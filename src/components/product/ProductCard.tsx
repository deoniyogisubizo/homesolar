import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
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
    <article className="group min-w-0">
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
            sizes="(min-width: 1440px) 330px, (min-width: 1024px) 25vw, 45vw"
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

      <div className="mt-3 text-center">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-1 text-[15px] font-medium leading-5 text-ink transition-colors hover:text-brand"
        >
          {product.cardTitle ?? product.name}
        </Link>
        <p className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-2 text-[15px] font-semibold leading-5 text-ink">
          <PriceRange price={price} priceMax={priceMax} />
          {compareAtPrice && compareAtPrice > price ? (
            <span className="text-[12px] font-normal text-muted line-through">
              <PriceRange price={compareAtPrice} />
            </span>
          ) : null}
        </p>
        <div className="mt-2 flex items-center justify-center gap-0.5 text-orange-bright" aria-label={`Rated ${product.rating} out of 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="h-3 w-3" fill="currentColor" strokeWidth={0} />
          ))}
        </div>
      </div>
    </article>
  );
}
