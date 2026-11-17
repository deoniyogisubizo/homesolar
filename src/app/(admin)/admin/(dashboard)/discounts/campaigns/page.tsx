import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { getCampaignStatus } from "@/lib/pricing";
import { connectToDatabase } from "@/lib/mongodb";
import { Campaign } from "@/models/Campaign";

export const metadata = { title: "Campaigns" };

const STATUSES = ["active", "scheduled", "paused", "expired"];

function formatDate(value: Date) {
  return value.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function discountLabel(campaign: { discountType: "percent" | "fixed"; value: number }, symbol: string) {
  return campaign.discountType === "percent"
    ? `${campaign.value}% off`
    : `${symbol} ${campaign.value.toLocaleString("en-US")} off`;
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await guardPage("campaigns:read");
  const params = await searchParams;
  await connectToDatabase();
  const general = await getSetting("general");

  const campaigns = await Campaign.find({}).sort({ startsAt: -1 }).lean();
  const now = new Date();
  const decorated = campaigns.map((campaign) => ({
    campaign,
    status: getCampaignStatus(campaign, now),
  }));

  const counts = new Map<string, number>();
  for (const entry of decorated) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);

  const query = params.q?.trim().toLowerCase() ?? "";
  const filtered = decorated.filter((entry) => {
    if (params.status && STATUSES.includes(params.status) && entry.status !== params.status) return false;
    if (query) {
      const haystack = `${entry.campaign.name} ${entry.campaign.slug} ${entry.campaign.promoCode}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: AdminTableRow[] = paged.map(({ campaign, status }) => ({
    id: String(campaign._id),
    cells: {
      name: {
        label: campaign.name,
        href: `/admin/discounts/campaigns/${campaign._id}`,
        sub: campaign.promoCode ? `Code ${campaign.promoCode}` : campaign.description || undefined,
      },
      discount: { label: discountLabel(campaign, general.currencySymbol), sortValue: campaign.value },
      scope: {
        label:
          campaign.scope === "store"
            ? "Entire store"
            : campaign.scope === "products"
              ? `${campaign.productIds.length} product${campaign.productIds.length === 1 ? "" : "s"}`
              : `${campaign.categoryIds.length} categor${campaign.categoryIds.length === 1 ? "y" : "ies"}`,
        sortValue: campaign.scope,
      },
      status: {
        label: labelize(status),
        tone: statusToneFor(status),
        sortValue: status,
      },
      schedule: {
        label: `${formatDate(campaign.startsAt)} → ${formatDate(campaign.endsAt)}`,
        sortValue: campaign.startsAt.toISOString(),
      },
      priority: { label: String(campaign.priority), sortValue: campaign.priority },
      usage: {
        label: campaign.usageLimit ? `${campaign.usageCount} / ${campaign.usageLimit}` : String(campaign.usageCount),
        sortValue: campaign.usageCount,
      },
    },
  }));

  const hasFilters = Boolean(params.q || params.status);

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Scheduled storefront discounts. The active campaign drives the sale strip, promo card and product prices."
        breadcrumbs={[{ label: "Sales" }, { label: "Campaigns" }]}
        action={
          <Link
            href="/admin/discounts/campaigns/new"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            New campaign
          </Link>
        }
      />
      <PageBody>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active", value: counts.get("active") ?? 0, href: "/admin/discounts/campaigns?status=active" },
            { label: "Scheduled", value: counts.get("scheduled") ?? 0, href: "/admin/discounts/campaigns?status=scheduled" },
            { label: "Paused", value: counts.get("paused") ?? 0, href: "/admin/discounts/campaigns?status=paused" },
            { label: "Expired", value: counts.get("expired") ?? 0, href: "/admin/discounts/campaigns?status=expired" },
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

        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/discounts/campaigns">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[240px]"
              placeholder="Name, slug or promo code"
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
              href="/admin/discounts/campaigns"
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
            >
              Clear
            </Link>
          ) : null}
          <Link
            href="/admin/discounts/coupons"
            className="ml-auto inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] font-medium text-ink hover:bg-tile"
          >
            Manage coupons
          </Link>
        </form>

        <DataTable
          columns={[
            { key: "name", header: "Campaign" },
            { key: "discount", header: "Discount" },
            { key: "scope", header: "Applies to" },
            { key: "status", header: "Status" },
            { key: "schedule", header: "Schedule" },
            { key: "priority", header: "Priority", align: "right", hideByDefault: true },
            { key: "usage", header: "Promo uses", align: "right", hideByDefault: true },
          ]}
          rows={rows}
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          emptyTitle={hasFilters ? "No campaigns match these filters" : "No campaigns yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search or status filter to see more campaigns."
              : "Create a campaign to drive the storefront sale strip, promo card and discounted product prices."
          }
          defaultSort={{ key: "schedule", desc: true }}
        />
      </PageBody>
    </>
  );
}
