import { NextRequest, NextResponse } from "next/server";
import { computeRFMAndSegments, processRetentionTriggers, checkPriceDropAndBackInStock } from "@/lib/retention";
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "all";

    let result: Record<string, unknown> = {};

    if (type === "rfm" || type === "all") {
      const rfm = await computeRFMAndSegments();
      result.rfm = rfm;
    }

    if (type === "triggers" || type === "all") {
      const triggers = await processRetentionTriggers();
      result.triggers = triggers;
    }

    if (type === "alerts" || type === "all") {
      const alerts = await checkPriceDropAndBackInStock();
      result.alerts = alerts;
    }

    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Retention cron failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to process retention" }, { status: 500 });
  }
}