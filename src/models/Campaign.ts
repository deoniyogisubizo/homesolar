import { Schema, model, models, type Model, type Types } from "mongoose";

export type DiscountType = "percent" | "fixed";
export type CampaignScope = "store" | "categories" | "products";

export type CampaignStorefront = {
  saleEnabled: boolean;
  saleHeading: string;
  saleText: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  promoEnabled: boolean;
  promoEyebrow: string;
  promoTitle: string;
  promoDiscountText: string;
  promoImage: string;
  promoHref: string;
  bannerEnabled: boolean;
  bannerEyebrow: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerImage: string;
  bannerCtaLabel: string;
  bannerCtaHref: string;
  countdownEnabled: boolean;
};

export type CampaignDocument = {
  name: string;
  slug: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  discountType: DiscountType;
  value: number;
  scope: CampaignScope;
  categoryIds: Types.ObjectId[];
  productIds: Types.ObjectId[];
  excludedProductIds: Types.ObjectId[];
  priority: number;
  stackWithCoupons: boolean;
  promoCode: string;
  usageLimit?: number | null;
  usageCount: number;
  active: boolean;
  pausedAt?: Date | null;
  endedAt?: Date | null;
  notes: string;
  storefront: CampaignStorefront;
  createdAt?: Date;
  updatedAt?: Date;
};

const storefrontSchema = new Schema<CampaignStorefront>(
  {
    saleEnabled: { type: Boolean, default: true },
    saleHeading: { type: String, default: "" },
    saleText: { type: String, default: "" },
    primaryCtaLabel: { type: String, default: "" },
    primaryCtaHref: { type: String, default: "/search" },
    secondaryCtaLabel: { type: String, default: "" },
    secondaryCtaHref: { type: String, default: "/search" },
    promoEnabled: { type: Boolean, default: true },
    promoEyebrow: { type: String, default: "" },
    promoTitle: { type: String, default: "" },
    promoDiscountText: { type: String, default: "" },
    promoImage: { type: String, default: "" },
    promoHref: { type: String, default: "/search" },
    bannerEnabled: { type: Boolean, default: false },
    bannerEyebrow: { type: String, default: "" },
    bannerTitle: { type: String, default: "" },
    bannerSubtitle: { type: String, default: "" },
    bannerImage: { type: String, default: "" },
    bannerCtaLabel: { type: String, default: "" },
    bannerCtaHref: { type: String, default: "/search" },
    countdownEnabled: { type: Boolean, default: false },
  },
  { _id: false },
);

const campaignSchema = new Schema<CampaignDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    discountType: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    scope: { type: String, enum: ["store", "categories", "products"], default: "store" },
    categoryIds: { type: [Schema.Types.ObjectId], ref: "Category", default: [] },
    productIds: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
    excludedProductIds: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
    priority: { type: Number, default: 0 },
    stackWithCoupons: { type: Boolean, default: false },
    promoCode: { type: String, default: "", trim: true, uppercase: true },
    usageLimit: { type: Number, default: null, min: 0 },
    usageCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true, index: true },
    pausedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    storefront: { type: storefrontSchema, default: () => ({}) },
  },
  { timestamps: true },
);

campaignSchema.index({ active: 1, startsAt: 1, endsAt: 1, priority: -1 });

export const Campaign: Model<CampaignDocument> =
  models.Campaign || model<CampaignDocument>("Campaign", campaignSchema);
