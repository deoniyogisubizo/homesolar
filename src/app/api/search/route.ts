import { NextResponse, type NextRequest } from "next/server";
import { searchProducts } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const products = await searchProducts(query);
  return NextResponse.json({ products, query });
}
