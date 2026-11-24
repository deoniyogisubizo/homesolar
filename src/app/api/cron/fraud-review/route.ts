import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { scoreOrder } from "@/lib/fraud";
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
    await connectToDatabase();

    const orders = await Order.find({
      status: "new",
      paymentStatus: "unpaid",
      "metadata.fraudReviewed": { $ne: true },
    })
      .select("_id")
      .lean();

    let scored = 0;
    let flagged = 0;

    for (const order of orders) {
      const result = await scoreOrder(order._id);
      scored++;
      if (result.decision !== "auto_approve") flagged++;
    }

    return NextResponse.json({ ok: true, scored, flagged }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Fraud review cron failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to process fraud review" }, { status: 500 });
  }
}