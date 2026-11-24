import { Schema, model, models, type Model, type Types } from "mongoose";

export type PopularityScoreDocument = {
  productId: Types.ObjectId;
  score: number;
  purchases: number;
  cartAdds: number;
  wishlists: number;
  views: number;
  windowStart: Date;
  windowEnd: Date;
  computedAt: Date;
};

const popularityScoreSchema = new Schema<PopularityScoreDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true, index: true },
    score: { type: Number, required: true, default: 0, index: true },
    purchases: { type: Number, default: 0 },
    cartAdds: { type: Number, default: 0 },
    wishlists: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

popularityScoreSchema.index({ score: -1 });
popularityScoreSchema.index({ windowEnd: 1 });

export const PopularityScore: Model<PopularityScoreDocument> =
  models.PopularityScore || model<PopularityScoreDocument>("PopularityScore", popularityScoreSchema);