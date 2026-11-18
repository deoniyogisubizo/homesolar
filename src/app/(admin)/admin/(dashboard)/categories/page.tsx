import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { statusToneFor } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { bulkCategoryDeleteFormAction } from "@/app/(admin)/admin/(dashboard)/categories/actions";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await guardPage("categories:write");
  const params = await searchParams;
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (params.status === "active") filter.active = true;
  if (params.status === "hidden") filter.active = false;
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { slug: pattern }];
  }

  const categories = await Category.find(filter).sort({ order: 1, name: 1 }).lean();
  const counts = await Product.aggregate<{ _id: unknown; count: number }>([
    { $match: { category: { $in: categories.map((category) => category._id) } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));

  const rows: AdminTableRow[] = categories.map((category) => ({
    id: String(category._id),
    cells: {
      name: {
        label: category.name,
        href: `/admin/categories/${category._id}`,
        sub: category.description || undefined,
      },
      slug: { label: `/category/${category.slug}` },
      products: { label: String(countMap.get(String(category._id)) ?? 0), sortValue: countMap.get(String(category._id)) ?? 0 },
      home: { label: category.showOnHome ? "Shown" : "Hidden", sortValue: category.showOnHome ? 1 : 0 },
      status: {
        label: category.active ? "Active" : "Hidden",
        tone: statusToneFor(category.active ? "active" : "archived"),
        sortValue: category.active ? 1 : 0,
      },
      order: { label: String(category.order), sortValue: category.order },
      updated: {
        label: (category.updatedAt ?? new Date()).toLocaleDateString("en-GB"),
        sortValue: (category.updatedAt ?? new Date()).toISOString(),
      },
    },
  }));

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise products into shopper-friendly groups and control homepage tiles."
        breadcrumbs={[{ label: "Catalog" }, { label: "Categories" }]}
        action={
          <Link
            href="/admin/categories/new"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            New category
          </Link>
        }
      />
      <PageBody>
        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/categories">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[240px]"
              placeholder="Name or slug"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="status">
              Visibility
            </label>
            <select id="status" name="status" defaultValue={params.status ?? ""} className="admin-field w-[160px]">
              <option value="">All categories</option>
              <option value="active">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white"
          >
            Apply filters
          </button>
          <Link
            href="/admin/categories"
            className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink"
          >
            Clear
          </Link>
        </form>

        <DataTable
          columns={[
            { key: "name", header: "Category" },
            { key: "slug", header: "URL" },
            { key: "products", header: "Products", align: "right" },
            { key: "home", header: "Homepage", hideByDefault: true },
            { key: "status", header: "Visibility" },
            { key: "order", header: "Order", align: "right", hideByDefault: true },
            { key: "updated", header: "Updated" },
          ]}
          rows={rows}
          total={rows.length}
          page={1}
          pageSize={Math.max(rows.length, 10)}
          bulkOptions={[{ value: "delete", label: "Delete" }]}
          bulkAction={bulkCategoryDeleteFormAction}
          emptyTitle={params.q || params.status ? "No categories match these filters" : "No categories yet"}
          emptyDescription={
            params.q || params.status
              ? "Adjust the filters to see more categories."
              : "Create a category before adding products so shoppers can browse the catalog."
          }
          defaultSort={{ key: "order", desc: false }}
        />
      </PageBody>
    </>
  );
}
