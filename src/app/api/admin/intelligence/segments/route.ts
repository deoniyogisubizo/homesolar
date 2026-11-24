import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSegmentStats } from "@/lib/retention";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "reports:read")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();
    const segments = await getSegmentStats();
    const formatted = Object.entries(segments).map(([segment, data]) => ({ segment, ...data }));
    return NextResponse.json({ ok: true, segments: formatted });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch segments" }, { status: 500 });
  }
}