import { z } from "zod";
import { idSchema } from "@/schemas/common";

export const STOCK_REASONS = ["restock", "correction", "damage", "return", "sale", "other"] as const;

export const inventoryAdjustSchema = z.object({
  productId: idSchema,
  variantSku: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  mode: z.enum(["set", "delta"]),
  value: z.coerce.number().int().min(-10_000_000).max(10_000_000),
  reason: z.enum(STOCK_REASONS),
  note: z.string().trim().max(500).default(""),
});

export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>;
