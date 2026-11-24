import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { getRelatedProducts, getFrequentlyBoughtTogether, getSimilarItems } from "@/lib/related-products";
import { cacheLife, cacheTag } from "next/cache";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

async function getCachedRelatedProducts(
  productId: Types.ObjectId,
  limit: number,
  type: string,
): Promise<{ products: any[]; type: string }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("related-products");

  await connectToDatabase();

  let relatedIds: Types.ObjectId[] = [];

  if (type === "frequently_bought") {
    relatedIds = await getFrequentlyBoughtTogether(productId, limit);
  } else if (type === "similar") {
    relatedIds = await getSimilarItems(productId, limit);
  } else {
    relatedIds = await getRelatedProducts(productId, limit);
  }

  const products = await Product.find({ _id: { $in: relatedIds }, publishStatus: "active" })
    .populate("category")
    .lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const orderedProducts = relatedIds
    .map((id) => productMap.get(id.toString()))
    .filter((p): p is typeof p & NonNullable<typeof p> => Boolean(p));

  return { products: orderedProducts, type };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await connectToDatabase();

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(12, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "4", 10)));
    const type = searchParams.get("type") ?? "all";

    const product = await Product.findOne({ slug, publishStatus: "active" }).select("_id").lean();
    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const { products: orderedProducts, type: resolvedType } = await getCachedRelatedProducts(product._id, limit, type);

    return NextResponse.json({
      ok: true,
      products: orderedProducts,
      type: resolvedType,
    }, {
      headers: {
        "Cache-Control": `public, max-age=${COMMERCE_CONFIG.cache.relatedTtlSeconds}, stale-while-revalidate=300`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch related products" }, { status: 500 });
  }
}