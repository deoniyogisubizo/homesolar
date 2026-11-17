import Link from "next/link";
import { ChevronLeft, MapPin, Package, Truck } from "lucide-react";
import { getOrderDetails } from "@/app/(auth)/actions/dashboard-actions";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { AccountLayout } from "@/components/account/AccountLayout";
import { canTransition, type OrderStatus } from "@/lib/admin/order-status";
import OrderActions from "./OrderActions";

export const instant = false;

export const metadata = { title: "Order details" };

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
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

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderResponse = await getOrderDetails(id);

  if (!orderResponse.ok) {
    return (
      <AccountLayout>
        <div className="mx-auto max-w-3xl py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted" />
          <h2 className="mb-2 text-[20px] font-semibold text-ink">Order not found</h2>
          <p className="mb-6 text-muted">{orderResponse.error}</p>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
          >
            Back to orders
          </Link>
        </div>
      </AccountLayout>
    );
  }

  const { order, currencySymbol } = orderResponse.data;
  const status = order.status as OrderStatus;
  const canCancel = canTransition(status, "cancelled");

  return (
    <AccountLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/account/orders"
            className="rounded p-2 text-muted transition-colors hover:bg-tile"
            aria-label="Back to orders"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-[24px] font-bold text-ink">{order.orderNumber}</h1>
            <p className="text-muted">{formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-[12px] border border-line bg-white p-6">
              <h2 className="mb-4 text-[18px] font-semibold text-ink">Order timeline</h2>
              <OrderTimeline
                status={status}
                history={order.statusHistory.map((entry) => ({
                  status: entry.status as OrderStatus,
                  at: entry.at,
                  by: entry.by,
                  note: entry.note,
                }))}
              />
            </div>

            <div className="rounded-[12px] border border-line bg-white p-6">
              <h2 className="mb-4 text-[18px] font-semibold text-ink">Items</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={`${item.productId}-${item.variantSku ?? item.id}`} className="flex gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-[8px] bg-tile">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${item.slug}`}
                        className="font-medium text-ink transition-colors hover:text-brand"
                      >
                        {item.name}
                      </Link>
                      {item.color || item.size ? (
                        <p className="text-sm text-muted">
                          {[item.color, item.size].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      {item.variantSku ? (
                        <p className="text-sm text-muted">SKU: {item.variantSku}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-muted">
                        Qty: {item.quantity} × {currencySymbol} {item.unitPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-ink">
                        {currencySymbol} {item.lineTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[12px] border border-line bg-white p-6">
              <h2 className="mb-4 text-[18px] font-semibold text-ink">Delivery address</h2>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-muted" />
                <div>
                  <p className="font-medium text-ink">{order.delivery.line1}</p>
                  <p className="text-muted">
                    {[order.delivery.sector, order.delivery.district, order.delivery.city]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {order.delivery.notes ? (
                    <p className="mt-1 text-sm text-muted">{order.delivery.notes}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {order.trackingNumber ? (
              <div className="rounded-[12px] border border-line bg-white p-6">
                <h2 className="mb-4 text-[18px] font-semibold text-ink">Tracking</h2>
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-muted">Courier</p>
                    <p className="font-medium text-ink">{order.courier || "Assigned"}</p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-muted">Tracking number</p>
                    <p className="font-mono font-medium text-ink">{order.trackingNumber}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[12px] border border-line bg-white p-6">
              <h2 className="mb-4 text-[18px] font-semibold text-ink">Order summary</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-medium text-ink">{order.formattedSubtotal}</dd>
                </div>
                {order.campaignDiscount > 0 ? (
                  <div className="flex justify-between text-success">
                    <dt>Campaign discount</dt>
                    <dd>
                      −{currencySymbol} {order.campaignDiscount.toLocaleString()}
                    </dd>
                  </div>
                ) : null}
                {order.couponDiscount > 0 ? (
                  <div className="flex justify-between text-success">
                    <dt>Coupon {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                    <dd>
                      −{currencySymbol} {order.couponDiscount.toLocaleString()}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd className="font-medium text-ink">
                    {order.shipping > 0
                      ? `${currencySymbol} ${order.shipping.toLocaleString()}`
                      : "Free"}
                  </dd>
                </div>
                {order.tax > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted">Tax</dt>
                    <dd className="font-medium text-ink">
                      {currencySymbol} {order.tax.toLocaleString()}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-line pt-3">
                  <dt className="font-semibold text-ink">Total</dt>
                  <dd className="text-[18px] font-semibold text-ink">{order.formattedTotal}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm capitalize text-muted">
                  Payment:{" "}
                  {order.paymentMethod
                    ? order.paymentMethod.replaceAll("_", " ")
                    : "Arranged on WhatsApp"}
                </p>
                <p className="mt-1 text-sm capitalize text-muted">{order.paymentStatus}</p>
              </div>
            </div>

            <div className="rounded-[12px] border border-line bg-white p-6">
              <h2 className="mb-4 text-[18px] font-semibold text-ink">Actions</h2>
              <OrderActions
                orderId={order.id}
                canCancel={canCancel}
                hasInvoice
              />
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
