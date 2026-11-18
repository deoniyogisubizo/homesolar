import { getSetting } from "@/lib/admin/settings";
import { getSitemapEntries } from "@/lib/data";
import {
  buildSitemapEntries,
  renderSitemapIndex,
  renderUrlSet,
  sitemapChunkCount,
} from "@/lib/seo/sitemap";
import { recordSitemapGeneration } from "@/lib/seo/sitemap-state";
import { getSiteUrl } from "@/lib/site";

export async function GET() {
  const [seo, source, siteUrl] = await Promise.all([
    getSetting("seo"),
    getSitemapEntries(),
    Promise.resolve(getSiteUrl()),
  ]);

  if (!seo.sitemapEnabled) {
    return new Response("Sitemap is disabled.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const entries = buildSitemapEntries(source, siteUrl);
  const chunks = sitemapChunkCount(entries.length);
  const body = chunks > 1 ? renderSitemapIndex(chunks, siteUrl) : renderUrlSet(entries);

  await recordSitemapGeneration();

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
