"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { recordAudit } from "@/lib/admin/audit";
import { getSetting } from "@/lib/admin/settings";
import { requirePermission } from "@/lib/admin/auth";
import { canTransition, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/admin/order-status";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/admin/order-status";
import {
  actionError,
  actionOk,
  fieldErrorsFromZod,
  runAdminAction,
  type ActionResult,
} from "@/lib/admin/action-result";
import { deductOrderStock, restoreOrderStock } from "@/lib/orders/stock";
import { sendTemplatedEmail } from "@/lib/admin/mail";
import { assertSameOrigin } from "@/lib/admin/auth";
import { idSchema } from "@/schemas/common";
import {
  deliveryPinForOrder,
  getInvoiceSettings,
  getInvoiceSigningSecret,
  getLatestInvoiceByOrderId,
  getOrCreateDeliveryToken,
  issueOrderInvoice,
  toInvoiceSnapshot,
} from "@/lib/invoices";
import { regenerateDeliveryCode, unlockDeliveryCode } from "@/lib/delivery";
import { enqueueOrderConfirmationMessages, processOutbox, retryOutboxMessage } from "@/lib/whatsapp/outbox";

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "new",
    "contacted",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  note: z.string().trim().max(500).optional(),
});

export async function changeOrderStatusAction(
  input: unknown,
): Promise<ActionResult<{ status: OrderStatus }>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = statusSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the status change.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    const nextStatus = parsed.data.status;
    if (!canTransition(order.status, nextStatus)) {
      return actionError(`Cannot move this order from ${order.status} to ${nextStatus}.`);
    }

    const previousStatus = order.status;
    let deductedNow = false;

    if (nextStatus === "confirmed" && !order.stockDeducted) {
      deductedNow = await deductOrderStock(parsed.data.id, session.email);
    }

    order.status = nextStatus;
    order.statusHistory.push({
      status: nextStatus,
      at: new Date(),
      by: session.email,
      note: parsed.data.note ?? "",
    });
    if (nextStatus === "confirmed") order.stockDeducted = true;
    if (nextStatus === "cancelled") order.cancelledAt = new Date();
    if (nextStatus === "delivered") {
      order.deliveredAt = new Date();
      if (order.paymentStatus === "unpaid" && order.paymentMethod === "cash_on_delivery") {
        order.paymentStatus = "paid";
      }
    }

    try {
      await order.save();
    } catch (error) {
      if (deductedNow) await restoreOrderStock(parsed.data.id, session.email);
      throw error;
    }

    if (nextStatus === "cancelled" && order.stockDeducted) {
      await restoreOrderStock(parsed.data.id, session.email);
    }

    if (nextStatus === "confirmed") {
      const invoiceSettings = await getInvoiceSettings();
      if (invoiceSettings.reissueOnConfirm) {
        try {
          await issueOrderInvoice(parsed.data.id);
        } catch {
          // A failed reissue must not roll back a confirmed order. The invoice
          // panel exposes a manual reissue action.
        }
      }
      try {
        await enqueueOrderConfirmationMessages(parsed.data.id);
        await processOutbox(5);
      } catch {
        // Pending outbox rows are retried by the cron route.
      }
    }

    await recordAudit({
      actor: session,
      action: "order.status_changed",
      entity: "Order",
      entityId: String(order._id),
      summary: `Order ${order.orderNumber}: ${previousStatus} to ${nextStatus}`,
      before: { status: previousStatus },
      after: { status: nextStatus },
      metadata: { orderNumber: order.orderNumber, note: parsed.data.note ?? "" },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.id}`);
    revalidatePath("/admin");
    return actionOk({ status: nextStatus });
  });
}

const paymentSchema = z.object({
  id: z.string().min(1),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

export async function updateOrderPaymentAction(
  input: unknown,
): Promise<ActionResult<{ paymentStatus: PaymentStatus; paymentMethod: PaymentMethod }>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the payment details.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    const before = {
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
    };
    order.paymentStatus = parsed.data.paymentStatus;
    order.paymentMethod = parsed.data.paymentMethod;
    order.refundedAt = parsed.data.paymentStatus === "refunded" ? new Date() : null;
    await order.save();

    await recordAudit({
      actor: session,
      action: "order.payment_updated",
      entity: "Order",
      entityId: String(order._id),
      summary: `Payment updated for ${order.orderNumber}`,
      before,
      after: {
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
      metadata: { orderNumber: order.orderNumber },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.id}`);
    return actionOk({
      paymentStatus: parsed.data.paymentStatus,
      paymentMethod: parsed.data.paymentMethod,
    });
  });
}

