"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Price } from "@/components/currency/Price";
import type { HeroProduct } from "@/types";

export function HeroSideProduct({
  products,
  activeProduct,
  fallbackImage,
  fallbackAlt,
}: {
  products: HeroProduct[];
  activeProduct: HeroProduct | null;
  fallbackImage: string;
  fallbackAlt: string;
}) {
  if (!products.length || !activeProduct) {
    return (
      <div className="absolute inset-x-0 bottom-0 h-[240px] overflow-hidden">
        <Image
          key={fallbackImage}
          src={fallbackImage}
          alt={fallbackAlt}
          fill
          sizes="(min-width: 1440px) 437px, 33vw"
          className="object-cover animate-[hero-side-fade_700ms_ease-out]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0081F1]/10 to-transparent" />
      </div>
    );
  }

  const activeIndex = products.findIndex((product) => product.id === activeProduct.id);

  return (
    <div className="absolute inset-x-0 bottom-0 h-[248px] overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        {products.map((product) => {
          const isActive = product.id === activeProduct.id;
          return (
            <div
              key={product.id}
              className={`absolute inset-0 transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isActive ? "z-10 scale-100 opacity-100" : "z-0 scale-[1.06] opacity-0"
              }`}
            >
              <Image
                src={product.image}
                alt=""
                fill
                sizes="(min-width: 1440px) 437px, 33vw"
                className="object-cover"
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(1,38,78,0)_30%,rgba(1,38,78,0.18)_52%,rgba(1,38,78,0.88)_100%)]" />

      {products.map((product) => {
        const isActive = product.id === activeProduct.id;
        return (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            tabIndex={isActive ? 0 : -1}
            aria-hidden={!isActive}
            className={`group/showcase absolute inset-0 z-20 flex items-end justify-between gap-4 px-7 pb-7 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isActive
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-3 opacity-0"
            }`}
          >
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold lowercase tracking-[0.2em] text-white/85">
                <span className="h-px w-5 bg-orange-bright" />
                featured product
              </span>
              <p className="mt-2 line-clamp-1 text-[16px] font-medium leading-5 text-white">
                {product.name}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[13px] leading-5">
                <Price value={product.price} className="font-semibold text-white" />
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <span className="text-[11px] font-normal text-white/55 line-through">
                    <Price value={product.compareAtPrice} />
                  </span>
                ) : null}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-sm transition-colors duration-300 group-hover/showcase:border-orange group-hover/showcase:bg-orange">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        );
      })}

      {products.length > 1 ? (
        <div className="absolute right-7 top-5 z-30 flex items-center gap-1.5" aria-hidden="true">
          {products.map((product, index) => (
            <span
              key={product.id}
              className={`h-[3px] rounded-full transition-all duration-500 ${
                index === activeIndex ? "w-6 bg-white" : "w-2.5 bg-white/45"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
