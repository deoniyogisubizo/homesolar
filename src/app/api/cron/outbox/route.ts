import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { processOutbox } from "@/lib/whatsapp/outbox";


function authorized(request: Request, secret: string): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const direct = request.headers.get("x-cron-secret") ?? "";
  return bearer === secret || direct === secret;
}

export async function GET(request: Request) {
  const config = getWhatsAppConfig();
  if (!config.cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if (!authorized(request, config.cronSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(new URL(request.url).searchParams.get("limit") ?? "20", 10) || 20),
  );
  const result = await processOutbox(limit);
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
