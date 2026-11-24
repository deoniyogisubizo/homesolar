import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAbandonmentStats } from "@/lib/cart-abandonment";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "reports:read")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();
    const stats = await getAbandonmentStats();
    return NextResponse.json({ ok: true, ...stats });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch abandonment stats" }, { status: 500 });
  }
}