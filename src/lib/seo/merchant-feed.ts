import type { Product, ProductVariant } from "@/types";
import { priceString, stripHtml } from "@/lib/seo/text";

export type MerchantShippingZone = {
  district: string;
  rate: number;
  eta: string;
};

export type MerchantFeedContext = {
  siteUrl: string;
  storeName: string;
  currency: string;
  shippingZones: MerchantShippingZone[];
  taxRate: number;
};

export type MerchantFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: "in_stock" | "out_of_stock";
  price: string;
  salePrice?: string;
  salePriceEffectiveDate?: string;
  condition: "new";
  brand: string;
  gtin?: string;
  mpn?: string;
  identifierExists?: false;
  itemGroupId: string;
  color?: string;
  size?: string;
  googleProductCategory?: string;
  productType?: string;
  customLabel0?: string;
  shipping: MerchantShippingZone[];
  taxRate: number;
};

export type MerchantSkippedProduct = {
  id: string;
  name: string;
  slug: string;
  reason: string;
};

export type MerchantFeed = {
  items: MerchantFeedItem[];
  skipped: MerchantSkippedProduct[];
};

function absolute(siteUrl: string, path: string): string {
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
}

function variantLabel(product: Product, variant: ProductVariant): string {
  const color = product.options.colors.find((option) => option.value === variant.color)?.label;
  const size = product.options.sizes.find((option) => option.value === variant.size)?.label;
  const parts = [color ?? variant.color, size ?? variant.size].filter(Boolean);
  return parts.length ? `${product.name} - ${parts.join(", ")}` : product.name;
}

function variantLink(siteUrl: string, product: Product, variant: ProductVariant): string {
  const url = new URL(absolute(siteUrl, `/product/${product.slug}`));
  if (variant.color) url.searchParams.set("color", variant.color);
  if (variant.size) url.searchParams.set("size", variant.size);
  return url.toString();
}

export function buildMerchantFeed(products: Product[], context: MerchantFeedContext): MerchantFeed {
  const items: MerchantFeedItem[] = [];
  const skipped: MerchantSkippedProduct[] = [];
  const shippingZones = context.shippingZones.filter(
    (zone) => zone.district.trim() && Number.isFinite(zone.rate) && zone.rate >= 0,
  );

  for (const product of products) {
    const skip = (reason: string) =>
      skipped.push({ id: product.id, name: product.name, slug: product.slug, reason });

    if (product.noindex) {
      skip("Marked noindex");
      continue;
    }

    const images = (product.images.length ? product.images.map((image) => image.src) : [product.image])
      .filter(Boolean)
      .map((image) => absolute(context.siteUrl, image));

    if (!images.length) {
      skip("No product image");
      continue;
    }

    const description = stripHtml(product.shortDescription || product.description);
    if (!description) {
      skip("Missing description");
      continue;
    }

    if (!product.category?.name) {
      skip("Category not assigned");
      continue;
    }

    let added = 0;
    let variantFailure = "";
    const variants: ProductVariant[] = product.variants.length
      ? product.variants
      : [
          {
            sku: product.id,
            color: null,
            size: null,
            price: product.price,
            compareAtPrice: product.compareAtPrice ?? null,
            stock: product.stock,
            isDefault: true,
          },
        ];

    for (const variant of variants) {
      const quote = product.variants.length
        ? product.variantPricing?.[variant.sku]
        : product.pricing;
      const regularPrice = quote?.originalPrice ?? variant.price;
      if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
        variantFailure = `Invalid price for SKU ${variant.sku}`;
        continue;
      }

      const campaignActive = Boolean(
        quote?.campaignId &&
          quote.discountPercent > 0 &&
          quote.effectivePrice < regularPrice &&
          quote.campaignStartsAt &&
          quote.campaignEndsAt,
      );
      const salePrice = campaignActive ? quote?.effectivePrice : undefined;

      items.push({
        id: variant.sku,
        title: variantLabel(product, variant),
        description,
        link: variantLink(context.siteUrl, product, variant),
        imageLink: images[0],
        additionalImageLinks: images.slice(1, 11),
        availability: variant.stock > 0 ? "in_stock" : "out_of_stock",
        price: `${priceString(regularPrice)} ${context.currency}`,
        ...(salePrice !== undefined
          ? {
              salePrice: `${priceString(salePrice)} ${context.currency}`,
              salePriceEffectiveDate: `${quote?.campaignStartsAt}/${quote?.campaignEndsAt}`,
            }
          : {}),
        condition: "new",
        brand: product.brand || context.storeName,
        ...(product.gtin ? { gtin: product.gtin } : {}),
        ...(product.mpn ? { mpn: product.mpn } : {}),
        ...(!product.gtin && !product.mpn ? { identifierExists: false as const } : {}),
        itemGroupId: product.id,
        ...(variant.color ? { color: variant.color } : {}),
        ...(variant.size ? { size: variant.size } : {}),
        ...(product.category.googleProductCategory
          ? { googleProductCategory: product.category.googleProductCategory }
          : {}),
        productType: product.category.name,
        ...(campaignActive && quote?.campaignName ? { customLabel0: quote.campaignName } : {}),
        shipping: shippingZones,
        taxRate: context.taxRate,
      });
      added += 1;
    }

    if (!added) {
      skip(variantFailure || "No valid variant price");
    }
  }

  return { items, skipped };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlTag(name: string, value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return `<g:${name}>${escapeXml(String(value))}</g:${name}>`;
}

