import { Schema, model, models, type Model } from "mongoose";

export type OrderCounterDocument = {
  prefix: string;
  seq: number;
};

const orderCounterSchema = new Schema<OrderCounterDocument>(
  {
    prefix: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const OrderCounter: Model<OrderCounterDocument> =
  models.OrderCounter || model<OrderCounterDocument>("OrderCounter", orderCounterSchema);