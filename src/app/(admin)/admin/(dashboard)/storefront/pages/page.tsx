import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Page } from "@/models/Page";
import { bulkDeletePagesFormAction, deletePageAction } from "@/app/(admin)/admin/(dashboard)/storefront/actions";

export const metadata = { title: "Pages" };

const STATUSES = ["draft", "published", "archived"];

export default async function PagesListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await guardPage("pages:write");
  const params = await searchParams;
  await connectToDatabase();

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const filter: Record<string, unknown> = {};
  if (params.status && STATUSES.includes(params.status)) filter.status = params.status;
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: pattern }, { slug: pattern }, { content: pattern }];
  }

  const [pages, total] = await Promise.all([
    Page.find(filter)
      .sort({ order: 1, title: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Page.countDocuments(filter),
  ]);

  const rows: AdminTableRow[] = pages.map((entry) => ({
    id: String(entry._id),
    cells: {
      title: {
        label: entry.title,
        href: `/admin/storefront/pages/${entry._id}`,
        sub: entry.excerpt || undefined,
      },
      slug: { label: `/${entry.slug}` },
      status: {
        label: labelize(entry.status),
        tone: statusToneFor(entry.status),
        sortValue: entry.status,
      },
      footer: { label: entry.showInFooter ? "Visible" : "Hidden", sortValue: entry.showInFooter ? 1 : 0 },
      order: { label: String(entry.order), sortValue: entry.order },
      updated: {
        label: (entry.updatedAt ?? new Date()).toLocaleDateString("en-GB"),
        sortValue: (entry.updatedAt ?? new Date()).toISOString(),
      },
    },
  }));

  return (
    <>
      <PageHeader
        title="Pages"
        description="About, policies, FAQs and any other standalone storefront content."
        breadcrumbs={[{ label: "Storefront" }, { label: "Pages" }]}
        action={
          <Link
            href="/admin/storefront/pages/new"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            New page
          </Link>
        }
      />
      <PageBody>
        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/storefront/pages">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[240px]"
              placeholder="Title, slug or content"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={params.status ?? ""} className="admin-field w-[160px]">
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelize(status)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white"
          >
            Apply filters
          </button>
          <Link
            href="/admin/storefront/pages"
            className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink"
          >
            Clear
          </Link>
        </form>

        <DataTable
          columns={[
            { key: "title", header: "Page" },
            { key: "slug", header: "URL" },
            { key: "status", header: "Status" },
            { key: "footer", header: "Footer", hideByDefault: true },
            { key: "order", header: "Order", hideByDefault: true, align: "right" },
            { key: "updated", header: "Updated" },
          ]}
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          emptyTitle={params.q || params.status ? "No pages match these filters" : "No pages yet"}
          emptyDescription={
            params.q || params.status
              ? "Adjust the search or status filter to see more pages."
              : "Create an About page, policies or FAQs so the footer and navigation links have somewhere to go."
          }
          defaultSort={{ key: "order", desc: false }}
          bulkOptions={[{ value: "delete", label: "Delete" }]}
          bulkAction={bulkDeletePagesFormAction}
          rowActions={[
            { label: "Edit", kind: "edit", hrefPrefix: "/admin/storefront/pages" },
            { label: "Delete", kind: "delete", onDeleteAction: deletePageAction },
          ]}
        />
      </PageBody>
    </>
  );
}
