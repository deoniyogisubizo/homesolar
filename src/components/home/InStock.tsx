"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types";

const LIMIT = 8;

type InStockProps = {
  title: string;
  initialProducts: Product[];
};

export function InStock({ title, initialProducts }: InStockProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialProducts.length >= LIMIT);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/home/in-stock?limit=${LIMIT}&page=${page + 1}`);
      const data = await res.json();
      if (data.ok) {
        const next: Product[] = data.products ?? [];
        setProducts((prev) => [...prev, ...next]);
        setPage((p) => p + 1);
        setHasMore(next.length >= LIMIT);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!products.length) return null;

  return (
    <section id="in-stock" className="pt-16 lg:pt-[98px]">
      <div className="container-page">
        <h2 className="text-center text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">
          {title}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} imageAspect="aspect-[148/118]" />
          ))}
        </div>
        <div ref={sentinel} className="h-10 w-full" aria-hidden="true" />
        {loading ? (
          <p className="pb-6 text-center text-[13px] text-muted">Loading more products…</p>
        ) : null}
      </div>
    </section>
  );
}
