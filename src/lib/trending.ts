import { Types, PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Event, type EventType } from "@/models/Event";
import { Product } from "@/models/Product";
import { PopularityScore } from "@/models/PopularityScore";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { trending } = COMMERCE_CONFIG;

const EVENT_WEIGHTS: Record<EventType, number> = {
  purchase: trending.purchaseWeight,
  cart_add: trending.cartAddWeight,
  wishlist: trending.wishlistWeight,
  view: trending.viewWeight,
  search: 0,
  cart_remove: 0,
  click: 0,
};

function timeDecayWeight(ageDays: number): number {
  const { timeDecayHalfLifeDays } = trending;
  return Math.exp(-ageDays / timeDecayHalfLifeDays);
}

interface EventGroup {
  _id: { productId: Types.ObjectId; type: EventType };
  events: Array<{ createdAt: Date }>;
}

export async function computeTrendingScores(): Promise<{
  updated: number;
  windowStart: Date;
  windowEnd: Date;
}> {
  await connectToDatabase();

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - trending.windowDays * 24 * 60 * 60 * 1000);

  const events = await Event.aggregate<EventGroup>([
    {
      $match: {
        type: { $in: Object.keys(EVENT_WEIGHTS) as EventType[] },
        productId: { $ne: null },
        createdAt: { $gte: windowStart, $lte: windowEnd },
      },
    },
    {
      $group: {
        _id: { productId: "$productId", type: "$type" },
        events: { $push: { createdAt: "$createdAt" } },
      },
    },
    {
      $project: {
        _id: 1,
        events: 1,
      },
    },
  ]).exec();

  const scoresByProduct = new Map<string, { score: number; purchases: number; cartAdds: number; wishlists: number; views: number }>();

  for (const eventGroup of events) {
    const productId = eventGroup._id.productId.toString();
    const type = eventGroup._id.type;
    const weight = EVENT_WEIGHTS[type];
    if (!weight) continue;

    let productScore = scoresByProduct.get(productId) ?? {
      score: 0,
      purchases: 0,
      cartAdds: 0,
      wishlists: 0,
      views: 0,
    };

    for (const evt of eventGroup.events) {
      const ageDays = (windowEnd.getTime() - new Date(evt.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const decay = timeDecayWeight(ageDays);
      const weightedScore = weight * decay;
      productScore.score += weightedScore;

      switch (type) {
        case "purchase":
          productScore.purchases += 1;
          break;
        case "cart_add":
          productScore.cartAdds += 1;
          break;
        case "wishlist":
          productScore.wishlists += 1;
          break;
        case "view":
          productScore.views += 1;
          break;
      }
    }

    scoresByProduct.set(productId, productScore);
  }

  const bulkOps = Array.from(scoresByProduct.entries()).map(([productId, data]) => ({
    updateOne: {
      filter: { productId: new Types.ObjectId(productId) },
      update: {
        $set: {
          score: data.score,
          purchases: data.purchases,
          cartAdds: data.cartAdds,
          wishlists: data.wishlists,
          views: data.views,
          windowStart,
          windowEnd,
          computedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  let updated = 0;
  if (bulkOps.length > 0) {
    const result = await PopularityScore.bulkWrite(bulkOps, { ordered: false });
    updated = result.upsertedCount + result.modifiedCount;
  }

  await Product.updateMany(
    { _id: { $in: Array.from(scoresByProduct.keys()).map((id) => new Types.ObjectId(id)) } },
    [{ $set: { popularityScore: { $arrayElemAt: [{ $filter: { input: "$$ROOT", cond: { $eq: ["$$this._id", "$productId"] } } }, 0] } } }],
  ).catch(() => {});

  return { updated, windowStart, windowEnd };
}

export async function getTrendingProducts(
  limit: number = trending.topN,
  categoryId?: Types.ObjectId,
): Promise<Array<{ productId: Types.ObjectId; score: number }>> {
  await connectToDatabase();

  const match: Record<string, unknown> = {};
  if (categoryId) {
    match.category = categoryId;
  }

  const pipeline: PipelineStage[] = [
    { $match: { publishStatus: "active", ...match } },
    {
      $lookup: {
        from: "popularityscores",
        localField: "_id",
        foreignField: "productId",
        as: "popularity",
      },
    },
    { $unwind: { path: "$popularity", preserveNullAndEmptyArrays: true } },
    { $addFields: { score: { $ifNull: ["$popularity.score", 0] } } },
    { $sort: { score: -1, createdAt: -1 } },
    { $limit: limit },
    { $project: { productId: "$_id", score: 1, _id: 0 } },
  ];

  const results = await Product.aggregate<{ productId: Types.ObjectId; score: number }>(pipeline).exec();
  return results.map((r) => ({ productId: r.productId, score: r.score }));
}

export async function getTrendingByCategory(categorySlug: string, limit = 20): Promise<Types.ObjectId[]> {
  await connectToDatabase();

  const category = await Product.db?.collection("categories").findOne({ slug: categorySlug }, { projection: { _id: 1 } });
  if (!category) return [];

  const trending = await getTrendingProducts(limit, category._id);
  return trending.map((t) => t.productId);
}