import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CustomerSegment } from "@/models/CustomerSegment";
import { Customer } from "@/models/Customer";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "reports:read")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();

    const [segmentStats, customerStats] = await Promise.all([
      CustomerSegment.aggregate<{ _id: string; count: number; avgPoints: number }>([
        { $group: { _id: "$loyaltyTier", count: { $sum: 1 }, avgPoints: { $avg: "$loyaltyPoints" } } },
      ]),
      Customer.aggregate<{ _id: null; totalPoints: number; totalMembers: number; pointsRedeemed: number }>([
        { $match: { blocked: { $ne: true } } },
        { $group: { _id: null, totalMembers: { $sum: 1 }, totalPoints: { $sum: "$lifetimeValue" }, pointsRedeemed: { $sum: 0 } } },
      ]),
    ]);

    const tierCounts = { bronze: 0, silver: 0, gold: 0 };
    for (const s of segmentStats) {
      if (s._id in tierCounts) tierCounts[s._id as keyof typeof tierCounts] = s.count;
    }

    return NextResponse.json({
      ok: true,
      totalMembers: customerStats[0]?.totalMembers ?? 0,
      totalPoints: Math.floor((customerStats[0]?.totalPoints ?? 0) * 0.01),
      bronze: tierCounts.bronze,
      silver: tierCounts.silver,
      gold: tierCounts.gold,
      pointsRedeemed: 0,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch loyalty stats" }, { status: 500 });
  }
}