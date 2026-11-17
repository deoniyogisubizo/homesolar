import "server-only";

import { Order } from "@/models/Order";
import { sendTemplatedEmail, siteUrl } from "@/lib/admin/mail";
import { getSetting } from "@/lib/admin/settings";

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
    const items = order.items
      .map((item) => `${item.quantity} x ${item.name} - ${symbol}${item.lineTotal.toFixed(2)}`)
      .join("<br />");
    const orderUrl = `${siteUrl()}/admin/orders/${String(order._id)}`;

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
                orderTotal: `${symbol}${order.total.toFixed(2)}`,
                orderItems: items,
                orderUrl,
              },
              orderId: String(order._id),
              sentBy: "storefront",
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
            orderTotal: `${symbol}${order.total.toFixed(2)}`,
          },
          orderId: String(order._id),
          sentBy: "storefront",
        });
      } catch {
        return;
      }
    }
  } catch {
    return;
  }
}
