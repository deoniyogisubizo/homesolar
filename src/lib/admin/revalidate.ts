import "server-only";

import { updateTag } from "next/cache";

const STOREFRONT_TAGS = [
  "site-content",
  "homepage",
  "products",
  "categories",
  "settings",
  "campaigns",
  "coupons",
  "navigation",
  "footer",
  "pages",
  "reviews",
  "media",
] as const;

export function revalidateStorefront(
  tags: Array<
    (typeof STOREFRONT_TAGS)[number] | `product-${string}` | `page-${string}` | `reviews-${string}`
  >,
) {
  const unique = new Set<string>(tags);
  for (const tag of unique) {
    updateTag(tag);
  }
  updateTag("site-content");
}

export function revalidateEverything() {
  revalidateStorefront([...STOREFRONT_TAGS]);
}
