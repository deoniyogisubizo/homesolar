import { Schema, model, models, type Model } from "mongoose";
import type { SiteContentData } from "@/types";

export type SiteContentDocument = {
  key: string;
  content: SiteContentData;
  createdAt?: Date;
  updatedAt?: Date;
};

const siteContentSchema = new Schema<SiteContentDocument>(
  {
    key: { type: String, required: true, unique: true, default: "home" },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const SiteContent: Model<SiteContentDocument> =
  models.SiteContent || model<SiteContentDocument>("SiteContent", siteContentSchema);
