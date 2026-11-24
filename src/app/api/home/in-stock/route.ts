import { NextResponse, type NextRequest } from "next/server";
import { getDynamicInStockProducts, getInStockAllProducts } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const limit = clampNumber(params.get("limit"), 8, 1, 100);
    const page = clampNumber(params.get("page"), 1, 1, 1000);

    let products;
    if (page === 1 && limit >= 100) {
      // For the initial load with client-side filtering, get a large randomized pool
      products = await getInStockAllProducts();
      // Shuffle for dynamic display
      for (let i = products.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [products[i], products[j]] = [products[j], products[i]];
      }
    } else {
      // Use dynamic function for paginated loads
      products = await getDynamicInStockProducts(limit);
    }

    return NextResponse.json({ ok: true, products, page, limit });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load products" }, { status: 500 });
  }
}

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}