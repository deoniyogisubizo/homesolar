import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { PopularityScore } from "@/models/PopularityScore";
import { getTrendingProducts } from "@/lib/trending";
import { cacheLife, cacheTag } from "next/cache";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

async function getCachedTrendingProducts(limit: number, categoryId: Types.ObjectId | undefined) {
  "use cache";
  cacheLife("seconds");
  cacheTag("trending");

  await connectToDatabase();

  const trending = await getTrendingProducts(limit, categoryId);
  const productIds = trending.map((t) => t.productId);

  const products = await Product.find({ _id: { $in: productIds }, publishStatus: "active" })
    .populate("category")
    .lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  return productIds
    .map((id) => productMap.get(id.toString()))
    .filter((p): p is typeof p & NonNullable<typeof p> => Boolean(p));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
    const categorySlug = searchParams.get("category");

    let categoryId: Types.ObjectId | undefined;
    if (categorySlug) {
      const category = await Product.db?.collection("categories").findOne({ slug: categorySlug }, { projection: { _id: 1 } });
      if (category) categoryId = category._id as Types.ObjectId;
    }

    const orderedProducts = await getCachedTrendingProducts(limit, categoryId);

    return NextResponse.json({
      ok: true,
      products: orderedProducts,
      cached: true,
    }, {
      headers: {
        "Cache-Control": `public, max-age=${COMMERCE_CONFIG.cache.trendingTtlSeconds}, stale-while-revalidate=120`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch trending products" }, { status: 500 });
  }
}