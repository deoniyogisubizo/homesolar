const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function stripHtml(value: string): string {
  if (!value) return "";
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateDescription(value: string, max = 159): string {
  const text = stripHtml(value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;

  const slice = text.slice(0, max + 1);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  if (sentenceEnd >= 60) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }

  const wordEnd = slice.lastIndexOf(" ");
  const clipped = (wordEnd > 0 ? slice.slice(0, wordEnd) : slice.slice(0, max)).replace(/[\s,;:.!?-]+$/, "");
  return `${clipped}\u2026`;
}

export function seoTitle(value: string | null | undefined, fallback: string, max = 60): string {
  const text = stripHtml(value ?? "") || fallback;
  if (text.length <= max) return text;
  return truncateDescription(text, max);
}

export function uniqueTitle(value: string, separator: string, duplicateOf: string | null): string {
  if (!duplicateOf || value.trim().toLowerCase() !== duplicateOf.trim().toLowerCase()) return value;
  return `${value}${separator}`;
}

export function priceString(value: number): string {
  const rounded = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
  return rounded.toFixed(2);
}

export function isoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function dateOnly(value: Date | string | null | undefined): string | undefined {
  const iso = isoDate(value);
  return iso ? iso.slice(0, 10) : undefined;
}
