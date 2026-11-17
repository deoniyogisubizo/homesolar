import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { statusToneFor } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import InventoryFilters from "@/components/admin/inventory/InventoryFilters";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; category?: string; page?: string; size?: string }>;
}) {
  await guardPage("inventory:read");
  const params = await searchParams;
  await connectToDatabase();
  const [general, categories] = await Promise.all([
    getSetting("general"),
    Category.find({}).sort({ name: 1 }).select("name slug").lean(),
  ]);

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const filter: Record<string, unknown> = { publishStatus: { $ne: "archived" } };
  if (params.level === "low") filter.stock = { $lt: 10 };
  if (params.level === "out") filter.stock = 0;
  if (params.level === "in") filter.stock = { $gte: 10 };
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { slug: pattern }];
  }
  if (params.category) {
    const match = categories.find((category) => category.slug === params.category);
    if (match) filter.category = match._id;
  }

  const [products, total, summary] = await Promise.all([
    Product.find(filter)
      .populate<{ category: { name: string; slug: string } }>("category", "name slug")
      .sort({ stock: 1, name: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Product.countDocuments(filter),
    Product.aggregate<{
      _id: null;
      units: number;
      value: number;
      low: number;
      out: number;
    }>([
      { $match: { publishStatus: { $ne: "archived" } } },
      {
        $group: {
          _id: null,
          units: { $sum: "$stock" },
          value: { $sum: { $multiply: ["$stock", "$price"] } },
          low: { $sum: { $cond: [{ $lt: ["$stock", 10] }, 1, 0] } },
          out: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const totals = summary[0] ?? { units: 0, value: 0, low: 0, out: 0 };
  const money = (value: number) => `${general.currencySymbol} ${value.toLocaleString("en-US")}`;
  const hasFilters = Boolean(params.q || params.level || params.category);

  const rows: AdminTableRow[] = products.map((product) => {
    const variantStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
    return {
      id: String(product._id),
      cells: {
        name: {
          label: product.name,
          href: `/admin/inventory/${product._id}`,
          sub: product.variants.length
            ? `${product.variants.length} variants · ${variantStock} units across variants`
            : product.category?.name ?? "Uncategorised",
        },
        category: { label: product.category?.name ?? "Uncategorised" },
        stock: {
          label: String(product.stock),
          sortValue: product.stock,
        },
        threshold: {
          label: String(product.lowStockThreshold ?? 5),
          sortValue: product.lowStockThreshold ?? 5,
        },
        status: {
          label:
            product.status === "out_of_stock"
              ? "Out of stock"
              : product.status === "low_stock"
                ? "Low stock"
                : "In stock",
          tone: statusToneFor(product.status),
          sortValue: product.stock,
        },
        value: { label: money(product.price * product.stock), sortValue: product.price * product.stock },
        updated: {
          label: (product.updatedAt ?? new Date()).toLocaleDateString("en-GB"),
          sortValue: (product.updatedAt ?? new Date()).toISOString(),
        },
      },
    };
  });

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock levels across the catalog. Adjustments are logged for every product and variant."
        breadcrumbs={[{ label: "Catalog" }, { label: "Inventory" }]}
        action={
          <Link
            href="/admin/inventory/movements"
            className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile"
          >
            Movement history
          </Link>
        }
      />
      <PageBody>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Units on hand", value: totals.units.toLocaleString("en-US"), href: "/admin/inventory" },
            { label: "Stock value", value: money(totals.value), href: "/admin/inventory" },
            { label: "Understock", value: String(totals.low), href: "/admin/inventory?level=low" },
            { label: "Out of stock", value: String(totals.out), href: "/admin/inventory?level=out" },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-[8px] border border-admin-line bg-white px-4 py-3 hover:border-brand/40"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">{card.label}</p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{card.value}</p>
            </Link>
          ))}
        </div>

        <InventoryFilters categories={categories} />

        <DataTable
          columns={[
            { key: "name", header: "Product" },
            { key: "category", header: "Category", hideByDefault: true },
            { key: "stock", header: "On hand", align: "right" },
            { key: "threshold", header: "Low at", align: "right", hideByDefault: true },
            { key: "status", header: "Status" },
            { key: "value", header: "Stock value", align: "right" },
            { key: "updated", header: "Updated" },
          ]}
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          emptyTitle={hasFilters ? "No products match these filters" : "Nothing in the catalog yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search and stock filters to see more products."
              : "Add products first, then track their stock levels here."
          }
          defaultSort={{ key: "stock", desc: false }}
        />
      </PageBody>
    </>
  );
}
