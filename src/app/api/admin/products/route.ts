import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { Product } from "@/models/Product";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  if (!can(session.role, "products:read")) {
    return NextResponse.json({ ok: false, error: "Your role does not allow this action." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") ?? "12", 10) || 12, 1), 30);

  await connectToDatabase();
  const filter: Record<string, unknown> = { publishStatus: { $ne: "archived" } };
  if (query) {
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { slug: pattern }, { tags: pattern }];
  }

  const products = await Product.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("name slug image price publishStatus")
    .lean();

  return NextResponse.json({
    ok: true,
    data: {
      items: products.map((product) => ({
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.price,
        publishStatus: product.publishStatus,
      })),
    },
  });
}
