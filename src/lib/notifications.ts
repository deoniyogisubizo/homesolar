import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { cartAbandonment } = COMMERCE_CONFIG;

export type NotificationChannel = "whatsapp" | "sms" | "email";

export type NotificationPayload = {
  to: string;
  channel: NotificationChannel;
  template: string;
  variables: Record<string, string>;
};

async function sendWhatsApp(payload: NotificationPayload): Promise<boolean> {
  const { devModeLogOnly } = cartAbandonment;
  const message = `[WhatsApp] To: ${payload.to} | Template: ${payload.template} | Vars: ${JSON.stringify(payload.variables)}`;

  if (devModeLogOnly) {
    console.log(message);
    return true;
  }

  // TODO: Integrate with actual WhatsApp provider (Twilio, Meta, etc.)
  // const response = await fetch("https://api.whatsapp.com/send", { ... });
  return true;
}

async function sendSMS(payload: NotificationPayload): Promise<boolean> {
  const { devModeLogOnly } = cartAbandonment;
  const message = `[SMS] To: ${payload.to} | Template: ${payload.template} | Vars: ${JSON.stringify(payload.variables)}`;

  if (devModeLogOnly) {
    console.log(message);
    return true;
  }

  // TODO: Integrate with actual SMS provider (Twilio, Africa's Talking, etc.)
  return true;
}

async function sendEmail(payload: NotificationPayload): Promise<boolean> {
  const { devModeLogOnly } = cartAbandonment;
  const message = `[Email] To: ${payload.to} | Template: ${payload.template} | Vars: ${JSON.stringify(payload.variables)}`;

  if (devModeLogOnly) {
    console.log(message);
    return true;
  }

  // TODO: Integrate with actual email provider (Nodemailer, SendGrid, etc.)
  return true;
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  switch (payload.channel) {
    case "whatsapp":
      return sendWhatsApp(payload);
    case "sms":
      return sendSMS(payload);
    case "email":
      return sendEmail(payload);
    default:
      return false;
  }
}

export function buildAbandonmentMessage(
  stage: "reminder" | "social_proof" | "incentive",
  variables: {
    cartUrl: string;
    itemNames: string[];
    cartValue: number;
    incentiveCode?: string;
    incentivePercent?: number;
    incentiveExpiresHours?: number;
  },
): { template: string; variables: Record<string, string> } {
  const baseVars = {
    cart_url: variables.cartUrl,
    item_list: variables.itemNames.join(", "),
    cart_value: variables.cartValue.toLocaleString("en-RW"),
  };

  switch (stage) {
    case "reminder":
      return {
        template: "cart_abandonment_reminder",
        variables: {
          ...baseVars,
          message: `You left ${variables.itemNames.length} item(s) in your cart worth ${variables.cartValue.toLocaleString("en-RW")} RWF. Complete your order: ${variables.cartUrl}`,
        },
      };
    case "social_proof":
      return {
        template: "cart_abandonment_social_proof",
        variables: {
          ...baseVars,
          message: `Others are buying ${variables.itemNames[0]}! Don't miss out. Complete your order: ${variables.cartUrl}`,
        },
      };
    case "incentive":
      return {
        template: "cart_abandonment_incentive",
        variables: {
          ...baseVars,
          incentive_code: variables.incentiveCode ?? "",
          incentive_percent: String(variables.incentivePercent ?? 0),
          incentive_expires: `${variables.incentiveExpiresHours ?? 48}h`,
          message: `Get ${variables.incentivePercent ?? 5}% off with code ${variables.incentiveCode ?? "SAVE5"}! Expires in ${variables.incentiveExpiresHours ?? 48}h. Complete your order: ${variables.cartUrl}`,
        },
      };
  }
}