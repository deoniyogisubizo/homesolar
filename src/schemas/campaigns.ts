import { z } from "zod";
import { idSchema, slugSchema } from "@/schemas/common";

const dateTime = z
  .string()
  .trim()
  .min(1, "Choose a date and time.")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date and time.");

const emptyToNull = (value: unknown) => (value === "" || value === undefined ? null : value);

export const campaignStorefrontSchema = z.object({
  saleEnabled: z.boolean().default(true),
  saleHeading: z.string().trim().max(120).default(""),
  saleText: z.string().trim().max(240).default(""),
  primaryCtaLabel: z.string().trim().max(60).default(""),
  primaryCtaHref: z.string().trim().max(300).default("/search"),
  secondaryCtaLabel: z.string().trim().max(60).default(""),
  secondaryCtaHref: z.string().trim().max(300).default("/search"),
  promoEnabled: z.boolean().default(false),
  promoEyebrow: z.string().trim().max(80).default(""),
  promoTitle: z.string().trim().max(120).default(""),
  promoDiscountText: z.string().trim().max(80).default(""),
  promoImage: z.string().trim().max(500).default(""),
  promoHref: z.string().trim().max(300).default("/search"),
  bannerEnabled: z.boolean().default(false),
  bannerEyebrow: z.string().trim().max(80).default(""),
  bannerTitle: z.string().trim().max(120).default(""),
  bannerSubtitle: z.string().trim().max(200).default(""),
  bannerImage: z.string().trim().max(500).default(""),
  bannerCtaLabel: z.string().trim().max(60).default(""),
  bannerCtaHref: z.string().trim().max(300).default("/search"),
  countdownEnabled: z.boolean().default(false),
});

export const campaignInputSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(2, "Enter a campaign name.").max(160),
    slug: slugSchema,
    description: z.string().trim().max(2000).default(""),
    startsAt: dateTime,
    endsAt: dateTime,
    discountType: z.enum(["percent", "fixed"]),
    value: z.coerce.number().min(0).max(100_000_000),
    scope: z.enum(["store", "categories", "products"]),
    categoryIds: z.array(idSchema).max(200).default([]),
    productIds: z.array(idSchema).max(500).default([]),
    excludedProductIds: z.array(idSchema).max(500).default([]),
    priority: z.coerce.number().int().min(0).max(999).default(0),
    stackWithCoupons: z.boolean().default(false),
    promoCode: z.string().trim().max(40).default(""),
    usageLimit: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(10_000_000).nullable()).default(null),
    active: z.boolean().default(true),
    notes: z.string().trim().max(2000).default(""),
    storefront: campaignStorefrontSchema,
  })
  .superRefine((value, context) => {
    const start = new Date(value.startsAt).getTime();
    const end = new Date(value.endsAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The end time must be after the start time.",
      });
    }
    if (value.discountType === "percent" && value.value > 100) {
      context.addIssue({ code: "custom", path: ["value"], message: "A percentage discount cannot exceed 100." });
    }
    if (value.scope === "products" && !value.productIds.length) {
      context.addIssue({ code: "custom", path: ["productIds"], message: "Select at least one product." });
    }
    if (value.scope === "categories" && !value.categoryIds.length) {
      context.addIssue({ code: "custom", path: ["categoryIds"], message: "Select at least one category." });
    }
  });

export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type CampaignStorefrontInput = z.infer<typeof campaignStorefrontSchema>;

export const campaignToggleSchema = z.object({
  id: idSchema,
  active: z.boolean(),
});

export const campaignDeleteSchema = z.object({ id: idSchema });

export const campaignBulkDeleteSchema = z.object({
  ids: z.array(idSchema).min(1, "Select at least one campaign."),
});

export const couponInputSchema = z
  .object({
    id: idSchema.optional(),
    code: z
      .string()
      .trim()
      .min(3, "Use at least three characters.")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens and underscores only."),
    description: z.string().trim().max(500).default(""),
    type: z.enum(["percent", "fixed", "free_shipping"]),
    value: z.coerce.number().min(0).max(100_000_000).default(0),
    minSubtotal: z.coerce.number().min(0).max(100_000_000).default(0),
    maxDiscount: z.preprocess(emptyToNull, z.coerce.number().min(0).max(100_000_000).nullable()).default(null),
    usageLimit: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(10_000_000).nullable()).default(null),
    perCustomerLimit: z.coerce.number().int().min(1).max(100).default(1),
    startsAt: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    endsAt: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    scope: z.enum(["all", "products", "categories"]).default("all"),
    productIds: z.array(idSchema).max(500).default([]),
    categoryIds: z.array(idSchema).max(200).default([]),
    status: z.enum(["active", "paused", "archived"]).default("active"),
  })
  .superRefine((value, context) => {
    if (value.type === "percent" && (value.value <= 0 || value.value > 100)) {
      context.addIssue({ code: "custom", path: ["value"], message: "Enter a percentage between 0.01 and 100." });
    }
    if (value.type === "fixed" && value.value <= 0) {
      context.addIssue({ code: "custom", path: ["value"], message: "Enter a discount amount greater than zero." });
    }
    if (value.startsAt && value.endsAt) {
      const start = new Date(value.startsAt).getTime();
      const end = new Date(value.endsAt).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
        context.addIssue({ code: "custom", path: ["endsAt"], message: "The end date must be after the start date." });
      }
    }
    if (value.scope === "products" && !value.productIds.length) {
      context.addIssue({ code: "custom", path: ["productIds"], message: "Select at least one product." });
    }
    if (value.scope === "categories" && !value.categoryIds.length) {
      context.addIssue({ code: "custom", path: ["categoryIds"], message: "Select at least one category." });
    }
  });

export type CouponInput = z.infer<typeof couponInputSchema>;

export const couponStatusSchema = z.object({
  id: idSchema,
  status: z.enum(["active", "paused", "archived"]),
});

export const couponDeleteSchema = z.object({ id: idSchema });

export const couponBulkDeleteSchema = z.object({
  ids: z.array(idSchema).min(1, "Select at least one coupon."),
});
