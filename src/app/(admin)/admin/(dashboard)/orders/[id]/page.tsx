import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { ExternalLink, MessageCircle, Package, Printer, Truck } from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge, labelize } from "@/components/admin/StatusBadge";
import { OrderActions } from "@/components/admin/orders/OrderActions";
import { OrderNotes } from "@/components/admin/orders/OrderNotes";
import { InvoiceActions } from "@/components/admin/orders/InvoiceActions";
import { OutboxRetryButton } from "@/components/admin/orders/OutboxRetryButton";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { getLatestInvoiceByOrderId } from "@/lib/invoices";
import { outboxMessagesForOrder } from "@/lib/whatsapp/outbox";
import { isFollowUpDue } from "@/lib/admin/follow-up";
import { statusTone, paymentStatusTone } from "@/lib/admin/order-status";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import {
  buildOrderItemLine,
  buildWhatsAppLink,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp";

export const metadata = { title: "Order" };

function money(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("orders:read");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const [order, general, whatsappOrder, customer] = await Promise.all([
    Order.findById(id).lean(),
    getSetting("general"),
    getSetting("whatsappOrder"),
    Order.findById(id).then((record) =>
      record?.customerId ? Customer.findById(record.customerId).lean() : null,
    ),
  ]);
  if (!order) notFound();

  const [invoice, outboxMessages] = await Promise.all([
    getLatestInvoiceByOrderId(id),
    outboxMessagesForOrder(id),
  ]);
  const invoiceSnapshot = invoice
    ? {
        invoiceNumber: String(invoice.invoiceNumber ?? ""),
        revision: Number(invoice.revision ?? 1),
        status: String(invoice.status ?? ""),
        issuedAt: invoice.issuedAt ? new Date(String(invoice.issuedAt)) : null,
        amountDue: Number((invoice.totals as { amountDue?: number } | undefined)?.amountDue ?? 0),
        total: Number((invoice.totals as { total?: number } | undefined)?.total ?? order.total),
      }
    : null;
  const deliveryLocked = Boolean(
    order.deliveryCodeLockedUntil && new Date(order.deliveryCodeLockedUntil) > new Date(),
  );

  const customerOrders = order.customerId
    ? await Order.find({ customerId: order.customerId })
        .sort({ createdAt: -1 })
        .select("orderNumber status total createdAt")
        .limit(10)
        .lean()
    : [];

  const staffMessage = renderWhatsAppTemplate(whatsappOrder.staffReplyTemplate, {
    storeName: general.storeName,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    orderNumber: order.orderNumber,
  });
  const customerChatHref = buildWhatsAppLink(order.customer.phone, staffMessage);
  const confirmationHref = buildWhatsAppLink(order.whatsapp.number, order.whatsapp.message);
  const summary = [
    `Order ${order.orderNumber}`,
    `Customer: ${order.customer.name} · ${order.customer.phone}`,
    `Delivery: ${[order.delivery.line1, order.delivery.sector, order.delivery.district, order.delivery.city]
      .filter(Boolean)
      .join(", ")}`,
    "",
    ...order.items.map((item, index) =>
      buildOrderItemLine(
        {
          name: item.name,
          options: item.options,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        },
        index + 1,
      ),
    ),
    "",
    `Total: $${order.total.toFixed(2)}`,
    `Status: ${labelize(order.status)}`,
  ].join("\n");
  const followUp =
    order.status === "new" &&
    order.createdAt &&
    isFollowUpDue(order.createdAt, whatsappOrder.followUpMinutes);

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`${labelize(order.status)} · ${labelize(order.paymentStatus)} · ${labelize(order.paymentMethod)}`}
        breadcrumbs={[
          { label: "Sales" },
          { label: "Orders", href: "/admin/orders" },
          { label: order.orderNumber },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/admin/orders/${order._id}/print?document=invoice`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Printer className="h-3.5 w-3.5" />
              Invoice
            </a>
            <a
              href={`/admin/orders/${order._id}/print?document=packing-slip`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Package className="h-3.5 w-3.5" />
              Packing slip
            </a>
          </div>
        }
      />
      <PageBody>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            {followUp ? (
              <div className="rounded-[8px] border border-warning/30 bg-warning-pale px-4 py-3 text-[12px] text-warning">
                This order is still waiting for first contact. Open the customer chat below.
              </div>
            ) : null}

            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Customer</h2>
                  <p className="mt-0.5 text-[12px] text-admin-muted">
                    {order.customer.name} · {order.customer.email || "No email"} ·{" "}
                    {order.customer.phone}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={labelize(order.status)} tone={statusTone(order.status)} />
                  <StatusBadge
                    label={labelize(order.paymentStatus)}
                    tone={paymentStatusTone(order.paymentStatus)}
                  />
                  <StatusBadge label="WhatsApp" tone="neutral" />
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-admin-muted">Channel</dt>
                  <dd className="text-ink">{labelize(order.channel)}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Payment method</dt>
                  <dd className="text-ink">{labelize(order.paymentMethod)}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Placed</dt>
                  <dd className="text-ink">{order.createdAt?.toLocaleString("en-GB") ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Updated</dt>
                  <dd className="text-ink">{order.updatedAt?.toLocaleString("en-GB") ?? "—"}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[8px] border border-admin-line bg-white">
              <div className="flex items-center justify-between border-b border-admin-line px-4 py-3">
                <h2 className="text-[14px] font-semibold text-ink">Order items</h2>
                <span className="text-[11px] text-admin-muted">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} units
                </span>
              </div>
              <ul className="divide-y divide-admin-line">
                {order.items.map((item, index) => (
                  <li
                    key={`${item.slug}-${item.variantSku ?? index}`}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-medium text-ink">{item.name}</p>
                        {item.variantSku ? (
                          <span className="font-mono text-[11px] text-admin-muted">
                            {item.variantSku}
                          </span>
                        ) : null}
                      </div>
                      {item.options.length ? (
                        <p className="mt-0.5 text-[12px] text-admin-muted">
                          {item.options.join(", ")}
                        </p>
                      ) : null}
                      {item.campaignName ? (
                        <p className="mt-0.5 text-[11px] text-success">
                          Campaign: {item.campaignName}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-[12px] text-admin-muted">Qty</p>
                        <p className="text-[13px] font-medium text-ink">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-[12px] text-admin-muted">Unit</p>
                        <p className="text-[13px] font-medium text-ink">
                          {money(item.unitPrice, general.currencySymbol)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] text-admin-muted">Line total</p>
                        <p className="text-[13px] font-semibold text-ink">
                          {money(item.lineTotal, general.currencySymbol)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <h2 className="text-[14px] font-semibold text-ink">Pricing breakdown</h2>
              <dl className="mt-4 space-y-2 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-admin-muted">Subtotal</dt>
                  <dd className="text-ink">{money(order.subtotal, general.currencySymbol)}</dd>
                </div>
                {order.campaignDiscount > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-admin-muted">Campaign discount</dt>
                    <dd className="text-success">
                      −{money(order.campaignDiscount, general.currencySymbol)}
                    </dd>
                  </div>
                ) : null}
                {order.couponDiscount > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-admin-muted">
                      Coupon discount {order.couponCode ? `(${order.couponCode})` : ""}
                    </dt>
                    <dd className="text-success">
                      −{money(order.couponDiscount, general.currencySymbol)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-admin-muted">Shipping</dt>
                  <dd className="text-ink">{money(order.shipping, general.currencySymbol)}</dd>
                </div>
                {order.tax > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-admin-muted">Tax</dt>
                    <dd className="text-ink">{money(order.tax, general.currencySymbol)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 border-t border-admin-line pt-3">
                  <dt className="text-[14px] font-semibold text-ink">Total</dt>
                  <dd className="text-[14px] font-semibold text-ink">
                    {money(order.total, general.currencySymbol)}
                  </dd>
                </div>
              </dl>
              {order.shippingNote ? (
                <p className="mt-3 text-[11px] leading-5 text-admin-muted">{order.shippingNote}</p>
              ) : null}
            </section>

            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <h2 className="text-[14px] font-semibold text-ink">Delivery address</h2>
              <address className="mt-3 flex items-start gap-2 not-italic text-[13px] leading-6 text-ink">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-admin-muted" />
                <span>
                  {[
                    order.delivery.line1,
                    order.delivery.sector,
                    order.delivery.district,
                    order.delivery.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  {order.delivery.landmark ? (
                    <span className="block text-admin-muted">
                      Landmark: {order.delivery.landmark}
                    </span>
                  ) : null}
                  {order.delivery.notes ? (
                    <span className="block text-admin-muted">Notes: {order.delivery.notes}</span>
                  ) : null}
                </span>
              </address>
            </section>

            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">WhatsApp handoff</h2>
                  <p className="mt-1 text-[12px] text-admin-muted">
                    {order.whatsapp.number || "No number saved"} ·{" "}
                    {order.whatsapp.clickCount} click
                    {order.whatsapp.clickCount === 1 ? "" : "s"}
                    {order.whatsapp.lastClickedAt
                      ? ` · last ${order.whatsapp.lastClickedAt.toLocaleString("en-GB")}`
                      : ""}
                  </p>
                </div>
                {confirmationHref ? (
                  <a
                    href={confirmationHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open sent message
                  </a>
                ) : null}
              </div>
              <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-[6px] bg-tile p-3 text-[12px] leading-5 text-ink">
                {order.whatsapp.message || "No message saved."}
              </pre>
            </section>

            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">Invoice and delivery code</h2>
                  {invoiceSnapshot ? (
                    <p className="mt-1 text-[12px] text-admin-muted">
                      {invoiceSnapshot.invoiceNumber} · revision {invoiceSnapshot.revision} ·{" "}
                      {invoiceSnapshot.issuedAt?.toLocaleDateString("en-GB") ?? "—"} ·{" "}
                      {money(invoiceSnapshot.total, general.currencySymbol)} total ·{" "}
                      {money(invoiceSnapshot.amountDue, general.currencySymbol)} due
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px] text-warning">
                      No invoice has been issued for this order yet.
                    </p>
                  )}
                </div>
                <StatusBadge
                  label={invoiceSnapshot ? (deliveryLocked ? "Code locked" : "Issued") : "Not issued"}
                  tone={invoiceSnapshot ? (deliveryLocked ? "warning" : "success") : "neutral"}
                />
              </div>
              {order.deliveryMismatch ? (
                <p className="mt-3 rounded-[6px] border border-warning/30 bg-warning-pale px-3 py-2 text-[12px] text-warning">
                  The amount collected at delivery does not match the order total. Review the proof below.
                </p>
              ) : null}
              <div className="mt-4">
                <InvoiceActions
                  orderId={String(order._id)}
                  invoiceNumber={invoiceSnapshot?.invoiceNumber ?? null}
                  hasEmail={Boolean(order.customer.email)}
                  hasDeliveryCode={Boolean(order.deliveryCodeHash)}
                  locked={deliveryLocked}
                  publicToken={order.token}
                />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-admin-muted">
                The delivery code is only printed on the customer copy. Staff can regenerate it or unlock a
                locked code. Regenerating invalidates the previously printed customer code.
              </p>
            </section>

            {order.status === "delivered" || order.deliveryProof ? (
              <section className="rounded-[8px] border border-admin-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[14px] font-semibold text-ink">Delivery proof</h2>
                    <p className="mt-1 text-[12px] text-admin-muted">
                      {order.deliveredAt
                        ? `Delivered ${new Date(order.deliveredAt).toLocaleString("en-GB")}`
                        : "Delivery confirmed"}
                    </p>
                  </div>
                  <StatusBadge
                    label={order.deliveryMismatch ? "Amount mismatch" : "Delivery confirmed"}
                    tone={order.deliveryMismatch ? "warning" : "success"}
                  />
                </div>
                {order.deliveryProof ? (
                  <dl className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2">
                    <div>
                      <dt className="text-admin-muted">Confirmed by</dt>
                      <dd className="text-ink">{order.deliveryProof.confirmedBy || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-admin-muted">Collected</dt>
                      <dd className="text-ink">
                        {money(order.deliveryProof.collectedAmount, general.currencySymbol)} ·{" "}
                        {labelize(order.deliveryProof.collectedMethod)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-admin-muted">Location</dt>
                      <dd className="text-ink">
                        {order.deliveryProof.coordinates ? (
                          <a
                            href={`https://maps.google.com/?q=${order.deliveryProof.coordinates.lat},${order.deliveryProof.coordinates.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            {order.deliveryProof.coordinates.lat.toFixed(5)},{" "}
                            {order.deliveryProof.coordinates.lng.toFixed(5)}
                          </a>
                        ) : (
                          "Not shared"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-admin-muted">Device</dt>
                      <dd className="break-all text-ink">{order.deliveryProof.userAgent || "—"}</dd>
                    </div>
                  </dl>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">WhatsApp messages</h2>
                  <p className="mt-1 text-[12px] text-admin-muted">
                    Queued and sent transactional messages. Credentials are read from environment variables.
                  </p>
                </div>
                <StatusBadge label={`${outboxMessages.length} message${outboxMessages.length === 1 ? "" : "s"}`} tone="neutral" />
              </div>
              {outboxMessages.length ? (
                <ul className="mt-4 divide-y divide-admin-line">
                  {outboxMessages.map((message) => {
                    const tone =
                      message.status === "sent"
                        ? "success"
                        : message.status === "failed"
                          ? "danger"
                          : message.status === "sending"
                            ? "info"
                            : "warning";
                    const canRetry = message.status === "failed" || message.status === "pending";
                    return (
                      <li key={String(message._id)} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-ink">
                              {message.templateName} → {message.recipient}
                            </p>
                            <p className="mt-0.5 text-[11px] text-admin-muted">
                              {labelize(message.event)} · attempts {message.attempts}/{message.maxAttempts}
                              {message.deliveryStatus ? ` · webhook: ${message.deliveryStatus}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge label={labelize(message.status)} tone={tone} />
                            {canRetry ? <OutboxRetryButton id={String(message._id)} /> : null}
                          </div>
                        </div>
                        {message.lastError ? (
                          <p className="mt-1 break-words text-[11px] text-danger">{message.lastError}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-[12px] text-admin-muted">
                  No automatic messages queued. Enable WhatsApp sending under Invoices and delivery.
                </p>
              )}
            </section>

            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <h2 className="text-[14px] font-semibold text-ink">Status timeline</h2>
              <div className="mt-4">
                <OrderTimeline
                  status={order.status}
                  history={order.statusHistory}
                  timezone={general.timezone || "Africa/Kigali"}
                />
              </div>
            </section>

            <OrderNotes id={String(order._id)} initialNotes={order.notes} />
          </div>

          <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
            <OrderActions
              id={String(order._id)}
              status={order.status}
              paymentStatus={order.paymentStatus}
              paymentMethod={order.paymentMethod}
              customerChatHref={customerChatHref}
              summary={summary}
              hasCustomerEmail={Boolean(order.customer.email)}
            />

            {order.courier || order.trackingNumber ? (
              <div className="rounded-[8px] border border-admin-line bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
                  Tracking
                </p>
                {order.courier ? (
                  <p className="mt-2 text-[12px] text-ink">
                    Courier: <span className="font-medium">{order.courier}</span>
                  </p>
                ) : null}
                {order.trackingNumber ? (
                  <p className="mt-1 text-[12px] text-ink">
                    Number: <span className="font-mono font-medium">{order.trackingNumber}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            {customer && customerOrders.length ? (
              <div className="rounded-[8px] border border-admin-line bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
                  Customer history
                </p>
                <p className="mt-2 text-[12px] text-ink">{customer.name}</p>
                <p className="text-[11px] text-admin-muted">
                  {customerOrders.length} order{customerOrders.length === 1 ? "" : "s"} total
                </p>
                <ul className="mt-3 max-h-[200px] space-y-2 overflow-y-auto">
                  {customerOrders.map((entry) => (
                    <li
                      key={entry.orderNumber}
                      className="flex items-center justify-between gap-2 text-[12px]"
                    >
                      <Link
                        href={`/admin/orders/${entry._id}`}
                        className="font-medium text-ink hover:text-brand"
                      >
                        {entry.orderNumber}
                      </Link>
                      <StatusBadge
                        label={labelize(entry.status)}
                        tone={statusTone(entry.status)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-[8px] border border-admin-line bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
                Customer confirmation
              </p>
              <p className="mt-2 flex items-center gap-2 text-[12px] text-ink">
                <MessageCircle className="h-3.5 w-3.5" />
                {order.whatsapp.number || "No WhatsApp number"}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-admin-muted">
                {order.whatsapp.message
                  ? "The message sent with this order is saved above."
                  : "This order has no saved WhatsApp message."}
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              Back to orders
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
