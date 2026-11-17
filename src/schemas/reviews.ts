import { z } from "zod";
import { idSchema } from "@/schemas/common";

export const reviewModerateSchema = z.object({
  id: idSchema,
  status: z.enum(["pending", "approved", "rejected"]),
});

export const reviewReplySchema = z.object({
  id: idSchema,
  reply: z.string().trim().max(2000).default(""),
});

export const reviewDeleteSchema = z.object({ id: idSchema });
