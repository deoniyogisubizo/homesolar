"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImageIcon, Plus, Search, X } from "lucide-react";

export type ProductOption = {
  id: string;
  name: string;
  slug: string;
  image: string;
};

type SearchItem = ProductOption & { price: number; publishStatus: string };

export function ProductPicker({
  value,
  onChange,
  initialOptions,
  max = 12,
  label = "Products",
  hint = "Search by name, slug or tag. Products are shown in this order on the storefront.",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  initialOptions: ProductOption[];
  max?: number;
  label?: string;
  hint?: string;
}) {
  const [known, setKnown] = useState<Record<string, ProductOption>>(() =>
    Object.fromEntries(initialOptions.map((option) => [option.id, option])),
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (active) setSearching(true);
      try {
        const response = await fetch(`/api/admin/products?q=${encodeURIComponent(query.trim())}&limit=12`);
        const payload = (await response.json()) as { ok: boolean; data?: { items: SearchItem[] } };
        if (!active) return;
        if (payload.ok && payload.data) {
          const items = payload.data.items;
          setResults(items);
          setKnown((current) => ({
            ...current,
            ...Object.fromEntries(items.map((item) => [item.id, item])),
          }));
          setOpen(true);
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const knownById = useMemo(
    () => ({
      ...Object.fromEntries(initialOptions.map((option) => [option.id, option])),
      ...known,
    }),
    [initialOptions, known],
  );

  const selected = useMemo(
    () => value.map((id) => knownById[id]).filter((option): option is ProductOption => Boolean(option)),
    [value, knownById],
  );

  const move = (index: number, direction: -1 | 1) => {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = (id: string) => {
    if (value.includes(id) || value.length >= max) return;
    onChange([...value, id]);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="admin-label mb-0">{label}</span>
        <span className="text-[11px] text-admin-muted">
          {value.length} of {max} selected
        </span>
      </div>

      {value.length ? (
        <ul className="mt-1.5 space-y-1.5">
          {value.map((id, index) => {
            const option = knownById[id];
            return (
              <li key={id} className="flex items-center gap-2 rounded-[6px] border border-admin-line bg-white p-2">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-tile">
                  {option?.image ? (
                    <Image src={option.image} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-admin-muted">
                      <ImageIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-ink">
                    {option?.name ?? "Unavailable product"}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-admin-muted">
                    {option?.slug ?? id}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                    aria-label={`Move ${option?.name ?? "product"} up`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                    aria-label={`Move ${option?.name ?? "product"} down`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((entry) => entry !== id))}
                    className="rounded-[4px] p-1 text-admin-muted hover:bg-danger-pale hover:text-danger"
                    aria-label={`Remove ${option?.name ?? "product"}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1.5 rounded-[6px] border border-dashed border-admin-line px-3 py-3 text-center text-[11px] text-admin-muted">
          No products selected. Automatic mode uses the storefront ordering.
        </p>
      )}

      <div ref={containerRef} className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-muted" />
        <input
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            if (!next.trim()) {
              setResults([]);
              setSearching(false);
              setOpen(false);
            } else {
              setOpen(true);
            }
          }}
          onFocus={() => query && setOpen(true)}
          disabled={value.length >= max}
          placeholder={value.length >= max ? "Selection is full" : "Search products to add"}
          className="admin-field pl-9"
          aria-label="Search products to add"
        />
        {open && query ? (
          <div className="absolute left-0 right-0 top-11 z-30 max-h-[280px] overflow-y-auto rounded-[6px] border border-admin-line bg-white shadow-[0_12px_32px_rgba(16,24,40,0.14)]">
            {searching ? (
              <p className="px-3 py-4 text-center text-[12px] text-admin-muted">Searching...</p>
            ) : results.length ? (
              results.map((item) => {
                const added = value.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => add(item.id)}
                    disabled={added || value.length >= max}
                    className="flex w-full items-center gap-2 border-b border-admin-line px-3 py-2 text-left last:border-b-0 hover:bg-tile disabled:opacity-55"
                  >
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[4px] bg-tile">
                      {item.image ? <Image src={item.image} alt="" fill sizes="32px" className="object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-ink">{item.name}</span>
                      <span className="block truncate text-[10px] text-admin-muted">
                        {item.slug} · {item.publishStatus}
                      </span>
                    </span>
                    {added ? (
                      <span className="text-[10px] text-admin-muted">Added</span>
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-brand-deep" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-center text-[12px] text-admin-muted">No products match this search.</p>
            )}
          </div>
        ) : null}
      </div>
      <p className="admin-help">{hint}</p>
      {selected.length !== value.length ? (
        <p className="admin-help text-warning">
          {value.length - selected.length} selected product{value.length - selected.length === 1 ? "" : "s"} could not be
          loaded and will be ignored on the storefront.
        </p>
      ) : null}
    </div>
  );
}
