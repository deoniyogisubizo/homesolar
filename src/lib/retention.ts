import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { CustomerSegment, type RFMSegment } from "@/models/CustomerSegment";
import { Event } from "@/models/Event";
import { Product } from "@/models/Product";
import { Wishlist } from "@/models/Wishlist";
import { sendNotification } from "@/lib/notifications";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { retention } = COMMERCE_CONFIG;

function calculateRFMScores(
  customerId: Types.ObjectId,
  orders: { createdAt: Date; total: number }[],
): { recencyScore: number; frequencyScore: number; monetaryScore: number } {
  const now = Date.now();
  const recencyBins = retention.rfm.recencyBins;
  const frequencyBins = retention.rfm.frequencyBins;
  const monetaryBins = retention.rfm.monetaryBins;

  const lastOrder = orders.length > 0 ? orders[0].createdAt : new Date(0);
  const daysSinceLastOrder = (now - new Date(lastOrder).getTime()) / (1000 * 60 * 60 * 24);

  let recencyScore = 1;
  for (let i = 0; i < recencyBins.length; i++) {
    if (daysSinceLastOrder <= recencyBins[i]) {
      recencyScore = 5 - i;
      break;
    }
  }

  const frequency = orders.length;
  let frequencyScore = 1;
  for (let i = 0; i < frequencyBins.length; i++) {
    if (frequency >= frequencyBins[i]) {
      frequencyScore = i + 2;
      if (frequencyScore > 5) frequencyScore = 5;
    } else {
      break;
    }
  }

  const monetary = orders.reduce((sum, o) => sum + o.total, 0);
  let monetaryScore = 1;
  for (let i = 0; i < monetaryBins.length; i++) {
    if (monetary >= monetaryBins[i]) {
      monetaryScore = i + 2;
      if (monetaryScore > 5) monetaryScore = 5;
    } else {
      break;
    }
  }

  return { recencyScore, frequencyScore, monetaryScore };
}

function determineSegment(recency: number, frequency: number, monetary: number): RFMSegment {
  const { segments } = retention;

  const inRange = (score: number, range: readonly [number, number]) => score >= range[0] && score <= range[1];

  if (inRange(recency, segments.champions.recency) && inRange(frequency, segments.champions.frequency) && inRange(monetary, segments.champions.monetary)) {
    return "champions";
  }
  if (inRange(recency, segments.loyal.recency) && inRange(frequency, segments.loyal.frequency) && inRange(monetary, segments.loyal.monetary)) {
    return "loyal";
  }
  if (inRange(recency, segments.potential.recency) && inRange(frequency, segments.potential.frequency) && inRange(monetary, segments.potential.monetary)) {
    return "potential";
  }
  if (inRange(recency, segments.new.recency) && inRange(frequency, segments.new.frequency) && inRange(monetary, segments.new.monetary)) {
    return "new";
  }
  if (inRange(recency, segments.atRisk.recency) && inRange(frequency, segments.atRisk.frequency) && inRange(monetary, segments.atRisk.monetary)) {
    return "at_risk";
  }
  return "hibernating";
}

function calculateLoyaltyTier(points: number): "bronze" | "silver" | "gold" {
  const { tiers } = retention.loyalty;
  if (points >= tiers.gold.minPoints) return "gold";
  if (points >= tiers.silver.minPoints) return "silver";
  return "bronze";
}

