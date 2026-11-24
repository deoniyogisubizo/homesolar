import { NextRequest, NextResponse } from "next/server";
import { detectAbandonedCarts, processAbandonmentMessages } from "@/lib/cart-abandonment";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";

function authorized(request: Request, secret: string): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const direct = request.headers.get("x-cron-secret") ?? "";
  return bearer === secret || direct === secret;
}

export async function GET(request: NextRequest) {
  const config = getWhatsAppConfig();
  if (!config.cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!authorized(request, config.cronSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const detected = await detectAbandonedCarts();
    const { sent, errors } = await processAbandonmentMessages();

    return NextResponse.json({ ok: true, detected, sent, errors }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Cart abandonment cron failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to process cart abandonment" }, { status: 500 });
  }
}