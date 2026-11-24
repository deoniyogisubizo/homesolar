import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { RelatedProduct } from "@/models/RelatedProduct";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { relatedProducts } = COMMERCE_CONFIG;

interface CoPurchasePair {
  productA: Types.ObjectId;
  productB: Types.ObjectId;
  pairCount: number;
  productAOrders: number;
  productBOrders: number;
}

async function getProductOrders(): Promise<Map<string, number>> {
  const orders = await Order.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { status: { $in: ["confirmed", "processing", "out_for_delivery", "delivered"] } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.productId", count: { $sum: 1 } } },
  ]).exec();

  const map = new Map<string, number>();
  for (const o of orders) {
    map.set(o._id.toString(), o.count);
  }
  return map;
}

async function getCoPurchasePairs(): Promise<CoPurchasePair[]> {
  const orders = await Order.aggregate<{ _id: Types.ObjectId; items: Types.ObjectId[] }>([
    { $match: { status: { $in: ["confirmed", "processing", "out_for_delivery", "delivered"] } } },
    { $project: { items: "$items.productId" } },
    { $match: { "items.1": { $exists: true } } },
  ]).exec();

  const pairCounts = new Map<string, number>();
  const productOrders = await getProductOrders();

  for (const order of orders) {
    const productIds = order.items.map((id) => id.toString()).sort();
    for (let i = 0; i < productIds.length; i++) {
      for (let j = i + 1; j < productIds.length; j++) {
        const key = `${productIds[i]}|${productIds[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const pairs: CoPurchasePair[] = [];
  for (const [key, count] of pairCounts) {
    if (count < relatedProducts.coPurchaseMinOrders) continue;

    const [productA, productB] = key.split("|");
    const productAOrders = productOrders.get(productA) ?? 0;
    const productBOrders = productOrders.get(productB) ?? 0;

    if (productAOrders === 0 || productBOrders === 0) continue;

    const confidenceA = count / productAOrders;
    const confidenceB = count / productBOrders;
    const lift = (count * productOrders.size) / (productAOrders * productBOrders);

    if (confidenceA >= relatedProducts.confidenceThreshold && lift >= relatedProducts.liftThreshold) {
      pairs.push({
        productA: new Types.ObjectId(productA),
        productB: new Types.ObjectId(productB),
        pairCount: count,
        productAOrders,
        productBOrders,
      });
    }
  }

  return pairs;
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

async function buildFallbackRelations(): Promise<Array<{
  productId: Types.ObjectId;
  relatedProductId: Types.ObjectId;
  score: number;
  type: "fallback_category" | "fallback_tag";
}>> {
  const products = await Product.find({ publishStatus: "active" })
    .select("_id category tags price")
    .lean();

  const byCategory = new Map<string, Types.ObjectId[]>();
  for (const p of products) {
    const cat = p.category.toString();
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p._id);
  }

  const relations: Array<{
    productId: Types.ObjectId;
    relatedProductId: Types.ObjectId;
    score: number;
    type: "fallback_category" | "fallback_tag";
  }> = [];

  for (const product of products) {
    const candidates: Array<{ id: Types.ObjectId; score: number; type: "fallback_category" | "fallback_tag" }> = [];

    const sameCategory = byCategory.get(product.category.toString()) ?? [];
    for (const candidateId of sameCategory) {
      if (candidateId.equals(product._id)) continue;

      const candidate = products.find((p) => p._id.equals(candidateId));
      if (!candidate) continue;

      const priceRatio = Math.min(product.price, candidate.price) / Math.max(product.price, candidate.price);
      if (priceRatio < 1 - relatedProducts.fallbackPriceBandPct) continue;

      const tagSetA = new Set(product.tags.map((t) => t.toLowerCase()));
      const tagSetB = new Set(candidate.tags.map((t) => t.toLowerCase()));
      const tagSim = jaccardSimilarity(tagSetA, tagSetB);

      let score = 0;
      if (tagSim >= relatedProducts.fallbackTagJaccardThreshold) {
        score = tagSim * relatedProducts.fallbackTagWeight;
        candidates.push({ id: candidateId, score, type: "fallback_tag" });
      } else {
        score = relatedProducts.fallbackCategoryWeight;
        candidates.push({ id: candidateId, score, type: "fallback_category" });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    for (const c of candidates.slice(0, relatedProducts.maxPerProduct)) {
      relations.push({
        productId: product._id,
        relatedProductId: c.id,
        score: c.score,
        type: c.type,
      });
    }
  }

  return relations;
}

export async function computeRelatedProducts(): Promise<{ coPurchase: number; fallback: number }> {
  await connectToDatabase();

  await RelatedProduct.deleteMany({});

  const coPurchasePairs = await getCoPurchasePairs();
  const totalProducts = await Product.countDocuments({ publishStatus: "active" });

  const coPurchaseOps = coPurchasePairs.flatMap((pair) => [
    {
      updateOne: {
        filter: { productId: pair.productA, relatedProductId: pair.productB },
        update: {
          $set: {
            productId: pair.productA,
            relatedProductId: pair.productB,
            score: pair.pairCount / pair.productAOrders,
            confidence: pair.pairCount / pair.productAOrders,
            lift: (pair.pairCount * totalProducts) / (pair.productAOrders * pair.productBOrders),
            type: "co_purchase",
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { productId: pair.productB, relatedProductId: pair.productA },
        update: {
          $set: {
            productId: pair.productB,
            relatedProductId: pair.productA,
            score: pair.pairCount / pair.productBOrders,
            confidence: pair.pairCount / pair.productBOrders,
            lift: (pair.pairCount * totalProducts) / (pair.productAOrders * pair.productBOrders),
            type: "co_purchase",
          },
        },
        upsert: true,
      },
    },
  ]);

  let coPurchaseCount = 0;
  if (coPurchaseOps.length > 0) {
    const result = await RelatedProduct.bulkWrite(coPurchaseOps, { ordered: false });
    coPurchaseCount = result.upsertedCount + result.modifiedCount;
  }

  const fallbackRelations = await buildFallbackRelations();
  const fallbackOps = fallbackRelations.map((r) => ({
    updateOne: {
      filter: { productId: r.productId, relatedProductId: r.relatedProductId },
      update: { $setOnInsert: { ...r, confidence: r.score, lift: 1 } },
      upsert: true,
    },
  }));

  let fallbackCount = 0;
  if (fallbackOps.length > 0) {
    const result = await RelatedProduct.bulkWrite(fallbackOps, { ordered: false });
    fallbackCount = result.upsertedCount;
  }

  for (const product of await Product.find({ publishStatus: "active" }).select("_id").lean()) {
    const related = await RelatedProduct.find({ productId: product._id })
      .sort({ score: -1 })
      .limit(relatedProducts.maxPerProduct)
      .select("relatedProductId")
      .lean();

    await Product.updateOne(
      { _id: product._id },
      { $set: { relatedProductIds: related.map((r) => r.relatedProductId) } },
    );
  }

  return { coPurchase: coPurchaseCount, fallback: fallbackCount };
}

export async function getRelatedProducts(productId: Types.ObjectId, limit = 12): Promise<Types.ObjectId[]> {
  await connectToDatabase();

  const related = await RelatedProduct.find({ productId })
    .sort({ score: -1 })
    .limit(limit)
    .select("relatedProductId")
    .lean();

  return related.map((r) => r.relatedProductId);
}

export async function getFrequentlyBoughtTogether(productId: Types.ObjectId, limit = 4): Promise<Types.ObjectId[]> {
  await connectToDatabase();

  const related = await RelatedProduct.find({ productId, type: "co_purchase" })
    .sort({ confidence: -1, lift: -1 })
    .limit(limit)
    .select("relatedProductId")
    .lean();

  return related.map((r) => r.relatedProductId);
}

export async function getSimilarItems(productId: Types.ObjectId, limit = 4): Promise<Types.ObjectId[]> {
  await connectToDatabase();

  const related = await RelatedProduct.find({ productId, type: { $in: ["fallback_category", "fallback_tag"] } })
    .sort({ score: -1 })
    .limit(limit)
    .select("relatedProductId")
    .lean();

  return related.map((r) => r.relatedProductId);
}