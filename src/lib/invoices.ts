import "server-only";

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { InvoiceCounter } from "@/models/InvoiceCounter";
import { Order } from "@/models/Order";
import { getSetting } from "@/lib/admin/settings";
import { decryptSecret, encryptSecret } from "@/lib/admin/crypto";
import type { InvoiceSettings } from "@/lib/admin/settings-defaults";

export const INVOICE_TOKEN_BYTES = 32;
export const DELIVERY_TOKEN_BYTES = 32;
export const DEFAULT_TOKEN_EXPIRY_DAYS = 60;
export const DELIVERY_PIN_LENGTH = 6;

export const INVOICE_KINDS = ["order_invoice"] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_STATUSES = ["issued", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoiceSellerSnapshot = {
  businessName: string;
  tin: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  pricesIncludeVat: boolean;
  vatRate: number;
};

export type InvoiceCustomerSnapshot = {
  name: string;
  phone: string;
  email: string;
};

export type InvoiceDeliverySnapshot = {
  line1: string;
  district: string;
  sector: string;
  landmark: string;
  city: string;
  notes: string;
};

export type InvoiceItemSnapshot = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  variantSku?: string | null;
  color?: string | null;
  size?: string | null;
  options: string[];
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  lineTotal: number;
  campaignId?: string | null;
  campaignName?: string | null;
  discount: number;
};

export type InvoiceTotals = {
  subtotal: number;
  campaignDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
  total: number;
  amountDue: number;
};

export type InvoicePaymentSnapshot = {
  method: string;
  status: string;
};

export type InvoiceSnapshot = {
  seller: InvoiceSellerSnapshot;
  customer: InvoiceCustomerSnapshot;
  delivery: InvoiceDeliverySnapshot;
  items: InvoiceItemSnapshot[];
  totals: InvoiceTotals;
  payment: InvoicePaymentSnapshot;
  notes: string;
  terms: string;
};

export type InvoiceAccessToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export type IssuedInvoice = {
  invoice: Record<string, unknown>;
  snapshot: InvoiceSnapshot;
  accessToken: InvoiceAccessToken;
  deliveryToken: InvoiceAccessToken;
  reissued: boolean;
};

type InvoiceRecord = Record<string, unknown> & {
  _id?: Types.ObjectId;
  invoiceNumber?: string;
  revision?: number;
  status?: string;
  accessTokenHash?: string;
  accessTokenExpiresAt?: Date;
  deliveryTokenHash?: string;
  deliveryTokenEncrypted?: string;
  deliveryTokenExpiresAt?: Date;
};

