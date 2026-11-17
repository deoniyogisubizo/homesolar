import { Schema, model, models, type Model, type Types } from "mongoose";

export type MediaDocument = {
  url: string;
  originalUrl: string;
  thumbUrl?: string | null;
  alt: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  folder: string;
  tags: string[];
  uploadedBy?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const mediaSchema = new Schema<MediaDocument>(
  {
    url: { type: String, required: true, unique: true },
    originalUrl: { type: String, required: true },
    thumbUrl: { type: String, default: null },
    alt: { type: String, default: "" },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    folder: { type: String, default: "general", index: true },
    tags: { type: [String], default: [], index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ alt: "text", originalName: "text", tags: "text" });

export const Media: Model<MediaDocument> =
  models.Media || model<MediaDocument>("Media", mediaSchema);
