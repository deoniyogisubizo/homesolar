import { Schema, model, models, type Model, type Types } from "mongoose";

export type CouponUsageDocument = {
  couponId: Types.ObjectId;
  couponCode: string;
  orderId?: Types.ObjectId | null;
  customerId?: Types.ObjectId | null;
  email: string;
  discount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

const couponUsageSchema = new Schema<CouponUsageDocument>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
    couponCode: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    discount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

couponUsageSchema.index({ couponId: 1, email: 1 });

export const CouponUsage: Model<CouponUsageDocument> =
  models.CouponUsage || model<CouponUsageDocument>("CouponUsage", couponUsageSchema);