const trackingSchema = z.object({
  id: z.string().min(1),
  courier: z.string().trim().max(120),
  trackingNumber: z.string().trim().max(120),
});

export async function updateOrderTrackingAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = trackingSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the tracking details.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    const before = { courier: order.courier, trackingNumber: order.trackingNumber };
    order.courier = parsed.data.courier;
    order.trackingNumber = parsed.data.trackingNumber.toUpperCase();
    await order.save();

    await recordAudit({
      actor: session,
      action: "order.tracking_updated",
      entity: "Order",
      entityId: String(order._id),
      summary: `Tracking updated for ${order.orderNumber}`,
      before,
      after: { courier: order.courier, trackingNumber: order.trackingNumber },
    });

    revalidatePath(`/admin/orders/${parsed.data.id}`);
    return actionOk(null);
  });
}

const noteSchema = z.object({
  id: z.string().min(1),
  body: z.string().trim().min(1, "Write a note first.").max(2000),
});

export async function addOrderNoteAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = noteSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Write a note first.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    order.notes.push({
      body: parsed.data.body,
      by: session.email,
      at: new Date(),
    });
    await order.save();

    await recordAudit({
      actor: session,
      action: "order.note_added",
      entity: "Order",
      entityId: String(order._id),
      summary: `Internal note added to ${order.orderNumber}`,
      metadata: { orderNumber: order.orderNumber },
    });

    revalidatePath(`/admin/orders/${parsed.data.id}`);
    return actionOk(null);
  });
}

const emailSchema = z.object({
  id: z.string().min(1),
});

export async function resendOrderEmailAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = emailSchema.safeParse(input);
    if (!parsed.success) return actionError("Order not found.");

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id).lean();
    if (!order) return actionError("Order not found.");
    if (!order.customer.email) return actionError("This customer has no email address.");

    const result = await sendTemplatedEmail({
      templateKey: "order_confirmation",
      to: order.customer.email,
      variables: {
        customerName: order.customer.name,
        orderNumber: order.orderNumber,
        orderTotal: `$${order.total.toFixed(2)}`,
      },
      orderId: String(order._id),
      sentBy: session.email,
    });

    if (!result.ok) return actionError(result.error);

    await recordAudit({
      actor: session,
      action: "order.email_resent",
      entity: "Order",
      entityId: String(order._id),
      summary: `Confirmation email resent for ${order.orderNumber}`,
    });
    return actionOk(null);
  });
}

const invoiceIdSchema = z.object({
  id: z.string().min(1),
});

export async function reissueInvoiceAction(input: unknown): Promise<ActionResult<{ invoiceNumber: string; revision: number }>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = invoiceIdSchema.safeParse(input);
    if (!parsed.success) return actionError("Order not found.");

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    const issued = await issueOrderInvoice(String(order._id));
    await recordAudit({
      actor: session,
      action: "invoice.reissued",
      entity: "Invoice",
      entityId: String(issued.invoice._id ?? ""),
      summary: `Invoice ${String(issued.invoice.invoiceNumber ?? "")} reissued for order ${order.orderNumber}`,
      metadata: { orderNumber: order.orderNumber, revision: Number(issued.invoice.revision ?? 1) },
    });

    revalidatePath(`/admin/orders/${parsed.data.id}`);
    return actionOk({ invoiceNumber: String(issued.invoice.invoiceNumber ?? ""), revision: Number(issued.invoice.revision ?? 1) });
  });
}

export async function regenerateDeliveryCodeAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = invoiceIdSchema.safeParse(input);
    if (!parsed.success) return actionError("Order not found.");

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    await regenerateDeliveryCode(String(order._id));

    const latestInvoice = await getLatestInvoiceByOrderId(String(order._id));

    await recordAudit({
      actor: session,
      action: "invoice.code_regenerated",
      entity: "Invoice",
      entityId: String(latestInvoice?._id ?? ""),
      summary: `Delivery code regenerated for order ${order.orderNumber}`,
      metadata: { orderNumber: order.orderNumber },
    });

    revalidatePath(`/admin/orders/${parsed.data.id}`);
    return actionOk(null);
  });
}

