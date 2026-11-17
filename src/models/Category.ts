import { Schema, model, models, type Model } from "mongoose";

export type CategoryDocument = {
  name: string;
  slug: string;
  description: string;
  image: string;
  bannerImage?: string | null;
  showOnHome: boolean;
  order: number;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    bannerImage: { type: String, default: "" },
    showOnHome: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

categorySchema.index({ active: 1, order: 1 });

// Next.js dev reuses compiled modules across hot reloads, so a Category model
// compiled before bannerImage existed would silently drop the field on save.
// Recompile only that stale model so the document prototype knows the field.
const cachedCategory = models.Category as Model<CategoryDocument> | undefined;
if (
  process.env.NODE_ENV !== "production" &&
  cachedCategory &&
  !cachedCategory.schema.path("bannerImage")
) {
  delete models.Category;
}

export const Category: Model<CategoryDocument> =
  models.Category || model<CategoryDocument>("Category", categorySchema);
