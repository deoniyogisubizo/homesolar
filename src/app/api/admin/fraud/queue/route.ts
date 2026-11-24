import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getFraudReviewQueue, reviewFraudScore } from "@/lib/fraud";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { Types } from "mongoose";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "orders:read")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();
    const queue = await getFraudReviewQueue();
    return NextResponse.json({ ok: true, queue });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch fraud queue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "orders:write")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { orderId, decision, note } = body as { orderId: string; decision: "approve" | "reject"; note?: string };

    if (!orderId || !decision) {
      return NextResponse.json({ ok: false, error: "orderId and decision are required" }, { status: 400 });
    }

    await connectToDatabase();
    await reviewFraudScore(new Types.ObjectId(orderId), new Types.ObjectId(session.id), decision, note);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to review fraud score" }, { status: 500 });
  }
}