export async function resendInvoiceAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = invoiceIdSchema.safeParse(input);
    if (!parsed.success) return actionError("Order not found.");

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id).lean();
    if (!order) return actionError("Order not found.");
    if (!order.customer.email) return actionError("This customer has no email address.");

    const invoice = await getLatestInvoiceByOrderId(String(order._id));
    if (!invoice) return actionError("Invoice not found.");

    const [general, delivery] = await Promise.all([
      getSetting("general"),
      getOrCreateDeliveryToken(String(invoice._id)),
    ]);
    const secret = getInvoiceSigningSecret();
    const pin = order.deliveryCodeHash
      ? deliveryPinForOrder(secret, {
          _id: order._id,
          deliveryCodeVersion: order.deliveryCodeVersion,
        })
      : "";
    const symbol = general.currencySymbol;
    const decimals = ["$", "£", "€"].includes(symbol) ? 2 : 0;
    const invoiceUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/invoice/${order.token}`;

    const result = await sendTemplatedEmail({
      templateKey: "order_confirmation",
      to: order.customer.email,
      variables: {
        customerName: order.customer.name,
        orderNumber: order.orderNumber,
        orderTotal: `${symbol}${order.total.toFixed(decimals)}`,
        invoiceUrl,
      },
      orderId: String(order._id),
      sentBy: session.email,
      invoice: {
        invoiceNumber: String(invoice.invoiceNumber ?? ""),
        orderNumber: order.orderNumber,
        snapshot: toInvoiceSnapshot(invoice),
        deliveryToken: delivery?.token,
        pin,
        issuedAt: new Date(String(invoice.issuedAt ?? Date.now())),
      },
    });

    if (!result.ok) return actionError(result.error);

    await recordAudit({
      actor: session,
      action: "invoice.resent",
      entity: "Invoice",
      entityId: String(invoice._id ?? ""),
      summary: `Invoice resent for order ${order.orderNumber}`,
      metadata: { orderNumber: order.orderNumber },
    });
    return actionOk(null);
  });
}

export async function unlockDeliveryCodeAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = invoiceIdSchema.safeParse(input);
    if (!parsed.success) return actionError("Order not found.");

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    await unlockDeliveryCode(String(order._id));

    await recordAudit({
      actor: session,
      action: "delivery.pin_unlocked",
      entity: "Order",
      entityId: String(order._id),
      summary: `Delivery code unlocked for order ${order.orderNumber}`,
      metadata: { orderNumber: order.orderNumber },
    });
    return actionOk(null);
  });
}

export async function retryOutboxMessageAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    const session = await requirePermission("orders:write");
    const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return actionError("Message not found.");

    const retried = await retryOutboxMessage(parsed.data.id);
    if (!retried) return actionError("This message can not be retried.");
    await processOutbox(5);

    await recordAudit({
      actor: session,
      action: "send",
      entity: "whatsapp",
      entityId: parsed.data.id,
      summary: "Retried a WhatsApp outbox message",
    });
    return actionOk(null);
  });
}

export async function deleteOrderAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("orders:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) return actionError("Invalid order.");

    await connectToDatabase();
    const order = await Order.findById(parsed.data.id);
    if (!order) return actionError("Order not found.");

    await order.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "order",
      entityId: parsed.data.id,
      summary: `Deleted order ${order.orderNumber}`,
      before: { orderNumber: order.orderNumber, status: order.status, total: order.total },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.id}`);
    return actionOk(null);
  });
}

const bulkOrderDeleteSchema = z.object({
  ids: z.array(idSchema).min(1, "Select at least one order."),
});

export async function bulkDeleteOrdersAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("orders:write");
    const parsed = bulkOrderDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid orders.");

    await connectToDatabase();
    const { ids } = parsed.data;
    const orders = await Order.find({ _id: { $in: ids } });
    if (!orders.length) return actionError("No matching orders were found.");

    let deleted = 0;

    for (const order of orders) {
      await order.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "order",
      entityId: null,
      summary: `Bulk deleted ${deleted} order${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    return actionOk({ deleted });
  });
}

export async function bulkDeleteOrdersFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkDeleteOrdersAction({ ids, intent });
}
