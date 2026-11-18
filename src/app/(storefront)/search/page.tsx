import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { SearchFilters } from "@/components/search/SearchFilters";
import { getAllCategories, searchProducts } from "@/lib/data";
import {
  getProductDepartment,
  matchesSolarTerm,
  parsePriceRange,
  PRICE_BUCKETS,
  SOLAR_TERMS,
} from "@/lib/search-filters";

export const metadata = {
  title: "Search products",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

function readParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function readList(value: string | string[] | undefined) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean);
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = readParam(params.q);
  const rawCategory = readParam(params.category);
  const rawDepartment = readParam(params.type);
  const department =
    rawDepartment === "solar" || rawDepartment === "electronics" ? rawDepartment : "";
  const terms = readList(params.term).filter((term) =>
    SOLAR_TERMS.some((option) => option.value === term),
  );
  const rawPrice = readParam(params.price);
  const price = PRICE_BUCKETS.some((bucket) => bucket.value === rawPrice) ? rawPrice : "";
  const range = parsePriceRange(price);

  const [allProducts, categories] = await Promise.all([searchProducts(query), getAllCategories()]);
  const category = categories.some((item) => item.slug === rawCategory) ? rawCategory : "";

  const products = allProducts.filter((product) => {
    if (category && product.category.slug !== category) return false;
    if (department && getProductDepartment(product) !== department) return false;
    if (terms.length && !terms.some((term) => matchesSolarTerm(product, term))) return false;

    const effectivePrice = product.pricing?.effectivePrice ?? product.price;
    if (range.min !== null && effectivePrice < range.min) return false;
    if (range.max !== null && effectivePrice > range.max) return false;

    return true;
  });

  const hasFilters = Boolean(
    category || department || terms.length || range.min !== null || range.max !== null,
  );
  const clearFiltersHref = query ? `/search?q=${encodeURIComponent(query)}` : "/search";

  return (
    <div className="container-page py-6 sm:py-10">
      <nav className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span>/</span>
        <span className="text-navy">Search</span>
      </nav>

      <div className="mt-7 max-w-[620px]">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">
          {query ? `Results for "${query}"` : "Shop all products"}
        </h1>
        <form action="/search" method="get" className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[5px] bg-tile px-5">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search solar panels, inverters, batteries..."
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 w-full shrink-0 items-center justify-center rounded-[5px] bg-gold px-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-gold-dark sm:w-auto"
          >
            Search
          </button>
        </form>
      </div>

      <SearchFilters
        categories={categories.map((item) => ({
          slug: item.slug,
          name: item.name,
          productCount: item.productCount,
        }))}
        query={query}
        category={category}
        department={department}
        terms={terms}
        price={price}
      />

      <p className="mt-7 text-[12px] text-muted">
        {products.length} {products.length === 1 ? "product" : "products"} found
        {hasFilters ? " with these filters" : ""}
      </p>

      {products.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-6 bg-tile px-6 py-16 text-center">
          <p className="text-[16px] font-medium text-ink">
            {hasFilters ? "No products matched these filters." : "No products matched your search."}
          </p>
          <p className="mt-2 text-[13px] text-muted">
            {hasFilters
              ? "Try a different category, price range, or solar term."
              : 'Try a broader term such as "solar", "battery", or "inverter".'}
          </p>
          <Link
            href={hasFilters ? clearFiltersHref : "/search"}
            className="mt-6 inline-flex h-10 items-center rounded-[5px] bg-navy px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
          >
            {hasFilters ? "Clear filters" : "View all products"}
          </Link>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <p className="text-[13px] text-muted">Popular categories:</p>
            {categories
              .slice()
              .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))
              .slice(0, 6)
              .map((category) => (
                <Link
                  key={category.slug}
                  href={`/search?category=${encodeURIComponent(category.slug)}`}
                  className="inline-flex h-9 items-center rounded-[5px] border border-line bg-white px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:border-navy hover:text-navy"
                >
                  {category.name} · {category.productCount}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="container-page py-6 sm:py-10">
      <div className="h-5 w-24 animate-pulse rounded-[4px] bg-tile" />
      <div className="mt-7 h-10 w-80 animate-pulse rounded-[4px] bg-tile" />
      <div className="mt-6 h-12 max-w-[620px] animate-pulse rounded-[5px] bg-tile" />
      <div className="mt-8 h-44 animate-pulse rounded-[10px] bg-tile" />
      <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-[144/118] animate-pulse bg-tile" />
        ))}
      </div>
    </div>
  );
}
