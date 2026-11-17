import { z } from "zod";
import { idSchema, slugSchema } from "@/schemas/common";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value ? value : null))
    .nullable();

const emptyToNull = (value: unknown) => (value === "" || value === undefined ? null : value);

export const productImageInputSchema = z.object({
  src: z.string().trim().min(1, "Choose an image.").max(500),
  thumbSrc: z.string().trim().max(500).nullable().default(null),
  alt: z.string().trim().max(160).default(""),
});

export const productVariantInputSchema = z.object({
  sku: z.string().trim().min(1, "Enter a SKU.").max(80),
  color: z.string().trim().max(80).nullable().default(null),
  size: z.string().trim().max(80).nullable().default(null),
  price: z.coerce.number().min(0).max(100_000_000),
  compareAtPrice: z.preprocess(emptyToNull, z.coerce.number().min(0).max(100_000_000).nullable()).default(null),
  stock: z.coerce.number().int().min(0).max(10_000_000),
  isDefault: z.boolean().default(false),
});

export const productInputSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Enter a product name.").max(200),
  pageTitle: optionalText(200).default(null),
  slug: slugSchema,
  publishStatus: z.enum(["draft", "active", "archived"]),
  category: idSchema,
  price: z.coerce.number().min(0, "Enter a price.").max(100_000_000),
  compareAtPrice: z.preprocess(emptyToNull, z.coerce.number().min(0).max(100_000_000).nullable()).default(null),
  stock: z.coerce.number().int().min(0).max(10_000_000),
  lowStockThreshold: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(1_000_000).nullable()).default(null),
  shortDescription: z.string().trim().min(1, "Add a short description.").max(400),
  description: z.string().trim().min(1, "Add a description.").max(10_000),
  detailsIntro: z.string().trim().max(5_000).default(""),
  shippingReturns: z.string().trim().max(5_000).default(""),
  badge: z.enum(["top", "sale"]).nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  images: z.array(productImageInputSchema).min(1, "Add at least one product image.").max(12),
  cardTitle: optionalText(160).default(null),
  cardSubtitle: optionalText(160).default(null),
  seoTitle: z.string().trim().max(160).default(""),
  seoDescription: z.string().trim().max(320).default(""),
  featuredOrder: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(999).nullable()).default(null),
  bestSellerOrder: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(999).nullable()).default(null),
  options: z
    .object({
      colors: z
        .array(
          z.object({
            value: z.string().trim().min(1).max(40),
            label: z.string().trim().min(1).max(60),
            hex: z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex colour."),
          }),
        )
        .max(20)
        .default([]),
      sizes: z
        .array(
          z.object({
            value: z.string().trim().min(1).max(40),
            label: z.string().trim().min(1).max(60),
          }),
        )
        .max(20)
        .default([]),
    })
    .default({ colors: [], sizes: [] }),
  variants: z.array(productVariantInputSchema).max(100).default([]),
  features: z
    .array(z.object({ icon: z.string().trim().min(1).max(40), label: z.string().trim().min(1).max(80) }))
    .max(8)
    .default([]),
  specs: z
    .array(z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(160) }))
    .max(30)
    .default([]),
  highlights: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
  detailBanner: z
    .object({
      image: z.string().trim().max(500).default(""),
      icon: z.string().trim().max(40).default(""),
      lines: z.array(z.string().trim().max(120)).max(6).default([]),
    })
    .nullable()
    .default(null),
  sizeGuide: z
    .object({
      title: z.string().trim().max(120).default(""),
      intro: z.string().trim().max(400).default(""),
      rows: z
        .array(z.object({ label: z.string().trim().max(80), value: z.string().trim().max(160) }))
        .max(40)
        .default([]),
    })
    .nullable()
    .default(null),
  relatedProductIds: z.array(idSchema).max(12).default([]),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productBulkSchema = z.object({
  ids: z.array(idSchema).min(1, "Select at least one product."),
  intent: z.enum([
    "publish",
    "draft",
    "archive",
    "feature",
    "unfeature",
    "best-seller",
    "remove-best-seller",
  ]),
});

export const productImportSchema = z.object({
  csv: z.string().trim().min(1, "Paste CSV content or choose a file.").max(1_000_000),
});
