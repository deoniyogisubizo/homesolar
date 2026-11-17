import Image from "next/image";
import Link from "next/link";
import { ProductCardActions } from "@/components/product/ProductCardActions";
import { PriceRange } from "@/components/currency/Price";
import type { Product } from "@/types";

const badgeLabels = {
  top: "Top",
  sale: "Sale",
} as const;

export function ProductCard({
  product,
  imageAspect = "aspect-[149/118]",
}: {
  product: Product;
  imageAspect?: string;
}) {
  const pricing = product.pricing;
  const price = pricing?.effectivePrice ?? product.price;
  const compareAtPrice =
    pricing && pricing.discountPercent > 0 ? pricing.originalPrice : product.compareAtPrice ?? null;
  const discountPercent =
    pricing && pricing.discountPercent > 0
      ? pricing.discountPercent
      : compareAtPrice && compareAtPrice > price
        ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
        : 0;
  const priceMax =
    product.priceMax && product.priceMax > product.price
      ? Math.max(price, product.priceMax - ((pricing?.originalPrice ?? product.price) - price))
      : product.priceMax;

  return (
    <article className="group relative min-w-0 cursor-pointer border border-transparent transition-all duration-150 hover:bg-[#1a1a1a]/5 hover:ring-2 hover:ring-offset-[3px] hover:ring-[#1a1a1a]/30 hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)] focus-within:ring-2 focus-within:ring-offset-[3px] focus-within:ring-[#1a1a1a]/30 focus-within:shadow-[0_8px_24px_rgba(26,26,26,0.08)] active:ring-2 active:ring-offset-[3px] active:ring-[#1a1a1a]/40 active:bg-[#1a1a1a]/10">
      <div className="relative">
        <Link
          href={`/product/${product.slug}`}
          aria-label={product.name}
          className={`relative block overflow-hidden bg-tile ${imageAspect}`}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1440px) 280px, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, 45vw"
            className="object-cover"
          />
          {discountPercent > 0 ? (
            <span className="absolute left-4 top-4 rounded-[4px] bg-white px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-orange shadow-[0_3px_12px_rgba(1,38,78,0.10)]">
              {discountPercent}% off
            </span>
          ) : product.badge ? (
            <span className="absolute left-4 top-4 rounded-[4px] bg-white px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-orange shadow-[0_3px_12px_rgba(1,38,78,0.10)]">
              {badgeLabels[product.badge]}
            </span>
          ) : null}
        </Link>
        <div className="absolute right-3 top-3 z-10">
          <ProductCardActions productId={product.id} productName={product.name} />
        </div>
      </div>

      <div className="mt-2 text-left">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-[13px] font-medium leading-5 text-ink transition-colors hover:text-brand"
        >
          {product.cardTitle ?? product.name}
        </Link>
        <p className="line-clamp-2 text-left text-[11px] font-normal leading-none text-[#555555]">
          {product.cardSubtitle ?? product.shortDescription ?? product.description}
        </p>
        <p className="mt-1 flex flex-wrap items-baseline justify-start gap-x-2 whitespace-nowrap text-[11px] font-bold leading-5 text-ink">
          <PriceRange price={price} priceMax={priceMax} />
          {compareAtPrice && compareAtPrice > price ? (
            <span className="text-[9px] font-normal text-muted line-through whitespace-nowrap">
              <PriceRange price={compareAtPrice} />
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
