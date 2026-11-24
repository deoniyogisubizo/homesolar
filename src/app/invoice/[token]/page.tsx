import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceByOrderToken, getInvoiceByToken, toInvoiceSnapshot } from "@/lib/invoices";
import { getSetting } from "@/lib/admin/settings";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const invoice = (await getInvoiceByToken(token)) ?? (await getInvoiceByOrderToken(token));
  const title = invoice ? `Invoice ${String(invoice.invoiceNumber ?? "")}` : "Invoice";
  return { title, robots: { index: false, follow: false } };
}

function formatMoney(value: number, symbol: string, decimals: number): string {
  const amount = value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${symbol}${amount}`;
}

export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = (await getInvoiceByToken(token)) ?? (await getInvoiceByOrderToken(token));
  if (!invoice) notFound();

  const snapshot = toInvoiceSnapshot(invoice);
  const currencySymbol = (await getSetting("general")).currencySymbol || "$";
  const decimals = currencySymbol === "$" || currencySymbol === "£" || currencySymbol === "€" ? 2 : 0;

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="transition-colors hover:text-ink">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">Invoice {String(invoice.invoiceNumber ?? "")}</span>
      </nav>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">INVOICE</h1>
          <p className="mt-2 text-[13px] text-muted">
            {String(invoice.invoiceNumber ?? "")} · Order {String(invoice.orderNumber ?? "")}
          </p>
          <p className="mt-2 text-[13px] text-muted">Issued {invoice.issuedAt ? new Date(String(invoice.issuedAt)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "recently"}</p>
        </div>
        <a
          href={`/invoice/${token}/pdf`}
          className="inline-flex h-12 items-center justify-center rounded-[4px] bg-navy px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-deep"
        >
          Download invoice
        </a>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <section className="border border-line bg-tile p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Billed to</h2>
                <p className="font-medium text-ink">{snapshot.customer.name}</p>
                {snapshot.customer.email ? <p className="text-muted">{snapshot.customer.email}</p> : null}
                {snapshot.customer.phone ? <p className="text-muted">{snapshot.customer.phone}</p> : null}
              </div>
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Deliver to</h2>
                <p className="font-medium text-ink">{snapshot.delivery.line1}</p>
                <p className="text-muted">
                  {[snapshot.delivery.sector, snapshot.delivery.district, snapshot.delivery.city].filter(Boolean).join(", ")}
                </p>
                {snapshot.delivery.landmark ? <p className="text-muted">{snapshot.delivery.landmark}</p> : null}
              </div>
            </div>
          </section>

          <section className="border border-line">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[16px] font-semibold text-ink">Items</h2>
            </div>
            <div className="overflow-hidden">
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
                  {snapshot.items.map((item, index) => (
                    <tr key={`${item.productId}-${index}`}>
                      <td className="p-4">
                        <p className="font-medium text-ink">{item.name}</p>
                        {item.variantSku ? <p className="text-sm text-muted">{item.variantSku}</p> : null}
                        {item.options.length ? <p className="text-sm text-muted">{item.options.join(", ")}</p> : null}
                      </td>
                      <td className="p-4 text-center font-medium text-ink">{item.quantity}</td>
                      <td className="p-4 text-right font-medium text-ink">{formatMoney(item.unitPrice, currencySymbol, decimals)}</td>
                      <td className="p-4 text-right font-medium text-ink">{formatMoney(item.lineTotal, currencySymbol, decimals)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="border border-line bg-white p-6">
            <h2 className="text-[16px] font-semibold text-ink">Totals</h2>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium text-ink">{formatMoney(snapshot.totals.subtotal, currencySymbol, decimals)}</span>
              </div>
              {snapshot.totals.campaignDiscount > 0 ? (
                <div className="flex justify-between text-sm text-success">
                  <span>Campaign discount</span>
                  <span>-{formatMoney(snapshot.totals.campaignDiscount, currencySymbol, decimals)}</span>
                </div>
              ) : null}
              {snapshot.totals.couponDiscount > 0 ? (
                <div className="flex justify-between text-sm text-success">
                  <span>Coupon discount</span>
                  <span>-{formatMoney(snapshot.totals.couponDiscount, currencySymbol, decimals)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm">
                <span className="text-muted">Delivery fee</span>
                <span className="font-medium text-ink">{formatMoney(snapshot.totals.deliveryFee, currencySymbol, decimals)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <span className="text-lg font-semibold text-ink">Total</span>
                <span className="text-lg font-semibold text-ink">{formatMoney(snapshot.totals.total, currencySymbol, decimals)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Amount due</span>
                <span className="font-medium text-ink">{formatMoney(snapshot.totals.amountDue, currencySymbol, decimals)}</span>
              </div>
            </div>
          </section>

          <section className="border border-line bg-white p-6">
            <h2 className="text-[16px] font-semibold text-ink">Payment</h2>
            <p className="mt-2 text-sm capitalize text-muted">{snapshot.payment.method || "Not set"}</p>
            <p className="mt-1 text-sm capitalize text-muted">{snapshot.payment.status}</p>
            {snapshot.totals.amountDue > 0 ? <p className="mt-2 text-sm text-ink">Due on delivery.</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
