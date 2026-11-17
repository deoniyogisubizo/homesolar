import { Schema, model, models, type Model, type Types } from "mongoose";

export type MessageStatus = "new" | "read" | "replied" | "archived";

export type MessageNote = {
  body: string;
  by: string;
  at: Date;
};

export type MessageDocument = {
  customerId?: Types.ObjectId | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  body: string;
  status: MessageStatus;
  notes: MessageNote[];
  replyBody: string;
  repliedAt?: Date | null;
  ip: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const messageNoteSchema = new Schema<MessageNote>(
  {
    body: { type: String, required: true },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const messageSchema = new Schema<MessageDocument>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["new", "read", "replied", "archived"], default: "new", index: true },
    notes: { type: [messageNoteSchema], default: [] },
    replyBody: { type: String, default: "" },
    repliedAt: { type: Date, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

messageSchema.index({ status: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ email: 1 });
messageSchema.index({ customerId: 1, createdAt: -1 });

export const Message: Model<MessageDocument> =
  models.Message || model<MessageDocument>("Message", messageSchema);
