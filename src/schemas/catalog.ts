import { z } from "zod";
import { idSchema, slugSchema } from "@/schemas/common";

export const categoryInputSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Enter a category name.").max(120),
  slug: slugSchema,
  description: z.string().trim().min(1, "Add a short description.").max(1000),
  image: z.string().trim().min(1, "Choose a category image.").max(500),
  bannerImage: z.string().trim().max(500).default(""),
  showOnHome: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(999),
  active: z.boolean().default(true),
  seoTitle: z.string().trim().max(160).default(""),
  seoDescription: z.string().trim().max(320).default(""),
  noindex: z.boolean().default(false),
  googleProductCategory: z.string().trim().max(200).default(""),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryBulkDeleteSchema = z.object({
  ids: z.array(idSchema).min(1, "Select at least one category."),
});
