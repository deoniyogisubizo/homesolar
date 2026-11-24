import { Schema, model, models, type Model, type Types } from "mongoose";

export type AbandonmentStage = "reminder" | "social_proof" | "incentive";

export type CartAbandonmentDocument = {
  sessionId: string;
  userId?: Types.ObjectId | null;
  cartItems: Types.ObjectId[];
  cartValue: number;
  stage: AbandonmentStage;
  lastMessageAt: Date;
  messageCount: number;
  recovered: boolean;
  recoveredAt?: Date | null;
  recoveryOrderId?: Types.ObjectId | null;
  incentiveCouponId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const cartAbandonmentSchema = new Schema<CartAbandonmentDocument>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    cartItems: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
    cartValue: { type: Number, required: true, min: 0 },
    stage: { type: String, enum: ["reminder", "social_proof", "incentive"], default: "reminder" },
    lastMessageAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0, min: 0 },
    recovered: { type: Boolean, default: false, index: true },
    recoveredAt: { type: Date, default: null },
    recoveryOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    incentiveCouponId: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
  },
  { timestamps: true },
);

cartAbandonmentSchema.index({ stage: 1, lastMessageAt: 1, recovered: 1 });
cartAbandonmentSchema.index({ userId: 1, createdAt: -1 });

export const CartAbandonment: Model<CartAbandonmentDocument> =
  models.CartAbandonment || model<CartAbandonmentDocument>("CartAbandonment", cartAbandonmentSchema);