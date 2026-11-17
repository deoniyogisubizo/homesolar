import { Schema, model, models, type Model, type Types } from "mongoose";

export type WishlistDocument = {
  sessionId?: string | null;
  customerId?: Types.ObjectId | null;
  products: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

const wishlistSchema = new Schema<WishlistDocument>(
  {
    sessionId: { type: String, default: null, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    products: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
  },
  { timestamps: true },
);

wishlistSchema.index({ sessionId: 1, customerId: 1 });

export const Wishlist: Model<WishlistDocument> =
  models.Wishlist || model<WishlistDocument>("Wishlist", wishlistSchema);
