import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Cart } from "@/models/Cart";
import { CartAbandonment, type AbandonmentStage } from "@/models/CartAbandonment";
import { Coupon } from "@/models/Coupon";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { sendNotification, buildAbandonmentMessage } from "@/lib/notifications";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { cartAbandonment } = COMMERCE_CONFIG;

interface StageConfig {
  delayHours: number;
  template: AbandonmentStage;
  includeSocialProof: boolean;
  includeIncentive: boolean;
  incentive?: {
    type: "percent";
    value: number;
    maxDiscount: number;
    expiresHours: number;
    singleUse: boolean;
  };
}

const STAGE_CONFIG: readonly StageConfig[] = cartAbandonment.messageSequence as readonly StageConfig[];

async function getCartDetails(sessionId: string): Promise<{
  items: Array<{ productId: Types.ObjectId; name: string; price: number }>;
  value: number;
  userId?: Types.ObjectId;
  phone?: string;
  email?: string;
} | null> {
  const cart = await Cart.findOne({ sessionId }).lean();
  if (!cart || cart.items.length === 0) return null;

  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select("name price").lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const items = cart.items
    .map((item) => {
      const product = productMap.get(item.product.toString());
      return product ? { productId: item.product, name: product.name, price: product.price } : null;
    })
    .filter((item): item is { productId: Types.ObjectId; name: string; price: number } => Boolean(item));

  const value = items.reduce((sum, item) => sum + item.price, 0);

  return { items, value, userId: undefined, phone: undefined, email: undefined };
}

async function createIncentiveCoupon(cartValue: number): Promise<Types.ObjectId | null> {
  const incentiveConfig = STAGE_CONFIG[2].incentive;
  if (!incentiveConfig) return null;
  
  const code = `SAVE${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const coupon = await Coupon.create({
    code,
    codeLower: code.toLowerCase(),
    description: `Cart recovery incentive - ${incentiveConfig.value}% off`,
    type: "percent",
    value: incentiveConfig.value,
    minSubtotal: cartAbandonment.minCartValue,
    maxDiscount: incentiveConfig.maxDiscount,
    usageLimit: 1,
    perCustomerLimit: 1,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + incentiveConfig.expiresHours * 60 * 60 * 1000),
    scope: "all",
    productIds: [],
    categoryIds: [],
    status: "active",
    usageCount: 0,
  });

  return coupon._id;
}

interface AbandonmentDoc {
  sessionId: string;
  stage: AbandonmentStage;
  lastMessageAt: Date;
  messageCount: number;
  recovered: boolean;
  createdAt: Date;
  incentiveCouponId?: Types.ObjectId | null;
}

async function sendStageMessage(
  abandonment: AbandonmentDoc,
  stage: AbandonmentStage,
  cartUrl: string,
): Promise<boolean> {
  const cartDetails = await getCartDetails(abandonment.sessionId);
  if (!cartDetails) return false;

  const itemNames = cartDetails.items.map((i) => i.name);
  const config = STAGE_CONFIG.find((s) => s.template === stage);

  const variables = {
    cartUrl,
    itemNames,
    cartValue: cartDetails.value,
  };

  if (stage === "incentive" && config?.incentive) {
    const couponId = await createIncentiveCoupon(cartDetails.value);
    if (couponId) {
      await CartAbandonment.updateOne(
        { sessionId: abandonment.sessionId },
        { $set: { incentiveCouponId: couponId } }
      );
      Object.assign(variables, {
        incentiveCode: `SAVE${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        incentivePercent: config.incentive.value,
        incentiveExpiresHours: config.incentive.expiresHours,
      });
    }
  }

  const message = buildAbandonmentMessage(stage, variables);

  const sent = await sendNotification({
    to: cartDetails.phone ?? "",
    channel: "whatsapp",
    template: message.template,
    variables: message.variables,
  });

  if (sent) {
    await CartAbandonment.updateOne(
      { sessionId: abandonment.sessionId },
      {
        $set: {
          stage,
          lastMessageAt: new Date(),
        },
        $inc: { messageCount: 1 },
      }
    );
  }

  return sent;
}

