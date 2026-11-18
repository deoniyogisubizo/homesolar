import { beforeEach, describe, expect, it } from "vitest";
import { pageMetadata } from "@/lib/seo/metadata";
import { canonicalPath, canonicalUrl, getSiteUrl } from "@/lib/site";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
});

describe("site URL configuration", () => {
  it("returns the canonical origin without a trailing slash", () => {
    expect(getSiteUrl()).toBe("https://shop.example");
    expect(canonicalUrl("/product/panel")).toBe("https://shop.example/product/panel");
  });

  it("rejects URLs with a path or query", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example/store";
    expect(() => getSiteUrl()).toThrow(/origin only/);

    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example/?ref=1";
    expect(() => getSiteUrl()).toThrow(/origin only/);
  });

  it("rejects non-http protocols", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "ftp://shop.example";
    expect(() => getSiteUrl()).toThrow(/http or https/);
  });
});

describe("canonical URLs", () => {
  it("ignores filters because the page path is passed without its query string", () => {
    expect(canonicalPath("/search")).toBe("/search");
    expect(canonicalPath("/category/solar-panels")).toBe("/category/solar-panels");
  });

  it("keeps pagination self-canonical", () => {
    expect(canonicalPath("/category/solar-panels", 1)).toBe("/category/solar-panels");
    expect(canonicalPath("/category/solar-panels", 2)).toBe(
      "/category/solar-panels?page=2",
    );
    expect(canonicalPath("/category/solar-panels", "3")).toBe(
      "/category/solar-panels?page=3",
    );
  });
});

describe("page metadata", () => {
  it("sets a unique title, description, canonical, Open Graph and Twitter fields", () => {
    const metadata = pageMetadata({
      title: "Monocrystalline Solar Panel",
      description: "A reliable panel for home solar systems.",
      path: "/product/monocrystalline-solar-panel",
      image: "/images/products/panel.jpg",
      imageAlt: "Solar panel",
    });

    expect(metadata.title).toBe("Monocrystalline Solar Panel");
    expect(metadata.description).toBe("A reliable panel for home solar systems.");
    expect(metadata.alternates?.canonical).toBe("/product/monocrystalline-solar-panel");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      title: "Monocrystalline Solar Panel",
      url: "/product/monocrystalline-solar-panel",
      images: [{ url: "https://shop.example/images/products/panel.jpg", alt: "Solar panel" }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Monocrystalline Solar Panel",
    });
    expect(metadata.robots).toBeUndefined();
  });

  it("uses the paginated canonical for later pages", () => {
    const metadata = pageMetadata({
      title: "Solar Panels",
      description: "Browse solar panels.",
      path: "/category/solar-panels",
      page: 2,
    });

    expect(metadata.alternates?.canonical).toBe("/category/solar-panels?page=2");
    expect(metadata.openGraph?.url).toBe("/category/solar-panels?page=2");
    expect((metadata.twitter as { card?: string }).card).toBe("summary");
  });

  it("adds noindex and nofollow when requested", () => {
    const metadata = pageMetadata({
      title: "Your cart",
      description: "Your cart items.",
      path: "/cart",
      noindex: true,
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("adds product Open Graph price tags for product pages", () => {
    const metadata = pageMetadata({
      title: "Solar Panel",
      description: "Panel description.",
      path: "/product/panel",
      ogType: "product",
      price: { amount: "229.00", currency: "USD" },
    });

    expect((metadata.openGraph as { type?: string }).type).toBe("website");
    expect(metadata.other).toEqual({
      "og:type": "product",
      "product:price:amount": "229.00",
      "product:price:currency": "USD",
    });
  });

  it("truncates long descriptions to roughly 159 characters", () => {
    const metadata = pageMetadata({
      title: "Long description",
      description: "<p>" + "solar panel ".repeat(40) + "</p>",
      path: "/product/panel",
    });

    expect((metadata.description ?? "").length).toBeLessThanOrEqual(160);
    expect(metadata.description).not.toContain("<p>");
  });
});
