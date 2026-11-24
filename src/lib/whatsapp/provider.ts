import "server-only";

import { normalizePhone } from "@/lib/whatsapp-core";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";

export type TemplateSendInput = {
  to: string;
  templateName: string;
  languageCode: string;
  variables: string[];
};

export type TemplateSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; retryable: boolean };

export type WhatsAppProvider = {
  name: "cloud_api" | "null";
  configured: boolean;
  sendTemplate(input: TemplateSendInput): Promise<TemplateSendResult>;
};

class CloudApiProvider implements WhatsAppProvider {
  name = "cloud_api" as const;

  constructor(
    private readonly graphVersion: string,
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  get configured() {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  async sendTemplate(input: TemplateSendInput): Promise<TemplateSendResult> {
    const to = normalizePhone(input.to);
    if (!to) {
      return { ok: false, error: "The recipient number is not valid.", retryable: false };
    }

    const parameters = input.variables.map((value) => ({
      type: "text",
      text: value || " ",
    }));

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.slice(1),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode || "en" },
        ...(parameters.length
          ? { components: [{ type: "body", parameters }] }
          : {}),
      },
    };

    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20_000),
          cache: "no-store",
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            messages?: Array<{ id?: string }>;
            error?: { message?: string; code?: number; type?: string };
          }
        | null;

      if (!response.ok) {
        const message = payload?.error?.message ?? `WhatsApp API returned ${response.status}.`;
        const retryable = response.status === 429 || response.status >= 500;
        return { ok: false, error: message, retryable };
      }

      const messageId = payload?.messages?.[0]?.id;
      if (!messageId) {
        return { ok: false, error: "WhatsApp API did not return a message id.", retryable: true };
      }
      return { ok: true, messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach the WhatsApp API.";
      return { ok: false, error: message, retryable: true };
    }
  }
}

class NullProvider implements WhatsAppProvider {
  name = "null" as const;
  configured = false;

  async sendTemplate(): Promise<TemplateSendResult> {
    return {
      ok: false,
      error: "WhatsApp Cloud API is not configured. Set WHATSAPP_* environment variables and enable it in invoice settings.",
      retryable: false,
    };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.phoneNumberId || !config.accessToken) {
    return new NullProvider();
  }
  return new CloudApiProvider(config.graphVersion, config.phoneNumberId, config.accessToken);
}
