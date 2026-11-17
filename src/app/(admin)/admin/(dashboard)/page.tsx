"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/admin/order-status";

type KPI = {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  iconColor: string;
  href: string;
};

type Period = "today" | "7d" | "30d" | "custom";

function formatMoney(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function KpiCard({ kpi, featured }: { kpi: KPI; featured: boolean }) {
  const positive = kpi.change >= 0;
  const changePercent = `${positive ? "+" : ""}${kpi.change.toFixed(1)}%`;

  if (featured) {
    return (
      <Link
        href={kpi.href}
        aria-label={`${kpi.label}: ${kpi.value}. ${changePercent} ${kpi.changeLabel}. Open details.`}
        className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-[12px] border border-navy bg-navy p-6 text-white shadow-[0_16px_34px_rgba(1,38,78,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_45px_rgba(1,38,78,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:col-span-2 xl:row-span-2 xl:min-h-0"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10 bg-white/5"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-brand/15 blur-2xl"
        />

        <div className="relative flex h-full flex-col justify-between gap-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px]! font-bold uppercase tracking-[0.18em] text-white/60">
                {kpi.label}
              </p>
              <p className="mt-4 break-words text-[36px]! font-bold leading-[1.05]! tracking-[-0.02em] sm:text-[44px]!">
                {kpi.value}
              </p>
            </div>
            <span className="shrink-0 rounded-[10px] bg-white/10 p-3 text-white [&_svg]:h-7 [&_svg]:w-7">
              {kpi.icon}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[14px] font-bold ${
                  positive ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"
                }`}
              >
                {positive ? (
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
                ) : (
                  <ArrowDownRight className="h-4 w-4" strokeWidth={2.4} />
                )}
                {changePercent}
              </span>
              <span className="text-[13px] font-medium text-white/65">{kpi.changeLabel}</span>
            </div>

            <span className="mt-6 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white/80">
              View details
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={kpi.href}
      aria-label={`${kpi.label}: ${kpi.value}. ${changePercent} ${kpi.changeLabel}. Open details.`}
      className="group flex flex-col justify-between rounded-[10px] border border-admin-line bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_14px_30px_rgba(1,38,78,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px]! font-bold uppercase tracking-[0.12em] text-admin-muted">
            {kpi.label}
          </p>
          <p className="mt-2.5 break-words text-[29px]! font-bold leading-none! tracking-[-0.02em] text-ink sm:text-[31px]!">
            {kpi.value}
          </p>
        </div>
        <span className={`shrink-0 rounded-[8px] bg-brand/10 p-2.5 ${kpi.iconColor}`}>
          {kpi.icon}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`text-[14px] font-bold ${
              kpi.change > 0
                ? "text-green-600"
                : kpi.change < 0
                  ? "text-red-600"
                  : "text-admin-muted"
            }`}
          >
            {changePercent}
          </span>
          <span className="text-[12px] font-medium text-admin-muted">{kpi.changeLabel}</span>
        </div>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-admin-muted opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [statusCounts, setStatusCounts] = useState<Array<{ status: OrderStatus; count: number }>>([]);
  const [inventory, setInventory] = useState({
    units: 0,
    value: 0,
    low: 0,
    out: 0,
  });
  const [currencySymbol, setCurrencySymbol] = useState<string>("RWF");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period });
        if (period === "custom" && customFrom && customTo) {
          params.set("from", customFrom);
          params.set("to", customTo);
        }
        const response = await fetch(`/api/admin/overview?${params.toString()}`);
        const data = await response.json();
        if (data.ok) {
          setLoadError(false);
          setStatusCounts(data.ordersByStatus ?? []);
          setCurrencySymbol(data.currencySymbol ?? "RWF");
          setInventory({
            units: Number(data.stockUnits ?? 0),
            value: Number(data.stockValue ?? 0),
            low: Number(data.lowStockCount ?? 0),
            out: Number(data.outOfStockCount ?? 0),
          });
          setKpis([
            {
              label: "Revenue",
              value: formatMoney(data.revenue, data.currencySymbol),
              change: data.revenueChange,
              changeLabel: "vs previous period",
              icon: <TrendingUp className="h-5 w-5" />,
              iconColor: "text-brand",
              href: "/admin/orders",
            },
            {
              label: "Orders",
              value: formatNumber(data.orders),
              change: data.ordersChange,
              changeLabel: "vs previous period",
              icon: <Package className="h-5 w-5" />,
              iconColor: "text-blue-600",
              href: "/admin/orders",
            },
            {
              label: "Avg. order value",
              value: formatMoney(data.avgOrderValue, data.currencySymbol),
              change: data.aovChange,
              changeLabel: "vs previous period",
              icon: <TrendingUp className="h-5 w-5" />,
              iconColor: "text-green-600",
              href: "/admin/orders",
            },
            {
              label: "Confirmed conversion",
              value: `${Number(data.conversion ?? 0).toFixed(1)}%`,
              change: 0,
              changeLabel: "Orders reaching confirmation",
              icon: <CheckCircle2 className="h-5 w-5" />,
              iconColor: "text-green-600",
              href: "/admin/reports",
            },
            {
              label: "New customers",
              value: formatNumber(data.newCustomers),
              change: data.customersChange,
              changeLabel: "vs previous period",
              icon: <Users className="h-5 w-5" />,
              iconColor: "text-purple-600",
              href: "/admin/customers",
            },
            {
              label: "Stock units",
              value: formatNumber(data.stockUnits),
              change: 0,
              changeLabel: "units on hand",
              icon: <Box className="h-5 w-5" />,
              iconColor: "text-indigo-600",
              href: "/admin/inventory",
            },
            {
              label: "Stock value",
              value: formatMoney(data.stockValue, data.currencySymbol),
              change: 0,
              changeLabel: "inventory value",
              icon: <BarChart2 className="h-5 w-5" />,
              iconColor: "text-emerald-600",
              href: "/admin/inventory",
            },
            {
              label: "Understock products",
              value: formatNumber(data.lowStockCount),
              change: 0,
              changeLabel: "out of stock or under 10 units",
              icon: <AlertTriangle className="h-5 w-5" />,
              iconColor: "text-red-600",
              href: "/admin/inventory?level=low",
            },
          ]);
        }
      } catch {
        setKpis([]);
        setStatusCounts([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, customFrom, customTo]);

  const changePeriod = (delta: number) => {
    if (period === "custom") return;
    const periods: Period[] = ["today", "7d", "30d"];
    const idx = periods.indexOf(period);
    const newIdx = Math.max(0, Math.min(periods.length - 1, idx + delta));
    setPeriod(periods[newIdx]);
  };

  const isCustom = period === "custom";

  return (
    <>
      <PageHeader
        title="Overview"
        description="Key metrics and store performance at a glance."
        breadcrumbs={[{ label: "Overview" }]}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => changePeriod(-1)}
              disabled={period === "today"}
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1 rounded-[6px] border border-admin-line bg-white px-3">
              <button
                onClick={() => setPeriod("today")}
                className={`px-2 py-1 rounded-[4px] text-[12px] font-medium ${period === "today" ? "bg-navy text-white" : "text-admin-muted hover:text-ink"}`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod("7d")}
                className={`px-2 py-1 rounded-[4px] text-[12px] font-medium ${period === "7d" ? "bg-navy text-white" : "text-admin-muted hover:text-ink"}`}
              >
                7 days
              </button>
              <button
                onClick={() => setPeriod("30d")}
                className={`px-2 py-1 rounded-[4px] text-[12px] font-medium ${period === "30d" ? "bg-navy text-white" : "text-admin-muted hover:text-ink"}`}
              >
                30 days
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`px-2 py-1 rounded-[4px] text-[12px] font-medium ${period === "custom" ? "bg-navy text-white" : "text-admin-muted hover:text-ink"}`}
              >
                Custom
              </button>
            </div>
            <button
              onClick={() => changePeriod(1)}
              disabled={period === "30d" || period === "custom"}
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {isCustom && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="admin-field w-[140px]"
                />
                <span className="text-admin-muted">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="admin-field w-[140px]"
                />
              </div>
            )}
          </div>
        }
      />
      <PageBody>
        {loadError ? (
          <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-[13px] text-danger">
            Overview metrics could not be loaded. Refresh the page to try again.
          </div>
        ) : null}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="min-h-[280px] animate-pulse rounded-[12px] border border-admin-line bg-white md:col-span-2 xl:row-span-2 xl:min-h-0" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[140px] animate-pulse rounded-[10px] border border-admin-line bg-white p-5"
              >
                <div className="mb-4 h-4 w-24 rounded bg-admin-line/60" />
                <div className="h-9 w-32 rounded bg-admin-line/60" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:auto-rows-fr xl:grid-cols-4">
            {kpis.map((kpi, index) => (
              <KpiCard key={kpi.label} kpi={kpi} featured={index === 0} />
            ))}
          </div>
        )}

        <section className="mt-6 rounded-[10px] border border-admin-line bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-ink">Inventory</h2>
              <p className="mt-1 text-[12px] text-admin-muted">Stock levels across the catalog.</p>
            </div>
            <Link
              href="/admin/inventory"
              className="text-[13px] font-semibold text-brand-deep hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Units on hand", value: inventory.units.toLocaleString("en-US"), href: "/admin/inventory" },
              { label: "Stock value", value: formatMoney(inventory.value, currencySymbol), href: "/admin/inventory" },
              { label: "Understock", value: String(inventory.low), href: "/admin/inventory?level=low" },
              { label: "Out of stock", value: String(inventory.out), href: "/admin/inventory?level=out" },
            ].map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="rounded-[8px] border border-admin-line bg-tile p-4 hover:border-brand/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">{card.label}</p>
                <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{card.value}</p>
              </Link>
            ))}
          </div>
        </section>

        {statusCounts.length ? (
          <section className="mt-6 rounded-[10px] border border-admin-line bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-ink">Order pipeline</h2>
                <p className="mt-1 text-[12px] text-admin-muted">
                  WhatsApp orders by status for the selected period.
                </p>
              </div>
              <Link
                href="/admin/reports"
                className="text-[13px] font-semibold text-brand-deep hover:underline"
              >
                Open reports
              </Link>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-7">
              {statusCounts.map((entry) => (
                <Link
                  key={entry.status}
                  href={`/admin/orders?status=${entry.status}`}
                  className="rounded-[6px] border border-admin-line bg-tile px-3 py-2.5 hover:border-brand/40"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-admin-muted">
                    {ORDER_STATUS_LABELS[entry.status] ?? entry.status}
                  </p>
                  <p className="mt-1 text-[20px] font-bold leading-none text-ink">{entry.count}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-[10px] border border-admin-line bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-ink">Alerts</h2>
            <Link
              href="/admin/inventory?level=low"
              className="text-[13px] font-semibold text-brand-deep hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[6px] border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="text-[14px] font-semibold text-ink">Understock products</span>
              </div>
              <p className="mt-1 text-[13px] text-admin-muted">
                {kpis.find((kpi) => kpi.label === "Understock products")?.value ?? "—"} products below threshold.{" "}
                <Link href="/admin/inventory?level=low" className="font-semibold text-brand-deep hover:underline">
                  Review inventory
                </Link>
              </p>
            </div>
            <div className="rounded-[6px] border border-brand/30 bg-brand/5 p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-brand-deep" />
                <span className="text-[14px] font-semibold text-ink">New orders</span>
              </div>
              <p className="mt-1 text-[13px] text-admin-muted">
                WhatsApp orders awaiting first contact.{" "}
                <Link href="/admin/orders?status=new" className="font-semibold text-brand-deep hover:underline">
                  Review orders
                </Link>
              </p>
            </div>
            <div className="rounded-[6px] border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-success" />
                <span className="text-[14px] font-semibold text-ink">Unread messages</span>
              </div>
              <p className="mt-1 text-[13px] text-admin-muted">
                New contact form submissions.{" "}
                <Link href="/admin/messages" className="font-semibold text-brand-deep hover:underline">
                  Open inbox
                </Link>
              </p>
            </div>
            <div className="rounded-[6px] border border-brand/30 bg-brand/5 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-deep" />
                <span className="text-[14px] font-semibold text-ink">Pending reviews</span>
              </div>
              <p className="mt-1 text-[13px] text-admin-muted">
                Reviews awaiting moderation.{" "}
                <Link href="/admin/reviews?status=pending" className="font-semibold text-brand-deep hover:underline">
                  Moderate reviews
                </Link>
              </p>
            </div>
          </div>
        </section>
      </PageBody>
    </>
  );
}