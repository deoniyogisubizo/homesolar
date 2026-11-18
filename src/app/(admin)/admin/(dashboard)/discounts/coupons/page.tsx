import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { couponStatus } from "@/lib/coupons";
import { connectToDatabase } from "@/lib/mongodb";
import { Coupon } from "@/models/Coupon";
import { bulkDeleteCouponsFormAction } from "@/app/(admin)/admin/(dashboard)/discounts/actions";

export const metadata = { title: "Coupons" };

const STATUSES = ["active", "scheduled", "paused", "expired", "exhausted", "archived"];

function valueLabel(coupon: { type: "percent" | "fixed" | "free_shipping"; value: number }, symbol: string) {
  if (coupon.type === "free_shipping") return "Free shipping";
  if (coupon.type === "percent") return `${coupon.value}% off`;
  return `${symbol} ${coupon.value.toLocaleString("en-US")} off`;
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await guardPage("coupons:read");
  const params = await searchParams;
  await connectToDatabase();
  const general = await getSetting("general");

  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
  const now = new Date();
  const decorated = coupons.map((coupon) => ({ coupon, status: couponStatus(coupon, now) }));
  const counts = new Map<string, number>();
  for (const entry of decorated) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);

  const query = params.q?.trim().toLowerCase() ?? "";
  const filtered = decorated.filter((entry) => {
    if (params.status && STATUSES.includes(params.status) && entry.status !== params.status) return false;
    if (query) {
      const haystack = `${entry.coupon.code} ${entry.coupon.description}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: AdminTableRow[] = paged.map(({ coupon, status }) => ({
    id: String(coupon._id),
    cells: {
      code: {
        label: coupon.code,
        href: `/admin/discounts/coupons/${coupon._id}`,
        sub: coupon.description || undefined,
      },
      value: { label: valueLabel(coupon, general.currencySymbol), sortValue: coupon.value },
      minimum: {
        label: coupon.minSubtotal ? `${general.currencySymbol} ${coupon.minSubtotal.toLocaleString("en-US")}` : "None",
        sortValue: coupon.minSubtotal,
      },
      usage: {
        label: coupon.usageLimit ? `${coupon.usageCount} / ${coupon.usageLimit}` : String(coupon.usageCount),
        sortValue: coupon.usageCount,
      },
      status: { label: labelize(status), tone: statusToneFor(status), sortValue: status },
      ends: {
        label: coupon.endsAt ? new Date(coupon.endsAt).toLocaleDateString("en-GB") : "No end date",
        sub: coupon.endsAt ? new Date(coupon.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : undefined,
        sortValue: coupon.endsAt ? new Date(coupon.endsAt).toISOString() : "9999",
      },
    },
  }));

  const hasFilters = Boolean(params.q || params.status);

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Enterable discount codes for checkout, including free shipping and product-specific offers."
        breadcrumbs={[{ label: "Sales" }, { label: "Coupons" }]}
        action={
          <Link
            href="/admin/discounts/coupons/new"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            New coupon
          </Link>
        }
      />
      <PageBody>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active", value: counts.get("active") ?? 0, href: "/admin/discounts/coupons?status=active" },
            { label: "Scheduled", value: counts.get("scheduled") ?? 0, href: "/admin/discounts/coupons?status=scheduled" },
            { label: "Paused", value: counts.get("paused") ?? 0, href: "/admin/discounts/coupons?status=paused" },
            { label: "Expired", value: counts.get("expired") ?? 0, href: "/admin/discounts/coupons?status=expired" },
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

        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/discounts/coupons">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[240px]"
              placeholder="Code or description"
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
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/admin/discounts/coupons"
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
            >
              Clear
            </Link>
          ) : null}
          <Link
            href="/admin/discounts/campaigns"
            className="ml-auto inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] font-medium text-ink hover:bg-tile"
          >
            Manage campaigns
          </Link>
        </form>

        <DataTable
          columns={[
            { key: "code", header: "Coupon" },
            { key: "value", header: "Discount" },
            { key: "minimum", header: "Minimum spend", align: "right" },
            { key: "usage", header: "Uses", align: "right" },
            { key: "status", header: "Status" },
            { key: "ends", header: "Ends" },
          ]}
          rows={rows}
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          emptyTitle={hasFilters ? "No coupons match these filters" : "No coupons yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search or status filter to see more coupons."
              : "Create a coupon code for checkout discounts, minimum-spend offers or free shipping."
          }
          defaultSort={{ key: "ends", desc: false }}
          bulkOptions={[{ value: "delete", label: "Delete" }]}
          bulkAction={bulkDeleteCouponsFormAction}
        />
      </PageBody>
    </>
  );
}
