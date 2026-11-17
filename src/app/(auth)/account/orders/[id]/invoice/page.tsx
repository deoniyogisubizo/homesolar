import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import { getOrderDetails } from "@/app/(auth)/actions/dashboard-actions";
import { AccountLayout } from "@/components/account/AccountLayout";
import { PrintInvoiceButton } from "./PrintInvoiceButton";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

export const instant = false;

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderResponse = await getOrderDetails(id);

  if (!orderResponse.ok) {
    return (
      <AccountLayout>
        <div className="mx-auto max-w-3xl py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted" />
          <h2 className="mb-2 text-[20px] font-semibold text-ink">Invoice not found</h2>
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

  return (
    <AccountLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/account/orders/${order.id}`}
            className="rounded p-2 text-muted transition-colors hover:bg-tile"
            aria-label="Back to order"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <PrintInvoiceButton />
        </div>

        <div className="rounded-[12px] border border-line bg-white p-8 print:border-0 print:shadow-none">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-bold text-ink">INVOICE</h1>
              <p className="mt-1 text-muted">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted">Date</p>
              <p className="font-medium text-ink">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Billed to
              </h3>
              <p className="font-medium text-ink">{order.customer.name}</p>
              <p className="text-muted">{order.customer.email}</p>
              <p className="text-muted">{order.customer.phone}</p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Ship to
              </h3>
              <p className="font-medium text-ink">{order.delivery.line1}</p>
              <p className="text-muted">
                {[order.delivery.sector, order.delivery.district, order.delivery.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-[8px] border border-line">
            <table className="w-full">
              <thead>
                <tr className="bg-tile">
                  <th className="p-4 text-left text-sm font-semibold text-muted">Item</th>
                  <th className="p-4 text-center text-sm font-semibold text-muted">Qty</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted">Unit price</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((item) => (
                  <tr key={`${item.productId}-${item.variantSku ?? item.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 rounded-[6px] object-cover"
                        />
                        <div>
                          <p className="font-medium text-ink">{item.name}</p>
                          {item.variantSku ? (
                            <p className="text-sm text-muted">{item.variantSku}</p>
                          ) : null}
                          {item.color ? (
                            <p className="text-sm text-muted">Colour: {item.color}</p>
                          ) : null}
                          {item.size ? (
                            <p className="text-sm text-muted">Size: {item.size}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-medium text-ink">{item.quantity}</td>
                    <td className="p-4 text-right font-medium text-ink">
                      {formatMoney(item.unitPrice, currencySymbol)}
                    </td>
                    <td className="p-4 text-right font-medium text-ink">
                      {formatMoney(item.lineTotal, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium text-ink">
                {formatMoney(order.subtotal, currencySymbol)}
              </span>
            </div>
            {order.campaignDiscount > 0 ? (
              <div className="flex justify-between text-sm text-success">
                <span>Campaign discount</span>
                <span>−{formatMoney(order.campaignDiscount, currencySymbol)}</span>
              </div>
            ) : null}
            {order.couponDiscount > 0 ? (
              <div className="flex justify-between text-sm text-success">
                <span>Coupon {order.couponCode ? `(${order.couponCode})` : ""}</span>
                <span>−{formatMoney(order.couponDiscount, currencySymbol)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-muted">Shipping</span>
              <span className="font-medium text-ink">
                {formatMoney(order.shipping, currencySymbol)}
              </span>
            </div>
            {order.tax > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tax</span>
                <span className="font-medium text-ink">{formatMoney(order.tax, currencySymbol)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-2">
              <span className="text-lg font-semibold text-ink">Total</span>
              <span className="text-lg font-semibold text-ink">
                {formatMoney(order.total, currencySymbol)}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-6 border-t border-line pt-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Payment
              </h3>
              <p className="font-medium capitalize text-ink">
                {order.paymentMethod ? order.paymentMethod.replaceAll("_", " ") : "Arranged on WhatsApp"}
              </p>
              <p className="text-sm capitalize text-muted">{order.paymentStatus}</p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Order status
              </h3>
              <p className="font-medium capitalize text-ink">
                {order.status.replaceAll("_", " ")}
              </p>
              <p className="text-sm text-muted">Placed on {formatDate(order.createdAt)}</p>
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-8 text-center text-sm text-muted">
            <p>Thank you for shopping with Solar Home System &amp; Electronic</p>
            <p className="mt-1">Questions? Reply to our WhatsApp thread or contact support.</p>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
