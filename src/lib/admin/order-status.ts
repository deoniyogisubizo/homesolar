export const ORDER_STATUSES = [
  "new",
  "contacted",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const REVENUE_STATUSES: OrderStatus[] = [
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["", "cash_on_delivery", "mobile_money", "bank_transfer", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["contacted", "cancelled"],
  contacted: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

export function statusTone(status: OrderStatus) {
  if (status === "delivered") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  if (status === "out_for_delivery") return "info" as const;
  if (status === "new") return "warning" as const;
  return "neutral" as const;
}

export function paymentStatusTone(status: PaymentStatus) {
  if (status === "paid") return "success" as const;
  if (status === "refunded") return "danger" as const;
  return "warning" as const;
}