export function renderMerchantXml(feed: MerchantFeed, context: MerchantFeedContext): string {
  const items = feed.items
    .map((item) => {
      const shipping = item.shipping
        .map(
          (zone) =>
            [
              "<g:shipping>",
              xmlTag("country", "RW"),
              xmlTag("region", zone.district),
              xmlTag("service", "Standard"),
              xmlTag("price", `${priceString(zone.rate)} ${context.currency}`),
              "</g:shipping>",
            ].join(""),
        )
        .join("");
      const tax =
        item.taxRate > 0
          ? [
              "<g:tax>",
              xmlTag("country", "RW"),
              xmlTag("rate", priceString(item.taxRate)),
              xmlTag("tax_ship", "no"),
              "</g:tax>",
            ].join("")
          : "";

      return [
        "<item>",
        xmlTag("id", item.id),
        xmlTag("title", item.title),
        xmlTag("description", item.description),
        xmlTag("link", item.link),
        xmlTag("image_link", item.imageLink),
        ...item.additionalImageLinks.map((image) => xmlTag("additional_image_link", image)),
        xmlTag("availability", item.availability),
        xmlTag("price", item.price),
        xmlTag("sale_price", item.salePrice),
        xmlTag("sale_price_effective_date", item.salePriceEffectiveDate),
        xmlTag("condition", item.condition),
        xmlTag("brand", item.brand),
        xmlTag("gtin", item.gtin),
        xmlTag("mpn", item.mpn),
        item.identifierExists === false ? xmlTag("identifier_exists", "no") : "",
        xmlTag("item_group_id", item.itemGroupId),
        xmlTag("color", item.color),
        xmlTag("size", item.size),
        xmlTag("google_product_category", item.googleProductCategory),
        xmlTag("product_type", item.productType),
        xmlTag("custom_label_0", item.customLabel0),
        shipping,
        tax,
        "</item>",
      ].join("");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    xmlTag("title", context.storeName),
    xmlTag("link", context.siteUrl),
    xmlTag("description", `Product feed for ${context.storeName}`),
    items,
    "</channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");
}

function tsvValue(value: string | number | undefined): string {
  if (value === undefined) return "";
  return String(value).replace(/[\t\r\n]+/g, " ").trim();
}

export function renderMerchantTsv(feed: MerchantFeed, context: MerchantFeedContext): string {
  const maxAdditionalImages = Math.max(0, ...feed.items.map((item) => item.additionalImageLinks.length));
  const maxShipping = Math.max(0, ...feed.items.map((item) => item.shipping.length));
  const hasTax = feed.items.some((item) => item.taxRate > 0);

  const headers = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    ...Array.from({ length: maxAdditionalImages }, () => "additional_image_link"),
    "availability",
    "price",
    "sale_price",
    "sale_price_effective_date",
    "condition",
    "brand",
    "gtin",
    "mpn",
    "identifier_exists",
    "item_group_id",
    "color",
    "size",
    "google_product_category",
    "product_type",
    "custom_label_0",
    ...Array.from({ length: maxShipping }, () => "shipping"),
    ...(hasTax ? ["tax"] : []),
  ];

  const rows = feed.items.map((item) => {
    const values = [
      item.id,
      item.title,
      item.description,
      item.link,
      item.imageLink,
      ...Array.from({ length: maxAdditionalImages }, (_, index) => item.additionalImageLinks[index] ?? ""),
      item.availability,
      item.price,
      item.salePrice ?? "",
      item.salePriceEffectiveDate ?? "",
      item.condition,
      item.brand,
      item.gtin ?? "",
      item.mpn ?? "",
      item.identifierExists === false ? "no" : "",
      item.itemGroupId,
      item.color ?? "",
      item.size ?? "",
      item.googleProductCategory ?? "",
      item.productType ?? "",
      item.customLabel0 ?? "",
      ...Array.from({ length: maxShipping }, (_, index) => {
        const zone = item.shipping[index];
        if (!zone) return "";
        return `RW:${zone.district}:Standard:${priceString(zone.rate)} ${context.currency}`;
      }),
      ...(hasTax ? [`RW:::${priceString(item.taxRate)}:no`] : []),
    ];
    return values.map(tsvValue).join("\t");
  });

  return [headers.join("\t"), ...rows].join("\n");
}
