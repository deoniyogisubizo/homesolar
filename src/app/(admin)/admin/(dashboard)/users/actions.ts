"use server";

import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models/AdminUser";
import { assertSameOrigin, hashPassword, requirePermission, randomToken } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { emailSchema, idSchema, userRoleSchema } from "@/schemas/common";
import { sendRawEmail } from "@/lib/admin/mail";

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  email: emailSchema,
  role: userRoleSchema,
});

const updateSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2, "Enter a name.").max(80),
  role: userRoleSchema,
  active: z.boolean(),
});

function temporaryPassword() {
  return `${randomToken().replace(/[-_]/g, "").slice(0, 10)}7a`;
}

async function ownerCount() {
  await connectToDatabase();
  return AdminUser.countDocuments({ role: "owner", active: true });
}

export async function inviteUserAction(
  input: unknown,
): Promise<ActionResult<{ temporaryPassword: string; email: string; emailSent: boolean }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("users:write");
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const existing = await AdminUser.findOne({ email: parsed.data.email }).lean();
    if (existing) {
      return actionError("An account with this email already exists.", { email: "This email is already in use." });
    }

    const password = temporaryPassword();
    const created = await AdminUser.create({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(password),
      active: true,
      forcePasswordChange: true,
      sessionVersion: 1,
      invitedBy: session.id,
    });

    const emailResult = await sendRawEmail({
      to: parsed.data.email,
      subject: "Your Homesolar dashboard account",
      html: `<p>Hello ${parsed.data.name},</p><p>An account has been created for you with the role ${parsed.data.role}.</p><p>Temporary password: <strong>${password}</strong></p><p>Sign in at /admin/login and change the password when prompted.</p>`,
      templateKey: "admin_invite",
      sentBy: session.id,
    });

    await recordAudit({
      actor: session,
      action: "create",
      entity: "admin_user",
      entityId: String(created._id),
      summary: `Invited ${parsed.data.email} as ${parsed.data.role}`,
      after: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
    });

    return actionOk({
      temporaryPassword: password,
      email: parsed.data.email,
      emailSent: emailResult.ok,
    });
  });
}

export async function updateUserAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("users:write");
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const user = await AdminUser.findById(parsed.data.id);
    if (!user) return actionError("Account not found.");

    if (user.role === "owner" && (parsed.data.role !== "owner" || !parsed.data.active)) {
      const owners = await ownerCount();
      if (owners <= 1) {
        return actionError("The last active owner cannot be deactivated or given another role.");
      }
    }
    if (String(user._id) === session.id && !parsed.data.active) {
      return actionError("You cannot deactivate your own account.");
    }

    const before = { name: user.name, role: user.role, active: user.active };
    user.name = parsed.data.name;
    user.role = parsed.data.role;
    user.active = parsed.data.active;
    if (!parsed.data.active) user.sessionVersion += 1;
    await user.save();

    await recordAudit({
      actor: session,
      action: "update",
      entity: "admin_user",
      entityId: String(user._id),
      summary: `Updated account ${user.email}`,
      before,
      after: { name: user.name, role: user.role, active: user.active },
    });

    return actionOk(null);
  });
}

export async function resetUserPasswordAction(
  input: unknown,
): Promise<ActionResult<{ temporaryPassword: string; emailSent: boolean }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("users:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) {
      return actionError("Invalid account.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const user = await AdminUser.findById(parsed.data.id);
    if (!user) return actionError("Account not found.");

    const password = temporaryPassword();
    user.passwordHash = await hashPassword(password);
    user.forcePasswordChange = true;
    user.sessionVersion += 1;
    await user.save();

    const emailResult = await sendRawEmail({
      to: user.email,
      subject: "Your Homesolar password was reset",
      html: `<p>Hello ${user.name},</p><p>Your password was reset by an administrator.</p><p>Temporary password: <strong>${password}</strong></p><p>You will be asked to choose a new password at sign-in.</p>`,
      templateKey: "admin_password_reset",
      sentBy: session.id,
    });

    await recordAudit({
      actor: session,
      action: "update",
      entity: "admin_user",
      entityId: String(user._id),
      summary: `Reset password for ${user.email}`,
    });

    return actionOk({ temporaryPassword: password, emailSent: emailResult.ok });
  });
}
