import { Schema, model, models, type Model, type Types } from "mongoose";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "register"
  | "login"
  | "login_failed"
  | "logout"
  | "settings"
  | "send"
  | "status"
  | "order.status_changed"
  | "order.tracking_updated"
  | "order.payment_updated"
  | "order.note_added"
  | "order.created"
  | "order.email_resent";

export type AuditLogDocument = {
  actorId?: Types.ObjectId | null;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip: string;
  userAgent?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null, index: true },
    actorEmail: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, default: null, index: true },
    summary: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, required: true },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });

export const AuditLog: Model<AuditLogDocument> =
  models.AuditLog || model<AuditLogDocument>("AuditLog", auditLogSchema);