function shouldSendStage(abandonment: AbandonmentDoc, stageIndex: number): boolean {
  const now = Date.now();
  const createdAt = new Date(abandonment.createdAt).getTime();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

  const requiredHours = STAGE_CONFIG[stageIndex].delayHours;
  if (hoursSinceCreation < requiredHours) return false;

  if (abandonment.messageCount >= stageIndex + 1) return false;

  if (abandonment.recovered) return false;

  return true;
}

export async function detectAbandonedCarts(): Promise<number> {
  await connectToDatabase();

  const windowStart = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const carts = await Cart.find({
    updatedAt: { $gte: windowStart, $lte: new Date(Date.now() - 60 * 60 * 1000) },
    "items.0": { $exists: true },
  }).lean();

  let detected = 0;
  for (const cart of carts) {
    const existing = await CartAbandonment.findOne({ sessionId: cart.sessionId });
    if (existing) continue;

    const productIds = cart.items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select("price").lean();
    const priceMap = new Map(products.map((p) => [p._id.toString(), p.price]));
    const value = cart.items.reduce((sum, item) => sum + (priceMap.get(item.product.toString()) ?? 0), 0);

    if (value < cartAbandonment.minCartValue || cart.items.length < cartAbandonment.minItems) continue;

    await CartAbandonment.create({
      sessionId: cart.sessionId,
      cartItems: productIds,
      cartValue: value,
      stage: "reminder",
      lastMessageAt: new Date(),
      messageCount: 0,
      recovered: false,
    });

    detected++;
  }

  return detected;
}

export async function processAbandonmentMessages(cartUrlBase = "/cart"): Promise<{ sent: number; errors: number }> {
  await connectToDatabase();

  const now = new Date();
  const abandoned = await CartAbandonment.find({
    recovered: false,
    messageCount: { $lt: cartAbandonment.maxMessagesPerCart },
  }).lean();

  let sent = 0;
  let errors = 0;

  for (const abandonment of abandoned) {
    for (let i = 0; i < STAGE_CONFIG.length; i++) {
      if (shouldSendStage(abandonment, i)) {
        const stage = STAGE_CONFIG[i].template as AbandonmentStage;
        const cartUrl = `${cartUrlBase}?session=${abandonment.sessionId}`;
        try {
          const success = await sendStageMessage(abandonment, stage, cartUrl);
          if (success) sent++;
        } catch {
          errors++;
        }
        break;
      }
    }
  }

  return { sent, errors };
}

export async function markCartRecovered(sessionId: string, orderId: Types.ObjectId): Promise<void> {
  await connectToDatabase();

  await CartAbandonment.updateOne(
    { sessionId, recovered: false },
    {
      $set: {
        recovered: true,
        recoveredAt: new Date(),
        recoveryOrderId: orderId,
      },
    },
  );
}

export async function getAbandonmentStats(): Promise<{
  total: number;
  recovered: number;
  recoveryRate: number;
  byStage: Record<AbandonmentStage, number>;
  revenueRecovered: number;
}> {
  await connectToDatabase();

  const [total, recovered, byStage, revenueResult] = await Promise.all([
    CartAbandonment.countDocuments(),
    CartAbandonment.countDocuments({ recovered: true }),
    CartAbandonment.aggregate<{ _id: AbandonmentStage; count: number }>([
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: null; total: number }>([
      { $match: { _id: { $in: await CartAbandonment.find({ recovered: true }).distinct("recoveryOrderId") } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  const stageCounts: Record<AbandonmentStage, number> = {
    reminder: 0,
    social_proof: 0,
    incentive: 0,
  };

  for (const s of byStage) {
    stageCounts[s._id] = s.count;
  }

  return {
    total,
    recovered,
    recoveryRate: total > 0 ? (recovered / total) * 100 : 0,
    byStage: stageCounts,
    revenueRecovered: revenueResult[0]?.total ?? 0,
  };
}