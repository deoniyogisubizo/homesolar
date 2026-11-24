import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { searchProducts } from "@/lib/search";
import { cacheLife, cacheTag } from "next/cache";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

async function getCachedSearchResults(query: string, limit: number) {
  "use cache";
  cacheLife("seconds");
  cacheTag("search");

  await connectToDatabase();

  const results = await searchProducts(query, limit);
  const productIds = results.map((r) => r.productId);

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
    const query = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(COMMERCE_CONFIG.search.maxResults, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));

    if (!query) {
      return NextResponse.json({ ok: true, products: [], query: "" });
    }

    const orderedProducts = await getCachedSearchResults(query, limit);

    return NextResponse.json({
      ok: true,
      products: orderedProducts,
      query,
    }, {
      headers: {
        "Cache-Control": `public, max-age=${COMMERCE_CONFIG.cache.searchTtlSeconds}, stale-while-revalidate=60`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Search failed" }, { status: 500 });
  }
}