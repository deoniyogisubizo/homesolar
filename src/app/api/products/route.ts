import { NextResponse, type NextRequest } from "next/server";
import { getProductsByCategorySlug, searchProducts } from "@/lib/data";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const category = params.get("category")?.trim() ?? "";
  const limit = clampNumber(params.get("limit"), 48, 1, 100);
  const page = clampNumber(params.get("page"), 1, 1, 1000);

  let products = category
    ? await getProductsByCategorySlug(category)
    : await searchProducts(query);

  if (query && category) {
    const needle = query.toLowerCase();
    products = products.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.description.toLowerCase().includes(needle) ||
        product.shortDescription.toLowerCase().includes(needle),
    );
  }

  const total = products.length;
  const start = (page - 1) * limit;
  const items = products.slice(start, start + limit);

  return NextResponse.json({ products: items, total, page, limit });
}

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
