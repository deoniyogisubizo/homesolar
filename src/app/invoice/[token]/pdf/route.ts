import { NextResponse } from "next/server";
import {
  deliveryPinForOrder,
  getInvoiceByOrderToken,
  getInvoiceByToken,
  getInvoiceSigningSecret,
  getOrCreateDeliveryToken,
  toInvoiceSnapshot,
} from "@/lib/invoices";
import { generateInvoicePdf } from "@/lib/invoices/pdf";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Invoice } from "@/models/Invoice";
import { getSetting } from "@/lib/admin/settings";


export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const invoice = (await getInvoiceByToken(token)) ?? (await getInvoiceByOrderToken(token));
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  await connectToDatabase();
  const [delivery, general, order] = await Promise.all([
    getOrCreateDeliveryToken(String(invoice._id)),
    getSetting("general"),
    Order.findById(invoice.orderId).lean(),
  ]);

  const snapshot = toInvoiceSnapshot(invoice);
  const pin =
    order?.deliveryCodeHash && order.deliveryCodeVersion !== undefined
      ? deliveryPinForOrder(getInvoiceSigningSecret(), {
          _id: order._id,
          deliveryCodeVersion: order.deliveryCodeVersion,
        })
      : undefined;

  const buffer = await generateInvoicePdf({
    snapshot,
    invoiceNumber: String(invoice.invoiceNumber ?? ""),
    orderNumber: String(invoice.orderNumber ?? ""),
    issuedAt: new Date(String(invoice.issuedAt ?? Date.now())),
    revision: Number(invoice.revision ?? 1),
    deliveryToken: delivery?.token,
    pin,
    currencySymbol: general.currencySymbol,
    decimals: ["$", "£", "€"].includes(general.currencySymbol) ? 2 : 0,
  });

  await Invoice.updateOne(
    { _id: invoice._id },
    { $set: { pdf: { generatedAt: new Date(), bytes: buffer.length } } },
  ).catch(() => null);

  const body = new Uint8Array(buffer);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${String(invoice.invoiceNumber ?? "")}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
