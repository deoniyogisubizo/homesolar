import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, zodDetails } from "@/lib/api";
import { ensureSessionId } from "@/lib/session";
import { applyCartCoupon, removeCartCoupon } from "@/lib/store";

const couponSchema = z.object({
  code: z.string().trim().min(2).max(40),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) return apiError("Enter a valid coupon code.", 422, zodDetails(parsed.error));

  const sessionId = await ensureSessionId();
  const result = await applyCartCoupon(sessionId, parsed.data.code);
  if (!result.ok) return apiError(result.error, 422);
  return NextResponse.json(result.cart, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const sessionId = await ensureSessionId();
  const cart = await removeCartCoupon(sessionId);
  return NextResponse.json(cart, { headers: { "Cache-Control": "no-store" } });
}
