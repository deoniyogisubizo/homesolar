"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Search,
  Package,
  AlertTriangle,
  Users,
  DollarSign,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Star,
  Target,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableColumn, type AdminTableRow } from "@/components/admin/DataTable";

type TrendingProduct = {
  productId: string;
  name: string;
  score: number;
  category: string;
  stock: number;
};

type ZeroResultSearch = {
  query: string;
  count: number;
  lastSearched: string;
};

type AbandonmentStat = {
  total: number;
  recovered: number;
  recoveryRate: number;
  byStage: Record<string, number>;
  revenueRecovered: number;
};

type FraudQueueItem = {
  orderId: string;
  orderNumber: string;
  score: number;
  factors: Array<{ factor: string; points: number; description: string }>;
  customerName: string;
  customerPhone: string;
  total: number;
  createdAt: string;
  decision: string;
};

type RestockSuggestion = {
  productId: string;
  name: string;
  stock: number;
  velocity: number;
  daysLeft: number;
  suggestedQty: number;
  leadDays: number;
};

type SegmentStat = {
  segment: string;
  count: number;
  avgPoints: number;
  avgLifetimeValue: number;
};

type LoyaltyStat = {
  totalMembers: number;
  totalPoints: number;
  bronze: number;
  silver: number;
  gold: number;
  pointsRedeemed: number;
};

type ActivePromotion = {
  _id: string;
  name: string;
  type: string;
  value: number;
  usageCount: number;
  usageLimitTotal: number | null;
  active: boolean;
  endsAt: string | null;
};

