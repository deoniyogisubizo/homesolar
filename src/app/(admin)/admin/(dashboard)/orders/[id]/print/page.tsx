import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { getSetting } from "@/lib/admin/settings";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export const metadata = { title: "Print order" };

function money(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ document?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isValidObjectId(id)) notFound();
  const packingSlip = query.document === "packing-slip";

  await connectToDatabase();
  const [order, general, contact] = await Promise.all([
    Order.findById(id).lean(),
    getSetting("general"),
    getSetting("contact"),
  ]);
  if (!order) notFound();

  return (
    <html lang="en">
      <head>
        <title>{packingSlip ? "Packing slip" : "Invoice"} {order.orderNumber}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          {`
            @page { margin: 20mm; size: A4; }
            @media print { body { margin: 0; } }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #111; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #111; }
            .logo { font-weight: 700; font-size: 24px; color: #111; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .invoice-meta { margin-top: 8px; font-size: 11px; color: #666; }
            .section { margin-top: 24px; }
            .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 8px; }
            .addresses { display: flex; justify-content: space-between; gap: 24px; }
            .address-block { flex: 1; }
            .address-block p { margin: 2px 0; }
            .address-block .label { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #666; font-size: 10px; }
            td.num { text-align: right; font-variant-numeric: tabular-nums; }
            tfoot td { border-top: 2px solid #111; font-weight: 700; }
            .totals { width: 300px; margin-left: auto; }
            .totals tr td { padding: 4px 6px; }
            .status-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .status-new { background: #fef3c7; color: #92400e; }
            .status-contacted { background: #f3f4f6; color: #374151; }
            .status-confirmed { background: #dbeafe; color: #1e40af; }
            .status-processing { background: #e0e7ff; color: #312e81; }
            .status-out_for_delivery { background: #e0f2fe; color: #075985; }
            .status-delivered { background: #d1fae5; color: #065f46; }
            .status-cancelled { background: #fee2e2; color: #991b1b; }
          `}
        </style>
      </head>
      <body>
        <div className="header">
          <div className="logo">{general?.storeName ?? "Homesolar"}</div>
          <div className="invoice-title">
            <h1>{packingSlip ? "PACKING SLIP" : "INVOICE"}</h1>
            <div className="invoice-meta">
              <p>Order: <strong>{order.orderNumber}</strong></p>
              <p>Date: <strong>{order.createdAt?.toLocaleDateString("en-GB")}</strong></p>
              <p>
                Status: <span className={`status-badge status-${order.status}`}>{order.status}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="section">
          <p className="section-title">From</p>
          <p>{general?.storeName ?? "Homesolar"}</p>
          {contact?.address && <p>{contact.address}</p>}
          {contact?.primaryPhone && <p>Phone: {contact.primaryPhone}</p>}
          {contact?.supportEmail && <p>Email: {contact.supportEmail}</p>}
        </div>

        <div className="section addresses">
          <div className="address-block">
            <p className="label">Bill to</p>
            <p><strong>{order.customer.name}</strong></p>
            {order.customer.email && <p>{order.customer.email}</p>}
            <p>{order.customer.phone}</p>
          </div>
          <div className="address-block">
            <p className="label">Ship to</p>
            <p>{order.delivery.line1 || "No address provided"}</p>
            {order.delivery.district && <p>{order.delivery.district}</p>}
            {order.delivery.city && <p>{order.delivery.city}</p>}
            {order.delivery.notes && <p>{order.delivery.notes}</p>}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: packingSlip ? "80%" : "45%" }}>Item</th>
              <th className="num" style={{ width: packingSlip ? "20%" : "10%" }}>Qty</th>
              {packingSlip ? null : (
                <>
                  <th className="num" style={{ width: "15%" }}>Unit price</th>
                  <th className="num" style={{ width: "15%" }}>Discount</th>
                  <th className="num" style={{ width: "15%" }}>Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td>
                  <strong>{item.name}</strong>
                  {item.options.length ? (
                    <>
                      <br />
                      <small>{item.options.join(", ")}</small>
                    </>
                  ) : null}
                  {item.variantSku ? (
                    <>
                      <br />
                      <small>SKU: {item.variantSku}</small>
                    </>
                  ) : null}
                </td>
                <td className="num">{item.quantity}</td>
                {packingSlip ? null : (
                  <>
                    <td className="num">{money(item.unitPrice, general.currencySymbol)}</td>
                    <td className="num">
                      {money(item.originalPrice - item.unitPrice, general.currencySymbol)}
                    </td>
                    <td className="num">{money(item.lineTotal, general.currencySymbol)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          {packingSlip ? null : (
          <tfoot>
            <tr>
              <td colSpan={4}>Subtotal</td>
              <td>{money(order.subtotal, general.currencySymbol)}</td>
            </tr>
            {order.campaignDiscount > 0 && (
              <tr>
                <td colSpan={4}>Campaign discount</td>
                <td>−{money(order.campaignDiscount, general.currencySymbol)}</td>
              </tr>
            )}
            {order.couponDiscount > 0 && (
              <tr>
                <td colSpan={4}>Coupon discount ({order.couponCode})</td>
                <td>−{money(order.couponDiscount, general.currencySymbol)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={4}>Shipping</td>
              <td>{money(order.shipping, general.currencySymbol)}</td>
            </tr>
            {order.tax > 0 && (
              <tr>
                <td colSpan={4}>Tax</td>
                <td>{money(order.tax, general.currencySymbol)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={4}>Total</td>
              <td>{money(order.total, general.currencySymbol)}</td>
            </tr>
            <tr>
              <td colSpan={4}>Payment method</td>
              <td>{order.paymentMethod}</td>
            </tr>
            <tr>
              <td colSpan={4}>Payment status</td>
              <td>{order.paymentStatus}</td>
            </tr>
          </tfoot>
          )}
        </table>

        {order.courier && (
          <div className="section">
            <p className="section-title">Tracking</p>
            <p>Courier: <strong>{order.courier}</strong></p>
            <p>Tracking: <strong>{order.trackingNumber}</strong></p>
          </div>
        )}

        <div className="section" style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#666" }}>
          <p>Thank you for your order!</p>
          <p>If you have any questions, contact us at {contact?.supportEmail ?? "support@homesolar.com"} or {contact?.primaryPhone ?? "our support line"}.</p>
        </div>
      </body>
    </html>
  );
}