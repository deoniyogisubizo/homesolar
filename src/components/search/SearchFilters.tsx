"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { PRICE_BUCKETS, SOLAR_TERMS } from "@/lib/search-filters";

const DEPARTMENTS = [
  { value: "", label: "All" },
  { value: "solar", label: "Solar" },
  { value: "electronics", label: "Electronics" },
] as const;

const labelClass = "block text-[12px] font-bold uppercase tracking-[0.14em] text-muted";
const selectClass =
  "mt-2 h-12 w-full rounded-[4px] border border-line bg-white px-4 text-[14px] font-semibold text-ink outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20";

export function SearchFilters({
  categories,
  query,
  category,
  department,
  terms,
  price,
}: {
  categories: Array<{ slug: string; name: string; productCount?: number }>;
  query: string;
  category: string;
  department: string;
  terms: string[];
  price: string;
}) {
  const { format } = useCurrency();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const applyFilters = (form: HTMLFormElement) => {
    const params = new URLSearchParams();

    new FormData(form).forEach((value, key) => {
      if (typeof value !== "string") return;
      const trimmed = value.trim();
      if (trimmed) params.append(key, trimmed);
    });

    const search = params.toString();
    startTransition(() => {
      router.replace(search ? `/search?${search}` : "/search", { scroll: false });
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters(event.currentTarget);
  };

  const priceLabel = (bucket: (typeof PRICE_BUCKETS)[number]) => {
    if (bucket.min === null && bucket.max === null) return "Any price";
    if (bucket.min === 0 && bucket.max !== null) return `Under ${format(bucket.max)}`;
    if (bucket.max === null && bucket.min !== null) return `${format(bucket.min)} & above`;
    if (bucket.min !== null && bucket.max !== null) {
      return `${format(bucket.min)} \u2013 ${format(bucket.max)}`;
    }
    return "Any price";
  };

  return (
    <form
      key={`${query}|${category}|${department}|${price}|${terms.join(",")}`}
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      onChange={(event) => applyFilters(event.currentTarget)}
      className="mt-8 rounded-[10px] border border-line bg-white p-5 sm:p-6"
    >
      {query ? <input type="hidden" name="q" value={query} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-navy">
          Filter products
        </p>
        <Link
          href={query ? `/search?q=${encodeURIComponent(query)}` : "/search"}
          className="text-[12px] font-medium text-muted underline underline-offset-4 transition-colors hover:text-gold"
        >
          Clear filters
        </Link>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.05fr_1fr_1fr] lg:items-end">
        <div>
          <span className={labelClass}>Shop</span>
          <div className="mt-2 inline-flex rounded-full border border-line bg-tile p-1">
            {DEPARTMENTS.map((item) => (
              <label key={item.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={item.value}
                  defaultChecked={department === item.value}
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
          <label htmlFor="search-category" className={labelClass}>
            Category
          </label>
          <select
            id="search-category"
            name="category"
            defaultValue={category}
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
          <label htmlFor="search-price" className={labelClass}>
            Price
          </label>
          <select id="search-price" name="price" defaultValue={price} className={selectClass}>
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
          {SOLAR_TERMS.map((term) => (
            <label key={term.value} className="cursor-pointer">
              <input
                type="checkbox"
                name="term"
                value={term.value}
                defaultChecked={terms.includes(term.value)}
                className="peer sr-only"
              />
              <span className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-navy transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                {term.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] text-muted">
          Filters apply automatically as you choose them.
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 w-full shrink-0 items-center justify-center rounded-[4px] bg-gold px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-gold-dark disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {isPending ? "Applying..." : "Apply filters"}
        </button>
      </div>
    </form>
  );
}
