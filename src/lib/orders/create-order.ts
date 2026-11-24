import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Cart } from "@/models/Cart";
import { Coupon } from "@/models/Coupon";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { recordAudit } from "@/lib/admin/audit";
import { getSetting } from "@/lib/admin/settings";
import { findOrCreateCustomer } from "@/lib/admin/orders";
import { generateOrderNumber } from "@/lib/orders/counter";
import { loadCartQuote } from "@/lib/store";
import { findDeliveryLocation } from "@/lib/locations";
import { getWhatsAppNumber, buildOrderMessage, buildWhatsAppLink, orderItemOptions } from "@/lib/whatsapp";
import { issueOrderInvoice } from "@/lib/invoices";
import { getSiteUrl } from "@/lib/site";
import type { CheckoutInput } from "@/schemas/checkout";

export class CheckoutError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status = 422, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "CheckoutError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type WhatsAppOrderResult = {
  orderNumber: string;
  token: string;
  whatsappUrl: string;
  orderId: string;
  created: boolean;
};

function resultFor(
  order: {
    _id?: unknown;
    orderNumber: string;
    token: string;
    whatsapp: { number: string; message: string };
  },
  created = false,
): WhatsAppOrderResult {
  const url = buildWhatsAppLink(order.whatsapp.number, order.whatsapp.message);
  if (!url) throw new CheckoutError("WhatsApp ordering is temporarily unavailable. Please contact us.", 503);
  return {
    orderNumber: order.orderNumber,
    token: order.token,
    whatsappUrl: url,
    orderId: order._id ? String(order._id) : "",
    created,
  };
}

