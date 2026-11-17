import { Schema, model, models, type Model, type Types } from "mongoose";

export type EmailTemplateDocument = {
  key: string;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  updatedBy?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const emailTemplateSchema = new Schema<EmailTemplateDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    active: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

export const EmailTemplate: Model<EmailTemplateDocument> =
  models.EmailTemplate || model<EmailTemplateDocument>("EmailTemplate", emailTemplateSchema);
