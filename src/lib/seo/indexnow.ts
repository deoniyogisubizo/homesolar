import "server-only";

import { getSitemapEntries } from "@/lib/data";
import { buildSitemapEntries } from "@/lib/seo/sitemap";
import { getSiteUrl } from "@/lib/site";

export type IndexNowResult =
  | { ok: true; submitted: number; status: number }
  | { ok: false; error: string };

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

export async function submitIndexNow(urls?: string[]): Promise<IndexNowResult> {
  const key = indexNowKey();
  if (!key) {
    return { ok: false, error: "INDEXNOW_KEY is missing or invalid. Set an 8-128 character key in the server environment." };
  }

  const siteUrl = getSiteUrl();
  let list = urls?.filter(Boolean) ?? [];
  if (!list.length) {
    const source = await getSitemapEntries();
    list = buildSitemapEntries(source, siteUrl).map((entry) => entry.url);
  }
  list = list.slice(0, 10_000);

  if (!list.length) return { ok: false, error: "There are no public URLs to submit." };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key,
        keyLocation: `${siteUrl}/indexnow.txt`,
        urlList: list,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok && response.status !== 202) {
      return { ok: false, error: `IndexNow responded with HTTP ${response.status}.` };
    }

    return { ok: true, submitted: list.length, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `IndexNow request failed: ${error.message}` : "IndexNow request failed.",
    };
  }
}
