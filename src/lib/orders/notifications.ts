import "server-only";

import { Order } from "@/models/Order";
import { sendTemplatedEmail, siteUrl } from "@/lib/admin/mail";
import { getSetting } from "@/lib/admin/settings";
import {
  deliveryPinForOrder,
  getInvoiceSigningSecret,
  getLatestInvoiceByOrderId,
  getOrCreateDeliveryToken,
  toInvoiceSnapshot,
} from "@/lib/invoices";
import { enqueueOrderPlacementMessages, processOutbox } from "@/lib/whatsapp/outbox";

export type InvoiceEmailPayload = {
  invoiceNumber: string;
  orderNumber: string;
  snapshot: ReturnType<typeof toInvoiceSnapshot>;
  deliveryToken?: string;
  pin?: string;
  issuedAt?: Date;
};

export async function notifyNewOrder(orderId: string) {
  try {
    const order = await Order.findById(orderId).lean();
    if (!order) return;

    const [notifications, general, whatsappOrder] = await Promise.all([
      getSetting("notifications"),
      getSetting("general"),
      getSetting("whatsappOrder"),
    ]);
    const symbol = general.currencySymbol;
    const decimals = ["$", "£", "€"].includes(symbol) ? 2 : 0;
    const items = order.items
      .map(
        (item) =>
          `${item.quantity} x ${item.name} - ${symbol}${item.lineTotal.toFixed(decimals)}`,
      )
      .join("<br />");
    const orderUrl = `${siteUrl()}/admin/orders/${String(order._id)}`;
    const invoiceUrl = `${siteUrl()}/invoice/${order.token}`;

    const invoice = await getLatestInvoiceByOrderId(orderId);
    let invoicePayload: InvoiceEmailPayload | null = null;
    let staffInvoicePayload: InvoiceEmailPayload | null = null;
    if (invoice) {
      const delivery = await getOrCreateDeliveryToken(String(invoice._id));
      const pin = order.deliveryCodeHash
        ? deliveryPinForOrder(getInvoiceSigningSecret(), {
            _id: order._id,
            deliveryCodeVersion: order.deliveryCodeVersion,
          })
        : "";
      const baseInvoice = {
        invoiceNumber: String(invoice.invoiceNumber ?? ""),
        orderNumber: order.orderNumber,
        snapshot: toInvoiceSnapshot(invoice),
        deliveryToken: delivery?.token,
        issuedAt: new Date(String(invoice.issuedAt ?? Date.now())),
      };
      invoicePayload = { ...baseInvoice, pin };
      staffInvoicePayload = baseInvoice;
    }

    if (notifications.enabled.orders && notifications.recipients.orders.length) {
      await Promise.all(
        notifications.recipients.orders.map(async (recipient) => {
          try {
            await sendTemplatedEmail({
              templateKey: "order_staff_notification",
              to: recipient,
              variables: {
                customerName: order.customer.name,
                customerPhone: order.customer.phone,
                orderNumber: order.orderNumber,
                orderTotal: `${symbol}${order.total.toFixed(decimals)}`,
                orderItems: items,
                orderUrl,
                invoiceUrl,
              },
              orderId: String(order._id),
              sentBy: "storefront",
              invoice: staffInvoicePayload ?? undefined,
            });
          } catch {
            return;
          }
        }),
      );
    }

    if (whatsappOrder.customerOrderEmail && order.customer.email) {
      try {
        await sendTemplatedEmail({
          templateKey: "order_confirmation",
          to: order.customer.email,
          variables: {
            customerName: order.customer.name,
            orderNumber: order.orderNumber,
            orderTotal: `${symbol}${order.total.toFixed(decimals)}`,
            invoiceUrl,
          },
          orderId: String(order._id),
          sentBy: "storefront",
          invoice: invoicePayload ?? undefined,
        });
      } catch {
        // Email is best-effort; WhatsApp delivery continues below.
      }
    }

    try {
      await enqueueOrderPlacementMessages(orderId);
      await processOutbox(10);
    } catch {
      // Outbox records stay pending and the cron route can retry later.
    }
  } catch {
    return;
  }
}
