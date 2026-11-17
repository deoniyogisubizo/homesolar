import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog, type AuditAction } from "@/models/AuditLog";
import { getClientIp, getUserAgent } from "@/lib/admin/auth";

export type AuditInput = {
  actor?: {
    id?: string;
    email: string;
    role: string;
  } | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export async function recordAudit(input: AuditInput) {
  await connectToDatabase();
  const [ip, userAgent] = await Promise.all([
    input.ip ?? getClientIp(),
    input.userAgent ?? getUserAgent(),
  ]);

  await AuditLog.create({
    actorId: input.actor?.id ?? null,
    actorEmail: input.actor?.email ?? "system",
    actorRole: input.actor?.role ?? "system",
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    summary: input.summary,
    before: input.before ?? null,
    after: input.after ?? null,
    ip,
    userAgent,
  });
}

export function diffSummary(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before || !after) return "";
  const changed = Object.keys(after).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  return changed.length ? `Changed: ${changed.slice(0, 12).join(", ")}` : "No field changes";
}

export function auditValue(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
