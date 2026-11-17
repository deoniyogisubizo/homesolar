import { NextResponse } from "next/server";
import { getInStockCategories } from "@/lib/data";

export async function GET() {
  try {
    const categories = await getInStockCategories();
    return NextResponse.json({ ok: true, categories });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load categories" }, { status: 500 });
  }
}