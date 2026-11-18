import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SEARCH_CRAWLERS, TRAINING_CRAWLERS } from "@/lib/admin/settings-defaults";
import { buildRobots, ROBOTS_DISALLOW } from "@/lib/seo/robots";

function rulesFor(robots: ReturnType<typeof buildRobots>, userAgent: string) {
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  return rules.filter((rule) => rule.userAgent === userAgent);
}

describe("robots.txt", () => {
  it("disallows everything when indexing is disabled", () => {
    const robots = buildRobots(
      { ...DEFAULT_SETTINGS.seo, indexable: false, sitemapEnabled: true },
      "https://shop.example",
    );

    expect(robots.rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    expect(robots.sitemap).toBe("https://shop.example/sitemap.xml");
  });

  it("allows public pages and blocks private routes for every search crawler", () => {
    const robots = buildRobots(DEFAULT_SETTINGS.seo, "https://shop.example");

    for (const crawler of SEARCH_CRAWLERS) {
      const rule = rulesFor(robots, crawler.userAgent)[0];
      expect(rule, crawler.userAgent).toBeDefined();
      expect(rule.allow).toBe("/");
      expect(rule.disallow).toEqual([...ROBOTS_DISALLOW]);
    }
  });

  it("blocks training crawlers by default", () => {
    const robots = buildRobots(DEFAULT_SETTINGS.seo, "https://shop.example");

    for (const crawler of TRAINING_CRAWLERS) {
      const rule = rulesFor(robots, crawler.userAgent)[0];
      expect(rule, crawler.userAgent).toEqual({ userAgent: crawler.userAgent, disallow: "/" });
    }
  });

  it("allows a training crawler when its single toggle is enabled", () => {
    const seo = {
      ...DEFAULT_SETTINGS.seo,
      robots: {
        ...DEFAULT_SETTINGS.seo.robots,
        training: { ...DEFAULT_SETTINGS.seo.robots.training, gptBot: true },
      },
    };
    const robots = buildRobots(seo, "https://shop.example");

    expect(rulesFor(robots, "GPTBot")[0]).toMatchObject({ allow: "/" });
    expect(rulesFor(robots, "ClaudeBot")[0]).toEqual({ userAgent: "ClaudeBot", disallow: "/" });
  });

  it("omits the sitemap reference when sitemap publishing is disabled", () => {
    const robots = buildRobots(
      { ...DEFAULT_SETTINGS.seo, sitemapEnabled: false },
      "https://shop.example",
    );
    expect(robots.sitemap).toBeUndefined();
  });
});
