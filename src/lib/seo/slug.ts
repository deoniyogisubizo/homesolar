export const SLUG_HISTORY_LIMIT = 50;

/**
 * Keeps old slugs so links to a renamed product, category or page can be
 * redirected to its current address. The new slug is removed so a slug can
 * never redirect to itself, and the oldest entries are dropped after the cap.
 */
export function appendSlugHistory(
  history: readonly string[] | null | undefined,
  previousSlug: string,
  nextSlug: string,
): string[] {
  const entries = new Set(history ?? []);
  entries.delete(nextSlug);
  if (previousSlug && previousSlug !== nextSlug) entries.add(previousSlug);
  return Array.from(entries).slice(-SLUG_HISTORY_LIMIT);
}
