import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Event, type EventType } from "@/models/Event";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { getCustomerSession } from "@/lib/auth/customer";

const EVENT_TYPES: EventType[] = ["view", "search", "cart_add", "cart_remove", "wishlist", "purchase", "click"];

interface IncomingEvent {
  type: EventType;
  productId?: string | null;
  query?: string | null;
  metadata?: Record<string, unknown>;
  anonId: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const anonIdCookie = cookieStore.get("hs_anon_id")?.value ?? "";

    const session = await getCustomerSession();
    const userId = session?.id ?? null;

    const body = await request.json();
    const { events } = body as { events: IncomingEvent[] };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: false, error: "No events provided" }, { status: 400 });
    }

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateLimitKey = `events:${userId ?? anonIdCookie ?? clientIp}`;
    if (!checkRateLimit(rateLimitKey, 100, 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const validEvents = events
      .filter((event) => EVENT_TYPES.includes(event.type))
      .map((event) => ({
        userId: userId ? new Types.ObjectId(userId) : null,
        anonId: userId ? null : (event.anonId || anonIdCookie),
        type: event.type,
        productId: event.productId ? new Types.ObjectId(event.productId) : null,
        query: event.query?.trim() || null,
        metadata: event.metadata ?? {},
        createdAt: new Date(event.timestamp),
      }));

    if (validEvents.length > 0) {
      await Event.insertMany(validEvents, { ordered: false });
    }

    return NextResponse.json({ ok: true, received: validEvents.length });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to record events" }, { status: 500 });
  }
}