export async function createWhatsAppOrder(
  sessionId: string,
  input: CheckoutInput,
): Promise<WhatsAppOrderResult> {
  await connectToDatabase();

  const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean();
  if (existing) return resultFor(existing);

  const number = await getWhatsAppNumber();
  if (!number) {
    throw new CheckoutError("Ordering is temporarily unavailable. Please contact us.", 503);
  }

  const location = await findDeliveryLocation(input.delivery.district);
  if (!location) {
    throw new CheckoutError("Choose a delivery district from the list.", 422, {
      "delivery.district": "Choose a delivery district from the list.",
    });
  }
  if (location.province !== input.delivery.province) {
    throw new CheckoutError("Choose a district within the selected province.", 422, {
      "delivery.district": "Choose a district within the selected province.",
    });
  }
  if (!location.sectors.includes(input.delivery.sector)) {
    throw new CheckoutError("Choose a sector within the selected district.", 422, {
      "delivery.sector": "Choose a sector within the selected district.",
    });
  }

  const quote = await loadCartQuote(sessionId, {
    district: location.name,
    province: location.province,
  });

  if (!quote.items.length) throw new CheckoutError("Your cart is empty.", 422);
  if (quote.hasUnavailable) {
    throw new CheckoutError("Remove unavailable items before placing the order.", 422, {
      cart: "Some items are no longer available.",
    });
  }
  if (quote.hasStockIssue) {
    throw new CheckoutError("Adjust quantities that exceed available stock.", 422, {
      cart: "Some quantities exceed available stock.",
    });
  }
  if (!quote.validItems.length) throw new CheckoutError("Your cart is empty.", 422);

  const [general, shipping, whatsappOrder] = await Promise.all([
    getSetting("general"),
    getSetting("shipping"),
    getSetting("whatsappOrder"),
  ]);

  const orderNumber = await generateOrderNumber(whatsappOrder.orderPrefix);
  const token = randomBytes(24).toString("base64url");
  const deliveryLocation = [location.province, location.name, input.delivery.sector]
    .filter(Boolean)
    .join(", ");
  const message = buildOrderMessage({
    template: whatsappOrder.messageTemplate,
    storeName: general.storeName,
    customerName: input.customer.name,
    customerPhone: input.customer.phone,
    orderNumber,
    items: quote.validItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      options: orderItemOptions({ color: item.color, size: item.size }),
    })),
    subtotal: quote.subtotal,
    discount: quote.campaignDiscount + quote.couponDiscount,
    total: quote.total,
    deliveryLocation,
    notes: input.notes,
    currencySymbol: general.currencySymbol,
    maxEncodedLength: 1580,
  });
  const whatsappUrl = buildWhatsAppLink(number, message);
  if (!whatsappUrl) {
    throw new CheckoutError("Ordering is temporarily unavailable. Please contact us.", 503);
  }

  const customer = await findOrCreateCustomer(input.customer);
  const addressLabel = [input.delivery.address, input.delivery.landmark].filter(Boolean).join(", ");
  const coupon = quote.coupon ? await Coupon.findOne({ codeLower: quote.coupon.code.toLowerCase() }).lean() : null;

  let order;
  try {
    order = await Order.create({
      orderNumber,
      token,
      idempotencyKey: input.idempotencyKey,
      channel: "whatsapp",
      customerId: customer._id,
      customer: input.customer,
      delivery: {
        line1: addressLabel,
        district: location.name,
        sector: input.delivery.sector,
        landmark: input.delivery.landmark,
        city: location.province,
        notes: input.notes,
      },
      items: quote.validItems.map((item) => ({
        productId: new Types.ObjectId(item.productId),
        name: item.name,
        slug: item.slug,
        image: item.image,
        variantSku: item.variantSku,
        color: item.color,
        size: item.size,
        options: orderItemOptions({ color: item.color, size: item.size }),
        unitPrice: item.unitPrice,
        originalPrice: item.originalPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        campaignId: item.campaignId ? new Types.ObjectId(item.campaignId) : null,
        campaignName: item.campaignName,
        discount: item.discount,
      })),
      subtotal: quote.subtotal,
      campaignDiscount: quote.campaignDiscount,
      couponDiscount: quote.couponDiscount,
      couponCode: quote.coupon?.code ?? "",
      couponId: coupon?._id ?? null,
      shipping: quote.shipping,
      shippingNote: shipping.shippingNote,
      tax: quote.tax,
      total: quote.total,
      status: "new",
      paymentStatus: "unpaid",
      paymentMethod: "",
      statusHistory: [{ status: "new", at: new Date(), by: "storefront" }],
      notes: [],
      whatsapp: { number, message, clickCount: 0, lastClickedAt: null },
      courier: "",
      trackingNumber: "",
      campaignIds: [
        ...new Set(
          quote.validItems
            .map((item) => item.campaignId)
            .filter((id): id is string => Boolean(id)),
        ),
      ].map((id) => new Types.ObjectId(id)),
      stockDeducted: false,
      whatsappOptIn: input.whatsappOptIn,
      whatsappOptInAt: input.whatsappOptIn ? new Date() : null,
      whatsappOptInSource: input.whatsappOptIn ? "checkout" : "",
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      const duplicate = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean();
      if (duplicate) return resultFor(duplicate);
    }
    throw error;
  }

  await Promise.all([
    Customer.updateOne(
      { _id: customer._id },
      {
        $inc: { orderCount: 1 },
        $set: { lastOrderAt: new Date(), name: input.customer.name, phone: input.customer.phone },
        $setOnInsert: { firstOrderAt: new Date() },
      },
    ),
    Cart.updateOne(
      { sessionId },
      { $set: { items: [], couponCode: "", couponAppliedAt: null } },
    ),
    coupon ? Coupon.updateOne({ _id: coupon._id }, { $inc: { usageCount: 1 } }) : Promise.resolve(),
  ]);

  await recordAudit({
    action: "order.created",
    entity: "Order",
    entityId: String(order._id),
    summary: `WhatsApp order ${orderNumber} created`,
    after: { orderNumber, total: quote.total, itemsCount: quote.validItems.length },
    metadata: { channel: "whatsapp", customerId: String(customer._id) },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/cart");
  revalidatePath("/checkout");

  let invoiceUrl: string | null = null;
  try {
    const issued = await issueOrderInvoice(String(order._id));
    invoiceUrl = `${getSiteUrl()}/invoice/${issued.accessToken.token || order.token}`;
    await recordAudit({
      action: issued.reissued ? "invoice.reissued" : "invoice.issued",
      entity: "Invoice",
      entityId: String(issued.invoice._id ?? ""),
      summary: `Invoice ${String(issued.invoice.invoiceNumber ?? "")} issued for order ${orderNumber}`,
      metadata: { orderNumber, revision: issued.invoice.revision ?? 1 },
    });
  } catch {
    // The order is already saved. A failed invoice must not block the handoff.
    invoiceUrl = null;
  }

  const finalMessage = buildOrderMessage({
    template: whatsappOrder.messageTemplate,
    storeName: general.storeName,
    customerName: input.customer.name,
    customerPhone: input.customer.phone,
    orderNumber,
    items: quote.validItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      options: orderItemOptions({ color: item.color, size: item.size }),
    })),
    subtotal: quote.subtotal,
    discount: quote.campaignDiscount + quote.couponDiscount,
    total: quote.total,
    deliveryLocation,
    notes: input.notes,
    currencySymbol: general.currencySymbol,
    maxEncodedLength: 1580,
    invoiceUrl,
  });
  await Order.updateOne(
    { _id: order._id, idempotencyKey: input.idempotencyKey },
    {
      $set: {
        whatsapp: {
          number,
          message: finalMessage,
          clickCount: order.whatsapp.clickCount,
          lastClickedAt: order.whatsapp.lastClickedAt,
        },
      },
    },
  );

  const finalWhatsAppUrl = buildWhatsAppLink(number, finalMessage);
  if (!finalWhatsAppUrl) throw new CheckoutError("Ordering is temporarily unavailable. Please contact us.", 503);

  return {
    orderNumber,
    token: order.token,
    whatsappUrl: finalWhatsAppUrl,
    orderId: String(order._id),
    created: true,
  };
}

export async function orderConfirmationUrl(orderNumber: string, token: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/order/${encodeURIComponent(orderNumber)}?t=${encodeURIComponent(token)}`;
}
