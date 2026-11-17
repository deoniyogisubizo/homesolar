import { Schema, model, models, type Model } from "mongoose";

export type LocationDocument = {
  name: string;
  slug: string;
  province: string;
  sectors: string[];
  active: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
};

const locationSchema = new Schema<LocationDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    province: { type: String, required: true, trim: true, index: true },
    sectors: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

locationSchema.index({ active: 1, order: 1 });

export const Location: Model<LocationDocument> =
  models.Location || model<LocationDocument>("Location", locationSchema);
