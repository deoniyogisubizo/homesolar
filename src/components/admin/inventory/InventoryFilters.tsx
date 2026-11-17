"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type InventoryFiltersProps = {
  categories: Array<{ _id: unknown; name: string; slug: string }>;
};

function buildQuery(values: { q: string; level: string; category: string }) {
  const query = new URLSearchParams();
  if (values.q) query.set("q", values.q);
  if (values.level) query.set("level", values.level);
  if (values.category) query.set("category", values.category);
  const str = query.toString();
  return str ? `?${str}` : "";
}

export default function InventoryFilters({ categories }: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [level, setLevel] = useState(searchParams.get("level") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const navigate = (next: { q: string; level: string; category: string }) => {
    router.replace(`/admin/inventory${buildQuery(next)}`);
  };

  const handleQChange = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate({ q: value, level, category });
    }, 300);
  };

  const handleLevelChange = (value: string) => {
    setLevel(value);
    if (timer.current) clearTimeout(timer.current);
    navigate({ q, level: value, category });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    if (timer.current) clearTimeout(timer.current);
    navigate({ q, level, category: value });
  };

  const hasFilters = Boolean(q || level || category);

  return (
    <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label className="admin-label" htmlFor="q">
          Search
        </label>
        <input
          id="q"
          name="q"
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          className="admin-field w-[220px]"
          placeholder="Product name or slug"
        />
      </div>
      <div>
        <label className="admin-label" htmlFor="level">
          Stock level
        </label>
        <select
          id="level"
          name="level"
          value={level}
          onChange={(e) => handleLevelChange(e.target.value)}
          className="admin-field w-[160px]"
        >
          <option value="">All levels</option>
          <option value="in">In stock</option>
          <option value="low">Understock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      <div>
        <label className="admin-label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="admin-field w-[180px]"
        >
          <option value="">All categories</option>
          {categories.map((entry) => (
            <option key={String(entry._id)} value={entry.slug}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>
      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setLevel("");
            setCategory("");
            if (timer.current) clearTimeout(timer.current);
            router.replace("/admin/inventory");
          }}
          className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
