import { z } from "zod";
import {
  emailSchema,
  optionalPhoneSchema,
  phoneSchema,
  socialLinkSchema,
} from "@/schemas/common";
import { normalizePhone } from "@/lib/whatsapp";
import type { SettingsMap } from "@/lib/admin/settings-defaults";

const text = (max: number, min = 0) =>
  z.string().trim().min(min, min ? "This field is required." : undefined).max(max);

const urlOrPath = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value),
    "Use a path starting with / or a full URL.",
  );

export const generalSettingsSchema = z.object({
  storeName: text(120, 2),
  tagline: text(160),
  logo: text(500),
  logoLight: text(500),
  favicon: text(500),
  currency: z.string().trim().length(3, "Use a three-letter currency code.").toUpperCase(),
  currencySymbol: text(8),
  currencyFormat: z.enum(["code", "symbol"]),
  timezone: text(80),
  maintenanceMode: z.boolean(),
  maintenanceMessage: text(500),
}) satisfies z.ZodType<SettingsMap["general"]>;

const whatsappNumberSchema = z
  .string()
  .trim()
  .max(32)
  .default("")
  .superRefine((value, context) => {
    if (value && !normalizePhone(value)) {
      context.addIssue({
        code: "custom",
        message: "Use an international number, for example +250788123456.",
      });
    }
  })
  .transform((value) => (value ? normalizePhone(value) ?? value : ""));

export const contactSettingsSchema = z.object({
  primaryPhone: phoneSchema,
  secondaryPhone: optionalPhoneSchema,
  whatsappNumber: whatsappNumberSchema,
  supportEmail: emailSchema,
  salesEmail: z.union([emailSchema, z.literal("")]),
  address: text(240),
  mapUrl: urlOrPath,
  workingHours: text(160),
  socials: z.array(socialLinkSchema).max(10),
}) satisfies z.ZodType<SettingsMap["contact"]>;

const recipientList = z.array(emailSchema).max(10);

export const notificationSettingsSchema = z.object({
  recipients: z.object({
    orders: recipientList,
    lowStock: recipientList,
    messages: recipientList,
    reviews: recipientList,
  }),
  enabled: z.object({
    orders: z.boolean(),
    lowStock: z.boolean(),
    messages: z.boolean(),
    reviews: z.boolean(),
  }),
}) satisfies z.ZodType<SettingsMap["notifications"]>;

const shippingZoneSchema = z.object({
  district: text(80, 1),
  rate: z.coerce.number().min(0).max(1_000_000),
  eta: text(80),
});

const trustBadgeSchema = z.object({
  icon: z.string().trim().max(40),
  title: text(60, 1),
  subtitle: text(80),
});

export const shippingSettingsSchema = z.object({
  freeShippingThreshold: z.coerce.number().min(0).max(10_000_000),
  zones: z.array(shippingZoneSchema).max(40),
  taxRate: z.coerce.number().min(0).max(100),
  payments: z.object({
    cashOnDelivery: z.boolean(),
    mobileMoney: z.boolean(),
    card: z.boolean(),
  }),
  trustBadges: z.array(trustBadgeSchema).max(4),
  shippingNote: text(300),
}) satisfies z.ZodType<SettingsMap["shipping"]>;

export const smtpSettingsSchema = z.object({
  host: z.string().trim().max(200).default(""),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().max(200).default(""),
  password: z.string().max(300).default(""),
  fromName: z.string().trim().max(120).default(""),
  fromEmail: z.union([emailSchema, z.literal("")]),
  replyTo: z.union([emailSchema, z.literal("")]),
});

const coordinate = (limit: number) =>
  z
    .string()
    .trim()
    .max(20)
    .default("")
    .refine(
      (value) => !value || (Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit),
      `Enter a number between -${limit} and ${limit}, or leave blank.`,
    );

export const seoSettingsSchema = z.object({
  titleTemplate: text(160, 1),
  metaDescription: text(320),
  ogImage: text(500),
  indexable: z.boolean(),
  sitemapEnabled: z.boolean(),
  llmsSummary: text(600),
  legalName: text(160),
  geoLatitude: coordinate(90),
  geoLongitude: coordinate(180),
  openingHours: text(160),
  googleSiteVerification: text(200),
  bingSiteVerification: text(200),
  indexNowEnabled: z.boolean(),
  robots: z.object({
    search: z.object({
      googlebot: z.boolean(),
      bingbot: z.boolean(),
      oaiSearchBot: z.boolean(),
      chatgptUser: z.boolean(),
      perplexityBot: z.boolean(),
      perplexityUser: z.boolean(),
      claudeSearchBot: z.boolean(),
      claudeUser: z.boolean(),
    }),
    training: z.object({
      gptBot: z.boolean(),
      claudeBot: z.boolean(),
      googleExtended: z.boolean(),
      ccBot: z.boolean(),
      applebotExtended: z.boolean(),
    }),
  }),
  sitemapGeneratedAt: text(40),
}) satisfies z.ZodType<SettingsMap["seo"]>;

export const newsletterSettingsSchema = z.object({
  doubleOptIn: z.boolean(),
}) satisfies z.ZodType<SettingsMap["newsletter"]>;

export const whatsappOrderSettingsSchema = z.object({
  messageTemplate: text(4000, 10),
  staffReplyTemplate: text(1000, 10),
  orderPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,8}$/, "Use 2 to 8 letters or numbers."),
  followUpMinutes: z.coerce.number().int().min(5).max(1440),
  cartHelperText: text(300),
  checkoutHelperText: text(300),
  customerOrderEmail: z.boolean(),
}) satisfies z.ZodType<SettingsMap["whatsappOrder"]>;

export const testEmailSchema = z.object({
  to: emailSchema,
});

export const contactMessageSchema = z.object({
  name: text(80, 1),
  email: emailSchema,
  phone: optionalPhoneSchema,
  subject: text(160, 1),
  body: text(4000, 10),
});
