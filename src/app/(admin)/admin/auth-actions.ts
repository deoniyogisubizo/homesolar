"use server";

import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models/AdminUser";
import { LoginAttempt } from "@/models/LoginAttempt";
import {
  assertSameOrigin,
  clearSessionCookie,
  getAdminSession,
  getClientIp,
  getUserAgent,
  hashPassword,
  hashToken,
  issueSessionCookie,
  randomToken,
  verifyPassword,
} from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { emailSchema } from "@/schemas/common";
import { sendTemplatedEmail, siteUrl } from "@/lib/admin/mail";
import { isAdminRole, permissionsFor } from "@/lib/admin/permissions";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
});

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Password is too long.")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use letters and numbers.");

const resetSchema = z.object({
  token: z.string().min(20, "Reset link is invalid.").max(300),
  password: passwordSchema,
});

const changeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  password: passwordSchema,
});

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function loginAction(input: unknown): Promise<ActionResult<{ forcePasswordChange: boolean }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    const [ip, userAgent] = await Promise.all([getClientIp(), getUserAgent()]);
    await connectToDatabase();

    const since = new Date(Date.now() - WINDOW_MS);
    const failures = await LoginAttempt.countDocuments({
      email: parsed.data.email,
      ip,
      success: false,
      createdAt: { $gte: since },
    });

    if (failures >= MAX_ATTEMPTS) {
      const oldest = await LoginAttempt.findOne({
        email: parsed.data.email,
        ip,
        success: false,
        createdAt: { $gte: since },
      })
        .sort({ createdAt: 1 })
        .lean();
      const minutes = oldest
        ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + WINDOW_MS - Date.now()) / 60000))
        : 15;
      return actionError(`Too many attempts. Try again in ${minutes} minutes.`);
    }

    const user = await AdminUser.findOne({ email: parsed.data.email, active: true })
      .select("+passwordHash")
      .lean();

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      await LoginAttempt.create({ email: parsed.data.email, ip, success: false });
      await recordAudit({
        actor: { email: parsed.data.email, role: "anonymous" },
        action: "login_failed",
        entity: "admin_user",
        entityId: user ? String(user._id) : null,
        summary: "Failed sign-in attempt",
        ip,
        userAgent,
      });
      return actionError("Email or password is incorrect.");
    }

    if (!isAdminRole(user.role)) return actionError("This account has an invalid role.");

    await Promise.all([
      LoginAttempt.deleteMany({ email: parsed.data.email, ip, success: false }),
      AdminUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }),
    ]);

    const session = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: permissionsFor(user.role),
      forcePasswordChange: user.forcePasswordChange,
      sessionVersion: user.sessionVersion,
    };

    await issueSessionCookie(session);
    await recordAudit({
      actor: session,
      action: "login",
      entity: "admin_user",
      entityId: session.id,
      summary: "Signed in to the dashboard",
      ip,
      userAgent,
    });

    return actionOk({ forcePasswordChange: user.forcePasswordChange });
  });
}

export async function logoutAction(): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await getAdminSession();
    await clearSessionCookie();
    if (session) {
      await recordAudit({
        actor: session,
        action: "logout",
        entity: "admin_user",
        entityId: session.id,
        summary: "Signed out",
      });
    }
    return actionOk(null);
  });
}

export async function signOutEverywhereAction(): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await getAdminSession();
    if (!session) return actionError("Sign in to continue.");
    await connectToDatabase();
    await AdminUser.updateOne({ _id: session.id }, { $inc: { sessionVersion: 1 } });
    await clearSessionCookie();
    await recordAudit({
      actor: session,
      action: "logout",
      entity: "admin_user",
      entityId: session.id,
      summary: "Signed out of all sessions",
    });
    return actionOk(null);
  });
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const parsed = z.object({ email: emailSchema }).safeParse(input);
    if (!parsed.success) {
      return actionError("Enter a valid email address.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const user = await AdminUser.findOne({ email: parsed.data.email, active: true }).lean();
    if (user) {
      const token = randomToken();
      await AdminUser.updateOne(
        { _id: user._id },
        {
          $set: {
            resetTokenHash: hashToken(token),
            resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        },
      );

      await sendTemplatedEmail({
        templateKey: "password_reset",
        to: user.email,
        variables: {
          customerName: user.name,
          resetUrl: `${siteUrl()}/admin/reset-password?token=${encodeURIComponent(token)}`,
        },
      });

      await recordAudit({
        actor: { email: user.email, role: "anonymous" },
        action: "update",
        entity: "admin_user",
        entityId: String(user._id),
        summary: "Password reset requested",
      });
    }

    return actionOk(null);
  });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const parsed = resetSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const tokenHash = hashToken(parsed.data.token);
    const user = await AdminUser.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() },
      active: true,
    }).select("+resetTokenHash +resetTokenExpiresAt");

    if (!user) return actionError("This reset link is invalid or has expired.");

    user.passwordHash = await hashPassword(parsed.data.password);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    user.forcePasswordChange = false;
    user.sessionVersion += 1;
    await user.save();

    await recordAudit({
      actor: { email: user.email, role: user.role },
      action: "update",
      entity: "admin_user",
      entityId: String(user._id),
      summary: "Password reset completed",
    });

    return actionOk(null);
  });
}

export async function changePasswordAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await getAdminSession();
    if (!session) return actionError("Sign in to continue.");

    const parsed = changeSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const user = await AdminUser.findById(session.id).select("+passwordHash");
    if (!user) return actionError("Account not found.");
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return actionError("Your current password is not correct.", {
        currentPassword: "Your current password is not correct.",
      });
    }
    if (await verifyPassword(parsed.data.password, user.passwordHash)) {
      return actionError("Choose a password you have not used before.", {
        password: "Choose a different password.",
      });
    }

    user.passwordHash = await hashPassword(parsed.data.password);
    user.forcePasswordChange = false;
    user.sessionVersion += 1;
    await user.save();

    await issueSessionCookie({
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      permissions: permissionsFor(session.role),
      forcePasswordChange: false,
      sessionVersion: user.sessionVersion,
    });

    await recordAudit({
      actor: session,
      action: "update",
      entity: "admin_user",
      entityId: session.id,
      summary: "Password changed",
    });

    return actionOk(null);
  });
}

