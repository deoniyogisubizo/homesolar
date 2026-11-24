import "server-only";

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { MessageOutbox } from "@/models/MessageOutbox";
import { Order } from "@/models/Order";
import { getSetting } from "@/lib/admin/settings";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { normalizePhone } from "@/lib/whatsapp-core";
import { getSiteUrl } from "@/lib/site";

export type EnqueueMessageInput = {
  orderId?: string | null;
  orderNumber: string;
  event: string;
  recipient: string;
  templateName: string;
  languageCode: string;
  variables: string[];
  idempotencyKey: string;
  createdBy?: string;
};

export type ProcessOutboxResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: boolean;
  reason?: string;
};

const MAX_ATTEMPTS = 5;

function money(value: number, symbol: string): string {
  const decimals = ["$", "£", "€"].includes(symbol) ? 2 : 0;
  return `${symbol}${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function orderedTemplateVariables(
  mapping: Record<string, string>,
  values: Record<string, string>,
): string[] {
  const entries = Object.entries(mapping)
    .map(([name, position]) => ({ name, position: Number.parseInt(position, 10) }))
    .filter((entry) => Number.isFinite(entry.position) && entry.position > 0)
    .sort((a, b) => a.position - b.position);

  const size = entries.reduce((max, entry) => Math.max(max, entry.position), 0);
  const variables = Array.from({ length: size }, () => "");
  for (const entry of entries) {
    variables[entry.position - 1] = values[entry.name] ?? "";
  }
  return variables;
}

export async function enqueueOutboxMessage(input: EnqueueMessageInput): Promise<boolean> {
  const recipient = normalizePhone(input.recipient);
  if (!recipient || !input.templateName.trim()) return false;

  await connectToDatabase();
  try {
    const result = await MessageOutbox.updateOne(
      { idempotencyKey: input.idempotencyKey },
      {
        $setOnInsert: {
          orderId: input.orderId ?? null,
          orderNumber: input.orderNumber,
          event: input.event,
          recipient,
          templateName: input.templateName.trim(),
          languageCode: input.languageCode || "en",
          variables: input.variables,
          status: "pending",
          attempts: 0,
          maxAttempts: MAX_ATTEMPTS,
          nextAttemptAt: new Date(),
          lastError: "",
          providerMessageId: "",
          deliveryStatus: "",
          sentAt: null,
          idempotencyKey: input.idempotencyKey,
          createdBy: input.createdBy ?? "system",
        },
      },
      { upsert: true },
    );
    return result.upsertedCount > 0;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return false;
    }
    throw error;
  }
}

function customerValues(
  order: {
    customer: { name: string; phone: string };
    orderNumber: string;
    total: number;
  },
  storeName: string,
  primaryNumber: string,
  invoiceUrl: string,
  symbol: string,
): Record<string, string> {
  return {
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    orderNumber: order.orderNumber,
    storeName,
    total: money(order.total, symbol),
    orderTotal: money(order.total, symbol),
    primaryNumber,
    supportPhone: primaryNumber,
    invoiceUrl,
    orderUrl: invoiceUrl,
  };
}

export async function enqueueOrderPlacementMessages(orderId: string): Promise<number> {
  const [order, invoices, general, contact] = await Promise.all([
    Order.findById(orderId).lean(),
    getSetting("invoices"),
    getSetting("general"),
    getSetting("contact"),
  ]);
  if (!order) return 0;
  if (!invoices.whatsappApi.enabled || !invoices.autoSend.onPlacement) return 0;

  const invoiceUrl = `${getSiteUrl()}/invoice/${order.token}`;
  const values = customerValues(
    order,
    general.storeName,
    contact.primaryPhone || contact.whatsappNumber,
    invoiceUrl,
    general.currencySymbol,
  );
  const jobId = String(order._id);
  let queued = 0;

  if (order.whatsappOptIn !== false) {
    const template = invoices.templates.order_invoice_customer;
    const created = await enqueueOutboxMessage({
      orderId: jobId,
      orderNumber: order.orderNumber,
      event: "order_placed",
      recipient: order.customer.phone,
      templateName: template.metaTemplateName,
      languageCode: template.languageCode,
      variables: orderedTemplateVariables(template.variableMapping, values),
      idempotencyKey: `order:${jobId}:customer:order_placed`,
      createdBy: "storefront",
    });
    if (created) queued += 1;
  }

  const staffTemplate = invoices.templates.order_invoice_staff;
  const staffValues = {
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    orderNumber: order.orderNumber,
    storeName: general.storeName,
    total: money(order.total, general.currencySymbol),
    orderTotal: money(order.total, general.currencySymbol),
    invoiceUrl,
    primaryNumber: contact.primaryPhone,
  };
  for (const recipient of invoices.recipients) {
    if (!recipient.events.includes("new_order")) continue;
    const created = await enqueueOutboxMessage({
      orderId: jobId,
      orderNumber: order.orderNumber,
      event: "staff_new_order",
      recipient: recipient.number,
      templateName: staffTemplate.metaTemplateName,
      languageCode: staffTemplate.languageCode,
      variables: orderedTemplateVariables(staffTemplate.variableMapping, staffValues),
      idempotencyKey: `order:${jobId}:staff:${normalizePhone(recipient.number) ?? recipient.number}`,
      createdBy: "storefront",
    });
    if (created) queued += 1;
  }

  return queued;
}

export async function enqueueOrderConfirmationMessages(orderId: string): Promise<number> {
  const [order, invoices, general, contact] = await Promise.all([
    Order.findById(orderId).lean(),
    getSetting("invoices"),
    getSetting("general"),
    getSetting("contact"),
  ]);
  if (!order || order.whatsappOptIn === false) return 0;
  if (!invoices.whatsappApi.enabled || !invoices.autoSend.onConfirmation) return 0;

  const invoiceUrl = `${getSiteUrl()}/invoice/${order.token}`;
  const values = customerValues(
    order,
    general.storeName,
    contact.primaryPhone || contact.whatsappNumber,
    invoiceUrl,
    general.currencySymbol,
  );
  const template = invoices.templates.order_invoice_customer;
  const created = await enqueueOutboxMessage({
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    event: "order_confirmed",
    recipient: order.customer.phone,
    templateName: template.metaTemplateName,
    languageCode: template.languageCode,
    variables: orderedTemplateVariables(template.variableMapping, values),
    idempotencyKey: `order:${String(order._id)}:customer:order_confirmed`,
    createdBy: "admin",
  });
  return created ? 1 : 0;
}

export async function enqueueDeliveryMessage(orderId: string): Promise<number> {
  const [order, invoices, general, contact] = await Promise.all([
    Order.findById(orderId).lean(),
    getSetting("invoices"),
    getSetting("general"),
    getSetting("contact"),
  ]);
  if (!order || order.whatsappOptIn === false) return 0;
  if (!invoices.whatsappApi.enabled || !invoices.autoSend.onDelivery) return 0;

  const invoiceUrl = `${getSiteUrl()}/order/${encodeURIComponent(order.orderNumber)}?t=${encodeURIComponent(order.token)}`;
  const values = customerValues(
    order,
    general.storeName,
    contact.primaryPhone || contact.whatsappNumber,
    invoiceUrl,
    general.currencySymbol,
  );
  const template = invoices.templates.order_delivered_customer;
  const created = await enqueueOutboxMessage({
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    event: "order_delivered",
    recipient: order.customer.phone,
    templateName: template.metaTemplateName,
    languageCode: template.languageCode,
    variables: orderedTemplateVariables(template.variableMapping, values),
    idempotencyKey: `order:${String(order._id)}:customer:order_delivered`,
    createdBy: "delivery",
  });
  return created ? 1 : 0;
}

export async function processOutbox(limit = 20): Promise<ProcessOutboxResult> {
  const provider = getWhatsAppProvider();
  const config = getWhatsAppConfig();
  if (!config.enabled) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "WHATSAPP_ENABLED is not true.",
    };
  }
  if (!provider.configured) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "WhatsApp Cloud API credentials are not configured.",
    };
  }

  await connectToDatabase();
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < limit; index += 1) {
    const now = new Date();
    const message = await MessageOutbox.findOneAndUpdate(
      {
        status: { $in: ["pending", "failed"] },
        nextAttemptAt: { $lte: now },
        attempts: { $lt: MAX_ATTEMPTS },
      },
      { $set: { status: "sending" }, $inc: { attempts: 1 } },
      { sort: { nextAttemptAt: 1 }, new: true },
    );
    if (!message) break;
    processed += 1;

    const result = await provider.sendTemplate({
      to: message.recipient,
      templateName: message.templateName,
      languageCode: message.languageCode,
      variables: message.variables,
    });

    if (result.ok) {
      sent += 1;
      message.status = "sent";
      message.providerMessageId = result.messageId;
      message.sentAt = new Date();
      message.lastError = "";
      message.nextAttemptAt = new Date();
      await message.save();
      continue;
    }

    failed += 1;
    const attempts = Number(message.attempts ?? 1);
    const willRetry = result.retryable && attempts < MAX_ATTEMPTS;
    message.status = willRetry ? "pending" : "failed";
    message.lastError = result.error.slice(0, 1000);
    message.nextAttemptAt = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60 * 1000);
    await message.save();
  }

  return { processed, sent, failed, skipped: false };
}

export async function retryOutboxMessage(id: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(id)) return false;
  await connectToDatabase();
  const result = await MessageOutbox.updateOne(
    { _id: id, status: { $in: ["failed", "pending", "skipped"] } },
    {
      $set: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: "",
      },
    },
  );
  return result.modifiedCount > 0;
}

export async function outboxMessagesForOrder(orderId: string) {
  await connectToDatabase();
  return MessageOutbox.find({ orderId }).sort({ createdAt: -1 }).limit(30).lean();
}
