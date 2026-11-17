import { CampaignBanner } from "@/components/home/CampaignBanner";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product, SiteContentData } from "@/types";

export function Featured({
  content,
  products,
}: {
  content: SiteContentData["featured"];
  products: Product[];
}) {
  return (
    <section id="featured" className="pt-10 lg:pt-[30px]">
      <div className="container-page">
        <h2 className="text-center text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">
          {content.title}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_418px]">
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} imageAspect="aspect-[148/105]" />
            ))}
          </div>
          <CampaignBanner
            banner={content.banner}
            tone="blue"
            className="hidden lg:flex"
          />
        </div>
      </div>
    </section>
  );
}
