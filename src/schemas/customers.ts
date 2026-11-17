import { z } from "zod";
import { idSchema, phoneSchema } from "@/schemas/common";
import {
  getProvince,
  getDistricts,
  getSectors,
  RWANDA_PROVINCE_NAMES,
} from "@/lib/rwanda-locations";

const provinceNames = z.enum(
  RWANDA_PROVINCE_NAMES as [string, ...string[]],
  "Select a province.",
);

/**
 * A saved delivery address. Province, district and sector are validated
 * against Rwanda's administrative divisions, and the landmark is required so
 * a courier can find the exact home even when there is no street number.
 */
export const customerAddressSchema = z
  .object({
    label: z.string().trim().min(1, "Choose an address label.").max(60),
    line1: z.string().trim().max(200).default(""),
    province: provinceNames,
    district: z.string().trim().min(1, "Select a district.").max(120),
    sector: z.string().trim().min(1, "Select a sector.").max(120),
    landmark: z
      .string()
      .trim()
      .min(3, "Describe the main public place near your home.")
      .max(300),
    phone: phoneSchema,
    isDefault: z.boolean().default(false),
  })
  .superRefine((address, context) => {
    const province = getProvince(address.province);
    if (!province) {
      context.addIssue({
        code: "custom",
        path: ["province"],
        message: "Select a valid province.",
      });
      return;
    }

    if (!getDistricts(address.province).includes(address.district)) {
      context.addIssue({
        code: "custom",
        path: ["district"],
        message: `Select a district in ${province.name}.`,
      });
      return;
    }

    if (!getSectors(address.province, address.district).includes(address.sector)) {
      context.addIssue({
        code: "custom",
        path: ["sector"],
        message: `Select a sector in ${address.district}.`,
      });
    }
  });

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;

export const customerAddressIdSchema = z.object({
  id: idSchema,
});

export const customerInputSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Enter the customer name.").max(120),
  email: z.string().trim().max(200).default(""),
  phone: z.string().trim().min(5, "Enter a phone number.").max(40),
  blocked: z.boolean().default(false),
  addresses: z.array(customerAddressSchema).max(8).default([]),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export const customerNoteSchema = z.object({
  id: idSchema,
  body: z.string().trim().min(1, "Write a note.").max(2000),
});

export const customerArchiveSchema = z.object({
  id: idSchema,
  archived: z.boolean(),
});
