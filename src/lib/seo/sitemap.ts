import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/site";

export const SITEMAP_PAGE_SIZE = 5000;

export type SitemapSourceEntry = {
  slug: string;
  updatedAt: Date | string | null;
  images: string[];
};

export type SitemapSource = {
  products: SitemapSourceEntry[];
  categories: SitemapSourceEntry[];
  pages: SitemapSourceEntry[];
};

export type SitemapEntry = {
  url: string;
  lastModified: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  images: string[];
};

function timestamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function iso(value: Date | string | null | undefined, fallback: string): string {
  const time = timestamp(value);
  return time ? new Date(time).toISOString() : fallback;
}

export function buildSitemapEntries(source: SitemapSource, siteUrl: string): SitemapEntry[] {
  const allDates = [
    ...source.products.map((entry) => timestamp(entry.updatedAt)),
    ...source.categories.map((entry) => timestamp(entry.updatedAt)),
    ...source.pages.map((entry) => timestamp(entry.updatedAt)),
  ].filter((value) => value > 0);
  const now = new Date().toISOString();
  const homeLastModified = allDates.length ? new Date(Math.max(...allDates)).toISOString() : now;

  const entries: SitemapEntry[] = [
    {
      url: `${siteUrl}/`,
      lastModified: homeLastModified,
      changeFrequency: "daily",
      priority: 1,
      images: [],
    },
  ];

  for (const category of source.categories) {
    entries.push({
      url: `${siteUrl}/category/${category.slug}`,
      lastModified: iso(category.updatedAt, now),
      changeFrequency: "weekly",
      priority: 0.8,
      images: category.images.map((image) => toAbsoluteUrl(image)),
    });
  }

  for (const product of source.products) {
    entries.push({
      url: `${siteUrl}/product/${product.slug}`,
      lastModified: iso(product.updatedAt, now),
      changeFrequency: "daily",
      priority: 0.7,
      images: product.images.map((image) => toAbsoluteUrl(image)),
    });
  }

  for (const page of source.pages) {
    entries.push({
      url: `${siteUrl}/${page.slug}`,
      lastModified: iso(page.updatedAt, now),
      changeFrequency: "monthly",
      priority: 0.5,
      images: page.images.map((image) => toAbsoluteUrl(image)),
    });
  }

  return entries.filter(
    (entry, index, list) => list.findIndex((candidate) => candidate.url === entry.url) === index,
  );
}

export function sitemapChunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / SITEMAP_PAGE_SIZE));
}

export function sitemapChunk(entries: SitemapEntry[], id: number): SitemapEntry[] {
  const start = id * SITEMAP_PAGE_SIZE;
  return entries.slice(start, start + SITEMAP_PAGE_SIZE);
}

export function toMetadataRoute(entries: SitemapEntry[]): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    ...(entry.images.length ? { images: entry.images } : {}),
  }));
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const images = entry.images
        .map((image) => `    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`)
        .join("\n");
      return [
        "  <url>",
        `    <loc>${escapeXml(entry.url)}</loc>`,
        `    <lastmod>${entry.lastModified}</lastmod>`,
        `    <changefreq>${entry.changeFrequency}</changefreq>`,
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
        ...(images ? [images] : []),
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urls,
    "</urlset>",
  ].join("\n");
}

export function renderSitemapIndex(count: number, siteUrl: string): string {
  const items = Array.from({ length: count }, (_, id) =>
    `  <sitemap><loc>${escapeXml(`${siteUrl}/sitemap/${id}.xml`)}</loc></sitemap>`,
  ).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    "</sitemapindex>",
  ].join("\n");
}
