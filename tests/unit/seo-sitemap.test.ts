import { beforeEach, describe, expect, it } from "vitest";
import {
  SITEMAP_PAGE_SIZE,
  buildSitemapEntries,
  renderSitemapIndex,
  renderUrlSet,
  sitemapChunk,
  sitemapChunkCount,
  type SitemapSource,
} from "@/lib/seo/sitemap";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
});

function source(overrides: Partial<SitemapSource> = {}): SitemapSource {
  return {
    products: [
      {
        slug: "monocrystalline-solar-panel",
        updatedAt: "2026-10-15T10:00:00.000Z",
        images: ["/images/products/panel.jpg", "https://cdn.example/panel-2.jpg"],
      },
    ],
    categories: [
      {
        slug: "solar-panels",
        updatedAt: "2026-09-01T07:30:00.000Z",
        images: ["/images/categories/panels.jpg"],
      },
    ],
    pages: [
      {
        slug: "faq",
        updatedAt: new Date("2026-11-01T12:00:00.000Z"),
        images: [],
      },
    ],
    ...overrides,
  };
}

describe("sitemap entries", () => {
  it("includes home, active categories, products and published pages", () => {
    const entries = buildSitemapEntries(source(), "https://shop.example");

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://shop.example/",
      "https://shop.example/category/solar-panels",
      "https://shop.example/product/monocrystalline-solar-panel",
      "https://shop.example/faq",
    ]);
  });

  it("uses real modification dates and the newest date for the home page", () => {
    const entries = buildSitemapEntries(source(), "https://shop.example");
    const home = entries[0];
    const product = entries.find((entry) => entry.url.endsWith("/product/monocrystalline-solar-panel"));

    expect(home.lastModified).toBe("2026-11-01T12:00:00.000Z");
    expect(product?.lastModified).toBe("2026-10-15T10:00:00.000Z");
    expect(entries.find((entry) => entry.url.endsWith("/category/solar-panels"))?.lastModified).toBe(
      "2026-09-01T07:30:00.000Z",
    );
  });

  it("makes image paths absolute and keeps absolute image URLs", () => {
    const entries = buildSitemapEntries(source(), "https://shop.example");
    const product = entries.find((entry) => entry.url.includes("/product/"));

    expect(product?.images).toEqual([
      "https://shop.example/images/products/panel.jpg",
      "https://cdn.example/panel-2.jpg",
    ]);
  });

  it("falls back to the current time when an entry has no modification date", () => {
    const entries = buildSitemapEntries(
      source({ pages: [{ slug: "about-us", updatedAt: null, images: [] }] }),
      "https://shop.example",
    );
    const page = entries.find((entry) => entry.url.endsWith("/about-us"));

    expect(Number.isNaN(Date.parse(page?.lastModified ?? ""))).toBe(false);
  });

  it("removes duplicate URLs", () => {
    const entries = buildSitemapEntries(
      source({
        products: [
          { slug: "panel", updatedAt: null, images: [] },
          { slug: "panel", updatedAt: null, images: [] },
        ],
      }),
      "https://shop.example",
    );

    expect(entries.filter((entry) => entry.url.endsWith("/product/panel"))).toHaveLength(1);
  });

  it("splits sitemaps into chunks of 5,000 URLs", () => {
    const entries = Array.from({ length: SITEMAP_PAGE_SIZE + 1 }, (_, index) => ({
      url: `https://shop.example/product/${index}`,
      lastModified: "2026-11-01T00:00:00.000Z",
      changeFrequency: "daily" as const,
      priority: 0.7,
      images: [],
    }));

    expect(sitemapChunkCount(entries.length)).toBe(2);
    expect(sitemapChunk(entries, 0)).toHaveLength(SITEMAP_PAGE_SIZE);
    expect(sitemapChunk(entries, 1)).toHaveLength(1);
    expect(sitemapChunk(entries, 1)[0].url).toBe("https://shop.example/product/5000");
  });

  it("renders an image sitemap and escapes XML characters", () => {
    const xml = renderUrlSet([
      {
        url: "https://shop.example/product/panel?a=1&b=2",
        lastModified: "2026-11-01T00:00:00.000Z",
        changeFrequency: "daily",
        priority: 0.7,
        images: ["https://shop.example/image.jpg?w=1&h=2"],
      },
    ]);

    expect(xml).toContain("<loc>https://shop.example/product/panel?a=1&amp;b=2</loc>");
    expect(xml).toContain("<image:loc>https://shop.example/image.jpg?w=1&amp;h=2</image:loc>");
    expect(xml).toContain("<priority>0.7</priority>");
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  });

  it("renders a sitemap index for multiple chunks", () => {
    const xml = renderSitemapIndex(2, "https://shop.example");

    expect(xml).toContain("<loc>https://shop.example/sitemap/0.xml</loc>");
    expect(xml).toContain("<loc>https://shop.example/sitemap/1.xml</loc>");
    expect(xml).toContain("<sitemapindex");
  });
});
