import "server-only";

import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/mongodb";
import { decryptSecret } from "@/lib/admin/crypto";
import { getSetting } from "@/lib/admin/settings";
import { EmailTemplate } from "@/models/EmailTemplate";
import { EmailLog } from "@/models/EmailLog";
import { generateInvoicePdf } from "@/lib/invoices/pdf";
import type { InvoiceSnapshot } from "@/lib/invoices";
import {
  DEFAULT_EMAIL_TEMPLATES,
  emailShell,
  substituteSubject,
  substituteVariables,
  type EmailTemplateKey,
} from "@/lib/emails/templates";
import type { SettingsMap } from "@/lib/admin/settings-defaults";

type SendInput = {
  to: string;
  subject: string;
  html: string;
  templateKey: string;
  orderId?: string | null;
  sentBy?: string | null;
  retryOf?: string | null;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
};

export type SendResult = { ok: true; messageId: string; logId: string } | { ok: false; error: string; logId: string };

function resolveSmtp(settings: SettingsMap["smtp"]) {
  const host = settings.host || process.env.SMTP_HOST || "";
  const port = settings.port || Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = settings.secure || process.env.SMTP_SECURE === "true";
  const username = settings.username || process.env.SMTP_USER || "";
  const password = settings.passwordEncrypted
    ? decryptSecret(settings.passwordEncrypted)
    : process.env.SMTP_PASSWORD || "";
  const fromEmail = settings.fromEmail || process.env.SMTP_FROM_EMAIL || username;
  const fromName = settings.fromName || process.env.SMTP_FROM_NAME || "Solar Home System";
  const replyTo = settings.replyTo || process.env.SMTP_REPLY_TO || fromEmail;

  return { host, port, secure, username, password, fromEmail, fromName, replyTo };
}

export async function sendEmail(input: SendInput): Promise<SendResult> {
  await connectToDatabase();
  const settings = await getSetting("smtp");
  const config = resolveSmtp(settings);

  if (!config.host || !config.fromEmail) {
    const log = await EmailLog.create({
      to: input.to,
      from: config.fromEmail,
      templateKey: input.templateKey,
      subject: input.subject,
      status: "failed",
      error: "SMTP is not configured.",
      orderId: input.orderId ?? null,
      sentBy: input.sentBy ?? null,
      retryOf: input.retryOf ?? null,
    });
    return { ok: false, error: "SMTP is not configured.", logId: String(log._id) };
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.username ? { user: config.username, pass: config.password } : undefined,
    });

    const info = await transport.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: input.to,
      replyTo: config.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((attachment) => ({
              filename: attachment.filename,
              content: attachment.content,
              contentType: attachment.contentType,
            })),
          }
        : {}),
    });

    const log = await EmailLog.create({
      to: input.to,
      from: config.fromEmail,
      templateKey: input.templateKey,
      subject: input.subject,
      status: "sent",
      messageId: info.messageId,
      orderId: input.orderId ?? null,
      sentBy: input.sentBy ?? null,
      retryOf: input.retryOf ?? null,
    });

    return { ok: true, messageId: info.messageId, logId: String(log._id) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email.";
    const log = await EmailLog.create({
      to: input.to,
      from: config.fromEmail,
      templateKey: input.templateKey,
      subject: input.subject,
      status: "failed",
      error: message,
      orderId: input.orderId ?? null,
      sentBy: input.sentBy ?? null,
      retryOf: input.retryOf ?? null,
    });
    return { ok: false, error: message, logId: String(log._id) };
  }
}

export async function sendTemplatedEmail(options: {
  templateKey: EmailTemplateKey | string;
  to: string;
  variables: Record<string, string | number | null | undefined>;
  orderId?: string | null;
  sentBy?: string | null;
  retryOf?: string | null;
  unsubscribeUrl?: string | null;
  invoice?: {
    invoiceNumber: string;
    orderNumber: string;
    snapshot: InvoiceSnapshot;
    deliveryToken?: string;
    pin?: string;
    issuedAt?: Date;
  } | null;
}) {
  await connectToDatabase();
  const stored = await EmailTemplate.findOne({ key: options.templateKey, active: true }).lean();

  const fallback = DEFAULT_EMAIL_TEMPLATES.find((template) => template.key === options.templateKey);
  const subjectTemplate = stored?.subject ?? fallback?.subject ?? options.templateKey;
  const bodyTemplate = stored?.body ?? fallback?.body ?? "<p></p>";

  const general = await getSetting("general");
  const contact = await getSetting("contact");
  const variables = {
    storeName: general.storeName,
    supportEmail: contact.supportEmail,
    supportPhone: contact.primaryPhone,
    ...options.variables,
  };

  const subject = substituteSubject(subjectTemplate, variables);
  const body = substituteVariables(bodyTemplate, variables);
  const html = emailShell({
    storeName: general.storeName,
    supportEmail: contact.supportEmail,
    supportPhone: contact.primaryPhone,
    body,
    unsubscribeUrl: options.unsubscribeUrl ?? undefined,
  });

  let attachments: SendInput["attachments"];
  if (options.invoice) {
    const pdfBuffer = await generateInvoicePdf({
      snapshot: options.invoice.snapshot,
      invoiceNumber: options.invoice.invoiceNumber,
      orderNumber: options.invoice.orderNumber,
      issuedAt: options.invoice.issuedAt ?? new Date(),
      deliveryToken: options.invoice.deliveryToken,
      pin: options.invoice.pin,
      currencySymbol: general.currencySymbol,
      decimals: ["$", "£", "€"].includes(general.currencySymbol) ? 2 : 0,
    });
    attachments = [
      { filename: `${options.invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" },
    ];
  } else {
    attachments = undefined;
  }

  return sendEmail({
    to: options.to,
    subject,
    html,
    templateKey: options.templateKey,
    orderId: options.orderId,
    sentBy: options.sentBy,
    retryOf: options.retryOf,
    attachments,
  });
}

export async function sendRawEmail(options: {
  to: string;
  subject: string;
  html: string;
  templateKey: string;
  sentBy?: string | null;
}) {
  return sendEmail(options);
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
