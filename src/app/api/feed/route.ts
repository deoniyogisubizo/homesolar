import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { getFeedProducts } from "@/lib/personalized-feed";
import { getCustomerSession } from "@/lib/auth/customer";
import { cacheLife, cacheTag } from "next/cache";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

async function getCachedFeedProducts(userId: Types.ObjectId | null, limit: number) {
  "use cache";
  cacheLife("seconds");
  cacheTag("feed");

  await connectToDatabase();

  const productIds = await getFeedProducts(userId, limit);

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
    const session = await getCustomerSession();
    const userId = session?.id ? new Types.ObjectId(session.id) : null;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));

    const orderedProducts = await getCachedFeedProducts(userId, limit);

    return NextResponse.json({
      ok: true,
      products: orderedProducts,
    }, {
      headers: {
        "Cache-Control": `public, max-age=${COMMERCE_CONFIG.cache.feedTtlSeconds}, stale-while-revalidate=120`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch feed" }, { status: 500 });
  }
}