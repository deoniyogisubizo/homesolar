import { Schema, model, models, type Model, type Types } from "mongoose";

export type NewsletterCampaignStatus = "draft" | "sending" | "sent" | "failed";

export type NewsletterCampaignDocument = {
  subject: string;
  body: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const newsletterCampaignSchema = new Schema<NewsletterCampaignDocument>(
  {
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sending", "sent", "failed"],
      default: "draft",
      index: true,
    },
    recipientCount: { type: Number, default: 0, min: 0 },
    sentCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

newsletterCampaignSchema.index({ createdAt: -1 });

export const NewsletterCampaign: Model<NewsletterCampaignDocument> =
  models.NewsletterCampaign ||
  model<NewsletterCampaignDocument>("NewsletterCampaign", newsletterCampaignSchema);
