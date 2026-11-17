import { BestSelling } from "@/components/home/BestSelling";
import { Categories } from "@/components/home/Categories";
import { Clients } from "@/components/home/Clients";
import { Featured } from "@/components/home/Featured";
import { Hero } from "@/components/home/Hero";
import { InStock } from "@/components/home/InStock";
import { Meet } from "@/components/home/Meet";
import { Promos } from "@/components/home/Promos";
import { SaleStrip } from "@/components/home/SaleStrip";
import {
  getActiveCampaignDisplay,
  getAllCategories,
  getBestSellingProducts,
  getFeaturedProducts,
  getHeroProductsByCategory,
  getSiteContent,
} from "@/lib/data";
import type { SiteContentData } from "@/types";

export default async function HomePage() {
  const content = await getSiteContent();
  const [allCategories, heroProducts, bestSelling, featured, campaign] = await Promise.all([
    getAllCategories(),
    getHeroProductsByCategory(),
    getBestSellingProducts(content.bestSelling.mode === "manual" ? content.bestSelling.productIds : []),
    getFeaturedProducts(content.featured.mode === "manual" ? content.featured.productIds : []),
    getActiveCampaignDisplay(),
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

  return <div>{content.sectionOrder.map((section) => sections[section] ?? null)}</div>;
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
