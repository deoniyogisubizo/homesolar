import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { toCsv } from "@/lib/csv";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

const HEADERS = [
  "slug",
  "name",
  "category",
  "price",
  "compare_at_price",
  "stock",
  "short_description",
  "description",
  "image",
  "publish_status",
  "seo_title",
  "seo_description",
  "tags",
];

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }
  if (!can(session.role, "products:read")) {
    return NextResponse.json({ ok: false, error: "Your role does not allow this action." }, { status: 403 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("template") === "1") {
    const csv = toCsv(HEADERS, []);
    return new NextResponse(`${csv}\n`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="product-import-template.csv"',
        "cache-control": "no-store",
      },
    });
  }

  const query = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status") ?? "";
  const categorySlug = url.searchParams.get("category") ?? "";
  const filter: Record<string, unknown> = {};
  if (["draft", "active", "archived"].includes(status)) filter.publishStatus = status;
  if (query) {
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { slug: pattern }, { tags: pattern }];
  }

  await connectToDatabase();
  if (categorySlug) {
    const category = await Category.findOne({ slug: categorySlug }).select("_id").lean();
    if (category) filter.category = category._id;
  }

  const products = await Product.find(filter)
    .populate<{ category: { slug: string } }>("category", "slug")
    .sort({ updatedAt: -1 })
    .limit(5000)
    .lean();

  const rows = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    category: product.category?.slug ?? "",
    price: product.price,
    compare_at_price: product.compareAtPrice ?? "",
    stock: product.stock,
    short_description: product.shortDescription,
    description: product.description,
    image: product.image,
    publish_status: product.publishStatus,
    seo_title: product.seoTitle,
    seo_description: product.seoDescription,
    tags: product.tags.join(","),
  }));

  const csv = toCsv(HEADERS, rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
