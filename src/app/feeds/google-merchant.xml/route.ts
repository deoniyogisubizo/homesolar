import { getSetting } from "@/lib/admin/settings";
import { BASE_CURRENCY } from "@/lib/calculator";
import { getMerchantFeedProducts } from "@/lib/data";
import { buildMerchantFeed, renderMerchantXml } from "@/lib/seo/merchant-feed";
import { getSiteUrl } from "@/lib/site";

export async function GET() {
  const [products, general, shipping] = await Promise.all([
    getMerchantFeedProducts(),
    getSetting("general"),
    getSetting("shipping"),
  ]);

  const context = {
    siteUrl: getSiteUrl(),
    storeName: general.storeName,
    currency: BASE_CURRENCY,
    shippingZones: shipping.zones,
    taxRate: shipping.taxRate,
  };
  const feed = buildMerchantFeed(products, context);

  return new Response(renderMerchantXml(feed, context), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
