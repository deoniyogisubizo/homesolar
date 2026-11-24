import "server-only";

export type WhatsAppConfig = {
  enabled: boolean;
  configured: boolean;
  graphVersion: string;
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  webhookVerifyToken: string;
  cronSecret: string;
  missing: string[];
};

export function getWhatsAppConfig(): WhatsAppConfig {
  const graphVersion = (process.env.WHATSAPP_GRAPH_VERSION ?? "v18.0").trim() || "v18.0";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
  const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
  const enabled = process.env.WHATSAPP_ENABLED === "true";

  const missing: string[] = [];
  if (!enabled) missing.push("WHATSAPP_ENABLED=true");
  if (!phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
  if (!appSecret) missing.push("WHATSAPP_APP_SECRET");
  if (!webhookVerifyToken) missing.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  if (!cronSecret) missing.push("CRON_SECRET");

  return {
    enabled,
    configured: enabled && Boolean(phoneNumberId && accessToken),
    graphVersion,
    phoneNumberId,
    accessToken,
    appSecret,
    webhookVerifyToken,
    cronSecret,
    missing,
  };
}

export function whatsAppStatus() {
  const config = getWhatsAppConfig();
  return {
    enabled: config.enabled,
    configured: config.configured,
    graphVersion: config.graphVersion,
    webhookReady: Boolean(config.appSecret && config.webhookVerifyToken),
    cronReady: Boolean(config.cronSecret),
    missing: config.missing,
  };
}
