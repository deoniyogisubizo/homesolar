import { Schema, model, models, type Model } from "mongoose";

export type LoginAttemptDocument = {
  email: string;
  ip: string;
  success: boolean;
  createdAt: Date;
};

const loginAttemptSchema = new Schema<LoginAttemptDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    ip: { type: String, required: true },
    success: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 },
  },
  { versionKey: false },
);

loginAttemptSchema.index({ email: 1, ip: 1, createdAt: -1 });
loginAttemptSchema.index({ success: 1, createdAt: -1 });

export const LoginAttempt: Model<LoginAttemptDocument> =
  models.LoginAttempt || model<LoginAttemptDocument>("LoginAttempt", loginAttemptSchema);
