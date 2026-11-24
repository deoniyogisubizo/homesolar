import { BestSelling } from "@/components/home/BestSelling";
import { Categories } from "@/components/home/Categories";
import { Clients } from "@/components/home/Clients";
import { Featured } from "@/components/home/Featured";
import { Hero } from "@/components/home/Hero";
import { InStock } from "@/components/home/InStock";
import { Meet } from "@/components/home/Meet";
import { Promos } from "@/components/home/Promos";
import { SaleStrip } from "@/components/home/SaleStrip";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSetting } from "@/lib/admin/settings";
import {
  getActiveCampaignDisplay,
  getAllCategories,
  getDynamicBestSellingProducts,
  getDynamicFeaturedProducts,
  getDynamicHeroProductsByCategory,
  getSiteContent,
} from "@/lib/data";
import { buildOrganization, buildStore, buildWebSite } from "@/lib/jsonld/organization";
import { getStoreIdentity } from "@/lib/jsonld/store";
import { pageMetadata } from "@/lib/seo/metadata";
import type { SiteContentData } from "@/types";

export async function generateMetadata() {
  const [general, seo] = await Promise.all([getSetting("general"), getSetting("seo")]);
  return pageMetadata({
    title: general.tagline ? `${general.storeName} | ${general.tagline}` : general.storeName,
    description: seo.metaDescription,
    path: "/",
    image: seo.ogImage,
    imageAlt: general.storeName,
    noindex: !seo.indexable,
  });
}

export default async function HomePage() {
  const content = await getSiteContent();
  const [allCategories, heroProducts, bestSelling, featured, campaign, store] = await Promise.all([
    getAllCategories(),
    getDynamicHeroProductsByCategory(),
    getDynamicBestSellingProducts(),
    getDynamicFeaturedProducts(),
    getActiveCampaignDisplay(),
    getStoreIdentity(),
  ]);
  const categories = allCategories.filter((category) => category.showOnHome);

  const promos = campaignPromos(content, campaign);

  const sections = {
    hero: (
      <Hero
        key="hero"
        hero={content.hero}
        categories={allCategories}
        productsByCategory={heroProducts}
      />
    ),
    sale: <SaleStrip key="sale" sale={content.sale} campaign={campaign} />,
    promos: <Promos key="promos" promos={promos} />,
    categories: (
      <div key="categories" className="pt-3">
        <Categories categories={categories} />
      </div>
    ),
    bestSelling: <BestSelling key="bestSelling" content={content.bestSelling} products={bestSelling} />,
    featured: <Featured key="featured" content={content.featured} products={featured} />,
    inStock: <InStock key="inStock" title="Explore Products" />,
    meet: <Meet key="meet" meet={content.meet} campaign={campaign} />,
    clients: <Clients key="clients" clients={content.clients} />,
  };

  return (
    <div>
      <JsonLd data={buildOrganization(store)} />
      <JsonLd data={buildWebSite(store)} />
      <JsonLd data={buildStore(store)} />
      {content.sectionOrder.map((section) => sections[section] ?? null)}
    </div>
  );
}

function campaignPromos(content: SiteContentData, campaign: Awaited<ReturnType<typeof getActiveCampaignDisplay>>) {
  if (!campaign?.storefront.bannerEnabled) return content.promos;

  return content.promos.map((promo, index) =>
    index === 0
      ? {
          ...promo,
          eyebrow: campaign.storefront.bannerEyebrow || promo.eyebrow,
          title: campaign.storefront.bannerTitle || promo.title,
          discount: campaign.storefront.bannerSubtitle || promo.discount,
          image: campaign.storefront.bannerImage || promo.image,
          cta: {
            label: campaign.storefront.bannerCtaLabel || promo.cta.label,
            href: campaign.storefront.bannerCtaHref || promo.cta.href,
          },
        }
      : promo,
  );
}
