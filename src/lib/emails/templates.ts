export const EMAIL_TEMPLATE_KEYS = [
  "order_confirmation",
  "order_staff_notification",
  "order_status_confirmed",
  "order_status_processing",
  "order_status_out_for_delivery",
  "order_status_delivered",
  "order_status_cancelled",
  "payment_refunded",
  "welcome",
  "password_reset",
  "contact_auto_reply",
  "low_stock_alert",
  "newsletter_confirmation",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export type EmailTemplateSeed = {
  key: EmailTemplateKey;
  name: string;
  subject: string;
  body: string;
};

const signOff = "<p>Thank you,<br />{{storeName}}</p>";

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateSeed[] = [
  {
    key: "order_confirmation",
    name: "Order confirmation",
    subject: "Order {{orderNumber}} confirmed",
    body: `<p>Hello {{customerName}},</p><p>We have received your order {{orderNumber}} for {{orderTotal}}. We will contact you when it is ready.</p><p>Support: {{supportEmail}} | {{supportPhone}}</p>${signOff}`,
  },
  {
    key: "order_staff_notification",
    name: "Staff new-order notification",
    subject: "New WhatsApp order {{orderNumber}}",
    body: `<p>{{customerName}} placed a WhatsApp order.</p><p>Phone: {{customerPhone}}<br />Total: {{orderTotal}}</p><p>{{orderItems}}</p><p><a href="{{orderUrl}}">Open the order</a></p>`,
  },
  {
    key: "order_status_confirmed",
    name: "Order confirmed",
    subject: "Order {{orderNumber}} is confirmed",
    body: `<p>Hello {{customerName}},</p><p>Your order {{orderNumber}} has been confirmed. We are preparing it now.</p>${signOff}`,
  },
  {
    key: "order_status_processing",
    name: "Order processing",
    subject: "Order {{orderNumber}} is being prepared",
    body: `<p>Hello {{customerName}},</p><p>Your order {{orderNumber}} is being prepared for delivery.</p>${signOff}`,
  },
  {
    key: "order_status_out_for_delivery",
    name: "Order out for delivery",
    subject: "Order {{orderNumber}} is out for delivery",
    body: `<p>Hello {{customerName}},</p><p>Your order {{orderNumber}} is on its way. Our team will contact you on WhatsApp before delivery.</p>${signOff}`,
  },
  {
    key: "order_status_delivered",
    name: "Order delivered",
    subject: "Order {{orderNumber}} was delivered",
    body: `<p>Hello {{customerName}},</p><p>Your order {{orderNumber}} was delivered. We would be glad to hear your feedback.</p>${signOff}`,
  },
  {
    key: "order_status_cancelled",
    name: "Order cancelled",
    subject: "Order {{orderNumber}} was cancelled",
    body: `<p>Hello {{customerName}},</p><p>Your order {{orderNumber}} has been cancelled. Contact us at {{supportPhone}} if you need help.</p>${signOff}`,
  },
  {
    key: "payment_refunded",
    name: "Payment refunded",
    subject: "Refund for order {{orderNumber}}",
    body: `<p>Hello {{customerName}},</p><p>The refund for order {{orderNumber}} has been processed.</p>${signOff}`,
  },
  {
    key: "welcome",
    name: "Welcome message",
    subject: "Welcome to {{storeName}}",
    body: `<p>Hello {{customerName}},</p><p>Welcome to {{storeName}}. We will keep you posted on new products and offers.</p>${signOff}`,
  },
  {
    key: "password_reset",
    name: "Password reset",
    subject: "Reset your {{storeName}} password",
    body: `<p>Hello {{customerName}},</p><p>Use the link below to reset your password. The link expires in one hour.</p><p><a href="{{resetUrl}}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  },
  {
    key: "contact_auto_reply",
    name: "Contact auto-reply",
    subject: "We received your message",
    body: `<p>Hello {{customerName}},</p><p>Thank you for contacting {{storeName}}. Our team will reply within one business day.</p><p>{{supportEmail}} | {{supportPhone}}</p>`,
  },
  {
    key: "low_stock_alert",
    name: "Low stock alert",
    subject: "Low stock: {{productName}}",
    body: `<p>{{productName}} has reached its low-stock threshold.</p><p>SKU: {{variantSku}}<br />Remaining: {{stockLeft}}</p>`,
  },
  {
    key: "newsletter_confirmation",
    name: "Newsletter confirmation",
    subject: "Confirm your subscription to {{storeName}}",
    body: `<p>Hello,</p><p>Please confirm your subscription to the {{storeName}} newsletter.</p><p><a href="{{confirmUrl}}">Confirm subscription</a></p>`,
  },
];

export const TEMPLATE_VARIABLES = [
  "customerName",
  "customerPhone",
  "orderNumber",
  "orderTotal",
  "orderItems",
  "orderUrl",
  "invoiceUrl",
  "trackingInfo",
  "storeName",
  "supportEmail",
  "supportPhone",
  "resetUrl",
  "confirmUrl",
  "unsubscribeUrl",
  "productName",
  "variantSku",
  "stockLeft",
] as const;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function substituteVariables(template: string, variables: Record<string, string | number | null | undefined>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) => {
    const value = variables[name];
    if (value === undefined || value === null) return "";
    return escapeHtml(String(value));
  });
}

export function substituteSubject(template: string, variables: Record<string, string | number | null | undefined>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) => {
    const value = variables[name];
    if (value === undefined || value === null) return "";
    return String(value).replace(/[\r\n]+/g, " ");
  });
}

export function emailShell(options: {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  body: string;
  unsubscribeUrl?: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#101828">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e9edf3;border-radius:8px;overflow:hidden">
        <tr><td style="background:#01264e;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:600">${escapeHtml(options.storeName)}</td></tr>
        <tr><td style="padding:24px;font-size:14px;line-height:1.65">${options.body}</td></tr>
        <tr><td style="padding:18px 24px;border-top:1px solid #e9edf3;font-size:12px;color:#6b7280">
          ${escapeHtml(options.storeName)} · ${escapeHtml(options.supportEmail)} · ${escapeHtml(options.supportPhone)}
          ${options.unsubscribeUrl ? `<br /><a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
