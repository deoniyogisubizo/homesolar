import { Schema, model, models, type Model, type Types } from "mongoose";

export type FraudScoreDocument = {
  orderId: Types.ObjectId;
  score: number;
  factors: Array<{ factor: string; points: number; description: string }>;
  decision: "auto_approve" | "manual_review" | "hold";
  reviewed: boolean;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewNote?: string | null;
  createdAt: Date;
};

const factorSchema = new Schema(
  {
    factor: { type: String, required: true },
    points: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const fraudScoreSchema = new Schema<FraudScoreDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100, index: true },
    factors: { type: [factorSchema], default: [] },
    decision: { type: String, enum: ["auto_approve", "manual_review", "hold"], required: true, index: true },
    reviewed: { type: Boolean, default: false, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const FraudScore: Model<FraudScoreDocument> =
  models.FraudScore || model<FraudScoreDocument>("FraudScore", fraudScoreSchema);