import { COMMERCE_CONFIG } from "@/lib/commerce-config";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { getInvoiceSigningSecret, deriveDeliveryPin, hashDeliveryPin, verifyDeliveryPin } from "@/lib/invoices";

const { delivery } = COMMERCE_CONFIG;

export interface ConfirmDeliveryInput {
  orderId: string;
  deliveryToken: string;
  pin: string;
  confirmedBy: string;
  collectedAmount: number;
  collectedMethod: "cash_on_delivery" | "mobile_money";
  coordinates: { lat: number; lng: number; accuracy?: number | null } | null;
  userAgent: string;
  ip: string;
}

export interface ConfirmDeliveryResult {
  ok: boolean;
  error?: string;
  locked?: boolean;
  alreadyDelivered?: boolean;
  orderNumber?: string;
  deliveredAt?: Date | null;
  mismatch?: boolean;
}

export interface RegenerateDeliveryCodeResult {
  ok: boolean;
  error?: string;
  newPin?: string;
}

export interface UnlockDeliveryCodeResult {
  ok: boolean;
  error?: string;
}

export type DistrictDeliveryConfig = {
  baseFee: number;
  perKgFee: number;
  standardDays: number;
  expressDays: number;
};

export type DeliveryCalculationInput = {
  district: string;
  weightKg: number;
  itemsValue: number;
  isExpress?: boolean;
  cutoffHour?: number;
};

export type DeliveryCalculationResult = {
  fee: number;
  standardDays: number;
  expressDays: number;
  estimatedDeliveryDate: Date;
  isFreeShipping: boolean;
  freeShippingRemaining: number;
  cutoffPassed: boolean;
};

const DISTRICT_CONFIG: Record<string, DistrictDeliveryConfig> = delivery.districts;

function normalizeDistrict(district: string): string {
  return district.toLowerCase().trim().replace(/\s+/g, "");
}

function getDistrictConfig(district: string): DistrictDeliveryConfig | null {
  const normalized = normalizeDistrict(district);
  return DISTRICT_CONFIG[normalized] ?? null;
}

function addBusinessDays(startDate: Date, days: number, weekendsCount = false): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (weekendsCount || (result.getDay() !== 0 && result.getDay() !== 6)) {
      added++;
    }
  }
  return result;
}

function isCutoffPassed(cutoffHour: number): boolean {
  const now = new Date();
  return now.getHours() >= cutoffHour;
}

export function calculateDelivery(input: DeliveryCalculationInput): DeliveryCalculationResult {
  const { district, weightKg, itemsValue, isExpress = false, cutoffHour = delivery.cutoffHour } = input;

  const config = getDistrictConfig(district);
  const freeShippingThreshold = delivery.freeShippingThreshold;

  if (!config) {
    return {
      fee: 5000,
      standardDays: 3,
      expressDays: 2,
      estimatedDeliveryDate: addBusinessDays(new Date(), 3, delivery.weekendsCount),
      isFreeShipping: itemsValue >= freeShippingThreshold,
      freeShippingRemaining: Math.max(0, freeShippingThreshold - itemsValue),
      cutoffPassed: isCutoffPassed(cutoffHour),
    };
  }

  const baseFee = config.baseFee;
  const weightFee = weightKg * config.perKgFee;
  const calculatedFee = baseFee + weightFee;

  const isFreeShipping = itemsValue >= freeShippingThreshold;
  const finalFee = isFreeShipping ? 0 : calculatedFee;

  const cutoffPassed = isCutoffPassed(cutoffHour);
  const shipDate = cutoffPassed ? addBusinessDays(new Date(), 1, delivery.weekendsCount) : new Date();

  const transitDays = isExpress ? config.expressDays : config.standardDays;
  const estimatedDeliveryDate = addBusinessDays(shipDate, transitDays, delivery.weekendsCount);

  return {
    fee: finalFee,
    standardDays: config.standardDays,
    expressDays: config.expressDays,
    estimatedDeliveryDate,
    isFreeShipping,
    freeShippingRemaining: Math.max(0, freeShippingThreshold - itemsValue),
    cutoffPassed,
  };
}

