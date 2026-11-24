import { Schema, model, models, type Model, type Types } from "mongoose";

export type UserInterestProfileDocument = {
  userId: Types.ObjectId;
  categoryWeights: Map<string, number>;
  brandWeights: Map<string, number>;
  priceBandWeights: Map<string, number>;
  lastUpdated: Date;
  createdAt: Date;
};

const userInterestProfileSchema = new Schema<UserInterestProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, unique: true, index: true },
    categoryWeights: { type: Map, of: Number, default: {} },
    brandWeights: { type: Map, of: Number, default: {} },
    priceBandWeights: { type: Map, of: Number, default: {} },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UserInterestProfile: Model<UserInterestProfileDocument> =
  models.UserInterestProfile || model<UserInterestProfileDocument>("UserInterestProfile", userInterestProfileSchema);