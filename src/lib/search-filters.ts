import type { Product } from "@/types";

export type ProductDepartment = "solar" | "electronics";

export const SOLAR_TERMS = [
  { value: "monocrystalline", label: "Monocrystalline" },
  { value: "off-grid", label: "Off-Grid" },
  { value: "mppt", label: "MPPT" },
  { value: "lithium", label: "Lithium" },
  { value: "portable", label: "Portable" },
  { value: "led", label: "LED" },
] as const;

export const PRICE_BUCKETS = [
  { value: "", min: null, max: null },
  { value: "0-100", min: 0, max: 100 },
  { value: "100-300", min: 100, max: 300 },
  { value: "300-600", min: 300, max: 600 },
  { value: "600-", min: 600, max: null },
] as const;

const ELECTRONICS_CATEGORY_SLUGS = new Set(["inverters", "batteries", "lighting"]);

export function getProductDepartment(
  product: Pick<Product, "tags" | "category">,
): ProductDepartment {
  const tags = product.tags.map((tag) => tag.toLowerCase());
  if (tags.includes("electronics")) return "electronics";
  if (tags.includes("solar")) return "solar";
  return ELECTRONICS_CATEGORY_SLUGS.has(product.category.slug) ? "electronics" : "solar";
}

export function matchesSolarTerm(product: Product, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    product.name,
    product.description,
    product.shortDescription,
    product.detailsIntro,
    product.category.name,
    ...product.tags,
    ...product.highlights,
    ...product.features.map((feature) => feature.label),
    ...product.specs.flatMap((spec) => [spec.label, spec.value]),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function parsePriceRange(value: string): { min: number | null; max: number | null } {
  const [rawMin, rawMax] = value.split("-");
  const min = Number(rawMin);
  const max = Number(rawMax);

  return {
    min: rawMin !== "" && Number.isFinite(min) ? min : null,
    max: rawMax !== "" && rawMax !== undefined && Number.isFinite(max) ? max : null,
  };
}
