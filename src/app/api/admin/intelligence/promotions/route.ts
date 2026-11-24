import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PromotionRule } from "@/models/PromotionRule";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "reports:read")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();

    const promotions = await PromotionRule.find({ active: true })
      .sort({ createdAt: -1 })
      .select("name type value usageCount usageLimitTotal active endsAt")
      .lean();

    return NextResponse.json({ ok: true, promotions });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch promotions" }, { status: 500 });
  }
}