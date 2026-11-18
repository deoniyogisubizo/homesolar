import dotenv from "dotenv";
import mongoose from "mongoose";
import type { PricingCampaign } from "../src/lib/pricing";

dotenv.config({ path: ".env.local" });
if (process.env.SEO_CHECK_TEST === "1") {
  dotenv.config({ path: ".env.test.local", override: true });
}

const URI =
  process.env.SEO_CHECK_TEST === "1"
    ? process.env.MONGODB_URI_TEST
    : process.env.MONGODB_URI;

type LeanRecord = {
  slug: string;
  slugHistory?: string[];
  noindex?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

type Report = {
  passed: number;
  warnings: number;
  failures: number;
};

const report: Report = { passed: 0, warnings: 0, failures: 0 };

function pass(message: string) {
  report.passed += 1;
  console.log(`PASS  ${message}`);
}

function warn(message: string) {
  report.warnings += 1;
  console.log(`WARN  ${message}`);
}

function fail(message: string) {
  report.failures += 1;
  console.log(`FAIL  ${message}`);
}

function check(condition: boolean, message: string, detail?: string) {
  if (condition) pass(message);
  else fail(detail ? `${message}: ${detail}` : message);
  return condition;
}

function checkSlugHistory(label: string, records: LeanRecord[], reserved = new Set<string>()) {
  const failuresBefore = report.failures;
  const current = new Map<string, string>();
  for (const record of records) {
    const owner = current.get(record.slug);
    if (owner) fail(`${label}: duplicate current slug "${record.slug}"`);
    current.set(record.slug, record.slug);
    if (reserved.has(record.slug)) {
      fail(`${label}: current slug "${record.slug}" is reserved by an application route`);
    }
  }

  const history = new Map<string, string>();
  for (const record of records) {
    for (const oldSlug of record.slugHistory ?? []) {
      if (!oldSlug) continue;
      if (oldSlug === record.slug) {
        warn(`${label}: "${oldSlug}" lists its own current slug in slugHistory`);
        continue;
      }
      const currentOwner = current.get(oldSlug);
      if (currentOwner) {
        fail(`${label}: old slug "${oldSlug}" shadows current page "${currentOwner}"`);
        continue;
      }
      const previousOwner = history.get(oldSlug);
      if (previousOwner && previousOwner !== record.slug) {
        fail(`${label}: old slug "${oldSlug}" belongs to both "${previousOwner}" and "${record.slug}"`);
        continue;
      }
      history.set(oldSlug, record.slug);
    }
  }

  if (report.failures === failuresBefore) pass(`${label}: slugs and slug history have no collisions`);
}

const RESERVED_PAGE_SLUGS = new Set([
  "account",
  "admin",
  "api",
  "cart",
  "category",
  "checkout",
  "contact",
  "feeds",
  "indexnow.txt",
  "llms.txt",
  "order",
  "privacy-policy",
  "product",
  "robots.txt",
  "search",
  "sitemap.xml",
  "terms-and-conditions",
  "wishlist",
]);

async function main() {
  if (!URI) {
    fail(
      process.env.SEO_CHECK_TEST === "1"
        ? "MONGODB_URI_TEST is missing from .env.test.local"
        : "MONGODB_URI is missing from .env.local",
    );
    return;
  }

  const { Product: ProductModel } = await import("../src/models/Product");
  const { Category: CategoryModel } = await import("../src/models/Category");
  const { Page: PageModel } = await import("../src/models/Page");
  const { Setting: SettingModel } = await import("../src/models/Setting");
  const { Campaign: CampaignModel } = await import("../src/models/Campaign");
  const { serializeProduct } = await import("../src/lib/serialize");
  const { getEffectivePrice, quoteForVariants } = await import("../src/lib/pricing");
  const { DEFAULT_SETTINGS } = await import("../src/lib/admin/settings-defaults");
  const { buildMerchantFeed } = await import("../src/lib/seo/merchant-feed");
  const { buildSitemapEntries } = await import("../src/lib/seo/sitemap");
  const { buildRobots, ROBOTS_DISALLOW } = await import("../src/lib/seo/robots");
  const { getSiteUrl } = await import("../src/lib/site");
  const { BASE_CURRENCY } = await import("../src/lib/calculator");

  const Product = ProductModel as mongoose.Model<Record<string, unknown>>;
  const Category = CategoryModel as mongoose.Model<Record<string, unknown>>;
  const Page = PageModel as mongoose.Model<Record<string, unknown>>;
  const Setting = SettingModel as mongoose.Model<Record<string, unknown>>;
  const Campaign = CampaignModel as mongoose.Model<Record<string, unknown>>;

  let siteUrl = "";
  try {
    siteUrl = getSiteUrl();
    const parsed = new URL(siteUrl);
    pass(`NEXT_PUBLIC_SITE_URL is a valid origin: ${siteUrl}`);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      warn("NEXT_PUBLIC_SITE_URL points at localhost; set the production origin before deploying");
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : "Invalid NEXT_PUBLIC_SITE_URL");
    return;
  }

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 12_000 });
  const database = mongoose.connection.db?.databaseName ?? "(unknown)";
  console.log(`\nDatabase: ${database}\n`);

  const settingDocs = await Setting.find({
    key: { $in: ["general", "contact", "shipping", "seo"] },
  }).lean();
  const settings = new Map(settingDocs.map((document) => [document.key, document.value as Record<string, unknown>]));
  const general = {
    ...DEFAULT_SETTINGS.general,
    ...(settings.get("general") ?? {}),
  };
  const shipping = {
    ...DEFAULT_SETTINGS.shipping,
    ...(settings.get("shipping") ?? {}),
  };
  const rawSeo = settings.get("seo") ?? {};
  const rawRobots = (rawSeo.robots ?? {}) as Record<string, Record<string, boolean> | undefined>;
  const seo = {
    ...DEFAULT_SETTINGS.seo,
    ...rawSeo,
    robots: {
      search: {
        ...DEFAULT_SETTINGS.seo.robots.search,
        ...(rawRobots.search ?? {}),
      },
      training: {
        ...DEFAULT_SETTINGS.seo.robots.training,
        ...(rawRobots.training ?? {}),
      },
    },
  };

  if (!general.storeName) fail("General settings: storeName is empty");
  else pass(`General settings: store name is "${general.storeName}"`);
  if (!shipping.zones?.length) {
    warn("Shipping settings contain no zones; the feed will not include shipping costs");
  } else {
    pass(`Shipping settings: ${shipping.zones.length} delivery zones available to the feed`);
  }

  const [products, categories, pages, campaignDocs] = await Promise.all([
    Product.find({ publishStatus: { $nin: ["draft", "archived"] } })
      .sort({ createdAt: 1 })
      .populate("category")
      .lean(),
    Category.find({ active: { $ne: false } }).lean(),
    Page.find({ status: "published" }).lean(),
    Campaign.find({
      active: true,
      endedAt: null,
      pausedAt: null,
      startsAt: { $lte: new Date() },
      endsAt: { $gte: new Date() },
    })
      .sort({ priority: -1, discountType: 1, value: -1 })
      .lean(),
  ]);

  const campaigns: PricingCampaign[] = campaignDocs.map((document) => ({
    id: String(document._id),
    name: String(document.name),
    startsAt: document.startsAt as Date,
    endsAt: document.endsAt as Date,
    discountType: document.discountType as PricingCampaign["discountType"],
    value: Number(document.value),
    scope: document.scope as PricingCampaign["scope"],
    categoryIds: ((document.categoryIds ?? []) as unknown[]).map(String),
    productIds: ((document.productIds ?? []) as unknown[]).map(String),
    excludedProductIds: ((document.excludedProductIds ?? []) as unknown[]).map(String),
    priority: Number(document.priority ?? 0),
    stackWithCoupons: Boolean(document.stackWithCoupons),
    active: Boolean(document.active),
    pausedAt: document.pausedAt as Date | null,
    endedAt: document.endedAt as Date | null,
  }));
  const pricingContext = { campaigns, now: new Date(), couponApplied: false };

  const serializedProducts = products.map((document) => {
    const product = serializeProduct(document as never);
    const base = {
      id: product.id,
      price: product.price,
      categoryId: product.category.id || null,
    };
    return {
      ...product,
      pricing: getEffectivePrice(base, null, pricingContext),
      variantPricing: quoteForVariants(
        base,
        product.variants.map((variant) => ({
          sku: variant.sku,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? null,
        })),
        pricingContext,
      ),
    };
  });

  const feed = buildMerchantFeed(serializedProducts, {
    siteUrl,
    storeName: general.storeName,
    currency: BASE_CURRENCY,
    shippingZones: shipping.zones ?? [],
    taxRate: shipping.taxRate ?? 0,
  });

  const duplicateSkus = new Map<string, number>();
  for (const item of feed.items) {
    duplicateSkus.set(item.id, (duplicateSkus.get(item.id) ?? 0) + 1);
  }
  const duplicateSkuEntries = [...duplicateSkus.entries()].filter(([, count]) => count > 1);
  check(
    duplicateSkuEntries.length === 0,
    "Merchant feed: every variant SKU is unique",
    duplicateSkuEntries.map(([sku, count]) => `${sku} (${count})`).join(", "),
  );

  const requiredFeedFields: Array<[keyof typeof feed.items[number], string]> = [
    ["id", "id"],
    ["title", "title"],
    ["description", "description"],
    ["link", "link"],
    ["imageLink", "image_link"],
    ["price", "price"],
    ["availability", "availability"],
    ["brand", "brand"],
  ];
  const invalidItems = feed.items.filter((item) =>
    requiredFeedFields.some(([key]) => !String(item[key] ?? "").trim()),
  );
  check(
    invalidItems.length === 0,
    `Merchant feed: ${feed.items.length} items have all required fields`,
    invalidItems.map((item) => item.id).join(", "),
  );
  const badPrices = feed.items.filter((item) => !/^\d+\.\d{2} [A-Z]{3}$/.test(item.price));
  check(
    badPrices.length === 0,
    "Merchant feed: prices use two decimals and the base currency",
    badPrices.map((item) => `${item.id}=${item.price}`).join(", "),
  );

  for (const skipped of feed.skipped) {
    if (skipped.reason === "Marked noindex") {
      warn(`Merchant feed excludes noindex product "${skipped.name}" (${skipped.slug})`);
    } else {
      fail(`Merchant feed skips "${skipped.name}" (${skipped.slug}): ${skipped.reason}`);
    }
  }

  const missingIdentifiers = serializedProducts.filter(
    (product) => !product.noindex && !product.gtin && !product.mpn,
  );
  if (missingIdentifiers.length) {
    warn(
      `${missingIdentifiers.length} products have no GTIN or MPN; the feed sends identifier_exists=no`,
    );
  } else {
    pass("Merchant feed: every product has a GTIN or MPN");
  }

  const missingSeo = serializedProducts.filter(
    (product) => !product.noindex && (!product.seoTitle || !product.seoDescription),
  );
  if (missingSeo.length) {
    warn(`${missingSeo.length} indexable products are missing an SEO title or description`);
  } else {
    pass("Product SEO: every indexable product has a title and description");
  }

  const categorySeo = categories.filter(
    (category) => category.noindex !== true && (!category.seoTitle || !category.seoDescription),
  );
  if (categorySeo.length) {
    warn(`${categorySeo.length} indexable categories are missing an SEO title or description`);
  } else {
    pass("Category SEO: every indexable category has a title and description");
  }

  const pageSeo = pages.filter(
    (page) => page.noindex !== true && (!page.seoTitle || !page.seoDescription),
  );
  if (pageSeo.length) {
    warn(`${pageSeo.length} published pages are missing an SEO title or description`);
  } else {
    pass("Page SEO: every indexable published page has a title and description");
  }

  checkSlugHistory("Products", products as LeanRecord[]);
  checkSlugHistory("Categories", categories as LeanRecord[]);
  checkSlugHistory("Pages", pages as LeanRecord[], RESERVED_PAGE_SLUGS);

  const sitemapSource = {
    products: serializedProducts
      .filter((product) => !product.noindex)
      .map((product) => ({
        slug: product.slug,
        updatedAt: product.updatedAt,
        images: product.images.map((image) => image.src),
      })),
    categories: categories
      .filter((category) => category.noindex !== true)
      .map((category) => ({
        slug: String(category.slug),
        updatedAt: (category.updatedAt as Date | null | undefined) ?? null,
        images: category.image ? [String(category.image)] : [],
      })),
    pages: pages
      .filter((page) => page.noindex !== true)
      .map((page) => ({
        slug: String(page.slug),
        updatedAt: (page.updatedAt as Date | null | undefined) ?? null,
        images: [],
      })),
  };
  const sitemapEntries = buildSitemapEntries(sitemapSource, siteUrl);
  const expectedSitemapMinimum = 1 + sitemapSource.categories.length + sitemapSource.products.length;
  check(
    sitemapEntries.length >= expectedSitemapMinimum,
    `Sitemap: ${sitemapEntries.length} URLs generated from the database`,
    `expected at least ${expectedSitemapMinimum}`,
  );
  check(
    sitemapEntries[0]?.url === `${siteUrl}/`,
    "Sitemap: the home page is the first entry",
  );
  const duplicateSitemapUrls = sitemapEntries.filter(
    (entry, index) => sitemapEntries.findIndex((candidate) => candidate.url === entry.url) !== index,
  );
  check(
    duplicateSitemapUrls.length === 0,
    "Sitemap: every URL appears once",
    duplicateSitemapUrls.map((entry) => entry.url).join(", "),
  );
  const missingSitemapDates = sitemapEntries.filter(
    (entry) => Number.isNaN(Date.parse(entry.lastModified)),
  );
  check(
    missingSitemapDates.length === 0,
    "Sitemap: every entry has a valid lastModified value",
  );

  const robots = buildRobots(seo, siteUrl);
  const robotRules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  const wildcardRule = robotRules.find((rule) => rule.userAgent === "*");
  const wildcardDisallow = Array.isArray(wildcardRule?.disallow)
    ? wildcardRule.disallow
    : [wildcardRule?.disallow ?? ""];
  check(
    ROBOTS_DISALLOW.every((path) => wildcardDisallow.includes(path)),
    "robots.txt: private routes are disallowed",
  );
  if (seo.sitemapEnabled) {
    check(Boolean(robots.sitemap), "robots.txt: sitemap reference is present");
  } else {
    warn("robots.txt: sitemap publishing is disabled in SEO settings");
  }
  if (!seo.indexable) {
    warn("robots.txt: site-wide indexing is disabled; every crawler is blocked");
  } else {
    pass("robots.txt: site-wide indexing is enabled");
  }
  for (const training of [
    "GPTBot",
    "ClaudeBot",
    "Google-Extended",
    "CCBot",
    "Applebot-Extended",
  ]) {
    const rule = robotRules.find((entry) => entry.userAgent === training);
    const disallowed = Array.isArray(rule?.disallow) ? rule.disallow.join(",") : rule?.disallow;
    check(
      disallowed === "/",
      `robots.txt: ${training} is disallowed by default`,
    );
  }

  if (!seo.googleSiteVerification) {
    warn("Google Search Console verification code is empty");
  } else {
    pass("Google Search Console verification code is configured");
  }
  if (!seo.bingSiteVerification) {
    warn("Bing Webmaster verification code is empty");
  } else {
    pass("Bing Webmaster verification code is configured");
  }
  if (!seo.geoLatitude || !seo.geoLongitude) {
    warn("Store geo coordinates are incomplete; Store markup omits geo");
  } else {
    pass("Store geo coordinates are configured");
  }
  if (!settings.get("contact")) {
    warn("Contact settings have not been saved; ContactPage markup uses defaults");
  }

  if (process.env.SEO_CHECK_HTTP === "1") {
    console.log("\nHTTP availability checks\n");
    for (const path of [
      "/robots.txt",
      "/sitemap.xml",
      "/llms.txt",
      "/feeds/google-merchant.xml",
      "/feeds/google-merchant.tsv",
    ]) {
      try {
        const response = await fetch(new URL(path, siteUrl), {
          signal: AbortSignal.timeout(10_000),
        });
        const body = await response.text();
        check(
          response.ok && body.trim().length > 0,
          `${path} responds with ${response.status} and a non-empty body`,
          response.statusText,
        );
      } catch (error) {
        fail(`${path} is not reachable: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
  } else {
    console.log("\nHTTP checks skipped. Set SEO_CHECK_HTTP=1 with a running server to verify the routes.\n");
  }

  console.log(
    `\nSummary: ${report.passed} passed, ${report.warnings} warnings, ${report.failures} failures`,
  );
  if (report.failures) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error("SEO check failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
