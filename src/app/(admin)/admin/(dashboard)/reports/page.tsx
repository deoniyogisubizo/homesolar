import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { getOrderReportMetrics } from "@/lib/admin/report-data";
import { ORDER_STATUS_LABELS, REVENUE_STATUSES } from "@/lib/admin/order-status";

export const metadata = { title: "Reports" };

const PERIODS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

function resolvePeriod(value: string | undefined): Period {
  return PERIODS.some((period) => period.value === value) ? (value as Period) : "30d";
}

function periodStart(period: Period) {
  if (period === "all") return new Date(0);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function money(value: number, symbol: string) {
  return `${symbol} ${Math.round(value).toLocaleString("en-US")}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await guardPage("reports:read");
  const query = await searchParams;
  const period = resolvePeriod(query.period);
  const from = periodStart(period);
  const to = new Date();

  const [general, metrics] = await Promise.all([
    getSetting("general"),
    getOrderReportMetrics(from, to),
  ]);

  const cards = [
    {
      label: "Revenue",
      value: money(metrics.revenue, general.currencySymbol),
      note: "Confirmed, processing, out for delivery and delivered orders",
    },
    {
      label: "Orders",
      value: metrics.totalOrders.toLocaleString("en-US"),
      note: `${metrics.whatsappOrders.toLocaleString("en-US")} placed on WhatsApp`,
    },
    {
      label: "Confirmed conversion",
      value: `${metrics.conversion.toFixed(1)}%`,
      note: `${metrics.confirmedOrders.toLocaleString("en-US")} orders reached confirmation`,
    },
    {
      label: "Revenue per order",
      value: money(metrics.averageOrderValue, general.currencySymbol),
      note: `${metrics.revenueOrders.toLocaleString("en-US")} revenue-bearing orders`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="WhatsApp order pipeline, confirmation rate and confirmed revenue."
        breadcrumbs={[{ label: "Reports" }]}
        action={
          <div className="flex flex-wrap items-center gap-1 rounded-[6px] border border-admin-line bg-white p-1">
            {PERIODS.map((option) => (
              <Link
                key={option.value}
                href={`/admin/reports?period=${option.value}`}
                className={`rounded-[4px] px-3 py-1.5 text-[12px] font-medium ${
                  period === option.value
                    ? "bg-navy text-white"
                    : "text-admin-muted hover:text-ink"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        }
      />
      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <section
              key={card.label}
              className="rounded-[8px] border border-admin-line bg-white p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
                {card.label}
              </p>
              <p className="mt-2 text-[24px] font-semibold leading-none text-ink">{card.value}</p>
              <p className="mt-2 text-[11px] leading-5 text-admin-muted">{card.note}</p>
            </section>
          ))}
        </div>

        <section className="mt-4 rounded-[8px] border border-admin-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-line px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">Orders by status</h2>
            <span className="text-[11px] text-admin-muted">
              {metrics.totalOrders.toLocaleString("en-US")} orders in this period
            </span>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-admin-line text-left text-[10px] uppercase tracking-[0.1em] text-admin-muted">
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Orders</th>
                <th className="px-4 py-2.5 text-right font-semibold">Share</th>
                <th className="px-4 py-2.5 font-semibold">Revenue treatment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {metrics.statusCounts.map((entry) => {
                const share =
                  metrics.totalOrders > 0 ? (entry.count / metrics.totalOrders) * 100 : 0;
                const countsRevenue = REVENUE_STATUSES.includes(entry.status);
                return (
                  <tr key={entry.status}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/orders?status=${entry.status}`}
                        className="font-medium text-ink hover:text-brand"
                      >
                        {ORDER_STATUS_LABELS[entry.status]}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink">
                      {entry.count.toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-2.5 text-right text-admin-muted">
                      {share.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-admin-muted">
                      {countsRevenue ? "Included" : "Excluded"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="mt-4 text-[11px] leading-5 text-admin-muted">
          Revenue includes orders from confirmed through delivered. New, contacted and cancelled
          orders are excluded. Conversion counts orders that reached confirmation, including orders
          later cancelled after confirmation.
        </p>
      </PageBody>
    </>
  );
}
