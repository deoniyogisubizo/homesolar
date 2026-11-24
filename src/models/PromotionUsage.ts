import { Schema, model, models, type Model, type Types } from "mongoose";

export type PromotionUsageDocument = {
  ruleId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  phone?: string | null;
  deviceFingerprint?: string | null;
  orderId?: Types.ObjectId | null;
  discountAmount: number;
  createdAt: Date;
};

const promotionUsageSchema = new Schema<PromotionUsageDocument>(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: "PromotionRule", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    phone: { type: String, default: null, index: true },
    deviceFingerprint: { type: String, default: null, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    discountAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

promotionUsageSchema.index({ ruleId: 1, userId: 1 });
promotionUsageSchema.index({ ruleId: 1, phone: 1 });
promotionUsageSchema.index({ ruleId: 1, deviceFingerprint: 1 });
promotionUsageSchema.index({ createdAt: -1 });

export const PromotionUsage: Model<PromotionUsageDocument> =
  models.PromotionUsage || model<PromotionUsageDocument>("PromotionUsage", promotionUsageSchema);