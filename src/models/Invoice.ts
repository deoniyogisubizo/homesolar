import { Schema, model, models, type Model, type Types } from "mongoose";

export type InvoiceKind = "order_invoice";

export type InvoiceStatus = "issued" | "void";

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

export type InvoiceDocument = {
  invoiceNumber: string;
  orderId: Types.ObjectId;
  orderNumber: string;
  revision: number;
  kind: InvoiceKind;
  status: InvoiceStatus;
  issuedAt: Date;
  seller: InvoiceSellerSnapshot;
  customer: InvoiceCustomerSnapshot;
  delivery: InvoiceDeliverySnapshot;
  items: InvoiceItemSnapshot[];
  totals: InvoiceTotals;
  payment: InvoicePaymentSnapshot;
  notes: string;
  terms: string;
  accessTokenHash: string;
  accessTokenExpiresAt: Date;
  deliveryTokenHash: string;
  deliveryTokenEncrypted?: string;
  deliveryTokenExpiresAt: Date;
  pdf: {
    url?: string;
    generatedAt?: Date;
    bytes?: number;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const invoiceItemSchema = new Schema<InvoiceItemSnapshot>(
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

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    revision: { type: Number, required: true, default: 1, min: 1 },
    kind: { type: String, enum: ["order_invoice"], default: "order_invoice" },
    status: { type: String, enum: ["issued", "void"], default: "issued" },
    issuedAt: { type: Date, default: Date.now },
    seller: {
      type: new Schema<InvoiceSellerSnapshot>(
        {
          businessName: { type: String, default: "" },
          tin: { type: String, default: "" },
          address: { type: String, default: "" },
          phone: { type: String, default: "" },
          email: { type: String, default: "" },
          logo: { type: String, default: "" },
          pricesIncludeVat: { type: Boolean, default: false },
          vatRate: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    customer: {
      type: new Schema<InvoiceCustomerSnapshot>(
        {
          name: { type: String, default: "" },
          phone: { type: String, default: "" },
          email: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    delivery: {
      type: new Schema<InvoiceDeliverySnapshot>(
        {
          line1: { type: String, default: "" },
          district: { type: String, default: "" },
          sector: { type: String, default: "" },
          landmark: { type: String, default: "" },
          city: { type: String, default: "" },
          notes: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    items: { type: [invoiceItemSchema], default: [] },
    totals: {
      type: new Schema<InvoiceTotals>(
        {
          subtotal: { type: Number, default: 0, min: 0 },
          campaignDiscount: { type: Number, default: 0, min: 0 },
          couponDiscount: { type: Number, default: 0, min: 0 },
          deliveryFee: { type: Number, default: 0, min: 0 },
          total: { type: Number, default: 0, min: 0 },
          amountDue: { type: Number, default: 0, min: 0 },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    payment: {
      type: new Schema<InvoicePaymentSnapshot>(
        {
          method: { type: String, default: "" },
          status: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    notes: { type: String, default: "" },
    terms: { type: String, default: "" },
    accessTokenHash: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    deliveryTokenHash: { type: String, required: true },
    deliveryTokenEncrypted: { type: String, default: "" },
    deliveryTokenExpiresAt: { type: Date, required: true },
    pdf: {
      type: new Schema(
        {
          url: { type: String, default: "" },
          generatedAt: { type: Date, default: null },
          bytes: { type: Number, default: null },
        },
        { _id: false },
      ),
      default: () => null,
    },
  },
  { timestamps: true },
);

invoiceSchema.index({ invoiceNumber: 1, revision: 1 }, { unique: true });
invoiceSchema.index({ orderId: 1, revision: -1 });
invoiceSchema.index({ issuedAt: -1 });

export const Invoice: Model<InvoiceDocument> =
  models.Invoice || model<InvoiceDocument>("Invoice", invoiceSchema);
