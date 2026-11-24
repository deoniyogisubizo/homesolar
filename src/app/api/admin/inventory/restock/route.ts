import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getRestockSuggestions } from "@/lib/inventory-forecast";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "inventory:read")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();
    const suggestions = await getRestockSuggestions();
    return NextResponse.json({ ok: true, suggestions });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch restock suggestions" }, { status: 500 });
  }
}