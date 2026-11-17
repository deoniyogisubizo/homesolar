import { Schema, model, models, type Model, type Types } from "mongoose";

export type EmailLogDocument = {
  to: string;
  from: string;
  templateKey: string;
  subject: string;
  status: "sent" | "failed";
  error: string;
  messageId: string;
  orderId?: Types.ObjectId | null;
  sentBy?: Types.ObjectId | null;
  retryOf?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const emailLogSchema = new Schema<EmailLogDocument>(
  {
    to: { type: String, required: true, index: true },
    from: { type: String, default: "" },
    templateKey: { type: String, required: true, index: true },
    subject: { type: String, default: "" },
    status: { type: String, enum: ["sent", "failed"], required: true, index: true },
    error: { type: String, default: "" },
    messageId: { type: String, default: "" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    sentBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    retryOf: { type: Schema.Types.ObjectId, ref: "EmailLog", default: null },
  },
  { timestamps: true },
);

emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });

export const EmailLog: Model<EmailLogDocument> =
  models.EmailLog || model<EmailLogDocument>("EmailLog", emailLogSchema);
