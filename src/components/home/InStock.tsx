"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Columns3, Grid3x3 } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { PriceRange } from "@/components/currency/Price";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { getProductDepartment, matchesSolarTerm, parsePriceRange, PRICE_BUCKETS, SOLAR_TERMS } from "@/lib/search-filters";
import type { Product } from "@/types";

const LIMIT = 8;

const DEPARTMENTS = [
  { value: "all", label: "All" },
  { value: "solar", label: "Solar" },
  { value: "electronics", label: "Electronics" },
] as const;

const labelClass = "block text-[12px] font-bold uppercase tracking-[0.14em] text-muted";
const selectClass =
  "mt-2 h-12 w-full rounded-[4px] border border-line bg-white px-4 text-[14px] font-semibold text-ink outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20";

type InStockProps = {
  title?: string;
};

export function InStock({ title = "Explore Products" }: InStockProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "post">("grid");
  const sentinel = useRef<HTMLDivElement>(null);
  const [department, setDepartment] = useState<string>("all");
  const [category, setCategory] = useState<string>("");
  const [terms, setTerms] = useState<string[]>([]);
  const [price, setPrice] = useState<string>("");
  const [categories, setCategories] = useState<Array<{ slug: string; name: string; productCount?: number }>>([]);

  const { format } = useCurrency();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/home/in-stock?limit=100&page=1"),
          fetch("/api/home/in-stock/categories"),
        ]);
        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        if (productsData.ok) {
          const items = productsData.products ?? [];
          // Shuffle products for dynamic/random display
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
          setProducts(items);
        }
        if (categoriesData.ok) setCategories(categoriesData.categories ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const range = useMemo(() => parsePriceRange(price), [price]);

  const filtered = useMemo(() => {
    let items = products;
    if (department !== "all" && department) {
      items = items.filter((product) => getProductDepartment(product) === department);
    }
    if (category) {
      items = items.filter((product) => product.category?.slug === category);
    }
    if (terms.length) {
      items = items.filter((product) => terms.some((term) => matchesSolarTerm(product, term)));
    }
    if (range.min !== null) {
      items = items.filter(
        (product) => (product.pricing?.effectivePrice ?? product.price) >= (range.min ?? 0),
      );
    }
    if (range.max !== null) {
      items = items.filter(
        (product) => (product.pricing?.effectivePrice ?? product.price) <= (range.max ?? Infinity),
      );
    }
    return items;
  }, [products, department, category, terms, range]);

  const visible = filtered.slice(0, page * LIMIT);

  const hasMore = visible.length < filtered.length;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setPage((current) => current + 1);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const priceLabel = (bucket: (typeof PRICE_BUCKETS)[number]) => {
    if (bucket.min === null && bucket.max === null) return "Any price";
    if (bucket.min === 0 && bucket.max !== null) return `Under ${format(bucket.max)}`;
    if (bucket.max === null && bucket.min !== null) return `${format(bucket.min)} & above`;
    if (bucket.min !== null && bucket.max !== null) return `${format(bucket.min)} – ${format(bucket.max)}`;
    return "Any price";
  };

  const hasFilters = Boolean(department !== "all" || category || terms.length || price);

  const clearFilters = () => {
    setDepartment("all");
    setCategory("");
    setTerms([]);
    setPrice("");
  };

  if (loading) {
    return (
      <section id="in-stock" className="pt-16 lg:pt-[98px]">
        <div className="container-page">
          <h2 className="text-center text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">
            {title}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[148/105] animate-pulse rounded-[10px] bg-tile" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) {
    return (
      <section id="in-stock" className="pt-16 lg:pt-[98px]">
        <div className="container-page">
          <h2 className="text-center text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">
            {title}
          </h2>
          <p className="mt-6 text-center text-[13px] text-muted">No in-stock products right now.</p>
        </div>
      </section>
    );
  }

  const deptBlock = (
    <div>
      <span className={labelClass}>Shop</span>
      <div className="mt-2 inline-flex rounded-full border border-line bg-tile p-1">
        {DEPARTMENTS.map((item) => (
          <label key={item.value} className="cursor-pointer">
            <input
              type="radio"
              name="department"
              value={item.value}
              checked={department === item.value}
              onChange={() => {
                setDepartment(item.value);
                setPage(1);
              }}
              className="peer sr-only"
            />
            <span className="inline-flex h-10 items-center rounded-full px-5 text-[13px] font-bold text-navy transition-colors peer-checked:bg-gold peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const categoryBlock = (
    <div>
      <label htmlFor="in-stock-category-post" className={labelClass}>
        Category
      </label>
      <select
        id="in-stock-category-post"
        name="category"
        value={category}
        onChange={(event) => {
          setCategory(event.target.value);
          setPage(1);
        }}
        className={selectClass}
      >
        <option value="">All categories</option>
        {categories.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
            {typeof item.productCount === "number" ? ` (${item.productCount})` : ""}
          </option>
        ))}
      </select>
    </div>
  );

  const priceBlock = (
    <div>
      <label htmlFor="in-stock-price-post" className={labelClass}>
        Price
      </label>
      <select
        id="in-stock-price-post"
        name="price"
        value={price}
        onChange={(event) => {
          setPrice(event.target.value);
          setPage(1);
        }}
        className={selectClass}
      >
        {PRICE_BUCKETS.map((bucket) => (
          <option key={bucket.value} value={bucket.value}>
            {priceLabel(bucket)}
          </option>
        ))}
      </select>
    </div>
  );

  const viewToggle = (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-[12px] font-bold uppercase tracking-[0.14em] text-muted">Choose view</span>
      <button
        type="button"
        onClick={() => setView("grid")}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[4px] border transition-colors ${
          view === "grid"
            ? "border-gold bg-gold text-white"
            : "border-line bg-white text-muted hover:border-gold hover:text-gold"
        }`}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
      >
        <Grid3x3 className="h-4 w-4" strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={() => setView("post")}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[4px] border transition-colors ${
          view === "post"
            ? "border-gold bg-gold text-white"
            : "border-line bg-white text-muted hover:border-gold hover:text-gold"
        }`}
        aria-label="Post view"
        aria-pressed={view === "post"}
      >
        <Columns3 className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );

  const filterBody = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-navy">Filter products</p>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[12px] font-medium text-muted underline underline-offset-4 transition-colors hover:text-gold"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.05fr_1fr_1fr] lg:items-end">
        <div>
          <span className={labelClass}>Shop</span>
          <div className="mt-2 inline-flex rounded-full border border-line bg-tile p-1">
            {DEPARTMENTS.map((item) => (
              <label key={item.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="department"
                  value={item.value}
                  checked={department === item.value}
                  onChange={() => {
                    setDepartment(item.value);
                    setPage(1);
                  }}
                  className="peer sr-only"
                />
                <span className="inline-flex h-10 items-center rounded-full px-5 text-[13px] font-bold text-navy transition-colors peer-checked:bg-gold peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="in-stock-category" className={labelClass}>
            Category
          </label>
          <select
            id="in-stock-category"
            name="category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
                {typeof item.productCount === "number" ? ` (${item.productCount})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="in-stock-price" className={labelClass}>
            Price
          </label>
          <select
            id="in-stock-price"
            name="price"
            value={price}
            onChange={(event) => {
              setPrice(event.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            {PRICE_BUCKETS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>
                {priceLabel(bucket)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className={labelClass}>Solar terms</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOLAR_TERMS.map((term) => {
            const checked = terms.includes(term.value);
            return (
              <label key={term.value} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="term"
                  value={term.value}
                  checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...terms, term.value]
                        : terms.filter((entry) => entry !== term.value);
                      setTerms(next);
                      setPage(1);
                    }}
                  className="peer sr-only"
                />
                <span className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-navy transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                  {term.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] text-muted">
          {filtered.length} {filtered.length === 1 ? "product" : "products"} found
          {hasFilters ? " with these filters" : ""}
        </span>
      </div>
    </>
  );

  return (
    <section id="in-stock" className="pt-16 lg:pt-[98px]">
      <div className="container-page">
        <h2 className="text-center text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">
          {title}
        </h2>

        {view === "grid" ? (
          <>
            <div className="mt-6 rounded-[10px] border border-line bg-white p-5 sm:p-6">
              {filterBody}
              <div className="mt-5 flex justify-end">{viewToggle}</div>
            </div>

            <div className="mt-6 origin-top scale-[0.9]">
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
            <aside className="lg:sticky lg:top-[120px] lg:w-[280px] lg:shrink-0">
              <div className="rounded-[10px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-navy">Filter products</p>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[12px] font-medium text-muted underline underline-offset-4 transition-colors hover:text-gold"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>

                <div className="mt-4">{deptBlock}</div>
                <div className="mt-5">{categoryBlock}</div>
                <div className="mt-4">{priceBlock}</div>

                <fieldset className="mt-5">
                  <legend className={labelClass}>Solar terms</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SOLAR_TERMS.map((term) => {
                      const checked = terms.includes(term.value);
                      return (
                        <label key={term.value} className="cursor-pointer">
                          <input
                            type="checkbox"
                            name="term"
                            value={term.value}
                            checked={checked}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...terms, term.value]
                                  : terms.filter((entry) => entry !== term.value);
                                setTerms(next);
                                setPage(1);
                              }}
                            className="peer sr-only"
                          />
                          <span className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-navy transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                            {term.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[13px] text-muted">
                    {filtered.length} {filtered.length === 1 ? "product" : "products"} found
                    {hasFilters ? " with these filters" : ""}
                  </span>
                  {viewToggle}
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-6">
              {visible.map((product) => {
                const price = product.pricing?.effectivePrice ?? product.price;
                const compareAtPrice =
                  product.pricing && product.pricing.discountPercent > 0
                    ? product.pricing.originalPrice
                    : product.compareAtPrice ?? null;
                const imageAspect = "aspect-[3/4]";
                return (
                  <article
                    key={product.id}
                    className="group relative w-full max-w-[380px] overflow-hidden rounded-none border border-line bg-white transition-all duration-150 hover:bg-[#1a1a1a]/5 hover:ring-2 hover:ring-offset-[3px] hover:ring-[#1a1a1a]/30 hover:shadow-[0_8px_24px_rgba(26,26,26,0.08)]"
                  >
                    <Link href={`/product/${product.slug}`} aria-label={product.name} className={`relative block overflow-hidden bg-tile w-full ${imageAspect}`}>
                      <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 320px, 100vw" className="object-cover" />
                      {product.badge ? (
                        <span className="absolute left-4 top-4 rounded-[4px] bg-white px-3 py-1 text-[9px] font-semibold tracking-[0.12em] text-gold shadow-[0_3px_12px_rgba(1,38,78,0.10)]">
                          {product.badge === "top" ? "Top" : "Sale"}
                        </span>
                      ) : null}
                    </Link>
                    <div className="p-4 text-center">
                      <Link href={`/product/${product.slug}`} className="line-clamp-2 block text-[13px] font-medium leading-5 text-ink transition-colors hover:text-brand">
                        {product.cardTitle ?? product.name}
                      </Link>
                      <p className="mt-2 line-clamp-2 text-left text-[11px] font-normal leading-none text-[#555555]">
                        {product.cardSubtitle ?? product.shortDescription ?? product.description}
                      </p>
                      <p className="mt-1 flex items-center justify-center gap-x-2 text-[11px] font-bold text-ink">
                        <PriceRange price={price} priceMax={null} />
                        {compareAtPrice ? (
                          <span className="text-[9px] font-normal text-muted line-through">
                            <PriceRange price={compareAtPrice} priceMax={null} />
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {hasMore ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className="h-12 rounded-[4px] bg-gold px-8 text-[14px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-gold-dark focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-gold"
            >
              Load more
            </button>
          </div>
        ) : null}

        <div ref={sentinel} className="h-10 w-full" aria-hidden="true" />
      </div>
    </section>
  );
}