export async function computeRFMAndSegments(): Promise<{ updated: number }> {
  await connectToDatabase();

  const customers = await Customer.find({ blocked: { $ne: true } }).select("_id orderCount lifetimeValue lastOrderAt createdAt").lean();

  const orders = await Order.aggregate<{ _id: Types.ObjectId; createdAt: Date; total: number }>([
    { $match: { status: { $in: ["delivered", "confirmed"] } } },
    { $sort: { createdAt: -1 } },
  ]).exec();

  const ordersByCustomer = new Map<string, { createdAt: Date; total: number }[]>();
  for (const order of orders) {
    const key = order._id.toString();
    if (!ordersByCustomer.has(key)) ordersByCustomer.set(key, []);
    ordersByCustomer.get(key)!.push({ createdAt: order.createdAt, total: order.total });
  }

  const bulkOps = [];
  for (const customer of customers) {
    const customerOrders = ordersByCustomer.get(customer._id.toString()) ?? [];
    const { recencyScore, frequencyScore, monetaryScore } = calculateRFMScores(customer._id, customerOrders);
    const segment = determineSegment(recencyScore, frequencyScore, monetaryScore);

    const points = Math.floor(customer.lifetimeValue * retention.loyalty.pointsPerRwf);
    const tier = calculateLoyaltyTier(points);
    const pointsExpiryAt = new Date(Date.now() + retention.loyalty.pointsExpiryMonths * 30 * 24 * 60 * 60 * 1000);

    bulkOps.push({
      updateOne: {
        filter: { customerId: customer._id },
        update: {
          $set: {
            recencyScore,
            frequencyScore,
            monetaryScore,
            segment,
            loyaltyPoints: points,
            loyaltyTier: tier,
            pointsExpiryAt,
          },
        },
        upsert: true,
      },
    });
  }

  let updated = 0;
  if (bulkOps.length > 0) {
    const result = await CustomerSegment.bulkWrite(bulkOps, { ordered: false });
    updated = result.upsertedCount + result.modifiedCount;
  }

  return { updated };
}

export async function processRetentionTriggers(): Promise<{ triggers: number; sent: number }> {
  await connectToDatabase();

  const segments = await CustomerSegment.find({}).lean();
  let triggers = 0;
  let sent = 0;

  for (const segment of segments) {
    const customer = await Customer.findById(segment.customerId).select("name phone email").lean();
    if (!customer || !customer.phone) continue;

    const now = new Date();
    const hour = now.getHours();

    if (hour >= retention.notifications.quietHoursStart || hour < retention.notifications.quietHoursEnd) {
      continue;
    }

    const recentNotifications = await Event.countDocuments({
      userId: segment.customerId,
      type: "click",
      "metadata.notification": true,
      createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    });

    if (recentNotifications >= retention.notifications.maxPerWeek) continue;

    let triggered = false;
    let message: { template: string; variables: Record<string, string> } | null = null;

    switch (segment.segment) {
      case "at_risk": {
        const lastOrder = await Order.findOne({ customerId: segment.customerId, status: { $in: ["delivered", "confirmed"] } })
          .sort({ createdAt: -1 })
          .select("createdAt")
          .lean();

        if (lastOrder && lastOrder.createdAt) {
          const daysSinceOrder = (now.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceOrder >= retention.triggers.winBackDelayDays) {
            triggered = true;
            message = {
              template: "win_back",
              variables: {
                name: customer.name,
                offer: `${retention.triggers.winBackOfferPercent}%`,
                url: "/account/orders",
              },
            };
          }
        }
        break;
      }
      case "champions": {
        if (retention.triggers.dailyDealEnabled) {
          triggered = true;
          message = {
            template: "early_access",
            variables: {
              name: customer.name,
              url: "/search?tag=daily-deal",
            },
          };
        }
        break;
      }
    }

    if (triggered && message) {
      const notificationSent = await sendNotification({
        to: customer.phone,
        channel: "whatsapp",
        template: message.template,
        variables: message.variables,
      });

      if (notificationSent) {
        await Event.create({
          userId: segment.customerId,
          type: "click",
          metadata: { notification: true, trigger: segment.segment, template: message.template },
        });
        sent++;
      }
      triggers++;
    }
  }

  return { triggers, sent };
}

