import { z } from "zod";
import { sanitizePlainText } from "@/lib/sanitize";
import { normalizePhone } from "@/lib/whatsapp-core";

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "dispostable.com",
  "getnada.com",
  "guerrillamail.com",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "trashmail.com",
  "yopmail.com",
]);

const plainText = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .min(min, message)
    .max(max, `Keep this under ${max} characters.`)
    .transform(sanitizePlainText)
    .refine((value) => value.length >= min, message);

const checkoutPhoneSchema = z
  .string()
  .trim()
  .min(7, "Enter your phone number.")
  .max(32, "Phone number is too long.")
  .transform((value) => normalizePhone(value) ?? "")
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid international phone number."));

const checkoutEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address.")
  .refine((value) => {
    const domain = value.split("@")[1] ?? "";
    return !DISPOSABLE_DOMAINS.has(domain);
  }, "Use a permanent email address so we can reach you.");

export const checkoutSchema = z.object({
  idempotencyKey: z.uuid("Refresh the page and try again."),
  customer: z.object({
    name: plainText(2, 80, "Enter your full name."),
    email: checkoutEmailSchema,
    phone: checkoutPhoneSchema,
  }),
  delivery: z.object({
    province: plainText(2, 80, "Choose your province."),
    district: plainText(2, 80, "Choose your district."),
    sector: plainText(2, 80, "Choose your sector."),
    address: plainText(4, 200, "Enter the delivery address."),
    landmark: plainText(0, 160, "Landmark is too long."),
  }),
  notes: plainText(0, 800, "Notes are too long."),
  honeypot: z.string().max(200).default(""),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
