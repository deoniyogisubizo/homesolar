import { Schema, model, models, type Model, type Types } from "mongoose";

export type CouponType = "percent" | "fixed" | "free_shipping";
export type CouponScope = "all" | "products" | "categories";
export type CouponStatus = "active" | "paused" | "archived";

export type CouponDocument = {
  code: string;
  codeLower: string;
  description: string;
  type: CouponType;
  value: number;
  minSubtotal: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  scope: CouponScope;
  productIds: Types.ObjectId[];
  categoryIds: Types.ObjectId[];
  status: CouponStatus;
  usageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

const couponSchema = new Schema<CouponDocument>(
  {
    code: { type: String, required: true, trim: true },
    codeLower: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["percent", "fixed", "free_shipping"], required: true },
    value: { type: Number, default: 0, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    usageLimit: { type: Number, default: null, min: 0 },
    perCustomerLimit: { type: Number, default: 1, min: 1 },
    startsAt: { type: Date, default: null, index: true },
    endsAt: { type: Date, default: null, index: true },
    scope: { type: String, enum: ["all", "products", "categories"], default: "all" },
    productIds: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
    categoryIds: { type: [Schema.Types.ObjectId], ref: "Category", default: [] },
    status: { type: String, enum: ["active", "paused", "archived"], default: "active", index: true },
    usageCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

couponSchema.index({ status: 1, codeLower: 1 });

export const Coupon: Model<CouponDocument> =
  models.Coupon || model<CouponDocument>("Coupon", couponSchema);
