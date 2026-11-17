import { z } from "zod";
import { ADMIN_ROLES } from "@/lib/admin/permissions";

const optionalText = (max: number) => z.string().trim().max(max).default("");

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Enter a slug.")
  .max(120, "Slug is too long.")
  .regex(slugPattern, "Use lowercase letters, numbers and hyphens only.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => {
    const compact = value.replace(/[\s().-]/g, "");
    if (compact.startsWith("00")) return `+${compact.slice(2)}`;
    if (compact.startsWith("0") && compact.length === 10) return `+250${compact.slice(1)}`;
    if (compact.startsWith("7") && compact.length === 9) return `+250${compact}`;
    return compact;
  })
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Use an international phone number, for example +250788123456."));

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32)
  .default("")
  .superRefine((value, context) => {
    if (!value) return;
    const parsed = phoneSchema.safeParse(value);
    if (!parsed.success) {
      context.addIssue({ code: "custom", message: "Use an international phone number." });
    }
  });

export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record id.");

export const optionalIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid record id.")
  .nullable()
  .optional();

export const moneySchema = z.coerce
  .number()
  .min(0, "Amount cannot be negative.")
  .max(10_000_000, "Amount is too large.")
  .transform((value) => Math.round(value * 100) / 100);

export const percentSchema = z.coerce
  .number()
  .min(0, "Percentage cannot be negative.")
  .max(100, "Percentage cannot exceed 100.");

export const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(30).default([]);

export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date.");

export const optionalIsoDateSchema = z
  .string()
  .trim()
  .default("")
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Enter a valid date.");

export const seoSchema = z.object({
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
});

export const userRoleSchema = z.enum(ADMIN_ROLES);

export const addressSchema = z.object({
  label: optionalText(40),
  line1: optionalText(200),
  district: optionalText(80),
  city: optionalText(80),
  phone: optionalPhoneSchema,
});

export const socialLinkSchema = z.object({
  platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "youtube"]),
  label: z.string().trim().min(1).max(40),
  href: z.string().trim().min(1).max(300),
});

export const footerLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(300),
});

export const navChildSchema = footerLinkSchema;

export const navLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(300),
  children: z.array(navChildSchema).max(20).default([]),
});
