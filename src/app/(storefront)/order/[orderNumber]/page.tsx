import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle, Package, ShieldCheck } from "lucide-react";
import { Price } from "@/components/currency/Price";
import { OpenWhatsAppButton } from "@/components/order/OpenWhatsAppButton";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { getSetting } from "@/lib/admin/settings";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/admin/order-status";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const instant = false;

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

const STATUS_TONE: Record<OrderStatus, string> = {
  new: "border-warning/30 bg-warning-pale text-warning",
  contacted: "border-line bg-tile text-ink",
  confirmed: "border-brand/30 bg-brand-pale text-brand-deep",
  processing: "border-brand/30 bg-brand-pale text-brand-deep",
  out_for_delivery: "border-info/30 bg-info/10 text-info",
  delivered: "border-success/30 bg-success/10 text-success",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

function formatPlaced(date: Date | undefined, timezone: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";
  if (!token) notFound();

  await connectToDatabase();
  const order = await Order.findOne({ orderNumber, token }).lean();
  if (!order) notFound();

  const [general, contact] = await Promise.all([getSetting("general"), getSetting("contact")]);
  const timezone = general.timezone || "Africa/Kigali";
  const whatsappUrl = buildWhatsAppLink(order.whatsapp.number, order.whatsapp.message);
  const status = order.status as OrderStatus;

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="transition-colors hover:text-ink">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">Order {order.orderNumber}</span>
      </nav>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Placed {formatPlaced(order.createdAt, timezone)}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-[4px] border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_TONE[status]}`}
        >
          {ORDER_STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <section className="border border-line bg-tile p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" strokeWidth={1.8} />
              <div>
                <h2 className="text-[19px] font-semibold text-ink">Order saved</h2>
                <p className="mt-2 max-w-[560px] text-[13px] leading-6 text-muted">
                  Send the order to our team on WhatsApp so we can confirm your delivery details.
                  Keep this page link in case you need to reopen the chat.
                </p>
              </div>
            </div>
            {whatsappUrl ? (
              <div className="mt-6">
                <OpenWhatsAppButton
                  orderNumber={order.orderNumber}
                  token={order.token}
                  href={whatsappUrl}
                />
              </div>
            ) : null}
            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
              Your order is already recorded. Opening WhatsApp does not create a second order.
            </p>
          </section>

          <section className="border border-line">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[16px] font-semibold text-ink">Items</h2>
              <span className="text-[12px] text-muted">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            <ul className="divide-y divide-line">
              {order.items.map((item, index) => (
                <li key={`${item.slug}-${item.variantSku ?? index}`} className="flex gap-4 px-5 py-4">
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[4px] bg-tile">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-[14px] font-medium text-ink transition-colors hover:text-brand"
                    >
                      {item.name}
                    </Link>
                    {item.options.length ? (
                      <p className="mt-1 text-[12px] text-muted">{item.options.join(", ")}</p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-muted">
                      <Price value={item.unitPrice} /> × {item.quantity}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-[14px] font-semibold text-ink">
                    <Price value={item.lineTotal} />
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-line p-5">
            <h2 className="text-[16px] font-semibold text-ink">Delivery details</h2>
            <dl className="mt-4 grid gap-4 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Recipient</dt>
                <dd className="mt-1 text-ink">{order.customer.name}</dd>
                <dd className="text-muted">{order.customer.phone}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Address</dt>
                <dd className="mt-1 leading-6 text-ink">
                  {[
                    order.delivery.line1,
                    order.delivery.sector,
                    order.delivery.district,
                    order.delivery.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
              {order.delivery.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Order notes</dt>
                  <dd className="mt-1 leading-6 text-ink">{order.delivery.notes}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-tile p-6">
            <h2 className="text-[19px] font-semibold text-ink">Order summary</h2>
            <dl className="mt-5 space-y-3 text-[13px]">
              <div className="flex justify-between gap-4 text-muted">
                <dt>Subtotal</dt>
                <dd className="text-ink">
                  <Price value={order.subtotal} />
                </dd>
              </div>
              {order.campaignDiscount > 0 ? (
                <div className="flex justify-between gap-4 text-muted">
                  <dt>Campaign discount</dt>
                  <dd className="text-success">
                    −<Price value={order.campaignDiscount} />
                  </dd>
                </div>
              ) : null}
              {order.couponDiscount > 0 ? (
                <div className="flex justify-between gap-4 text-muted">
                  <dt>Coupon {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                  <dd className="text-success">
                    −<Price value={order.couponDiscount} />
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 text-muted">
                <dt>Shipping</dt>
                <dd className="text-ink">
                  {order.shipping > 0 ? <Price value={order.shipping} /> : "Free"}
                </dd>
              </div>
              {order.tax > 0 ? (
                <div className="flex justify-between gap-4 text-muted">
                  <dt>Tax</dt>
                  <dd className="text-ink">
                    <Price value={order.tax} />
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-[15px] font-semibold text-ink">
                <dt>Total</dt>
                <dd>
                  <Price value={order.total} />
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] text-muted">
              {order.paymentStatus === "paid" ? "Payment recorded." : "Payment is arranged on WhatsApp."}
            </p>
          </section>

          <section className="border border-line p-6">
            <h2 className="text-[16px] font-semibold text-ink">Invoice</h2>
            <p className="mt-2 text-[12px] leading-6 text-muted">
              The invoice is issued automatically with your order and includes the delivery code.
            </p>
            <a
              href={`/invoice/${order.token}`}
              className="mt-4 inline-flex h-12 items-center justify-center rounded-[4px] bg-navy px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-deep"
            >
              Download invoice
            </a>
          </section>

          <section className="border border-line p-6">
            <h2 className="text-[16px] font-semibold text-ink">Order status</h2>
            <div className="mt-4">
              <OrderTimeline
                status={status}
                history={order.statusHistory}
                timezone={timezone}
              />
            </div>
          </section>

          <section className="border border-line p-6">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              <Package className="h-4 w-4" strokeWidth={1.8} />
              Need help?
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-muted">
              Contact the store if the WhatsApp chat does not open or you need to change this order.
            </p>
            <div className="mt-3 space-y-1 text-[12px] text-ink">
              <a href={`tel:${contact.primaryPhone}`} className="block hover:text-brand">
                {contact.primaryPhone}
              </a>
              <a href={`mailto:${contact.supportEmail}`} className="block hover:text-brand">
                {contact.supportEmail}
              </a>
            </div>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-brand-deep hover:text-brand"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                Open the chat directly
              </a>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
