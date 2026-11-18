import type {
  AggregateRating,
  Brand,
  Offer,
  OfferShippingDetails,
  Product as SchemaProduct,
  ProductGroup,
  Review as SchemaReview,
  UnitPriceSpecification,
  WithContext,
} from "schema-dts";
import type { Product, Review } from "@/types";
import type { StoreIdentity } from "@/lib/jsonld/store";
import { organizationId } from "@/lib/jsonld/store";
import { toAbsoluteUrl } from "@/lib/site";
import { dateOnly, priceString, stripHtml } from "@/lib/seo/text";

export type ShippingZoneInput = {
  district: string;
  rate: number;
  eta: string;
};

export type ProductSchemaInput = {
  product: Product;
  store: StoreIdentity;
  reviews: Review[];
  ratingVisible: boolean;
  shippingZones: ShippingZoneInput[];
};

const LOW_STOCK_LIMIT = 5;

export function availabilityFor(stock: number): string {
  if (stock <= 0) return "https://schema.org/OutOfStock";
  if (stock <= LOW_STOCK_LIMIT) return "https://schema.org/LimitedAvailability";
  return "https://schema.org/InStock";
}

function parseTransitTime(eta: string) {
  const match = eta.match(/(\d+)\s*(?:-|to)\s*(\d+)/i) ?? eta.match(/(\d+)/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2] ?? match[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return {
    "@type": "QuantitativeValue" as const,
    minValue: min,
    maxValue: max,
    unitCode: "DAY",
  };
}

export function buildShippingDetails(
  zones: ShippingZoneInput[],
  currency: string,
): OfferShippingDetails[] {
  return zones
    .filter((zone) => zone.district.trim() && Number.isFinite(zone.rate) && zone.rate >= 0)
    .map((zone) => {
      const transitTime = parseTransitTime(zone.eta);
      return {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "RW",
          addressRegion: zone.district,
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: priceString(zone.rate),
          currency,
        },
        ...(transitTime
          ? {
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                transitTime,
              },
            }
          : {}),
      };
    });
}

function buildOffer({
  store,
  url,
  price,
  originalPrice,
  campaignActive,
  campaignEndsAt,
  stock,
  shippingDetails,
}: {
  store: StoreIdentity;
  url: string;
  price: number;
  originalPrice: number;
  campaignActive: boolean;
  campaignEndsAt: string | null | undefined;
  stock: number;
  shippingDetails: OfferShippingDetails[];
}): Offer {
  const priceValidUntil = campaignActive ? dateOnly(campaignEndsAt) : undefined;
  const listPrice: UnitPriceSpecification | null =
    campaignActive && originalPrice > price
      ? {
          "@type": "UnitPriceSpecification",
          priceType: "https://schema.org/ListPrice",
          price: priceString(originalPrice),
          priceCurrency: store.currency,
        }
      : null;

  return {
    "@type": "Offer",
    url,
    priceCurrency: store.currency,
    price: priceString(price),
    availability: availabilityFor(stock) as Offer["availability"],
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": organizationId(store) },
    ...(priceValidUntil ? { priceValidUntil } : {}),
    ...(listPrice ? { priceSpecification: listPrice } : {}),
    ...(shippingDetails.length ? { shippingDetails } : {}),
  };
}

