import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, zodDetails } from "@/lib/api";
import { ensureSessionId } from "@/lib/session";
import { CartStockError, addToCart, getCart, removeCartItem, updateCartItem } from "@/lib/store";

const addSchema = z.object({
  productId: z.string().min(1),
  variantSku: z.string().min(1).max(80).optional(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

const updateSchema = z.object({
  productId: z.string().min(1),
  variantSku: z.string().min(1).max(80).optional(),
  quantity: z.coerce.number().int().min(0).max(99),
});

export async function GET(request: NextRequest) {
  const sessionId = await ensureSessionId();
  const district = request.nextUrl.searchParams.get("district")?.trim() || null;
  const province = request.nextUrl.searchParams.get("province")?.trim() || null;
  const cart = await getCart(sessionId, district ? { district, province } : {});
  return NextResponse.json(cart, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid cart request.", 422, zodDetails(parsed.error));
  }

  const sessionId = await ensureSessionId();
  try {
    const cart = await addToCart(
      sessionId,
      parsed.data.productId,
      parsed.data.quantity,
      parsed.data.variantSku,
    );
    if (!cart) return apiError("Product or variant not found.", 404);
    return NextResponse.json(cart, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CartStockError) {
      return apiError(error.message, 409, { available: error.available });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid cart update.", 422, zodDetails(parsed.error));
  }

  const sessionId = await ensureSessionId();
  try {
    const cart = await updateCartItem(
      sessionId,
      parsed.data.productId,
      parsed.data.quantity,
      parsed.data.variantSku,
    );
    return NextResponse.json(cart, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CartStockError) {
      return apiError(error.message, 409, { available: error.available });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return apiError("A productId query parameter is required.", 400);
  const variantSku = request.nextUrl.searchParams.get("variantSku");

  const sessionId = await ensureSessionId();
  const cart = await removeCartItem(sessionId, productId, variantSku);
  return NextResponse.json(cart, { headers: { "Cache-Control": "no-store" } });
}
