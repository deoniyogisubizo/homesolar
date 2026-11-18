import { Schema, model, models, type Model } from "mongoose";

export type PageStatus = "draft" | "published" | "archived";

export type PageFaq = {
  question: string;
  answer: string;
};

export type PageDocument = {
  title: string;
  slug: string;
  slugHistory: string[];
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  faqs: PageFaq[];
  status: PageStatus;
  order: number;
  showInFooter: boolean;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const faqSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const pageSchema = new Schema<PageDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    slugHistory: { type: [String], default: [] },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    noindex: { type: Boolean, default: false },
    faqs: { type: [faqSchema], default: [] },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    order: { type: Number, default: 0 },
    showInFooter: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

pageSchema.index({ status: 1, order: 1 });
pageSchema.index({ slugHistory: 1 });

export const Page: Model<PageDocument> =
  models.Page || model<PageDocument>("Page", pageSchema);
