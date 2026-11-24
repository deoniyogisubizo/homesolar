import { Schema, model, models, type Model, type Types } from "mongoose";

export type EventType =
  | "view"
  | "search"
  | "cart_add"
  | "cart_remove"
  | "wishlist"
  | "purchase"
  | "click";

export type EventDocument = {
  userId?: Types.ObjectId | null;
  anonId?: string | null;
  type: EventType;
  productId?: Types.ObjectId | null;
  query?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

const eventSchema = new Schema<EventDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    anonId: { type: String, default: null, index: true },
    type: {
      type: String,
      enum: ["view", "search", "cart_add", "cart_remove", "wishlist", "purchase", "click"],
      required: true,
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null, index: true },
    query: { type: String, default: null, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ productId: 1, type: 1, createdAt: -1 });
eventSchema.index({ anonId: 1, createdAt: -1 });
eventSchema.index({ type: 1, createdAt: -1 });
eventSchema.index({ "metadata.sessionId": 1, createdAt: -1 });

export const Event: Model<EventDocument> = models.Event || model<EventDocument>("Event", eventSchema);