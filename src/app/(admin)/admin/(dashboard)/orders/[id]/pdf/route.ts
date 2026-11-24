import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/admin/auth";
import { getSetting } from "@/lib/admin/settings";
import {
  deliveryPinForOrder,
  getInvoiceSigningSecret,
  getLatestInvoiceByOrderId,
  getOrCreateDeliveryToken,
  toInvoiceSnapshot,
} from "@/lib/invoices";
import { generateDeliverySlipPdf, generateInvoicePdf } from "@/lib/invoices/pdf";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";


export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requirePermission("orders:read");
  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  await connectToDatabase();
  const [order, invoice, general, invoices] = await Promise.all([
    Order.findById(id).lean(),
    getLatestInvoiceByOrderId(id),
    getSetting("general"),
    getSetting("invoices"),
  ]);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const documentType = new URL(request.url).searchParams.get("document") ?? "invoice";
  const snapshot = invoice ? toInvoiceSnapshot(invoice) : null;
  const delivery = invoice ? await getOrCreateDeliveryToken(String(invoice._id)) : null;
  const decimals = ["$", "£", "€"].includes(general.currencySymbol) ? 2 : 0;

  if (!snapshot || !invoice) {
    return NextResponse.json({ error: "Issue the invoice first." }, { status: 409 });
  }

  if (documentType === "packing-slip" || documentType === "delivery-slip") {
    const buffer = await generateDeliverySlipPdf({
      snapshot,
      invoiceNumber: String(invoice.invoiceNumber ?? ""),
      orderNumber: order.orderNumber,
      issuedAt: new Date(String(invoice.issuedAt ?? Date.now())),
      deliveryToken: delivery?.token,
      slipSize: documentType === "packing-slip" ? "A4" : "A5",
      currencySymbol: general.currencySymbol,
      decimals,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${documentType}-${order.orderNumber}.pdf"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const pin = order.deliveryCodeHash
    ? deliveryPinForOrder(getInvoiceSigningSecret(), {
        _id: order._id,
        deliveryCodeVersion: order.deliveryCodeVersion,
      })
    : undefined;
  const buffer = await generateInvoicePdf({
    snapshot,
    invoiceNumber: String(invoice.invoiceNumber ?? ""),
    orderNumber: order.orderNumber,
    issuedAt: new Date(String(invoice.issuedAt ?? Date.now())),
    revision: Number(invoice.revision ?? 1),
    deliveryToken: delivery?.token,
    pin: invoices.confirmationMode === "pin_and_scan" ? pin : undefined,
    currencySymbol: general.currencySymbol,
    decimals,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${String(invoice.invoiceNumber ?? order.orderNumber)}.pdf"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
