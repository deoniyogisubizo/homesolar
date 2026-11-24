import { Schema, model, models, type Model, type Types } from "mongoose";

export type PromotionRuleType = "percent" | "fixed" | "bogo" | "free_shipping";
export type PromotionSegment = "all" | "new" | "returning" | "vip" | "at_risk";

export type PromotionRuleConditions = {
  minCart?: number;
  categories?: Types.ObjectId[];
  segment?: PromotionSegment;
  firstOrder?: boolean;
  stockAbove?: number;
  stockBelow?: number;
  startsAt?: Date;
  endsAt?: Date;
};

export type PromotionRuleDocument = {
  name: string;
  description: string;
  type: PromotionRuleType;
  value: number;
  maxDiscount?: number | null;
  conditions: PromotionRuleConditions;
  usageLimitTotal?: number | null;
  usageLimitPerUser: number;
  stackable: boolean;
  active: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const conditionsSchema = new Schema<PromotionRuleConditions>(
  {
    minCart: { type: Number, default: 0, min: 0 },
    categories: { type: [Schema.Types.ObjectId], ref: "Category", default: [] },
    segment: { type: String, enum: ["all", "new", "returning", "vip", "at_risk"], default: "all" },
    firstOrder: { type: Boolean, default: false },
    stockAbove: { type: Number, default: null, min: 0 },
    stockBelow: { type: Number, default: null, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { _id: false },
);

const promotionRuleSchema = new Schema<PromotionRuleDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    type: { type: String, enum: ["percent", "fixed", "bogo", "free_shipping"], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    conditions: { type: conditionsSchema, default: {} },
    usageLimitTotal: { type: Number, default: null, min: 1 },
    usageLimitPerUser: { type: Number, default: 1, min: 1 },
    stackable: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    usageCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

promotionRuleSchema.index({ active: 1, "conditions.startsAt": 1, "conditions.endsAt": 1 });

export const PromotionRule: Model<PromotionRuleDocument> =
  models.PromotionRule || model<PromotionRuleDocument>("PromotionRule", promotionRuleSchema);