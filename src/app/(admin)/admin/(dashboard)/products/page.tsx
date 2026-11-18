import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { ProductImportDialog } from "@/components/admin/catalog/ProductImportDialog";
import { bulkProductsFormAction, deleteProductAction } from "@/app/(admin)/admin/(dashboard)/products/actions";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const metadata = { title: "Products" };

const STATUSES = ["draft", "active", "archived"];

function money(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; stock?: string; page?: string; size?: string }>;
}) {
  await guardPage("products:read");
  const params = await searchParams;
  await connectToDatabase();
  const [general, categories] = await Promise.all([
    getSetting("general"),
    Category.find({}).sort({ name: 1 }).select("name slug").lean(),
  ]);

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const filter: Record<string, unknown> = {};
  if (params.status && STATUSES.includes(params.status)) {
    // Legacy products created before the publish status existed have no
    // publishStatus field. They are treated as active everywhere else.
    filter.publishStatus = params.status === "active" ? { $nin: ["draft", "archived"] } : params.status;
  }
  if (params.stock === "low") filter.status = "low_stock";
  if (params.stock === "out") filter.status = "out_of_stock";
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { slug: pattern }, { tags: pattern }];
  }
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  if (params.category && categoryBySlug.has(params.category)) {
    filter.category = categoryBySlug.get(params.category)!._id;
  }

  const [products, total, summary] = await Promise.all([
    Product.find(filter)
      .populate<{ category: { name: string; slug: string } }>("category", "name slug")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Product.countDocuments(filter),
    Product.aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $ifNull: ["$publishStatus", "active"] }, count: { $sum: 1 } } },
    ]),
  ]);

  const summaryMap = new Map(summary.map((entry) => [entry._id, entry.count]));
  const activeCount = summaryMap.get("active") ?? 0;
  const draftCount = summaryMap.get("draft") ?? 0;
  const archivedCount = summaryMap.get("archived") ?? 0;

  const rows: AdminTableRow[] = products.map((product) => {
    const stockLabel =
      product.status === "out_of_stock"
        ? "Out of stock"
        : product.status === "low_stock"
          ? `Low: ${product.stock}`
          : String(product.stock);

    return {
      id: String(product._id),
      cells: {
        name: {
          label: product.name,
          href: `/admin/products/${product._id}`,
          sub: product.shortDescription || undefined,
        },
        category: { label: product.category?.name ?? "Uncategorised", sub: product.category?.slug },
        price: {
          label: money(product.price, general.currencySymbol),
          sortValue: product.price,
        },
        stock: {
          label: stockLabel,
          tone: statusToneFor(product.status),
          sortValue: product.stock,
        },
        publish: {
          label: labelize(product.publishStatus ?? "active"),
          tone: statusToneFor(product.publishStatus ?? "active"),
          sortValue: product.publishStatus ?? "active",
        },
        featured: {
          label: product.featuredOrder === null || product.featuredOrder === undefined ? "No" : `#${product.featuredOrder}`,
          sortValue: product.featuredOrder ?? -1,
        },
        best: {
          label:
            product.bestSellerOrder === null || product.bestSellerOrder === undefined
              ? "No"
              : `#${product.bestSellerOrder}`,
          sortValue: product.bestSellerOrder ?? -1,
        },
        updated: {
          label: (product.updatedAt ?? new Date()).toLocaleDateString("en-GB"),
          sortValue: (product.updatedAt ?? new Date()).toISOString(),
        },
      },
    };
  });

  const hasFilters = Boolean(params.q || params.status || params.category || params.stock);

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything shoppers can buy. Drafts stay hidden until you publish them."
        breadcrumbs={[{ label: "Catalog" }, { label: "Products" }]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ProductImportDialog />
            <Link
              href="/admin/products/new"
              className="inline-flex h-9 items-center rounded-[6px] bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-deep"
            >
              New product
            </Link>
          </div>
        }
      />
      <PageBody>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Active", value: activeCount, href: "/admin/products?status=active" },
            { label: "Drafts", value: draftCount, href: "/admin/products?status=draft" },
            { label: "Archived", value: archivedCount, href: "/admin/products?status=archived" },
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

        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/products">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[220px]"
              placeholder="Name, slug or tag"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={params.status ?? ""} className="admin-field w-[150px]">
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelize(status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="category">
              Category
            </label>
            <select id="category" name="category" defaultValue={params.category ?? ""} className="admin-field w-[180px]">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={String(category._id)} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="stock">
              Stock
            </label>
            <select id="stock" name="stock" defaultValue={params.stock ?? ""} className="admin-field w-[150px]">
              <option value="">Any stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/admin/products"
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable
          columns={[
            { key: "name", header: "Product" },
            { key: "category", header: "Category" },
            { key: "price", header: "Price", align: "right" },
            { key: "stock", header: "Stock" },
            { key: "publish", header: "Status" },
            { key: "featured", header: "Featured", hideByDefault: true },
            { key: "best", header: "Best seller", hideByDefault: true },
            { key: "updated", header: "Updated" },
          ]}
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          bulkOptions={[
            { value: "publish", label: "Publish" },
            { value: "draft", label: "Move to draft" },
            { value: "archive", label: "Archive" },
            { value: "feature", label: "Add to featured" },
            { value: "unfeature", label: "Remove from featured" },
            { value: "best-seller", label: "Add to best selling" },
            { value: "remove-best-seller", label: "Remove from best selling" },
            { value: "delete", label: "Delete" },
          ]}
          bulkAction={bulkProductsFormAction}
          rowActions={[
            { label: "Edit", kind: "edit", href: (id) => `/admin/products/${id}` },
            {
              label: "Delete",
              kind: "delete",
              onDelete: (id) =>
                deleteProductAction({ id }).then((r) => {
                  if (!r.ok) throw new Error(r.error);
                }),
            },
          ]}
          emptyTitle={hasFilters ? "No products match these filters" : "No products yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search, category or status filters to see more products."
              : "Add your first product or import a CSV to fill the catalog. Drafts stay hidden until published."
          }
          defaultSort={{ key: "updated", desc: true }}
        />
      </PageBody>
    </>
  );
}
