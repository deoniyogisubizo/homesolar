import { Schema, model, models, type Model } from "mongoose";
import type { AdminRole } from "@/lib/admin/permissions";

export type AdminUserDocument = {
  name: string;
  email: string;
  role: AdminRole;
  passwordHash: string;
  active: boolean;
  forcePasswordChange: boolean;
  sessionVersion: number;
  lastLoginAt?: Date | null;
  invitedBy?: string | null;
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const adminUserSchema = new Schema<AdminUserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ["owner", "admin", "editor", "support"],
      required: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true, index: true },
    forcePasswordChange: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: null },
    invitedBy: { type: String, default: null },
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

adminUserSchema.index({ email: 1, active: 1 });

export const AdminUser: Model<AdminUserDocument> =
  models.AdminUser || model<AdminUserDocument>("AdminUser", adminUserSchema);
