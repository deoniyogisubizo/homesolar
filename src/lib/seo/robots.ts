import type { MetadataRoute } from "next";
import {
  DEFAULT_ROBOTS_SETTINGS,
  SEARCH_CRAWLERS,
  TRAINING_CRAWLERS,
  type SeoSettings,
} from "@/lib/admin/settings-defaults";

export const ROBOTS_DISALLOW = [
  "/admin",
  "/api/",
  "/cart",
  "/checkout",
  "/account",
  "/order/",
  "/search",
  "/invoice",
  "/delivery",
] as const;

export function buildRobots(seo: SeoSettings, siteUrl: string): MetadataRoute.Robots {
  if (!seo.indexable) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      ...(seo.sitemapEnabled ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
    };
  }

  const robots = seo.robots ?? DEFAULT_ROBOTS_SETTINGS;
  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW],
    },
  ];

  for (const crawler of SEARCH_CRAWLERS) {
    rules.push(
      robots.search[crawler.key]
        ? {
            userAgent: crawler.userAgent,
            allow: "/",
            disallow: [...ROBOTS_DISALLOW],
          }
        : {
            userAgent: crawler.userAgent,
            disallow: "/",
          },
    );
  }

  for (const crawler of TRAINING_CRAWLERS) {
    rules.push(
      robots.training[crawler.key]
        ? {
            userAgent: crawler.userAgent,
            allow: "/",
            disallow: [...ROBOTS_DISALLOW],
          }
        : {
            userAgent: crawler.userAgent,
            disallow: "/",
          },
    );
  }

  return {
    rules,
    ...(seo.sitemapEnabled ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
