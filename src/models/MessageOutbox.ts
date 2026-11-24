import { Schema, model, models, type Model, type Types } from "mongoose";

export const OUTBOX_STATUSES = ["pending", "sending", "sent", "failed", "skipped"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export type MessageOutboxDocument = {
  orderId?: Types.ObjectId | null;
  orderNumber: string;
  event: string;
  recipient: string;
  templateName: string;
  languageCode: string;
  variables: string[];
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string;
  providerMessageId: string;
  deliveryStatus: string;
  sentAt?: Date | null;
  idempotencyKey: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const messageOutboxSchema = new Schema<MessageOutboxDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    orderNumber: { type: String, default: "", index: true },
    event: { type: String, required: true },
    recipient: { type: String, required: true },
    templateName: { type: String, required: true },
    languageCode: { type: String, default: "en" },
    variables: { type: [String], default: [] },
    status: {
      type: String,
      enum: OUTBOX_STATUSES,
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lastError: { type: String, default: "" },
    providerMessageId: { type: String, default: "", index: true },
    deliveryStatus: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    idempotencyKey: { type: String, required: true, unique: true },
    createdBy: { type: String, default: "system" },
  },
  { timestamps: true },
);

messageOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
messageOutboxSchema.index({ createdAt: -1 });

export const MessageOutbox: Model<MessageOutboxDocument> =
  models.MessageOutbox || model<MessageOutboxDocument>("MessageOutbox", messageOutboxSchema);
