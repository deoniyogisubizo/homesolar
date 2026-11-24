import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryConfirmForm } from "@/components/delivery/DeliveryConfirmForm";
import { getInvoiceByDeliveryToken, getInvoiceSettings, toInvoiceSnapshot } from "@/lib/invoices";
import { getSetting } from "@/lib/admin/settings";
import { Order } from "@/models/Order";
import { connectToDatabase } from "@/lib/mongodb";

export const instant = false;

export const metadata: Metadata = {
  title: "Delivery confirmation",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

const CONFIRMABLE_STATUSES = ["confirmed", "processing", "out_for_delivery"];

function formatMoney(value: number, symbol: string, decimals: number): string {
  const amount = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${amount}`;
}

export default async function DeliveryPage({ params }: PageProps) {
  const { token } = await params;
  const invoice = await getInvoiceByDeliveryToken(token);
  if (!invoice) notFound();

  await connectToDatabase();
  const [order, general, invoiceSettings] = await Promise.all([
    Order.findById(invoice.orderId).lean(),
    getSetting("general"),
    getInvoiceSettings(),
  ]);
  if (!order) notFound();

  const snapshot = toInvoiceSnapshot(invoice);
  const alreadyDelivered = order.status === "delivered";
  const confirmable = CONFIRMABLE_STATUSES.includes(order.status);
  const amountToCollect = snapshot.totals.amountDue;
  const decimals = ["$", "£", "€"].includes(general.currencySymbol) ? 2 : 0;
  const money = (value: number) => formatMoney(value, general.currencySymbol, decimals);
  const pinRequired = invoiceSettings.confirmationMode === "pin_and_scan";

  const customerName = order.customer?.name ?? "";
  const nameParts = customerName.trim().split(/\s+/).filter(Boolean);
  const customerFirstName = nameParts[0] ?? "";
  const customerLastInitial = nameParts.length > 1 ? `${nameParts[nameParts.length - 1]?.[0] ?? ""}.` : "";

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="transition-colors hover:text-ink">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">Delivery {order.orderNumber}</span>
      </nav>

      <div className="mt-6">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">Delivery confirmation</h1>
        <p className="mt-2 text-[13px] text-muted">Order {order.orderNumber}</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="border border-line bg-white p-6">
          <h2 className="text-[16px] font-semibold text-ink">Items</h2>
          <ul className="mt-4 space-y-2">
            {snapshot.items.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="flex items-center justify-between gap-4 text-[13px]">
                <span className="text-ink">
                  {item.quantity} x {item.name}
                </span>
                <span className="shrink-0 font-medium text-ink">{money(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2 border-t border-line pt-4 text-[13px]">
            <p className="text-ink">
              Customer: {customerFirstName} {customerLastInitial}
            </p>
            <p className="text-muted">
              Delivery area: {[order.delivery?.sector, order.delivery?.district, order.delivery?.city].filter(Boolean).join(", ")}
            </p>
            {order.delivery?.line1 ? <p className="text-muted">Address: {order.delivery.line1}</p> : null}
            {order.delivery?.landmark ? <p className="text-muted">Landmark: {order.delivery.landmark}</p> : null}
            <p className="text-ink">Total: {money(snapshot.totals.total)}</p>
            <p className="text-ink">Amount to collect: {money(amountToCollect)}</p>
            <p className="capitalize text-muted">
              Payment method: {order.paymentMethod ? order.paymentMethod.replaceAll("_", " ") : "Not set"}
            </p>
          </div>
        </section>

        <div className="space-y-6">
          {alreadyDelivered ? (
            <section className="border border-line bg-tile p-6 text-center">
              <h2 className="text-[18px] font-semibold text-ink">Already delivered</h2>
              <p className="mt-2 text-[13px] text-muted">Order {order.orderNumber} was delivered. No further action is needed.</p>
            </section>
          ) : confirmable ? (
            <section className="border border-line bg-white p-6">
              <h2 className="text-[16px] font-semibold text-ink">Confirm delivery</h2>
              <p className="mt-2 text-[12px] leading-5 text-muted">
                {pinRequired
                  ? "Enter the delivery code from the customer invoice when the items are in hand."
                  : "Scan the delivery code when the items are in hand."}
              </p>
              <div className="mt-6">
                <DeliveryConfirmForm
                  token={token}
                  orderNumber={order.orderNumber}
                  amountDue={amountToCollect}
                  paymentMethod={order.paymentMethod ?? ""}
                  currencySymbol={general.currencySymbol}
                  pinRequired={pinRequired}
                  geolocationRequired={invoiceSettings.geolocationRequired}
                />
              </div>
            </section>
          ) : (
            <section className="border border-line bg-tile p-6 text-center">
              <h2 className="text-[18px] font-semibold text-ink">Delivery not available</h2>
              <p className="mt-2 text-[13px] text-muted">
                This delivery link can not be confirmed for order {order.orderNumber} (status: {order.status}).
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
