import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser, type AdminUserDocument } from "@/models/AdminUser";
import { createAdminToken, verifyAdminToken } from "@/lib/admin/token";
import {
  can,
  isAdminRole,
  permissionsFor,
  type AdminRole,
  type Permission,
} from "@/lib/admin/permissions";

export const ADMIN_COOKIE = "homesolar_admin";
const SESSION_DAYS = Number.parseInt(process.env.ADMIN_SESSION_DAYS ?? "7", 10);
const SESSION_SECONDS = (Number.isFinite(SESSION_DAYS) ? SESSION_DAYS : 7) * 86400;

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  forcePasswordChange: boolean;
  sessionVersion: number;
};

export class AdminAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

function toSession(user: {
  _id: unknown;
  name: string;
  email: string;
  role: AdminRole;
  forcePasswordChange: boolean;
  sessionVersion: number;
}): AdminSession {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: permissionsFor(user.role),
    forcePasswordChange: user.forcePasswordChange,
    sessionVersion: user.sessionVersion,
  };
}

export async function issueSessionCookie(user: AdminSession) {
  const token = await createAdminToken({
    uid: user.id,
    role: user.role,
    sv: user.sessionVersion,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  });

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyAdminToken(token);
  if (!payload || !isAdminRole(payload.role)) return null;

  await connectToDatabase();
  const user = await AdminUser.findOne({
    _id: payload.uid,
    active: true,
    sessionVersion: payload.sv,
  })
    .select("name email role forcePasswordChange sessionVersion")
    .lean();

  if (!user) return null;
  return toSession(user as typeof user & { role: AdminRole });
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requirePermission(permission: Permission): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError("Sign in to continue.", 401);
  if (!can(session.role, permission)) {
    throw new AdminAuthError("Your role does not allow this action.", 403);
  }
  return session;
}

export async function getClientIp() {
  const store = await headers();
  return (
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    store.get("x-real-ip") ??
    "unknown"
  );
}

export async function getUserAgent() {
  const store = await headers();
  return store.get("user-agent")?.slice(0, 400) ?? "";
}

export async function assertSameOrigin() {
  const store = await headers();
  const origin = store.get("origin");
  const host = store.get("host");
  if (!origin) throw new AdminAuthError("Missing request origin.", 403);

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AdminAuthError("Invalid request origin.", 403);
  }

  if (!host || originHost !== host) {
    throw new AdminAuthError("Cross-site request blocked.", 403);
  }
}

export async function findUserForLogin(email: string) {
  await connectToDatabase();
  return AdminUser.findOne({ email: email.toLowerCase(), active: true })
    .select("+passwordHash")
    .lean();
}

export function publicUser(user: AdminUserDocument & { _id: unknown }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    forcePasswordChange: user.forcePasswordChange,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt?.toISOString() ?? null,
  };
}
