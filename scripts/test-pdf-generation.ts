import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { generateInvoicePdf, generateDeliverySlipPdf } from "@/lib/invoices/pdf";
import { toInvoiceSnapshot, getInvoiceSettings } from "@/lib/invoices";
import { getSetting } from "@/lib/admin/settings";
import fs from "fs/promises";

async function main() {
  await connectToDatabase();
  
  // Get an existing order
  const order = await Order.findOne({ status: "delivered" }).lean();
  if (!order) {
    console.log("No delivered orders found, using first order");
    const fallback = await Order.findOne().lean();
    if (!fallback) {
      console.log("No orders in database");
      return;
    }
  }
  
  const targetOrder = order || (await Order.findOne().lean());
  if (!targetOrder) return;
  
  console.log(`Testing with order: ${targetOrder.orderNumber}`);
  
  // Get settings
  const [general, invoicesSettings] = await Promise.all([
    getSetting("general"),
    getInvoiceSettings(),
  ]);
  
  // Create mock invoice data from order
  const snapshot = {
    seller: {
      businessName: invoicesSettings.business.businessName,
      tin: invoicesSettings.business.tin,
      address: invoicesSettings.business.address,
      phone: invoicesSettings.business.phone,
      email: invoicesSettings.business.email,
      logo: invoicesSettings.business.logo,
      pricesIncludeVat: invoicesSettings.business.pricesIncludeVat,
      vatRate: invoicesSettings.business.vatRate,
    },
    customer: {
      name: targetOrder.customer.name,
      phone: targetOrder.customer.phone,
      email: targetOrder.customer.email,
    },
    delivery: {
      line1: targetOrder.delivery.line1,
      district: targetOrder.delivery.district,
      sector: targetOrder.delivery.sector,
      landmark: targetOrder.delivery.landmark,
      city: targetOrder.delivery.city,
      notes: targetOrder.delivery.notes,
    },
    items: targetOrder.items.map(item => ({
      productId: String(item.productId),
      name: item.name,
      slug: item.slug,
      image: item.image,
      variantSku: item.variantSku,
      color: item.color,
      size: item.size,
      options: item.options,
      unitPrice: item.unitPrice,
      originalPrice: item.originalPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      campaignId: item.campaignId ? String(item.campaignId) : null,
      campaignName: item.campaignName,
      discount: item.discount,
    })),
    totals: {
      subtotal: targetOrder.subtotal,
      campaignDiscount: targetOrder.campaignDiscount,
      couponDiscount: targetOrder.couponDiscount,
      deliveryFee: targetOrder.shipping,
      total: targetOrder.total,
      amountDue: targetOrder.paymentStatus === "paid" ? 0 : targetOrder.total,
    },
    payment: {
      method: targetOrder.paymentMethod,
      status: targetOrder.paymentStatus,
    },
    notes: targetOrder.notes?.map(n => n.body).join("\n") || "",
    terms: invoicesSettings.terms,
  };
  
  const decimals = ["$", "£", "€"].includes(general.currencySymbol) ? 2 : 0;
  const deliveryToken = "test-delivery-token-" + Date.now();
  
  // Generate customer copy (with PIN + QR)
  console.log("Generating customer invoice PDF with QR + PIN...");
  const invoiceBuffer = await generateInvoicePdf({
    snapshot,
    invoiceNumber: "INV-TEST-0001",
    orderNumber: targetOrder.orderNumber,
    issuedAt: new Date(),
    revision: 1,
    deliveryToken,
    pin: "123456",
    currencySymbol: general.currencySymbol,
    decimals,
  });
  
  await fs.writeFile("/tmp/test-invoice-customer.pdf", invoiceBuffer);
  console.log(`✓ Customer invoice saved: /tmp/test-invoice-customer.pdf (${invoiceBuffer.length} bytes)`);
  
  // Generate delivery slip (QR only, no PIN, A5)
  console.log("Generating delivery slip PDF (QR only, no PIN)...");
  const slipBuffer = await generateDeliverySlipPdf({
    snapshot,
    invoiceNumber: "INV-TEST-0001",
    orderNumber: targetOrder.orderNumber,
    issuedAt: new Date(),
    deliveryToken,
    slipSize: "A5",
    currencySymbol: general.currencySymbol,
    decimals,
  });
  
  await fs.writeFile("/tmp/test-delivery-slip.pdf", slipBuffer);
  console.log(`✓ Delivery slip saved: /tmp/test-delivery-slip.pdf (${slipBuffer.length} bytes)`);
  
  // Verify PDF headers
  const invoiceHeader = invoiceBuffer.subarray(0, 5).toString();
  const slipHeader = slipBuffer.subarray(0, 5).toString();
  console.log(`\nInvoice PDF header: ${invoiceHeader}`);
  console.log(`Delivery slip PDF header: ${slipHeader}`);
  
  if (invoiceHeader === "%PDF-" && slipHeader === "%PDF-") {
    console.log("\n✅ Both PDFs are valid!");
  } else {
    console.log("\n❌ PDF validation failed");
  }
  
  console.log("\n--- Test complete ---");
}

main().catch(console.error);