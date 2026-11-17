import "server-only";

import { Product } from "@/models/Product";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order, type OrderDocument, type OrderItem } from "@/models/Order";

export class InsufficientStockError extends Error {
  constructor(public itemName: string) {
    super(`Insufficient stock for ${itemName}.`);
    this.name = "InsufficientStockError";
  }
}

type LeanOrder = OrderDocument & { _id: unknown };

async function changeItemStock(
  item: Pick<OrderItem, "productId" | "variantSku" | "name" | "quantity">,
  direction: 1 | -1,
  actorEmail: string,
  note: string,
) {
  const delta = direction * item.quantity;
  const variantSku = item.variantSku ?? null;
  const filter: Record<string, unknown> = { _id: item.productId };

  if (variantSku) {
    filter.variants = {
      $elemMatch: {
        sku: variantSku,
        ...(direction === -1 ? { stock: { $gte: item.quantity } } : {}),
      },
    };
  } else if (direction === -1) {
    filter.stock = { $gte: item.quantity };
  }

  const update = variantSku
    ? { $inc: { "variants.$[variant].stock": delta } }
    : { $inc: { stock: delta } };

  const product = await Product.findOneAndUpdate(filter, update, {
    new: true,
    arrayFilters: variantSku ? [{ "variant.sku": variantSku }] : undefined,
  }).lean();

  if (!product) throw new InsufficientStockError(item.name);

  const variant = variantSku ? product.variants.find((entry) => entry.sku === variantSku) : null;
  const stockAfter = variant ? variant.stock : product.stock;

  if (!variant) {
    const threshold = product.lowStockThreshold ?? 5;
    const status = stockAfter <= 0 ? "out_of_stock" : stockAfter <= threshold ? "low_stock" : "in_stock";
    await Product.updateOne({ _id: product._id }, { $set: { status } });
  }

  await InventoryMovement.create({
    productId: item.productId,
    variantSku,
    delta,
    stockAfter,
    reason: direction === -1 ? "sale" : "order_cancelled",
    actorEmail,
    note,
  });
}

async function applyOrderItems(
  order: LeanOrder,
  direction: 1 | -1,
  actorEmail: string,
  note: string,
) {
  const applied: OrderItem[] = [];
  try {
    for (const item of order.items) {
      await changeItemStock(item, direction, actorEmail, note);
      applied.push(item);
    }
  } catch (error) {
    for (const item of applied) {
      await changeItemStock(item, direction === -1 ? 1 : -1, actorEmail, `Rollback for ${order.orderNumber}`);
    }
    throw error;
  }
}

export async function deductOrderStock(orderId: string, actorEmail: string) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockDeducted: { $ne: true } },
    { $set: { stockDeducted: true } },
    { new: true },
  ).lean();
  if (!order) return false;

  try {
    await applyOrderItems(order as LeanOrder, -1, actorEmail, `Confirmed order ${order.orderNumber}`);
    return true;
  } catch (error) {
    await Order.updateOne({ _id: orderId }, { $set: { stockDeducted: false } });
    throw error;
  }
}

export async function restoreOrderStock(orderId: string, actorEmail: string) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockDeducted: true },
    { $set: { stockDeducted: false } },
    { new: true },
  ).lean();
  if (!order) return false;

  await applyOrderItems(order as LeanOrder, 1, actorEmail, `Cancelled order ${order.orderNumber}`);
  return true;
}

export async function setOrderStockDeducted(orderId: string, deducted: boolean, actorEmail: string) {
  return deducted
    ? deductOrderStock(orderId, actorEmail)
    : restoreOrderStock(orderId, actorEmail);
}
