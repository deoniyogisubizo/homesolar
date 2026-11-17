"use server";

import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { Setting } from "@/models/Setting";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit, auditValue } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { decryptSecret, encryptSecret } from "@/lib/admin/crypto";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { getSetting } from "@/lib/admin/settings";
import { sendRawEmail } from "@/lib/admin/mail";
import {
  contactSettingsSchema,
  generalSettingsSchema,
  newsletterSettingsSchema,
  notificationSettingsSchema,
  seoSettingsSchema,
  shippingSettingsSchema,
  smtpSettingsSchema,
  testEmailSchema,
  whatsappOrderSettingsSchema,
} from "@/schemas/settings";
import type { SettingsMap } from "@/lib/admin/settings-defaults";

type SectionKey = keyof SettingsMap;

async function saveSection<K extends SectionKey>(key: K, value: SettingsMap[K]) {
  await connectToDatabase();
  const before = await Setting.findOne({ key }).lean();
  await Setting.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy: "dashboard" } },
    { upsert: true, new: true },
  );
  return { before: auditValue(before?.value ?? null), after: auditValue(value) };
}

function tagsFor(key: SectionKey): Array<"settings" | "site-content" | "homepage" | "footer" | "products"> {
  if (key === "general") return ["settings", "site-content", "homepage", "footer", "products"];
  if (key === "contact") return ["settings", "site-content", "footer"];
  if (key === "shipping") return ["settings", "products", "site-content"];
  if (key === "seo") return ["settings", "site-content"];
  if (key === "whatsappOrder") return ["settings", "products"];
  return ["settings"];
}

async function persist<K extends SectionKey>(
  key: K,
  schema: z.ZodType<SettingsMap[K]>,
  input: unknown,
  summary: string,
): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const permission = {
      general: "settings:write",
      contact: "contact:write",
      notifications: "notifications:write",
      shipping: "shipping:write",
      smtp: "smtp:write",
      seo: "seo:write",
      newsletter: "newsletter:write",
      whatsappOrder: "contact:write",
    } as const;
    const session = await requirePermission(permission[key]);
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }
    const diff = await saveSection(key, parsed.data);
    await recordAudit({
      actor: session,
      action: "settings",
      entity: "settings",
      entityId: key,
      summary,
      before: diff.before,
      after: diff.after,
    });
    revalidateStorefront(tagsFor(key));
    return actionOk(null);
  });
}

export async function saveGeneralSettingsAction(input: unknown) {
  return persist("general", generalSettingsSchema, input, "Updated general settings");
}

export async function saveContactSettingsAction(input: unknown) {
  return persist("contact", contactSettingsSchema, input, "Updated contact and social settings");
}

export async function saveNotificationSettingsAction(input: unknown) {
  return persist("notifications", notificationSettingsSchema, input, "Updated notification settings");
}

export async function saveShippingSettingsAction(input: unknown) {
  return persist("shipping", shippingSettingsSchema, input, "Updated shipping and payment settings");
}

export async function saveSeoSettingsAction(input: unknown) {
  return persist("seo", seoSettingsSchema, input, "Updated SEO settings");
}

export async function saveNewsletterSettingsAction(input: unknown) {
  return persist("newsletter", newsletterSettingsSchema, input, "Updated newsletter settings");
}

export async function saveSmtpSettingsAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("smtp:write");
    const parsed = smtpSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const current = await getSetting("smtp");
    const passwordEncrypted = parsed.data.password
      ? encryptSecret(parsed.data.password)
      : current.passwordEncrypted;

    const value = {
      host: parsed.data.host,
      port: parsed.data.port,
      secure: parsed.data.secure,
      username: parsed.data.username,
      passwordEncrypted,
      fromName: parsed.data.fromName,
      fromEmail: parsed.data.fromEmail,
      replyTo: parsed.data.replyTo,
    };

    const diff = await saveSection("smtp", value);
    await recordAudit({
      actor: session,
      action: "settings",
      entity: "settings",
      entityId: "smtp",
      summary: parsed.data.password ? "Updated SMTP settings and password" : "Updated SMTP settings",
      before: diff.before,
      after: { ...diff.after, passwordEncrypted: passwordEncrypted ? "[encrypted]" : "" },
    });
    revalidateStorefront(["settings"]);
    return actionOk(null);
  });
}

export async function saveWhatsAppSettingsAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("contact:write");
    const parsed = z
      .object({
        whatsappOrder: whatsappOrderSettingsSchema,
        freeShippingThreshold: z.coerce.number().min(0).max(10_000_000),
      })
      .safeParse(input);
    if (!parsed.success) {
      return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const shipping = await getSetting("shipping");
    const whatsappDiff = await saveSection("whatsappOrder", parsed.data.whatsappOrder);
    await saveSection("shipping", { ...shipping, freeShippingThreshold: parsed.data.freeShippingThreshold });
    await recordAudit({
      actor: session,
      action: "settings",
      entity: "settings",
      entityId: "whatsappOrder",
      summary: "Updated checkout and WhatsApp settings",
      before: { whatsappOrder: whatsappDiff.before, freeShippingThreshold: shipping.freeShippingThreshold },
      after: { whatsappOrder: whatsappDiff.after, freeShippingThreshold: parsed.data.freeShippingThreshold },
    });
    revalidateStorefront(["settings", "products"]);
    return actionOk(null);
  });
}

export async function sendTestEmailAction(input: unknown): Promise<ActionResult<{ logId: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("smtp:write");
    const parsed = testEmailSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("Enter a valid recipient email.", fieldErrorsFromZod(parsed.error));
    }

    const settings = await getSetting("smtp");
    const connected = Boolean(
      (settings.host || process.env.SMTP_HOST) &&
        (settings.username || process.env.SMTP_USER) &&
        (settings.passwordEncrypted || process.env.SMTP_PASSWORD),
    );
    if (!connected) {
      return actionError("SMTP is not configured yet. Save host, username and password first.");
    }

    const result = await sendRawEmail({
      to: parsed.data.to,
      subject: "SMTP test from Homesolar Admin",
      html: "<p>This is a test message sent from the Homesolar dashboard. SMTP is configured correctly.</p>",
      templateKey: "smtp_test",
      sentBy: session.id,
    });

    await recordAudit({
      actor: session,
      action: "send",
      entity: "email",
      entityId: result.logId,
      summary: `Sent SMTP test email to ${parsed.data.to}`,
    });

    if (!result.ok) {
      return actionError(result.error);
    }
    return actionOk({ logId: result.logId });
  });
}

export async function verifySmtpPasswordAction(): Promise<ActionResult<{ configured: boolean }>> {
  return runAdminAction(async () => {
    const session = await requirePermission("smtp:read");
    void session;
    const settings = await getSetting("smtp");
    const configured = Boolean(settings.passwordEncrypted && decryptSecret(settings.passwordEncrypted));
    return actionOk({ configured });
  });
}
