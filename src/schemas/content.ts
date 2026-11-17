import { z } from "zod";

const short = (max = 120) => z.string().trim().max(max);
const required = (max = 120) => z.string().trim().min(1, "This field is required.").max(max);

export const hrefSchema = z
  .string()
  .trim()
  .min(1, "Enter a link.")
  .max(400)
  .refine(
    (value) => value.startsWith("/") || value.startsWith("#") || /^(https?:|mailto:|tel:)/i.test(value),
    "Use a path starting with /, an anchor, or a full URL.",
  );

export const ctaSchema = z.object({
  label: required(60),
  href: hrefSchema,
});

export const contentSocialSchema = z.object({
  platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "youtube"]),
  label: required(40),
  href: hrefSchema,
});

const productIdsSchema = z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(12).default([]);

export const headerContentSchema = z.object({
  storeName: required(120),
  logo: short(500),
  logoLight: short(500),
  currency: required(8),
  currencies: z.array(z.string().trim().min(3).max(3)).max(10),
  language: required(8),
  languages: z.array(z.string().trim().min(2).max(8)).max(10),
  searchEnabled: z.boolean(),
  searchPlaceholder: short(80),
  accountLabel: short(40),
  wishlistLabel: short(40),
  cartLabel: short(40),
  nav: z
    .array(
      z.object({
        label: required(80),
        href: hrefSchema,
        children: z.array(z.object({ label: required(80), href: hrefSchema })).max(20).default([]),
      }),
    )
    .max(16),
});

export const heroContentSchema = z.object({
  eyebrow: short(60),
  titleStrong: required(120),
  titleLight: short(120),
  subtitle: short(200),
  cta: ctaSchema,
  image: short(500),
  imageAlt: short(160),
  sideImage: short(500),
  sideImageAlt: short(160),
  sideEyebrow: short(60),
  sideTitle: short(80),
  sideTitleAccent: short(80),
  sideSubtitle: short(120),
  socials: z.array(contentSocialSchema).max(8),
});

export const saleContentSchema = z.object({
  title: required(120),
  description: short(300),
  buttons: z.array(ctaSchema).max(3),
  manualOverride: z.boolean(),
  enabled: z.boolean(),
});

export const promosContentSchema = z
  .array(
    z.object({
      id: required(40),
      eyebrow: short(60),
      title: required(80),
      discount: short(80),
      cta: ctaSchema,
      image: short(500),
      tone: z.enum(["blue", "pale"]),
    }),
  )
  .max(4);

export const categoriesContentSchema = z.object({
  eyebrow: short(60),
  title: required(120),
  emptyLabel: short(120),
});

const bannerSchema = z.object({
  eyebrow: short(60),
  title: required(80),
  titleLight: short(80),
  cta: ctaSchema,
  image: short(500),
});

const productSectionSchema = z.object({
  eyebrow: short(60),
  title: required(120),
  mode: z.enum(["manual", "automatic"]),
  productIds: productIdsSchema,
  banner: bannerSchema,
});

export const bestSellingContentSchema = productSectionSchema;
export const featuredContentSchema = productSectionSchema;

export const meetContentSchema = z.object({
  title: required(120),
  navy: z.object({
    discount: short(40),
    title: short(120),
    description: short(240),
    cta: ctaSchema,
  }),
  newsletter: z.object({
    eyebrow: short(60),
    title: required(80),
    description: short(240),
    placeholder: short(80),
    button: required(40),
    success: short(300),
    error: short(300),
  }),
});

export const clientsContentSchema = z.object({
  title: required(120),
  logos: z
    .array(
      z.object({
        name: required(80),
        image: short(500),
        href: hrefSchema,
      }),
    )
    .max(12),
});

export const metaContentSchema = z.object({
  title: required(160),
  description: short(320),
});

export const sectionOrderSchema = z
  .array(
    z.enum(["hero", "sale", "promos", "categories", "bestSelling", "featured", "meet", "clients"]),
  )
  .min(1);

export const homepageSectionSchemas = {
  meta: metaContentSchema,
  header: headerContentSchema,
  hero: heroContentSchema,
  sale: saleContentSchema,
  promos: promosContentSchema,
  categories: categoriesContentSchema,
  bestSelling: bestSellingContentSchema,
  featured: featuredContentSchema,
  meet: meetContentSchema,
  clients: clientsContentSchema,
  sectionOrder: sectionOrderSchema,
} as const;

export type HomepageSectionKey = keyof typeof homepageSectionSchemas;

export const footerContentSchema = z.object({
  address: short(240),
  phone: short(40),
  email: short(160),
  socials: z.array(contentSocialSchema).max(10),
  columns: z
    .array(
      z.object({
        title: required(80),
        links: z.array(z.object({ label: required(80), href: hrefSchema })).max(12),
      }),
    )
    .max(6),
  instagram: z.object({
    title: required(60),
    image: short(500),
    href: hrefSchema,
  }),
  copyright: required(200),
});
