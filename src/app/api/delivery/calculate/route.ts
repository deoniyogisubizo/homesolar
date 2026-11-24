import { NextRequest, NextResponse } from "next/server";
import { calculateDelivery, type DeliveryCalculationInput } from "@/lib/delivery";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`delivery:${clientIp}`, 30, 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const { district, weightKg, itemsValue, isExpress } = body as DeliveryCalculationInput;

    if (!district || typeof weightKg !== "number" || typeof itemsValue !== "number") {
      return NextResponse.json({ ok: false, error: "Missing required fields: district, weightKg, itemsValue" }, { status: 400 });
    }

    const result = calculateDelivery({ district, weightKg, itemsValue, isExpress });

    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to calculate delivery" }, { status: 500 });
  }
}