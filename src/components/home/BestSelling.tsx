import { CampaignBanner } from "@/components/home/CampaignBanner";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product, SiteContentData } from "@/types";

export function BestSelling({
  content,
  products,
}: {
  content: SiteContentData["bestSelling"];
  products: Product[];
}) {
  return (
    <section id="best-selling" className="pt-16 lg:pt-[98px]">
      <div className="container-page">
        <h2 className="text-center text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">
          {content.title}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-[427px_repeat(3,minmax(0,1fr))]">
          <CampaignBanner
            banner={content.banner}
            tone="navy"
            className="hidden lg:row-span-2 lg:flex"
          />
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
