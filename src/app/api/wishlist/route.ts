import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, zodDetails } from "@/lib/api";
import { ensureSessionId } from "@/lib/session";
import { addToWishlist, getWishlist, removeFromWishlist } from "@/lib/store";

const wishlistSchema = z.object({
  productId: z.string().min(1),
});

export async function GET() {
  const sessionId = await ensureSessionId();
  const wishlist = await getWishlist(sessionId);
  return NextResponse.json(wishlist, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid wishlist request.", 422, zodDetails(parsed.error));
  }

  const sessionId = await ensureSessionId();
  const wishlist = await addToWishlist(sessionId, parsed.data.productId);
  if (!wishlist) return apiError("Product not found.", 404);

  return NextResponse.json(wishlist, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return apiError("A productId query parameter is required.", 400);

  const sessionId = await ensureSessionId();
  const wishlist = await removeFromWishlist(sessionId, productId);
  return NextResponse.json(wishlist, { headers: { "Cache-Control": "no-store" } });
}