export function getDistrictList(): Array<{ key: string; name: string; config: DistrictDeliveryConfig }> {
  return Object.entries(DISTRICT_CONFIG).map(([key, config]) => ({
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    config,
  }));
}

export function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString("en-RW", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function getDeliveryEtaMessage(result: DeliveryCalculationResult): string {
  const dateStr = formatDeliveryDate(result.estimatedDeliveryDate);
  const speed = result.fee === 0 ? "Free" : result.cutoffPassed ? "Standard" : "Standard";
  return `${speed} delivery by ${dateStr}`;
}

export async function confirmDelivery(input: ConfirmDeliveryInput): Promise<ConfirmDeliveryResult> {
  await connectToDatabase();

  const order = await Order.findById(input.orderId).lean();
  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  // Check if already delivered
  if (order.status === "delivered") {
    return {
      ok: true,
      alreadyDelivered: true,
      orderNumber: order.orderNumber,
      deliveredAt: order.deliveredAt,
    };
  }

  // Check if delivery code is locked
  if (order.deliveryCodeLockedUntil && new Date(order.deliveryCodeLockedUntil) > new Date()) {
    return { ok: false, error: "Delivery code is locked due to too many failed attempts.", locked: true };
  }

  const secret = getInvoiceSigningSecret();
  const version = Number(order.deliveryCodeVersion ?? 0);

  // Verify the PIN
  const isValidPin = verifyDeliveryPin(secret, input.orderId, input.pin, order.deliveryCodeHash, version);
  if (!isValidPin) {
    // Increment attempts and potentially lock
    const newAttempts = Number(order.deliveryCodeAttempts ?? 0) + 1;
    const update: Record<string, unknown> = { deliveryCodeAttempts: newAttempts };

    if (newAttempts >= 5) {
      update.deliveryCodeLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
    }

    await Order.updateOne({ _id: input.orderId }, { $set: update });
    return { ok: false, error: "Invalid delivery code.", locked: newAttempts >= 5 };
  }

  // PIN is valid - mark as delivered
  const deliveredAt = new Date();
  const mismatch = input.collectedAmount > 0 && order.total > 0 && Math.abs(input.collectedAmount - order.total) > 100;

  await Order.updateOne(
    { _id: input.orderId },
    {
      $set: {
        status: "delivered",
        paymentStatus: "paid",
        deliveredAt,
        deliveryProof: {
          confirmedBy: input.confirmedBy,
          collectedAmount: input.collectedAmount,
          collectedMethod: input.collectedMethod,
          coordinates: input.coordinates,
          userAgent: input.userAgent,
          ip: input.ip,
          confirmedAt: deliveredAt,
        },
        deliveryCodeAttempts: 0,
        deliveryCodeLockedUntil: null,
        deliveryMismatch: mismatch,
      },
      $push: {
        statusHistory: {
          status: "delivered",
          at: deliveredAt,
          by: input.confirmedBy,
          note: "Delivery confirmed via customer PIN.",
        },
      },
    },
  );

  return {
    ok: true,
    orderNumber: order.orderNumber,
    deliveredAt,
    mismatch,
  };
}

export async function regenerateDeliveryCode(orderId: string): Promise<RegenerateDeliveryCodeResult> {
  await connectToDatabase();

  const order = await Order.findById(orderId).lean();
  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  const secret = getInvoiceSigningSecret();
  const newVersion = Number(order.deliveryCodeVersion ?? 0) + 1;
  const newPin = deriveDeliveryPin(secret, orderId, newVersion);
  const newHash = hashDeliveryPin(secret, orderId, newPin, newVersion);

  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        deliveryCodeVersion: newVersion,
        deliveryCodeHash: newHash,
        deliveryCodeAttempts: 0,
        deliveryCodeLockedUntil: null,
      },
    },
  );

  return { ok: true, newPin };
}

export async function unlockDeliveryCode(orderId: string): Promise<UnlockDeliveryCodeResult> {
  await connectToDatabase();

  const order = await Order.findById(orderId).lean();
  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        deliveryCodeAttempts: 0,
        deliveryCodeLockedUntil: null,
      },
    },
  );

  return { ok: true };
}