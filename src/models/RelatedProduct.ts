import { Schema, model, models, type Model, type Types } from "mongoose";

export type RelatedProductDocument = {
  productId: Types.ObjectId;
  relatedProductId: Types.ObjectId;
  score: number;
  confidence: number;
  lift: number;
  type: "co_purchase" | "fallback_category" | "fallback_tag";
  createdAt: Date;
  updatedAt: Date;
};

const relatedProductSchema = new Schema<RelatedProductDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    relatedProductId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    score: { type: Number, required: true, default: 0 },
    confidence: { type: Number, required: true, default: 0 },
    lift: { type: Number, required: true, default: 0 },
    type: { type: String, enum: ["co_purchase", "fallback_category", "fallback_tag"], required: true },
  },
  { timestamps: true },
);

relatedProductSchema.index({ productId: 1, score: -1 });
relatedProductSchema.index({ productId: 1, relatedProductId: 1 }, { unique: true });

export const RelatedProduct: Model<RelatedProductDocument> =
  models.RelatedProduct || model<RelatedProductDocument>("RelatedProduct", relatedProductSchema);