export function toInvoiceSnapshot(invoice: Record<string, unknown>): InvoiceSnapshot {
  const seller = (invoice.seller ?? {}) as Partial<InvoiceSellerSnapshot>;
  const customer = (invoice.customer ?? {}) as Partial<InvoiceCustomerSnapshot>;
  const delivery = (invoice.delivery ?? {}) as Partial<InvoiceDeliverySnapshot>;
  const totals = (invoice.totals ?? {}) as Partial<InvoiceTotals>;
  const payment = (invoice.payment ?? {}) as Partial<InvoicePaymentSnapshot>;

  return {
    seller: {
      businessName: seller.businessName ?? "",
      tin: seller.tin ?? "",
      address: seller.address ?? "",
      phone: seller.phone ?? "",
      email: seller.email ?? "",
      logo: seller.logo ?? "",
      pricesIncludeVat: Boolean(seller.pricesIncludeVat),
      vatRate: Number(seller.vatRate ?? 0),
    },
    customer: {
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
    },
    delivery: {
      line1: delivery.line1 ?? "",
      district: delivery.district ?? "",
      sector: delivery.sector ?? "",
      landmark: delivery.landmark ?? "",
      city: delivery.city ?? "",
      notes: delivery.notes ?? "",
    },
    items: ((invoice.items ?? []) as InvoiceItemSnapshot[]).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      slug: item.slug,
      image: item.image,
      variantSku: item.variantSku ?? null,
      color: item.color ?? null,
      size: item.size ?? null,
      options: item.options ?? [],
      unitPrice: Number(item.unitPrice ?? 0),
      originalPrice: Number(item.originalPrice ?? 0),
      quantity: Number(item.quantity ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      campaignId: item.campaignId ? String(item.campaignId) : null,
      campaignName: item.campaignName ?? null,
      discount: Number(item.discount ?? 0),
    })),
    totals: {
      subtotal: Number(totals.subtotal ?? 0),
      campaignDiscount: Number(totals.campaignDiscount ?? 0),
      couponDiscount: Number(totals.couponDiscount ?? 0),
      deliveryFee: Number(totals.deliveryFee ?? 0),
      total: Number(totals.total ?? 0),
      amountDue: Number(totals.amountDue ?? totals.total ?? 0),
    },
    payment: {
      method: payment.method ?? "",
      status: payment.status ?? "",
    },
    notes: typeof invoice.notes === "string" ? invoice.notes : "",
    terms: typeof invoice.terms === "string" ? invoice.terms : "",
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(candidateHash: string, expectedHash: string): boolean {
  const left = Buffer.from(candidateHash);
  const right = Buffer.from(expectedHash);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function getInvoiceSigningSecret(): string {
  const configured = process.env.INVOICE_SIGNING_SECRET?.trim();
  if (configured) return configured;
  const appSecret = process.env.APP_SECRET?.trim();
  if (appSecret) return appSecret;
  return "homesolar-development-invoice-signing";
}

/**
 * The delivery code is derived from the order id and a rotation counter. Only
 * its HMAC is stored, so staff can never read the code, while the customer
 * copy can be rendered again without changing the printed code.
 */
export function deriveDeliveryPin(secret: string, orderId: string, version = 0): string {
  const digest = createHmac("sha256", secret).update(`delivery-pin:${orderId}:${version}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(DELIVERY_PIN_LENGTH, "0");
}

export function hashDeliveryPin(secret: string, orderId: string, pin: string, version = 0): string {
  const key = secret || getInvoiceSigningSecret();
  return createHmac("sha256", key).update(`${orderId}:${version}:${pin}`).digest("hex");
}

export function verifyDeliveryPin(
  secret: string,
  orderId: string,
  pin: string,
  expectedHash: string,
  version = 0,
): boolean {
  if (!secret || !expectedHash) return false;
  const candidateHash = hashDeliveryPin(secret, orderId, pin, version);
  return tokensMatch(candidateHash, expectedHash);
}

export function deliveryPinForOrder(
  secret: string,
  order: { _id: unknown; deliveryCodeVersion?: number | null },
): string {
  return deriveDeliveryPin(secret, String(order._id), Number(order.deliveryCodeVersion ?? 0));
}

export function generateDeliveryPin(): string {
  return String(randomInt(1_000_000)).padStart(DELIVERY_PIN_LENGTH, "0");
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  return getSetting("invoices");
}

function newToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

function expiryFromNow(days: number): Date {
  return new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
}

function isFuture(date: Date | undefined | null): boolean {
  return Boolean(date && new Date(date).getTime() > Date.now());
}

async function nextInvoiceNumber(prefix: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const counter = await InvoiceCounter.findOneAndUpdate(
        { prefix },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const seq = Number(counter?.seq ?? 1);
      return `${prefix}-${String(seq).padStart(6, "0")}`;
    } catch (error) {
      const duplicate =
        typeof error === "object" && error !== null && "code" in error && error.code === 11000;
      if (!duplicate || attempt === 4) throw error;
    }
  }
  throw new Error("Unable to allocate an invoice number.");
}

function sellerFromSettings(settings: InvoiceSettings): InvoiceSellerSnapshot {
  return {
    businessName: settings.business.businessName,
    tin: settings.business.tin,
    address: settings.business.address,
    phone: settings.business.phone,
    email: settings.business.email,
    logo: settings.business.logo,
    pricesIncludeVat: settings.business.pricesIncludeVat,
    vatRate: settings.business.vatRate,
  };
}

async function ensureOrderDeliveryCode(orderId: string): Promise<void> {
  const order = await Order.findById(orderId).lean();
  if (!order) return;
  const secret = getInvoiceSigningSecret();
  const version = Number(order.deliveryCodeVersion ?? 0);
  const hasHash = Boolean(order.deliveryCodeHash);
  if (hasHash) return;
  const pin = deriveDeliveryPin(secret, orderId, version);
  await Order.updateOne(
    { _id: order._id, deliveryCodeHash: { $in: ["", null] } },
    {
      $set: {
        deliveryCodeHash: hashDeliveryPin(secret, orderId, pin, version),
        deliveryCodeVersion: version,
        deliveryCodeAttempts: 0,
        deliveryCodeLockedUntil: null,
      },
    },
  );
}

function storedDeliveryToken(previous: InvoiceRecord | null, settings: InvoiceSettings): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  if (previous?.deliveryTokenEncrypted && isFuture(previous.deliveryTokenExpiresAt)) {
    const token = decryptSecret(previous.deliveryTokenEncrypted);
    if (token) {
      return {
        token,
        tokenHash: String(previous.deliveryTokenHash ?? hashToken(token)),
        expiresAt: new Date(previous.deliveryTokenExpiresAt as Date),
      };
    }
  }
  const token = newToken(DELIVERY_TOKEN_BYTES);
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: expiryFromNow(settings.tokenExpiryDays || DEFAULT_TOKEN_EXPIRY_DAYS),
  };
}

function accessTokenForReissue(previous: InvoiceRecord | null, settings: InvoiceSettings): InvoiceAccessToken {
  if (previous?.accessTokenHash && isFuture(previous.accessTokenExpiresAt)) {
    return {
      token: "",
      tokenHash: String(previous.accessTokenHash),
      expiresAt: new Date(previous.accessTokenExpiresAt as Date),
    };
  }
  const token = newToken(INVOICE_TOKEN_BYTES);
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: expiryFromNow(settings.tokenExpiryDays || DEFAULT_TOKEN_EXPIRY_DAYS),
  };
}

/**
 * Issues the first invoice for an order, or creates a new revision with the
 * same invoice number. Revisions keep the same access and delivery tokens so
 * that printed QR codes and links keep working.
 */
export async function issueOrderInvoice(orderId: string): Promise<IssuedInvoice> {
  await connectToDatabase();
  const settings = await getInvoiceSettings();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const order = await Order.findById(orderId).lean();
    if (!order) throw new Error("Order not found.");

    const previous = (await Invoice.findOne({ orderId }).sort({ revision: -1 }).lean()) as
      | InvoiceRecord
      | null;

    const revision = previous ? Number(previous.revision ?? 0) + 1 : 1;
    const invoiceNumber =
      previous?.invoiceNumber ?? (await nextInvoiceNumber(settings.invoicePrefix.trim() || "INV"));

    const accessToken = previous
      ? accessTokenForReissue(previous, settings)
      : (() => {
          const token = newToken(INVOICE_TOKEN_BYTES);
          return {
            token,
            tokenHash: hashToken(token),
            expiresAt: expiryFromNow(settings.tokenExpiryDays || DEFAULT_TOKEN_EXPIRY_DAYS),
          };
        })();

    const deliveryToken = previous
      ? storedDeliveryToken(previous, settings)
      : (() => {
          const token = newToken(DELIVERY_TOKEN_BYTES);
          return {
            token,
            tokenHash: hashToken(token),
            expiresAt: expiryFromNow(settings.tokenExpiryDays || DEFAULT_TOKEN_EXPIRY_DAYS),
          };
        })();

    if (!order.deliveryCodeHash) {
      await ensureOrderDeliveryCode(orderId);
    }

    const amountDue =
      order.paymentStatus === "paid" ? 0 : Number(order.total ?? 0);

    try {
      const invoice = await Invoice.create({
        invoiceNumber,
        orderId: order._id,
        orderNumber: order.orderNumber,
        revision,
        kind: "order_invoice",
        status: "issued",
        issuedAt: new Date(),
        seller: sellerFromSettings(settings),
        customer: {
          name: order.customer?.name ?? "",
          phone: order.customer?.phone ?? "",
          email: order.customer?.email ?? "",
        },
        delivery: {
          line1: order.delivery?.line1 ?? "",
          district: order.delivery?.district ?? "",
          sector: order.delivery?.sector ?? "",
          landmark: order.delivery?.landmark ?? "",
          city: order.delivery?.city ?? "",
          notes: order.delivery?.notes ?? "",
        },
        items: (order.items ?? []).map((item) => ({
          productId: item.productId,
          name: item.name,
          slug: item.slug,
          image: item.image,
          variantSku: item.variantSku ?? null,
          color: item.color ?? null,
          size: item.size ?? null,
          options: item.options ?? [],
          unitPrice: item.unitPrice,
          originalPrice: item.originalPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          campaignId: item.campaignId ?? null,
          campaignName: item.campaignName ?? null,
          discount: item.discount ?? 0,
        })),
        totals: {
          subtotal: Number(order.subtotal ?? 0),
          campaignDiscount: Number(order.campaignDiscount ?? 0),
          couponDiscount: Number(order.couponDiscount ?? 0),
          deliveryFee: Number(order.shipping ?? 0),
          total: Number(order.total ?? 0),
          amountDue,
        },
        payment: {
          method: order.paymentMethod ?? "",
          status: order.paymentStatus ?? "unpaid",
        },
        notes: (order.notes ?? []).map((note) => note.body).filter(Boolean).join("\n"),
        terms: settings.terms,
        accessTokenHash: accessToken.tokenHash,
        accessTokenExpiresAt: accessToken.expiresAt,
        deliveryTokenHash: deliveryToken.tokenHash,
        deliveryTokenEncrypted: encryptSecret(deliveryToken.token),
        deliveryTokenExpiresAt: deliveryToken.expiresAt,
        pdf: null,
      });

      if (previous?._id) {
        await Invoice.updateOne({ _id: previous._id }, { $set: { status: "void" } });
      }

      return {
        invoice: invoice as unknown as Record<string, unknown>,
        snapshot: toInvoiceSnapshot(invoice as unknown as Record<string, unknown>),
        accessToken,
        deliveryToken,
        reissued: Boolean(previous),
      };
    } catch (error) {
      const duplicate =
        typeof error === "object" && error !== null && "code" in error && error.code === 11000;
      if (!duplicate || attempt === 4) throw error;
    }
  }

  throw new Error("Unable to issue the invoice.");
}

export async function getInvoiceByToken(token: string): Promise<Record<string, unknown> | null> {
  await connectToDatabase();
  const invoice = await Invoice.findOne({ accessTokenHash: hashToken(token) })
    .sort({ revision: -1 })
    .lean();
  if (!invoice || invoice.status === "void") return null;
  if (!isFuture(invoice.accessTokenExpiresAt)) return null;
  return invoice as unknown as Record<string, unknown>;
}

export async function getInvoiceByDeliveryToken(token: string): Promise<Record<string, unknown> | null> {
  await connectToDatabase();
  const invoice = await Invoice.findOne({ deliveryTokenHash: hashToken(token) })
    .sort({ revision: -1 })
    .lean();
  if (!invoice || invoice.status === "void") return null;
  if (!isFuture(invoice.deliveryTokenExpiresAt)) return null;
  return invoice as unknown as Record<string, unknown>;
}

export async function getInvoiceByOrderToken(orderToken: string): Promise<Record<string, unknown> | null> {
  await connectToDatabase();
  const order = await Order.findOne({ token: orderToken }).select("_id").lean();
  if (!order) return null;
  return getLatestInvoiceByOrderId(String(order._id));
}

export async function getLatestInvoiceByOrderId(orderId: string): Promise<Record<string, unknown> | null> {
  await connectToDatabase();
  const invoice = await Invoice.findOne({ orderId, status: "issued" }).sort({ revision: -1 }).lean();
  return invoice ? (invoice as unknown as Record<string, unknown>) : null;
}

export async function getLatestInvoiceRecord(orderId: string): Promise<InvoiceRecord | null> {
  await connectToDatabase();
  return (await Invoice.findOne({ orderId }).sort({ revision: -1 }).lean()) as InvoiceRecord | null;
}

/**
 * Returns the stable delivery token for an invoice. The raw token is kept
 * encrypted so PDF downloads and resends never invalidate a printed QR code.
 */
export async function getOrCreateDeliveryToken(invoiceId: string): Promise<{ token: string; expiresAt: Date } | null> {
  await connectToDatabase();
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;

  if (invoice.deliveryTokenEncrypted && isFuture(invoice.deliveryTokenExpiresAt)) {
    const token = decryptSecret(invoice.deliveryTokenEncrypted);
    if (token) return { token, expiresAt: new Date(invoice.deliveryTokenExpiresAt) };
  }

  const settings = await getInvoiceSettings();
  const token = newToken(DELIVERY_TOKEN_BYTES);
  invoice.deliveryTokenHash = hashToken(token);
  invoice.deliveryTokenEncrypted = encryptSecret(token);
  invoice.deliveryTokenExpiresAt = expiryFromNow(settings.tokenExpiryDays || DEFAULT_TOKEN_EXPIRY_DAYS);
  await invoice.save();
  return { token, expiresAt: invoice.deliveryTokenExpiresAt };
}

export async function getOrCreateDeliveryTokenForOrder(
  orderId: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  const invoice = await getLatestInvoiceByOrderId(orderId);
  if (!invoice?._id) return null;
  return getOrCreateDeliveryToken(String(invoice._id));
}

export async function regenerateDeliveryToken(
  invoiceId: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  await connectToDatabase();
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;
  const settings = await getInvoiceSettings();
  const token = newToken(DELIVERY_TOKEN_BYTES);
  invoice.deliveryTokenHash = hashToken(token);
  invoice.deliveryTokenEncrypted = encryptSecret(token);
  invoice.deliveryTokenExpiresAt = expiryFromNow(settings.tokenExpiryDays || DEFAULT_TOKEN_EXPIRY_DAYS);
  await invoice.save();
  return { token, expiresAt: invoice.deliveryTokenExpiresAt };
}
