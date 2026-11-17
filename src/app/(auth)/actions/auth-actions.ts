"use server";

import { z } from "zod";
import {
  verifyPassword,
  issueSessionCookie,
  clearSessionCookie,
  createCustomerWithPassword,
  findCustomerForLogin,
  createOrUpdateCustomerFromGoogle,
} from "@/lib/auth/customer";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAction, type ActionResult } from "@/lib/admin/action-result";
import { emailSchema } from "@/schemas/common";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: emailSchema,
  phone: z.string().min(8, "Enter a valid phone number").max(20),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use letters and numbers"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export async function registerAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    try {
      const customer = await createCustomerWithPassword({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        password: parsed.data.password,
      });

      const session = {
        id: String(customer._id),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        image: customer.image,
        sessionVersion: customer.sessionVersion,
      };

      await issueSessionCookie(session);

      await recordAudit({
        actor: { email: customer.email, role: "customer" },
        action: "register",
        entity: "customer",
        entityId: session.id,
        summary: "Customer registered",
      });

      return actionOk(null);
    } catch (error) {
      if (error instanceof Error && error.message === "Email already registered") {
        return actionError("This email is already registered.", { email: "This email is already registered." });
      }
      throw error;
    }
  });
}

export async function loginAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the form and try again.", fieldErrorsFromZod(parsed.error));
    }

    const customer = await findCustomerForLogin(parsed.data.email);

    if (!customer || !customer.passwordHash || !(await verifyPassword(parsed.data.password, customer.passwordHash))) {
      return actionError("Invalid email or password.");
    }

    if (customer.blocked) {
      return actionError("This account has been blocked. Contact support.");
    }

    const session = {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      image: customer.image,
      sessionVersion: customer.sessionVersion,
    };

    await issueSessionCookie(session);

    await recordAudit({
      actor: { id: session.id, email: session.email, role: "customer" },
      action: "login",
      entity: "customer",
      entityId: session.id,
      summary: "Customer signed in",
    });

    return actionOk(null);
  });
}

export async function logoutAction(): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { getCustomerSession } = await import("@/lib/auth/customer");
    const session = await getCustomerSession();
    await clearSessionCookie();
    if (session) {
      await recordAudit({
        actor: { id: session.id, email: session.email, role: "customer" },
        action: "logout",
        entity: "customer",
        entityId: session.id,
        summary: "Customer signed out",
      });
    }
    return actionOk(null);
  });
}

export async function googleLoginAction(input: unknown): Promise<ActionResult<{ googleId: string; email: string; name: string }>> {
  return runAction(async () => {
    const parsed = z
      .object({
        googleId: z.string().min(1),
        email: emailSchema,
        name: z.string().min(1),
        picture: z.string().url().optional(),
      })
      .safeParse(input);

    if (!parsed.success) {
      return actionError("Invalid Google account data.", fieldErrorsFromZod(parsed.error));
    }

    const customer = await createOrUpdateCustomerFromGoogle(parsed.data);
    if (!customer) {
      return actionError("Failed to create or update customer.");
    }

    const session = {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      image: customer.image,
      sessionVersion: customer.sessionVersion,
    };

    await issueSessionCookie(session);

    await recordAudit({
      actor: { id: session.id, email: session.email, role: "customer" },
      action: "login",
      entity: "customer",
      entityId: session.id,
      summary: "Customer signed in with Google",
    });

    return actionOk({ googleId: parsed.data.googleId, email: parsed.data.email, name: parsed.data.name });
  });
}