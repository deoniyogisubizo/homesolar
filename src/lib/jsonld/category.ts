import type { CollectionPage, ItemList, ListItem, WithContext } from "schema-dts";
import type { Category, Product } from "@/types";
import type { StoreIdentity } from "@/lib/jsonld/store";
import { websiteId } from "@/lib/jsonld/store";
import { toAbsoluteUrl } from "@/lib/site";
import { stripHtml } from "@/lib/seo/text";

export function buildCategoryJsonLd({
  category,
  products,
  store,
}: {
  category: Category;
  products: Product[];
  store: StoreIdentity;
}): WithContext<CollectionPage> {
  const url = toAbsoluteUrl(`/category/${category.slug}`);
  const itemListElement: ListItem[] = products.map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: product.name,
    url: toAbsoluteUrl(`/product/${product.slug}`),
  }));

  const itemList: ItemList = {
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement,
  };

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.seoTitle || category.name,
    description: stripHtml(category.seoDescription || category.description),
    url,
    isPartOf: { "@id": websiteId(store) },
    mainEntity: itemList,
  };
}