export async function checkPriceDropAndBackInStock(): Promise<{ alerts: number; sent: number }> {
  await connectToDatabase();

  const wishlists = await Wishlist.find({}).populate("products").lean();
  let alerts = 0;
  let sent = 0;

  for (const wishlist of wishlists) {
    const customer = await Customer.findById(wishlist.customerId).select("name phone").lean();
    if (!customer || !customer.phone) continue;

    const productIds = wishlist.products.map((p: { _id: Types.ObjectId }) => p._id);
    const products = await Product.find({ _id: { $in: productIds } }).select("name price stock").lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    for (const productId of productIds) {
      const product = productMap.get(productId.toString());
      if (!product) continue;

      alerts++;

      if (retention.triggers.backInStockAlertEnabled && product.stock > 0) {
        const alreadyNotified = await Event.exists({
          userId: wishlist.customerId,
          productId,
          type: "click",
          "metadata.backInStock": true,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        });

        if (!alreadyNotified) {
          const notificationSent = await sendNotification({
            to: customer.phone,
            channel: "whatsapp",
            template: "back_in_stock",
            variables: { name: customer.name, product: product.name, url: `/product/${product._id}` },
          });

          if (notificationSent) {
            await Event.create({
              userId: wishlist.customerId,
              productId,
              type: "click",
              metadata: { notification: true, backInStock: true },
            });
            sent++;
          }
        }
      }

      if (retention.triggers.priceDropAlertEnabled) {
        const previousPrice = await Event.findOne({
          userId: wishlist.customerId,
          productId,
          type: "view",
          "metadata.price": { $exists: true },
        }).sort({ createdAt: -1 }).select("metadata.price").lean();

        if (previousPrice && previousPrice.metadata?.price) {
          const prevPrice = previousPrice.metadata.price as number;
          if (product.price < prevPrice * 0.9) {
            const notificationSent = await sendNotification({
              to: customer.phone,
              channel: "whatsapp",
              template: "price_drop",
              variables: {
                name: customer.name,
                product: product.name,
                oldPrice: prevPrice.toLocaleString(),
                newPrice: product.price.toLocaleString(),
                url: `/product/${product._id}`,
              },
            });

            if (notificationSent) {
              await Event.create({
                userId: wishlist.customerId,
                productId,
                type: "click",
                metadata: { notification: true, priceDrop: true },
              });
              sent++;
            }
          }
        }
      }
    }
  }

  return { alerts, sent };
}

export async function recordLogin(customerId: Types.ObjectId): Promise<void> {
  await connectToDatabase();

  const segment = await CustomerSegment.findOne({ customerId });
  if (!segment) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let newStreak = 1;
  if (segment.lastLoginAt) {
    const lastLogin = new Date(segment.lastLoginAt);
    const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
    const diffDays = Math.round((today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = segment.loginStreak + 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  const update: Record<string, unknown> = { lastLoginAt: now, loginStreak: newStreak };

  if (newStreak <= retention.triggers.loginStreakBonus.maxStreakDays) {
    const bonusPoints = retention.triggers.loginStreakBonus.points;
    update.$inc = { loyaltyPoints: bonusPoints };
    update.$setOnInsert = { pointsExpiryAt: new Date(Date.now() + retention.loyalty.pointsExpiryMonths * 30 * 24 * 60 * 60 * 1000) };

    await CustomerSegment.updateOne({ customerId }, update);

    await Event.create({
      userId: customerId,
      type: "click",
      metadata: { notification: false, loginStreakBonus: bonusPoints, streak: newStreak },
    });
  } else {
    await CustomerSegment.updateOne({ customerId }, update);
  }
}

export async function getSegmentStats(): Promise<Record<RFMSegment, { count: number; avgPoints: number; avgLifetimeValue: number }>> {
  await connectToDatabase();

  const segments = await CustomerSegment.aggregate<{ _id: RFMSegment; count: number; avgPoints: number; avgLifetimeValue: number }>([
    {
      $lookup: {
        from: "customers",
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    {
      $group: {
        _id: "$segment",
        count: { $sum: 1 },
        avgPoints: { $avg: "$loyaltyPoints" },
        avgLifetimeValue: { $avg: "$customer.lifetimeValue" },
      },
    },
  ]).exec();

  const result: Record<RFMSegment, { count: number; avgPoints: number; avgLifetimeValue: number }> = {
    champions: { count: 0, avgPoints: 0, avgLifetimeValue: 0 },
    loyal: { count: 0, avgPoints: 0, avgLifetimeValue: 0 },
    potential: { count: 0, avgPoints: 0, avgLifetimeValue: 0 },
    new: { count: 0, avgPoints: 0, avgLifetimeValue: 0 },
    at_risk: { count: 0, avgPoints: 0, avgLifetimeValue: 0 },
    hibernating: { count: 0, avgPoints: 0, avgLifetimeValue: 0 },
  };

  for (const s of segments) {
    result[s._id] = {
      count: s.count,
      avgPoints: Math.round(s.avgPoints),
      avgLifetimeValue: Math.round(s.avgLifetimeValue),
    };
  }

  return result;
}