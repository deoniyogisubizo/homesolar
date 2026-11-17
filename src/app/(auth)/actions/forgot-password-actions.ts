"use server";

import { z } from "zod";
import { hashToken, randomToken, issueSessionCookie } from "@/lib/auth/customer";
import { sendTemplatedEmail, siteUrl } from "@/lib/admin/mail";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAction, type ActionResult } from "@/lib/admin/action-result";
import { emailSchema } from "@/schemas/common";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";

const forgotSchema = z.object({
  email: emailSchema,
});

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const parsed = forgotSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Enter a valid email address.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const customer = await Customer.findOne({ email: parsed.data.email.toLowerCase() }).lean();
    
    if (customer) {
      const token = randomToken();
      const tokenHash = hashToken(token);
      await Customer.updateOne(
        { _id: customer._id },
        {
          $set: {
            resetTokenHash: tokenHash,
            resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        },
      );

      await sendTemplatedEmail({
        templateKey: "password_reset",
        to: customer.email,
        variables: {
          customerName: customer.name,
          resetUrl: `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`,
        },
      });

      await recordAudit({
        actor: { id: String(customer._id), email: customer.email, role: "customer" },
        action: "update",
        entity: "customer",
        entityId: String(customer._id),
        summary: "Password reset requested",
      });
    }

    return actionOk(null);
  });
}

const resetSchema = z.object({
  token: z.string().min(20, "Reset link is invalid.").max(300),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Password is too long.")
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use letters and numbers."),
});

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const parsed = resetSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    await connectToDatabase();
    const tokenHash = hashToken(parsed.data.token);
    const customer = await Customer.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() },
    }).select("+resetTokenHash +resetTokenExpiresAt");

    if (!customer) {
      return actionError("This reset link is invalid or has expired.");
    }

    const passwordHash = await import("bcryptjs").then((bcrypt) => bcrypt.hash(parsed.data.password, 12));
    await Customer.updateOne(
      { _id: customer._id },
      {
        $set: {
          passwordHash,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          sessionVersion: (customer.sessionVersion ?? 0) + 1,
        },
      },
    );

    const session = {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      sessionVersion: (customer.sessionVersion ?? 0) + 1,
    };

    await issueSessionCookie(session);

    await recordAudit({
      actor: { id: session.id, email: session.email, role: "customer" },
      action: "update",
      entity: "customer",
      entityId: session.id,
      summary: "Password reset completed",
    });

    return actionOk(null);
  });
}