"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Package,
  RefreshCw,
  X,
} from "lucide-react";
import { getCustomerOrders, cancelOrder, reorderAction } from "@/app/(auth)/actions/dashboard-actions";
import { canTransition, type OrderStatus } from "@/lib/admin/order-status";

const STATUS_OPTIONS = [
  { value: "all", label: "All orders" },
  { value: "new", label: "Order received" },
  { value: "contacted", label: "Contacted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_TONE: Record<OrderStatus, string> = {
  new: "border-warning/20 bg-warning/10 text-warning",
  contacted: "border-line bg-tile text-ink",
  confirmed: "border-info/20 bg-info/10 text-info",
  processing: "border-brand/20 bg-brand/10 text-brand",
  out_for_delivery: "border-info/20 bg-info/10 text-info",
  delivered: "border-success/20 bg-success/10 text-success",
  cancelled: "border-danger/20 bg-danger/10 text-danger",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Order received",
  contacted: "Contacted",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_TONE: Record<string, string> = {
  unpaid: "border-warning/20 bg-warning/10 text-warning",
  paid: "border-success/20 bg-success/10 text-success",
  refunded: "border-info/20 bg-info/10 text-info",
};

type OrdersData = Extract<
  Awaited<ReturnType<typeof getCustomerOrders>>,
  { ok: true }
>["data"];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium capitalize ${
        PAYMENT_TONE[status] ?? PAYMENT_TONE.unpaid
      }`}
    >
      {status}
    </span>
  );
}

export default function OrdersClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const status = searchParams.get("status") ?? "all";
  const pageSize = 10;

  const [pending, startTransition] = useTransition();
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = (pageNumber: number) => {
    startTransition(async () => {
      const response = await getCustomerOrders({ page: pageNumber, pageSize, status });
      if (response.ok) {
        setOrdersData(response.data);
      } else {
        setError(response.error);
      }
    });
  };

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const response = await getCustomerOrders({ page, pageSize, status });
      if (cancelled) return;
      if (response.ok) {
        setOrdersData(response.data);
      } else {
        setError(response.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  const handleCancel = async (orderId: string) => {
    if (!window.confirm("Cancel this order? Reserved stock will be released.")) return;
    const response = await cancelOrder(orderId);
    if (response.ok) {
      loadOrders(page);
    } else {
      window.alert(response.error);
    }
  };

  const handleReorder = async (orderId: string) => {
    const response = await reorderAction(orderId);
    if (response.ok) {
      router.push(response.data.cartUrl);
    } else {
      window.alert(response.error);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ink">My orders</h1>
          <p className="mt-1 text-muted">Track deliveries and open the WhatsApp thread for any order.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="rounded-[12px] border border-line bg-white">
        <div className="border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-muted" htmlFor="order-status-filter">
              Filter by status
            </label>
            <select
              id="order-status-filter"
              value={status}
              onChange={(event) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("status", event.target.value);
                params.delete("page");
                router.push(`/account/orders?${params.toString()}`);
              }}
              className="rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {ordersData?.orders.length ? (
          <div className="divide-y divide-line">
            {ordersData.orders.map((order) => {
              const orderStatus = order.status as OrderStatus;
              return (
                <div key={order.id} className="p-4 transition-colors hover:bg-tile/50">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-tile">
                        <Package className="h-6 w-6 text-muted" />
                      </div>
                      <div>
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="font-medium text-ink transition-colors hover:text-brand"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                          {order.formattedTotal}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={orderStatus} />
                      <PaymentBadge status={order.paymentStatus} />
                      <span className="text-sm text-muted">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="inline-flex items-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-tile"
                    >
                      <Eye className="h-4 w-4" />
                      View details
                    </Link>
                    <Link
                      href={`/account/orders/${order.id}/invoice`}
                      className="inline-flex items-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-tile"
                    >
                      <FileText className="h-4 w-4" />
                      Invoice
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleReorder(order.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-tile disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Buy again
                    </button>
                    {canTransition(orderStatus, "cancelled") ? (
                      <button
                        type="button"
                        onClick={() => void handleCancel(order.id)}
                        disabled={pending}
                        className="inline-flex items-center gap-2 rounded-[6px] border border-danger/30 bg-danger-pale px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted" />
            <h3 className="mb-2 text-[18px] font-semibold text-ink">No orders yet</h3>
            <p className="mb-6 text-muted">
              When you place an order on WhatsApp, it will appear here.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
            >
              <Package className="h-4 w-4" />
              Start shopping
            </Link>
          </div>
        )}

        {ordersData && ordersData.totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2 border-t border-line p-4">
            <button
              type="button"
              onClick={() => loadOrders(Math.max(1, ordersData.page - 1))}
              disabled={ordersData.page === 1 || pending}
              className="inline-flex items-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-tile disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-muted">
              Page {ordersData.page} of {ordersData.totalPages}
            </span>
            <button
              type="button"
              onClick={() => loadOrders(Math.min(ordersData.totalPages, ordersData.page + 1))}
              disabled={ordersData.page === ordersData.totalPages || pending}
              className="inline-flex items-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-tile disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
