const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "hr",
]);

const BLOCKED_WITH_CONTENT =
  /<(script|style|iframe|object|embed|form|svg|math|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

function safeHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return null;
}

function sanitizeAttributes(attributes: string) {
  const hrefMatch = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
  if (!href) return "";
  return ` href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer"`;
}

export function sanitizeRichText(html: string) {
  if (!html) return "";

  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(BLOCKED_WITH_CONTENT, "")
    .replace(/<(script|style|iframe|object|embed|form|svg|math|template|noscript|input|button|link|meta)\b[^>]*\/?>/gi, "");

  return cleaned.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag: string, attributes: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (match.startsWith("</")) return `</${tag}>`;
    if (tag === "br" || tag === "hr") return `<${tag} />`;
    if (tag === "a") return `<a${sanitizeAttributes(attributes)}>`;
    return `<${tag}>`;
  });
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePlainText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(BLOCKED_WITH_CONTENT, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptFromHtml(html: string, length = 160) {
  const text = stripHtml(html);
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}
