export const WHATSAPP_URL_LIMIT = 1800;
const DEFAULT_COUNTRY_CODE = "+250";

export type WhatsAppOrderItem = {
  name: string;
  quantity: number;
  lineTotal: number;
  options?: string[] | null;
  color?: string | null;
  size?: string | null;
};

export type OrderMessageInput = {
  template: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  items: WhatsAppOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  deliveryLocation: string;
  notes?: string | null;
  currencySymbol?: string;
  maxEncodedLength?: number;
  invoiceUrl?: string | null;
};

export type TemplateVariables = Record<string, string | number | null | undefined>;

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Normalizes a phone number to E.164. Local Rwandan numbers are expanded with
 * the default country code; other international formats must include a country
 * code (with or without a leading plus).
 */
export function normalizePhone(value: string, defaultCountryCode = DEFAULT_COUNTRY_CODE): string | null {
  const input = value.trim();
  if (!input) return null;

  const compact = input.replace(/[\s().-]/g, "");
  const countryDigits = phoneDigits(defaultCountryCode);
  let digits = phoneDigits(compact);

  if (compact.startsWith("00")) {
    digits = compact.slice(2).replace(/\D/g, "");
  } else if (compact.startsWith("+")) {
    digits = compact.slice(1).replace(/\D/g, "");
  } else if (compact.startsWith("0")) {
    digits = `${countryDigits}${compact.slice(1).replace(/\D/g, "")}`;
  } else if (compact.startsWith(countryDigits)) {
    digits = compact;
  } else if (digits.length === 9 && digits.startsWith("7")) {
    digits = `${countryDigits}${digits}`;
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  if (/^(\d)\1+$/.test(digits)) return null;

  return `+${digits}`;
}

export function buildWhatsAppLink(number: string, message: string): string | null {
  const normalized = normalizePhone(number);
  if (!normalized) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(message)}`;
}

export function renderWhatsAppTemplate(template: string, variables: TemplateVariables) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(variables, name)) return match;
    const value = variables[name];
    return value === undefined || value === null ? "" : String(value);
  });
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatOption(value: string) {
  if (/^[0-9]+(\.[0-9]+)?\s*[a-z]{1,3}$/i.test(value)) return value.toUpperCase();
  return titleCase(value);
}

export function orderItemOptions(
  item: Pick<WhatsAppOrderItem, "options" | "color" | "size">,
) {
  const provided = (item.options ?? []).map((option) => option.trim()).filter(Boolean);
  if (provided.length) return provided.map(formatOption);
  return [item.color, item.size]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map(formatOption);
}

function money(value: number, symbol: string) {
  const decimals = symbol === "$" || symbol === "£" || symbol === "€" ? 2 : 0;
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function buildOrderItemLine(item: WhatsAppOrderItem, index: number, symbol = "$") {
  const options = orderItemOptions(item);
  const optionText = options.length ? ` (${options.join(", ")})` : "";
  return `${index}. ${item.name}${optionText} x${item.quantity} - ${money(item.lineTotal, symbol)}`;
}

export function buildOrderMessage(input: OrderMessageInput): string {
  const symbol = input.currencySymbol ?? "$";
  const maxEncodedLength = input.maxEncodedLength ?? 1600;
  const itemLines = input.items.map((item, index) => buildOrderItemLine(item, index + 1, symbol));
  const itemCount = input.items.reduce((total, item) => total + item.quantity, 0);
  const notes = input.notes?.trim() ? `Notes: ${input.notes.trim()}` : "";

  const variables = (lines: string[], omitted: number, notesText: string): TemplateVariables => ({
    storeName: input.storeName,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    orderNumber: input.orderNumber,
    items: [...lines, omitted > 0 ? `+${omitted} more items (see order ${input.orderNumber})` : ""]
      .filter(Boolean)
      .join("\n"),
    itemCount,
    subtotal: money(input.subtotal, symbol),
    discount: money(input.discount, symbol),
    total: money(input.total, symbol),
    deliveryLocation: input.deliveryLocation,
    notes: notesText,
    invoiceUrl: input.invoiceUrl?.trim() ?? "",
  });

  const render = (lines: string[], omitted: number, notesText: string) =>
    renderWhatsAppTemplate(input.template, variables(lines, omitted, notesText)).trim();

  let visibleLines = [...itemLines];
  let omitted = 0;
  let rendered = render(visibleLines, omitted, notes);

  while (encodeURIComponent(rendered).length > maxEncodedLength && visibleLines.length > 1) {
    visibleLines = visibleLines.slice(0, -1);
    omitted = itemLines.length - visibleLines.length;
    rendered = render(visibleLines, omitted, notes);
  }

  if (encodeURIComponent(rendered).length > maxEncodedLength) {
    rendered = render(visibleLines, omitted, "");
  }

  if (encodeURIComponent(rendered).length > maxEncodedLength) {
    rendered = render([], itemLines.length, "");
  }

  if (encodeURIComponent(rendered).length > maxEncodedLength) {
    const compact = renderWhatsAppTemplate(input.template, {
      ...variables([], itemLines.length, ""),
      items: "",
    })
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    rendered = compact;
  }

  let finalMessage = rendered.replace(/\s+$/, "");
  const invoiceUrl = input.invoiceUrl?.trim() ?? "";
  const templateIncludesInvoice = /\{\{\s*invoiceUrl\s*\}\}/.test(input.template);
  const appendInvoice = Boolean(invoiceUrl) && !templateIncludesInvoice;
  if (appendInvoice) {
    finalMessage = finalMessage ? `${finalMessage}\nInvoice: ${invoiceUrl}` : `Invoice: ${invoiceUrl}`;
  }
  let finalText = finalMessage.trim();
  if (encodeURIComponent(finalText).length > maxEncodedLength) {
    const compact = renderWhatsAppTemplate(input.template, {
      ...variables([], itemLines.length, ""),
      items: "",
    })
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .replace(/\s+$/, "");
    finalText = compact && appendInvoice ? `${compact}\nInvoice: ${invoiceUrl}`.trim() : compact || (appendInvoice ? `Invoice: ${invoiceUrl}` : "");
  }

  return finalText.trim();
}
