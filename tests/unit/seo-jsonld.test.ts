import { beforeEach, describe, expect, it } from "vitest";
import { buildBreadcrumbList } from "@/lib/jsonld/breadcrumb";
import { buildProductJsonLd } from "@/lib/jsonld/product";
import { serializeJsonLd } from "@/lib/jsonld/serialize";
import { productFixture, reviewFixture, shippingZones, store } from "./seo-fixtures";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
});

function offersOf(data: unknown) {
  return (data as { offers: Record<string, unknown> }).offers;
}

describe("product JSON-LD", () => {
  it("builds a single Product with a two-decimal price and stock availability", () => {
    const schema = buildProductJsonLd({
      product: productFixture(),
      store,
      reviews: [],
      ratingVisible: true,
      shippingZones,
    });

    expect(schema["@type"]).toBe("Product");
    const offers = offersOf(schema);
    expect(offers.price).toBe("229.00");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.priceValidUntil).toBeUndefined();
    expect(offers.priceSpecification).toBeUndefined();
    expect(offers.shippingDetails).toHaveLength(2);
    expect((schema as { aggregateRating?: { reviewCount: number } }).aggregateRating?.reviewCount).toBe(2);
    expect((schema as { review?: unknown[] }).review).toBeUndefined();
  });

  it("uses campaign pricing, list price and the campaign end date", () => {
    const campaign = {
      originalPrice: 229,
      effectivePrice: 183.2,
      discountPercent: 20,
      campaignId: "campaign-1",
      campaignName: "Sun Sale",
      campaignStartsAt: "2026-11-01T00:00:00.000Z",
      campaignEndsAt: "2026-11-30T23:59:59.000Z",
    };
    const product = productFixture({
      pricing: campaign,
      variantPricing: { "SP-450": campaign },
    });

    const schema = buildProductJsonLd({
      product,
      store,
      reviews: [],
      ratingVisible: false,
      shippingZones,
    });
    const offers = offersOf(schema);
    expect(offers.price).toBe("183.20");
    expect(offers.priceValidUntil).toBe("2026-11-30");
    expect(offers.priceSpecification).toMatchObject({
      priceType: "https://schema.org/ListPrice",
      price: "229.00",
    });
    expect((schema as { aggregateRating?: unknown }).aggregateRating).toBeUndefined();
  });

  it("builds ProductGroup with one Offer per variant", () => {
    const product = productFixture({
      options: {
        colors: [
          { value: "black", label: "Black", hex: "#000000" },
          { value: "white", label: "White", hex: "#ffffff" },
        ],
        sizes: [],
      },
      variants: [
        { sku: "SP-BLK", color: "black", size: null, price: 229, compareAtPrice: null, stock: 8 },
        { sku: "SP-WHT", color: "white", size: null, price: 239, compareAtPrice: null, stock: 0 },
      ],
      variantPricing: {
        "SP-BLK": { originalPrice: 229, effectivePrice: 229, discountPercent: 0 },
        "SP-WHT": { originalPrice: 239, effectivePrice: 239, discountPercent: 0 },
      },
    });

    const schema = buildProductJsonLd({
      product,
      store,
      reviews: [],
      ratingVisible: false,
      shippingZones,
    });

    expect(schema["@type"]).toBe("ProductGroup");
    const variants = (schema as unknown as { hasVariant: Array<Record<string, unknown>> }).hasVariant;
    expect(variants).toHaveLength(2);
    expect(variants[0].name).toContain("Black");
    expect((variants[0].offers as Record<string, unknown>).price).toBe("229.00");
    expect((variants[1].offers as Record<string, unknown>).availability).toBe(
      "https://schema.org/OutOfStock",
    );
    expect((schema as { offers?: unknown }).offers).toBeUndefined();
  });

  it("marks low stock as LimitedAvailability and zero stock as OutOfStock", () => {
    const low = buildProductJsonLd({
      product: productFixture({ stock: 3, variants: [{ ...productFixture().variants[0], stock: 3 }] }),
      store,
      reviews: [],
      ratingVisible: false,
      shippingZones,
    });
    const out = buildProductJsonLd({
      product: productFixture({ stock: 0, variants: [{ ...productFixture().variants[0], stock: 0 }] }),
      store,
      reviews: [],
      ratingVisible: false,
      shippingZones,
    });

    expect(offersOf(low).availability).toBe("https://schema.org/LimitedAvailability");
    expect(offersOf(out).availability).toBe("https://schema.org/OutOfStock");
  });

  it("includes only approved visible reviews and omits ratings when hidden", () => {
    const schema = buildProductJsonLd({
      product: productFixture(),
      store,
      reviews: [reviewFixture],
      ratingVisible: false,
      shippingZones,
    });

    expect((schema as { aggregateRating?: unknown }).aggregateRating).toBeUndefined();
    const reviews = (schema as { review?: Array<Record<string, unknown>> }).review;
    expect(reviews).toHaveLength(1);
    expect(reviews?.[0]).toMatchObject({ "@type": "Review", author: { name: "Aline" } });
  });

  it("escapes script-breaking characters", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
  });
});

describe("breadcrumb JSON-LD", () => {
  it("numbers each item and keeps absolute URLs", () => {
    const schema = buildBreadcrumbList([
      { name: "Home", url: "https://shop.example/" },
      { name: "Solar Panels", url: "https://shop.example/category/solar-panels" },
    ]);

    expect(schema.itemListElement).toHaveLength(2);
    const items = schema.itemListElement as unknown as Array<Record<string, unknown>>;
    expect(items[0]).toMatchObject({ position: 1, name: "Home" });
    expect(items[1]).toMatchObject({ position: 2, name: "Solar Panels" });
  });
});
