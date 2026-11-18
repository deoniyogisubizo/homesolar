import type { BreadcrumbList, ListItem } from "schema-dts";
import type { WithContext } from "schema-dts";

export function buildBreadcrumbList(
  items: Array<{ name: string; url: string }>,
): WithContext<BreadcrumbList> {
  const itemListElement: ListItem[] = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}
