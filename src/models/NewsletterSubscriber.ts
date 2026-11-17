import { Schema, model, models, type Model } from "mongoose";

export type NewsletterStatus = "pending" | "active" | "unsubscribed" | "bounced";

export type NewsletterSubscriberDocument = {
  email: string;
  status: NewsletterStatus;
  source: string;
  confirmToken?: string | null;
  unsubscribeToken: string;
  confirmedAt?: Date | null;
  unsubscribedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const newsletterSubscriberSchema = new Schema<NewsletterSubscriberDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "active", "unsubscribed", "bounced"],
      default: "active",
      index: true,
    },
    source: { type: String, default: "homepage" },
    confirmToken: { type: String, default: null, select: false },
    unsubscribeToken: { type: String, required: true, index: true },
    confirmedAt: { type: Date, default: null },
    unsubscribedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

newsletterSubscriberSchema.index({ status: 1, createdAt: -1 });

export const NewsletterSubscriber: Model<NewsletterSubscriberDocument> =
  models.NewsletterSubscriber ||
  model<NewsletterSubscriberDocument>("NewsletterSubscriber", newsletterSubscriberSchema);
