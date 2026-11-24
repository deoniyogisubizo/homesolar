import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { anonId, userId } = body as { anonId: string; userId: string };

    if (!anonId || !userId) {
      return NextResponse.json({ ok: false, error: "anonId and userId are required" }, { status: 400 });
    }

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`merge:${clientIp}`, 20, 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const result = await Event.updateMany(
      { anonId, userId: null },
      { $set: { userId: new Types.ObjectId(userId), anonId: null } },
    );

    return NextResponse.json({ ok: true, modified: result.modifiedCount });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to merge events" }, { status: 500 });
  }
}