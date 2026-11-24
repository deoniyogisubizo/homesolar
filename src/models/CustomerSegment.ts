import { Schema, model, models, type Model, type Types } from "mongoose";

export type RFMSegment = "champions" | "loyal" | "potential" | "new" | "at_risk" | "hibernating";

export type CustomerSegmentDocument = {
  customerId: Types.ObjectId;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  segment: RFMSegment;
  loyaltyPoints: number;
  loyaltyTier: "bronze" | "silver" | "gold";
  pointsExpiryAt: Date;
  lastLoginAt?: Date | null;
  loginStreak: number;
  computedAt: Date;
};

const customerSegmentSchema = new Schema<CustomerSegmentDocument>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, unique: true, index: true },
    recencyScore: { type: Number, required: true, min: 1, max: 5 },
    frequencyScore: { type: Number, required: true, min: 1, max: 5 },
    monetaryScore: { type: Number, required: true, min: 1, max: 5 },
    segment: { type: String, enum: ["champions", "loyal", "potential", "new", "at_risk", "hibernating"], required: true, index: true },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyTier: { type: String, enum: ["bronze", "silver", "gold"], default: "bronze" },
    pointsExpiryAt: { type: Date, required: true },
    lastLoginAt: { type: Date, default: null },
    loginStreak: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const CustomerSegment: Model<CustomerSegmentDocument> =
  models.CustomerSegment || model<CustomerSegmentDocument>("CustomerSegment", customerSegmentSchema);