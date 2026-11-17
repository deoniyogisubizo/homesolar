import { Schema, model, models, type Model, type Types } from "mongoose";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewDocument = {
  productId: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  author: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  reply: string;
  repliedAt?: Date | null;
  repliedBy?: string | null;
  moderatedBy?: string | null;
  moderatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const reviewSchema = new Schema<ReviewDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    author: { type: String, required: true, trim: true, maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reply: { type: String, default: "" },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: String, default: null },
    moderatedBy: { type: String, default: null },
    moderatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, createdAt: -1 });

export const Review: Model<ReviewDocument> =
  models.Review || model<ReviewDocument>("Review", reviewSchema);
