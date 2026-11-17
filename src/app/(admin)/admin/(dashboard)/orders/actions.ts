"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { recordAudit } from "@/lib/admin/audit";
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
    if (
      nextStatus === "delivered" &&
      order.paymentStatus === "unpaid" &&
      order.paymentMethod === "cash_on_delivery"
    ) {
      order.paymentStatus = "paid";
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