function formatMoney(value: number): string {
  return `${value.toLocaleString("en-RW")} RWF`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-RW");
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function SegmentBadge({ segment }: { segment: string }) {
  const colors: Record<string, string> = {
    champions: "bg-purple-100 text-purple-700",
    loyal: "bg-blue-100 text-blue-700",
    potential: "bg-green-100 text-green-700",
    new: "bg-indigo-100 text-indigo-700",
    at_risk: "bg-orange-100 text-orange-700",
    hibernating: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colors[segment] ?? "bg-gray-100 text-gray-700"}`}>
      {segment.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const colors: Record<string, string> = {
    auto_approve: "bg-emerald-100 text-emerald-700",
    manual_review: "bg-amber-100 text-amber-700",
    hold: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colors[decision] ?? "bg-gray-100 text-gray-700"}`}>
      {decision.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function toTrendingRows(items: TrendingProduct[]): AdminTableRow[] {
  return items.map((item) => ({
    id: item.productId,
    cells: {
      name: { label: item.name },
      category: { label: item.category },
      score: { label: item.score.toFixed(1), sortValue: item.score },
      stock: { label: String(item.stock), sortValue: item.stock, tone: item.stock < 10 ? "danger" : "success" },
    },
  }));
}

function toZeroResultRows(items: ZeroResultSearch[]): AdminTableRow[] {
  return items.map((item) => ({
    id: item.query,
    cells: {
      query: { label: item.query },
      count: { label: String(item.count), sortValue: item.count },
      lastSearched: { label: new Date(item.lastSearched).toLocaleDateString(), sortValue: new Date(item.lastSearched).getTime() },
    },
  }));
}

function toFraudRows(items: FraudQueueItem[]): AdminTableRow[] {
  return items.map((item) => ({
    id: item.orderId,
    cells: {
      orderNumber: { label: item.orderNumber },
      score: { label: String(item.score), sortValue: item.score, tone: item.score >= 70 ? "danger" : item.score >= 40 ? "warning" : "success" },
      customerName: { label: item.customerName },
      total: { label: formatMoney(item.total), sortValue: item.total },
      decision: { label: item.decision, tone: item.decision === "hold" ? "danger" : item.decision === "manual_review" ? "warning" : "success" },
    },
  }));
}

function toRestockRows(items: RestockSuggestion[]): AdminTableRow[] {
  return items.map((item) => ({
    id: item.productId,
    cells: {
      name: { label: item.name },
      stock: { label: String(item.stock), sortValue: item.stock, tone: "danger" },
      velocity: { label: item.velocity.toFixed(2), sortValue: item.velocity },
      daysLeft: { label: item.daysLeft.toFixed(1), sortValue: item.daysLeft, tone: "warning" },
      suggestedQty: { label: String(item.suggestedQty), sortValue: item.suggestedQty, tone: "success" },
    },
  }));
}

function toPromotionRows(items: ActivePromotion[]): AdminTableRow[] {
  return items.map((item) => ({
    id: item._id,
    cells: {
      name: { label: item.name },
      type: { label: item.type.replace("_", " ") },
      value: { label: item.type === "percent" ? `${item.value}%` : formatMoney(item.value) },
      usage: { label: `${item.usageCount} / ${item.usageLimitTotal ?? "∞"}` },
      endsAt: { label: item.endsAt ? new Date(item.endsAt).toLocaleDateString() : "Ongoing" },
    },
  }));
}

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState<TrendingProduct[]>([]);
  const [zeroResults, setZeroResults] = useState<ZeroResultSearch[]>([]);
  const [abandonment, setAbandonment] = useState<AbandonmentStat | null>(null);
  const [fraudQueue, setFraudQueue] = useState<FraudQueueItem[]>([]);
  const [restock, setRestock] = useState<RestockSuggestion[]>([]);
  const [segments, setSegments] = useState<SegmentStat[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyStat | null>(null);
  const [promotions, setPromotions] = useState<ActivePromotion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendingRes, zeroRes, abandonmentRes, fraudRes, restockRes, segmentsRes, loyaltyRes, promosRes] = await Promise.all([
        fetch("/api/admin/intelligence/trending").then((r) => r.json()),
        fetch("/api/admin/intelligence/zero-results").then((r) => r.json()),
        fetch("/api/admin/intelligence/abandonment").then((r) => r.json()),
        fetch("/api/admin/fraud/queue").then((r) => r.json()),
        fetch("/api/admin/inventory/restock").then((r) => r.json()),
        fetch("/api/admin/intelligence/segments").then((r) => r.json()),
        fetch("/api/admin/intelligence/loyalty").then((r) => r.json()),
        fetch("/api/admin/intelligence/promotions").then((r) => r.json()),
      ]);

      if (trendingRes.ok) setTrending(trendingRes.products ?? []);
      if (zeroRes.ok) setZeroResults(zeroRes.queries ?? []);
      if (abandonmentRes.ok) setAbandonment(abandonmentRes);
      if (fraudRes.ok) setFraudQueue(fraudRes.queue ?? []);
      if (restockRes.ok) setRestock(restockRes.suggestions ?? []);
      if (segmentsRes.ok) setSegments(segmentsRes.segments ?? []);
      if (loyaltyRes.ok) setLoyalty(loyaltyRes);
      if (promosRes.ok) setPromotions(promosRes.promotions ?? []);
    } catch {
      setError("Failed to load intelligence data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Commerce Intelligence" description="AI-powered insights and automation metrics." breadcrumbs={[{ label: "Intelligence" }]} />
        <PageBody>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="min-h-[140px] animate-pulse rounded-[10px] border border-admin-line bg-white p-5" />
            ))}
          </div>
        </PageBody>
      </>
    );
  }

  const trendingColumns: AdminTableColumn[] = [
    { key: "name", header: "Product" },
    { key: "category", header: "Category" },
    { key: "score", header: "Score", align: "right" },
    { key: "stock", header: "Stock", align: "right" },
  ];

  const zeroColumns: AdminTableColumn[] = [
    { key: "query", header: "Query" },
    { key: "count", header: "Count", align: "right" },
    { key: "lastSearched", header: "Last Searched", align: "right" },
  ];

  const fraudColumns: AdminTableColumn[] = [
    { key: "orderNumber", header: "Order" },
    { key: "score", header: "Score", align: "right" },
    { key: "customerName", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
    { key: "decision", header: "Decision" },
  ];

  const restockColumns: AdminTableColumn[] = [
    { key: "name", header: "Product" },
    { key: "stock", header: "Stock", align: "right" },
    { key: "velocity", header: "Daily Velocity", align: "right" },
    { key: "daysLeft", header: "Days Left", align: "right" },
    { key: "suggestedQty", header: "Suggested Qty", align: "right" },
  ];

  const promoColumns: AdminTableColumn[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type" },
    { key: "value", header: "Value" },
    { key: "usage", header: "Usage" },
    { key: "endsAt", header: "Ends" },
  ];

  return (
    <>
      <PageHeader
        title="Commerce Intelligence"
        description="AI-powered insights and automation metrics."
        breadcrumbs={[{ label: "Intelligence" }]}
        action={
          <button onClick={fetchData} className="inline-flex items-center gap-2 h-9 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />
      <PageBody>
        {error && (
          <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-[13px] text-danger">{error}</div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Trending Products"
            value={trending.length}
            icon={<TrendingUp className="h-5 w-5" />}
            iconColor="text-brand"
            href="/admin/intelligence/trending"
          />
          <StatCard
            label="Zero-Result Searches"
            value={zeroResults.length}
            icon={<Search className="h-5 w-5" />}
            iconColor="text-orange-600"
            href="/admin/intelligence/search"
          />
          <StatCard
            label="Cart Recovery Rate"
            value={abandonment ? formatPercent(abandonment.recoveryRate) : "—"}
            icon={<Package className="h-5 w-5" />}
            iconColor="text-green-600"
            href="/admin/intelligence/abandonment"
          />
          <StatCard
            label="Fraud Review Queue"
            value={fraudQueue.length}
            icon={<Shield className="h-5 w-5" />}
            iconColor="text-red-600"
            href="/admin/intelligence/fraud"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[10px] border border-admin-line bg-white">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Top Trending Products</h2>
              <Link href="/admin/intelligence/trending" className="text-[12px] font-medium text-brand-deep hover:underline">
                View all
              </Link>
            </div>
            <div className="p-5">
              {trending.length === 0 ? (
                <p className="text-admin-muted text-sm">No trending data yet. Run the trending cron job.</p>
              ) : (
                <DataTable
                  columns={trendingColumns}
                  rows={toTrendingRows(trending.slice(0, 10))}
                  total={trending.length}
                  page={1}
                  pageSize={10}
                  emptyTitle="No trending products"
                  emptyDescription="Run the trending cron job to populate"
                />
              )}
            </div>
          </section>

          <section className="rounded-[10px] border border-admin-line bg-white">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Zero-Result Searches</h2>
              <Link href="/admin/intelligence/search" className="text-[12px] font-medium text-brand-deep hover:underline">
                View all
              </Link>
            </div>
            <div className="p-5">
              {zeroResults.length === 0 ? (
                <p className="text-admin-muted text-sm">No zero-result searches recorded.</p>
              ) : (
                <DataTable
                  columns={zeroColumns}
                  rows={toZeroResultRows(zeroResults.slice(0, 10))}
                  total={zeroResults.length}
                  page={1}
                  pageSize={10}
                  emptyTitle="No zero-result searches"
                  emptyDescription="Search queries with no results will appear here"
                />
              )}
            </div>
          </section>

          <section className="rounded-[10px] border border-admin-line bg-white xl:col-span-2">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Cart Abandonment Recovery</h2>
              <Link href="/admin/intelligence/abandonment" className="text-[12px] font-medium text-brand-deep hover:underline">
                View details
              </Link>
            </div>
            <div className="p-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {abandonment && [
                { label: "Total Abandoned", value: formatNumber(abandonment.total), icon: <Package className="h-5 w-5" />, color: "text-blue-600" },
                { label: "Recovered", value: formatNumber(abandonment.recovered), icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-600" },
                { label: "Recovery Rate", value: formatPercent(abandonment.recoveryRate), icon: <TrendingUp className="h-5 w-5" />, color: "text-emerald-600" },
                { label: "Revenue Recovered", value: formatMoney(abandonment.revenueRecovered), icon: <DollarSign className="h-5 w-5" />, color: "text-brand" },
              ].map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} iconColor={stat.color} />
              ))}
            </div>
          </section>

          <section className="rounded-[10px] border border-admin-line bg-white">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Fraud Review Queue</h2>
              <Link href="/admin/intelligence/fraud" className="text-[12px] font-medium text-brand-deep hover:underline">
                Review all
              </Link>
            </div>
            <div className="p-5">
              {fraudQueue.length === 0 ? (
                <p className="text-admin-muted text-sm">No orders pending review.</p>
              ) : (
                <DataTable
                  columns={fraudColumns}
                  rows={toFraudRows(fraudQueue.slice(0, 10))}
                  total={fraudQueue.length}
                  page={1}
                  pageSize={10}
                  emptyTitle="No fraud reviews"
                  emptyDescription="Orders flagged for review will appear here"
                />
              )}
            </div>
          </section>

          <section className="rounded-[10px] border border-admin-line bg-white">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Restock Suggestions</h2>
              <Link href="/admin/intelligence/inventory" className="text-[12px] font-medium text-brand-deep hover:underline">
                View all
              </Link>
            </div>
            <div className="p-5">
              {restock.length === 0 ? (
                <p className="text-admin-muted text-sm">No restock alerts.</p>
              ) : (
                <DataTable
                  columns={restockColumns}
                  rows={toRestockRows(restock.slice(0, 10))}
                  total={restock.length}
                  page={1}
                  pageSize={10}
                  emptyTitle="No restock alerts"
                  emptyDescription="Products needing restock will appear here"
                />
              )}
            </div>
          </section>

          <section className="rounded-[10px] border border-admin-line bg-white xl:col-span-2">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Customer Segments (RFM)</h2>
            </div>
            <div className="p-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {segments.map((seg) => (
                <div key={seg.segment} className="rounded-[8px] border border-admin-line bg-tile p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SegmentBadge segment={seg.segment} />
                  </div>
                  <p className="text-[22px] font-bold text-ink">{formatNumber(seg.count)}</p>
                  <p className="text-[11px] text-admin-muted">Avg points: {formatNumber(seg.avgPoints)} | Avg LTV: {formatMoney(seg.avgLifetimeValue)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[10px] border border-admin-line bg-white">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Loyalty Program</h2>
            </div>
            <div className="p-5 grid gap-3 sm:grid-cols-2">
              {loyalty && [
                { label: "Total Members", value: formatNumber(loyalty.totalMembers), icon: <Users className="h-5 w-5" />, color: "text-blue-600" },
                { label: "Total Points", value: formatNumber(loyalty.totalPoints), icon: <Star className="h-5 w-5" />, color: "text-amber-600" },
                { label: "Bronze", value: formatNumber(loyalty.bronze), icon: <Circle className="h-5 w-5" />, color: "text-orange-600" },
                { label: "Silver", value: formatNumber(loyalty.silver), icon: <Circle className="h-5 w-5" />, color: "text-gray-400" },
                { label: "Gold", value: formatNumber(loyalty.gold), icon: <Circle className="h-5 w-5" />, color: "text-yellow-500" },
                { label: "Points Redeemed", value: formatNumber(loyalty.pointsRedeemed), icon: <Target className="h-5 w-5" />, color: "text-green-600" },
              ].map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} iconColor={stat.color} />
              ))}
            </div>
          </section>

          <section className="rounded-[10px] border border-admin-line bg-white">
            <div className="border-b border-admin-line px-5 py-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">Active Promotions</h2>
              <Link href="/admin/discounts" className="text-[12px] font-medium text-brand-deep hover:underline">
                Manage
              </Link>
            </div>
            <div className="p-5">
              {promotions.length === 0 ? (
                <p className="text-admin-muted text-sm">No active promotions.</p>
              ) : (
                <DataTable
                  columns={promoColumns}
                  rows={toPromotionRows(promotions.slice(0, 10))}
                  total={promotions.length}
                  page={1}
                  pageSize={10}
                  emptyTitle="No active promotions"
                  emptyDescription="Create promotions in the Discounts section"
                />
              )}
            </div>
          </section>
        </div>
      </PageBody>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconColor,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-[8px] border border-admin-line bg-white p-4 hover:border-brand/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">{label}</p>
          <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{value}</p>
        </div>
        <span className={`shrink-0 rounded-[8px] bg-brand/10 p-2 ${iconColor}`}>{icon}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}