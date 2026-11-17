import { Schema, model, models, type Model, type Types } from "mongoose";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/admin/order-status";

export type OrderChannel = "whatsapp" | "manual";

export type OrderItem = {
  productId: Types.ObjectId;
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
  campaignId?: Types.ObjectId | null;
  campaignName?: string | null;
  discount: number;
};

export type OrderNote = {
  body: string;
  by: string;
  at: Date;
};

export type OrderStatusEvent = {
  status: OrderStatus;
  at: Date;
  by: string;
  note?: string;
};

export type OrderWhatsApp = {
  number: string;
  message: string;
  clickCount: number;
  lastClickedAt?: Date | null;
};

export type OrderDocument = {
  orderNumber: string;
  token: string;
  idempotencyKey?: string | null;
  channel: OrderChannel;
  customerId?: Types.ObjectId | null;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  delivery: {
    line1: string;
    district: string;
    sector: string;
    landmark: string;
    city: string;
    notes: string;
  };
  items: OrderItem[];
  subtotal: number;
  campaignDiscount: number;
  couponDiscount: number;
  couponCode: string;
  couponId?: Types.ObjectId | null;
  shipping: number;
  shippingNote: string;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | "";
  statusHistory: OrderStatusEvent[];
  notes: OrderNote[];
  whatsapp: OrderWhatsApp;
  courier: string;
  trackingNumber: string;
  campaignIds: Types.ObjectId[];
  stockDeducted: boolean;
  cancelledAt?: Date | null;
  refundedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String, required: true },
    variantSku: { type: String, default: null },
    color: { type: String, default: null },
    size: { type: String, default: null },
    options: { type: [String], default: [] },
    unitPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", default: null },
    campaignName: { type: String, default: null },
    discount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const orderNoteSchema = new Schema<OrderNote>(
  {
    body: { type: String, required: true },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusEventSchema = new Schema<OrderStatusEvent>(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const whatsappSchema = new Schema<OrderWhatsApp>(
  {
    number: { type: String, default: "" },
    message: { type: String, default: "" },
    clickCount: { type: Number, default: 0, min: 0 },
    lastClickedAt: { type: Date, default: null },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    token: { type: String, required: true },
    idempotencyKey: { type: String },
    channel: { type: String, enum: ["whatsapp", "manual"], default: "whatsapp", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, default: "" },
      phone: { type: String, required: true },
    },
    delivery: {
      line1: { type: String, default: "" },
      district: { type: String, default: "" },
      sector: { type: String, default: "" },
      landmark: { type: String, default: "" },
      city: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    campaignDiscount: { type: Number, default: 0, min: 0 },
    couponDiscount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: "" },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    shipping: { type: Number, default: 0, min: 0 },
    shippingNote: { type: String, default: "" },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["new", "contacted", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"],
      default: "new",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["", "cash_on_delivery", "mobile_money", "bank_transfer", "other"],
      default: "",
    },
    statusHistory: { type: [statusEventSchema], default: [] },
    notes: { type: [orderNoteSchema], default: [] },
    whatsapp: { type: whatsappSchema, default: () => ({}) },
    courier: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    campaignIds: { type: [Schema.Types.ObjectId], ref: "Campaign", default: [] },
    stockDeducted: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ "customer.email": 1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ couponCode: 1 });
orderSchema.index({ token: 1 }, { unique: true });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Order: Model<OrderDocument> =
  models.Order || model<OrderDocument>("Order", orderSchema);
