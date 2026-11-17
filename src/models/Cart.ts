import { Schema, model, models, type Model, type Types } from "mongoose";

export type CartItemDocument = {
  product: Types.ObjectId;
  variantSku?: string | null;
  color?: string | null;
  size?: string | null;
  priceSnapshot?: number | null;
  quantity: number;
};

export type CartDocument = {
  sessionId: string;
  items: CartItemDocument[];
  couponCode: string;
  couponAppliedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const cartItemSchema = new Schema<CartItemDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, default: null },
    color: { type: String, default: null },
    size: { type: String, default: null },
    priceSnapshot: { type: Number, default: null, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
);

const cartSchema = new Schema<CartDocument>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, default: "" },
    couponAppliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Cart: Model<CartDocument> =
  models.Cart || model<CartDocument>("Cart", cartSchema);
