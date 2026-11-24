import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Event, type EventType } from "@/models/Event";
import { Product } from "@/models/Product";
import { PopularityScore } from "@/models/PopularityScore";
import { RelatedProduct } from "@/models/RelatedProduct";
import { Order } from "@/models/Order";
import { UserInterestProfile } from "@/models/UserInterestProfile";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { personalizedFeed } = COMMERCE_CONFIG;

const EVENT_WEIGHTS: Record<EventType, number> = {
  purchase: personalizedFeed.eventWeights.purchase,
  cart_add: personalizedFeed.eventWeights.cart,
  view: personalizedFeed.eventWeights.view,
  search: personalizedFeed.eventWeights.search,
  cart_remove: 0,
  wishlist: 0,
  click: 0,
};

function getPriceBand(price: number): string {
  if (price < 10000) return "0-10k";
  if (price < 50000) return "10k-50k";
  if (price < 100000) return "50k-100k";
  if (price < 500000) return "100k-500k";
  return "500k+";
}

function timeDecayWeight(ageDays: number): number {
  return Math.exp(-ageDays / personalizedFeed.timeDecayHalfLifeDays);
}

async function buildInterestProfile(userId: Types.ObjectId): Promise<{
  categoryWeights: Map<string, number>;
  brandWeights: Map<string, number>;
  priceBandWeights: Map<string, number>;
}> {
  const windowStart = new Date(Date.now() - personalizedFeed.windowDays * 24 * 60 * 60 * 1000);

  const events = await Event.aggregate<{
    _id: Types.ObjectId;
    type: EventType;
    productId: Types.ObjectId;
    createdAt: Date;
    query: string;
  }>([
    { $match: { userId, createdAt: { $gte: windowStart }, productId: { $ne: null } } },
    { $sort: { createdAt: -1 } },
  ]).exec();

  const productIds = [...new Set(events.map((e) => e.productId.toString()))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select("category brand price")
    .lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const categoryWeights = new Map<string, number>();
  const brandWeights = new Map<string, number>();
  const priceBandWeights = new Map<string, number>();

  for (const event of events) {
    const product = productMap.get(event.productId.toString());
    if (!product) continue;

    const weight = EVENT_WEIGHTS[event.type];
    if (!weight) continue;

    const ageDays = (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const decay = timeDecayWeight(ageDays);
    const finalWeight = weight * decay;

    const catKey = product.category.toString();
    categoryWeights.set(catKey, (categoryWeights.get(catKey) ?? 0) + finalWeight);

    if (product.brand) {
      brandWeights.set(product.brand, (brandWeights.get(product.brand) ?? 0) + finalWeight);
    }

    const priceBand = getPriceBand(product.price);
    priceBandWeights.set(priceBand, (priceBandWeights.get(priceBand) ?? 0) + finalWeight);
  }

  return { categoryWeights, brandWeights, priceBandWeights };
}

export async function updateUserInterestProfile(userId: Types.ObjectId): Promise<void> {
  await connectToDatabase();

  const profile = await buildInterestProfile(userId);

  await UserInterestProfile.updateOne(
    { userId },
    {
      $set: {
        categoryWeights: Object.fromEntries(profile.categoryWeights),
        brandWeights: Object.fromEntries(profile.brandWeights),
        priceBandWeights: Object.fromEntries(profile.priceBandWeights),
        lastUpdated: new Date(),
      },
    },
    { upsert: true },
  );
}

function calculateInterestScore(
  product: { category: Types.ObjectId; brand: string; price: number },
  profile: { categoryWeights: Map<string, number>; brandWeights: Map<string, number>; priceBandWeights: Map<string, number> },
): number {
  let score = 0;

  const catWeight = profile.categoryWeights.get(product.category.toString()) ?? 0;
  score += catWeight;

  if (product.brand) {
    const brandWeight = profile.brandWeights.get(product.brand) ?? 0;
    score += brandWeight;
  }

  const priceBand = getPriceBand(product.price);
  const priceWeight = profile.priceBandWeights.get(priceBand) ?? 0;
  score += priceWeight;

  return score;
}

async function getPurchasedProductIds(userId: Types.ObjectId): Promise<Set<string>> {
  const orders = await Order.find({ customerId: userId, status: { $in: ["delivered", "confirmed"] } })
    .select("items.productId")
    .lean();

  const purchased = new Set<string>();
  for (const order of orders) {
    for (const item of order.items) {
      purchased.add(item.productId.toString());
    }
  }
  return purchased;
}

async function getCandidatePool(userId: Types.ObjectId, limit: number): Promise<Types.ObjectId[]> {
  const trending = await Product.aggregate<{ _id: Types.ObjectId }>([
    { $match: { publishStatus: "active" } },
    { $lookup: { from: "popularityscores", localField: "_id", foreignField: "productId", as: "pop" } },
    { $unwind: { path: "$pop", preserveNullAndEmptyArrays: true } },
    { $sort: { "pop.score": -1 } },
    { $limit: Math.ceil(limit * personalizedFeed.candidatePoolMultiplier) },
    { $project: { _id: 1 } },
  ]).exec();

  const trendingIds = trending.map((t) => t._id);

  const recentViews = await Event.find({ userId, type: "view" })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("productId")
    .lean();

  const relatedIds: Types.ObjectId[] = [];
  for (const view of recentViews) {
    const related = await RelatedProduct.find({ productId: view.productId })
      .sort({ score: -1 })
      .limit(5)
      .select("relatedProductId")
      .lean();
    relatedIds.push(...related.map((r) => r.relatedProductId));
  }

  const allCandidates = new Set<string>();
  for (const id of [...trendingIds, ...relatedIds]) {
    allCandidates.add(id.toString());
  }

  return Array.from(allCandidates).slice(0, limit * personalizedFeed.candidatePoolMultiplier).map((id) => new Types.ObjectId(id));
}

export async function generatePersonalizedFeed(userId: Types.ObjectId, limit: number = personalizedFeed.feedSize): Promise<Types.ObjectId[]> {
  await connectToDatabase();

  const [profileDoc, purchasedIds, candidateIds] = await Promise.all([
    UserInterestProfile.findOne({ userId }).lean(),
    getPurchasedProductIds(userId),
    getCandidatePool(userId, limit),
  ]);

  if (candidateIds.length === 0) {
    return getColdStartFeed(limit);
  }

  const profile = profileDoc
    ? {
        categoryWeights: new Map(Object.entries(profileDoc.categoryWeights)),
        brandWeights: new Map(Object.entries(profileDoc.brandWeights)),
        priceBandWeights: new Map(Object.entries(profileDoc.priceBandWeights)),
      }
    : { categoryWeights: new Map(), brandWeights: new Map(), priceBandWeights: new Map() };

  const candidates = await Product.find({ _id: { $in: candidateIds }, publishStatus: "active" })
    .select("category brand price stock")
    .lean();

  const popularityMap = new Map<string, number>();
  const popScores = await PopularityScore.find({ productId: { $in: candidateIds } }).select("productId score").lean();
  for (const ps of popScores) {
    popularityMap.set(ps.productId.toString(), ps.score);
  }

  const scored = candidates
    .filter((p) => !purchasedIds.has(p._id.toString()))
    .map((p) => {
      const interestScore = calculateInterestScore(p, profile);
      const popularity = popularityMap.get(p._id.toString()) ?? 0;
      const novelty = p.stock > 0 && popularity < 10 ? 1 : 0;

      const finalScore =
        interestScore * personalizedFeed.interestWeight +
        popularity * personalizedFeed.popularityWeight +
        novelty * personalizedFeed.noveltyWeight;

      return { productId: p._id, score: finalScore, category: p.category.toString() };
    });

  scored.sort((a, b) => b.score - a.score);

  const diversified: Types.ObjectId[] = [];
  const categoryCounts = new Map<string, number>();
  const maxPerCategory = Math.ceil(limit * personalizedFeed.maxCategoryShare);

  for (const item of scored) {
    if (diversified.length >= limit) break;

    const catCount = categoryCounts.get(item.category) ?? 0;
    if (catCount >= maxPerCategory) continue;

    diversified.push(item.productId);
    categoryCounts.set(item.category, catCount + 1);
  }

  if (diversified.length < limit) {
    const remaining = candidateIds.filter((id) => !diversified.some((d) => d.equals(id)));
    for (const id of remaining) {
      if (diversified.length >= limit) break;
      diversified.push(id);
    }
  }

  return diversified.slice(0, limit);
}

async function getColdStartFeed(limit: number): Promise<Types.ObjectId[]> {
  const topCategories = await Order.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { status: { $in: ["delivered", "confirmed"] } } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $group: { _id: "$product.category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: personalizedFeed.coldStartTopCategories },
  ]).exec();

  const categoryIds = topCategories.map((c) => c._id);

  const trending = await Product.aggregate<{ _id: Types.ObjectId }>([
    { $match: { publishStatus: "active", category: { $in: categoryIds } } },
    { $lookup: { from: "popularityscores", localField: "_id", foreignField: "productId", as: "pop" } },
    { $unwind: { path: "$pop", preserveNullAndEmptyArrays: true } },
    { $sort: { "pop.score": -1 } },
    { $limit: limit },
    { $project: { _id: 1 } },
  ]).exec();

  return trending.map((t) => t._id);
}

export async function getFeedProducts(userId: Types.ObjectId | null, limit: number = personalizedFeed.feedSize): Promise<Types.ObjectId[]> {
  if (!userId) {
    return getColdStartFeed(limit);
  }
  return generatePersonalizedFeed(userId, limit);
}