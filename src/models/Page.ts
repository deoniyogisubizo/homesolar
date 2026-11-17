import { Schema, model, models, type Model } from "mongoose";

export type PageStatus = "draft" | "published" | "archived";

export type PageDocument = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  status: PageStatus;
  order: number;
  showInFooter: boolean;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const pageSchema = new Schema<PageDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    order: { type: Number, default: 0 },
    showInFooter: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Page: Model<PageDocument> =
  models.Page || model<PageDocument>("Page", pageSchema);