function buildReview(review: Review): SchemaReview {
  return {
    "@type": "Review",
    author: { "@type": "Person", name: review.author },
    datePublished: review.createdAt.slice(0, 10),
    name: review.title,
    reviewBody: review.body,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

function commonProductFields(product: Product, store: StoreIdentity, url: string) {
  const description = stripHtml(product.shortDescription || product.description);
  const images = (product.images.length ? product.images.map((image) => image.src) : [product.image]).map(
    toAbsoluteUrl,
  );
  const brand: Brand = {
    "@type": "Brand",
    name: product.brand || store.name,
  };

  return {
    name: product.name,
    description,
    image: images,
    sku: product.variants[0]?.sku || product.id,
    ...(product.gtin ? { gtin: product.gtin } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    brand,
    category: product.category.name,
    url,
  };
}

function aggregateRatingFor(product: Product, visible: boolean): AggregateRating | null {
  if (!visible || product.ratingCount <= 0 || product.ratingAverage <= 0) return null;
  return {
    "@type": "AggregateRating",
    ratingValue: priceString(product.ratingAverage),
    reviewCount: product.ratingCount,
    bestRating: 5,
    worstRating: 1,
  };
}

export function buildProductJsonLd({
  product,
  store,
  reviews,
  ratingVisible,
  shippingZones,
}: ProductSchemaInput): WithContext<SchemaProduct | ProductGroup> {
  const url = toAbsoluteUrl(`/product/${product.slug}`);
  const shippingDetails = buildShippingDetails(shippingZones, store.currency);
  const aggregateRating = aggregateRatingFor(product, ratingVisible);
  const schemaReviews = reviews.map(buildReview);
  const hasVariants =
    product.variants.length > 1 || Boolean(product.options.colors.length || product.options.sizes.length);

  if (!hasVariants) {
    const variant = product.variants[0] ?? null;
    const pricing = (variant && product.variantPricing?.[variant.sku]) || product.pricing;
    const price = pricing?.effectivePrice ?? variant?.price ?? product.price;
    const originalPrice = pricing?.originalPrice ?? variant?.compareAtPrice ?? price;
    const stock = variant?.stock ?? product.stock;
    const offer = buildOffer({
      store,
      url,
      price,
      originalPrice,
      campaignActive: Boolean(pricing?.campaignId && pricing.discountPercent > 0),
      campaignEndsAt: pricing?.campaignEndsAt,
      stock,
      shippingDetails,
    });

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      ...commonProductFields(product, store, url),
      ...(product.variants[0]?.sku ? { sku: product.variants[0].sku } : {}),
      ...(variant?.color ? { color: variant.color } : {}),
      ...(variant?.size ? { size: variant.size } : {}),
      offers: offer,
      ...(aggregateRating ? { aggregateRating } : {}),
      ...(schemaReviews.length ? { review: schemaReviews } : {}),
    };
  }

  const groupId = `${url}#product-group`;
  const colorLabels = new Map(product.options.colors.map((color) => [color.value, color.label]));
  const sizeLabels = new Map(product.options.sizes.map((size) => [size.value, size.label]));

  const variants: SchemaProduct[] = product.variants.map((variant) => {
    const pricing = product.variantPricing?.[variant.sku] ?? product.pricing;
    const price = pricing?.effectivePrice ?? variant.price;
    const originalPrice = pricing?.originalPrice ?? variant.compareAtPrice ?? price;
    const labelParts = [
      variant.color ? colorLabels.get(variant.color) ?? variant.color : null,
      variant.size ? sizeLabels.get(variant.size) ?? variant.size : null,
    ].filter(Boolean);
    const offer = buildOffer({
      store,
      url,
      price,
      originalPrice,
      campaignActive: Boolean(pricing?.campaignId && pricing.discountPercent > 0),
      campaignEndsAt: pricing?.campaignEndsAt,
      stock: variant.stock,
      shippingDetails,
    });

    return {
      "@type": "Product",
      ...commonProductFields(product, store, url),
      name: labelParts.length ? `${product.name} - ${labelParts.join(", ")}` : product.name,
      sku: variant.sku,
      ...(variant.color ? { color: variant.color } : {}),
      ...(variant.size ? { size: variant.size } : {}),
      isVariantOf: { "@type": "ProductGroup", "@id": groupId },
      offers: offer,
    };
  });

  const variesBy = [
    product.options.colors.length ? "color" : null,
    product.options.sizes.length ? "size" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": groupId,
    ...commonProductFields(product, store, url),
    productGroupID: product.id,
    ...(variesBy.length ? { variesBy } : {}),
    hasVariant: variants,
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(schemaReviews.length ? { review: schemaReviews } : {}),
  };
}
