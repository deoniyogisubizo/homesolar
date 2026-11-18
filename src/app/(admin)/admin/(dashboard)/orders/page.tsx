import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { followUpCutoff } from "@/lib/admin/follow-up";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin/order-status";
import { bulkDeleteOrdersFormAction, deleteOrderAction } from "@/app/(admin)/admin/(dashboard)/orders/actions";

export const metadata = { title: "Orders" };

function money(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

function relativeTime(date: Date | undefined) {
  if (!date) return "—";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    payment?: string;
    dateFrom?: string;
    dateTo?: string;
    minTotal?: string;
    maxTotal?: string;
    followUp?: string;
    page?: string;
    size?: string;
  }>;
}) {
  await guardPage("orders:read");
  const params = await searchParams;
  await connectToDatabase();
  const [general, whatsappOrder] = await Promise.all([
    getSetting("general"),
    getSetting("whatsappOrder"),
  ]);

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const followUp = params.followUp === "1";
  const followUpBefore = followUpCutoff(whatsappOrder.followUpMinutes);

  const filter: Record<string, unknown> = {};
  if (params.status && ORDER_STATUSES.includes(params.status as OrderStatus)) {
    filter.status = params.status;
  }
  if (params.payment && PAYMENT_STATUSES.includes(params.payment as PaymentStatus)) {
    filter.paymentStatus = params.payment;
  }
  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) (filter.createdAt as Record<string, Date>).$gte = new Date(params.dateFrom);
    if (params.dateTo) (filter.createdAt as Record<string, Date>).$lte = new Date(params.dateTo);
  }
  if (params.minTotal || params.maxTotal) {
    filter.total = {};
    if (params.minTotal) (filter.total as Record<string, number>).$gte = Number(params.minTotal);
    if (params.maxTotal) (filter.total as Record<string, number>).$lte = Number(params.maxTotal);
  }
  if (followUp) {
    filter.status = "new";
    filter.createdAt = { ...(filter.createdAt as Record<string, Date> | undefined), $lte: followUpBefore };
  }
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { orderNumber: pattern },
      { "customer.name": pattern },
      { "customer.email": pattern },
      { "customer.phone": pattern },
      { couponCode: pattern },
    ];
  }

  const [orders, total, summary, followUpCount] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: string; count: number }>([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ status: "new", createdAt: { $lte: followUpBefore } }),
  ]);

  const summaryMap = new Map(summary.map((entry) => [entry._id, entry.count]));

  const hasFilters = Boolean(
    params.q ||
      params.status ||
      params.payment ||
      params.dateFrom ||
      params.dateTo ||
      params.minTotal ||
      params.maxTotal ||
      followUp,
  );

  const rows: AdminTableRow[] = orders.map((order) => ({
    id: String(order._id),
    cells: {
      orderNumber: {
        label: order.orderNumber,
        href: `/admin/orders/${order._id}`,
        sub: order.couponCode ? `Code: ${order.couponCode}` : undefined,
      },
      customer: {
        label: order.customer.name,
        sub: order.customer.phone,
      },
      channel: {
        label: order.channel === "whatsapp" ? "WhatsApp" : labelize(order.channel),
        tone: order.channel === "whatsapp" ? "info" : "neutral",
        sortValue: order.channel,
      },
      items: {
        label: `${order.items.length} item${order.items.length === 1 ? "" : "s"}`,
        sortValue: order.items.length,
      },
      total: {
        label: money(order.total, general.currencySymbol),
        sortValue: order.total,
      },
      status: {
        label: labelize(order.status),
        tone: statusToneFor(order.status),
        sortValue: order.status,
      },
      payment: {
        label: labelize(order.paymentStatus),
        tone: statusToneFor(order.paymentStatus),
        sortValue: order.paymentStatus,
      },
      method: { label: labelize(order.paymentMethod) },
      clicks: {
        label: String(order.whatsapp.clickCount),
        sortValue: order.whatsapp.clickCount,
      },
      created: {
        label: relativeTime(order.createdAt),
        title: order.createdAt?.toLocaleString("en-GB") ?? undefined,
        sortValue: order.createdAt?.toISOString() ?? "",
      },
    },
  }));

  const cards = [
    { label: "Total", value: Array.from(summaryMap.values()).reduce((sum, value) => sum + value, 0) },
    {
      label: "New",
      value: summaryMap.get("new") ?? 0,
      href: "/admin/orders?status=new",
    },
    {
      label: "Needs follow-up",
      value: followUpCount,
      href: "/admin/orders?followUp=1",
    },
    {
      label: "In progress",
      value:
        (summaryMap.get("confirmed") ?? 0) +
        (summaryMap.get("processing") ?? 0) +
        (summaryMap.get("out_for_delivery") ?? 0),
    },
    {
      label: "Delivered",
      value: summaryMap.get("delivered") ?? 0,
      href: "/admin/orders?status=delivered",
    },
    {
      label: "Cancelled",
      value: summaryMap.get("cancelled") ?? 0,
      href: "/admin/orders?status=cancelled",
    },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        description="WhatsApp orders with contact, fulfilment and payment tracking."
        breadcrumbs={[{ label: "Sales" }, { label: "Orders" }]}
      />
      <PageBody>
        <div className="mb-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href ?? "/admin/orders"}
              className="rounded-[8px] border border-admin-line bg-white px-4 py-3 hover:border-brand/40"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
                {card.label}
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{card.value}</p>
            </Link>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/admin/orders?followUp=1"
            className={`inline-flex h-8 items-center rounded-[6px] border px-3 text-[12px] font-medium ${
              followUp
                ? "border-navy bg-navy text-white"
                : "border-admin-line bg-white text-ink hover:bg-tile"
            }`}
          >
            Needs follow-up
          </Link>
          <span className="text-[11px] text-admin-muted">
            New for more than {whatsappOrder.followUpMinutes} minutes
          </span>
        </div>

        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/orders">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[260px]"
              placeholder="Order number, name, email, phone, coupon"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="admin-field w-[160px]"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelize(status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="payment">
              Payment
            </label>
            <select
              id="payment"
              name="payment"
              defaultValue={params.payment ?? ""}
              className="admin-field w-[160px]"
            >
              <option value="">All payment</option>
              {PAYMENT_STATUSES.map((payment) => (
                <option key={payment} value={payment}>
                  {labelize(payment)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="dateFrom">
              From
            </label>
            <input
              id="dateFrom"
              name="dateFrom"
              type="date"
              defaultValue={params.dateFrom ?? ""}
              className="admin-field w-[140px]"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="dateTo">
              To
            </label>
            <input
              id="dateTo"
              name="dateTo"
              type="date"
              defaultValue={params.dateTo ?? ""}
              className="admin-field w-[140px]"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="minTotal">
              Min total
            </label>
            <input
              id="minTotal"
              name="minTotal"
              type="number"
              min="0"
              step="0.01"
              defaultValue={params.minTotal ?? ""}
              className="admin-field w-[110px]"
              placeholder="Min"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="maxTotal">
              Max total
            </label>
            <input
              id="maxTotal"
              name="maxTotal"
              type="number"
              min="0"
              step="0.01"
              defaultValue={params.maxTotal ?? ""}
              className="admin-field w-[110px]"
              placeholder="Max"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/admin/orders"
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable
          columns={[
            { key: "orderNumber", header: "Order" },
            { key: "created", header: "Placed" },
            { key: "customer", header: "Customer" },
            { key: "channel", header: "Channel" },
            { key: "items", header: "Items", align: "right", hideByDefault: true },
            { key: "total", header: "Total", align: "right" },
            { key: "status", header: "Status" },
            { key: "payment", header: "Payment" },
            { key: "method", header: "Method", hideByDefault: true },
            { key: "clicks", header: "Chat clicks", align: "right", hideByDefault: true },
          ]}
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          emptyTitle={hasFilters ? "No orders match these filters" : "No orders yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search, status, payment or date filters to see more orders."
              : "Orders placed on the storefront will appear here automatically."
          }
          defaultSort={{ key: "created", desc: true }}
          bulkOptions={[{ value: "delete", label: "Delete" }]}
          bulkAction={bulkDeleteOrdersFormAction}
          rowActions={[
            { label: "Edit", kind: "edit", hrefPrefix: "/admin/orders" },
            { label: "Delete", kind: "delete", onDeleteAction: deleteOrderAction },
          ]}
        />
      </PageBody>
    </>
  );
}
