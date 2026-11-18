"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { isValidObjectId, Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, type CategoryDocument } from "@/models/Category";
import { Product, type ProductDocument } from "@/models/Product";
import { Review } from "@/models/Review";
import { SiteContent } from "@/models/SiteContent";
import { Campaign } from "@/models/Campaign";
import { Page } from "@/models/Page";
import { serializeCategory, serializeProduct, serializeReview } from "@/lib/serialize";
import { normalizeSiteContent } from "@/lib/site-defaults";
import {
  getEffectivePrice,
  quoteForVariants,
  type PricingCampaign,
  type PricingContext,
} from "@/lib/pricing";
import type {
  Category as CategoryType,
  HeroProduct as HeroProductType,
  Product as ProductType,
  Review as ReviewType,
  ReviewSummary,
  SiteContentData,
  StorePage,
} from "@/types";

const HOME_PRODUCT_LIMIT = 6;
const HERO_SIDE_PRODUCT_LIMIT = 6;
const PUBLIC_PRODUCT: QueryFilter<ProductDocument> = {
  publishStatus: { $nin: ["draft", "archived"] },
};
const PUBLIC_CATEGORY: QueryFilter<CategoryDocument> = { active: { $ne: false } };

export type StorefrontCampaign = {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  discountType: "percent" | "fixed";
  value: number;
  storefront: {
    saleEnabled: boolean;
    saleHeading: string;
    saleText: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    promoEnabled: boolean;
    promoEyebrow: string;
    promoTitle: string;
    promoDiscountText: string;
    promoImage: string;
    promoHref: string;
    bannerEnabled: boolean;
    bannerEyebrow: string;
    bannerTitle: string;
    bannerSubtitle: string;
    bannerImage: string;
    bannerCtaLabel: string;
    bannerCtaHref: string;
    countdownEnabled: boolean;
  };
};

export async function getSiteContent(): Promise<SiteContentData> {
  cacheLife("minutes");
  cacheTag("site-content", "homepage");

  await connectToDatabase();
  const document = await SiteContent.findOne({ key: "home" }).lean();
  return normalizeSiteContent(document?.content);
}

export async function getPricingCampaigns(): Promise<PricingCampaign[]> {
  cacheLife("minutes");
  cacheTag("campaigns");

  await connectToDatabase();
  const now = new Date();
  const campaigns = await Campaign.find({
    active: true,
    endedAt: null,
    pausedAt: null,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  })
    .sort({ priority: -1, discountType: 1, value: -1 })
    .lean();

  return campaigns.map((campaign) => ({
    id: campaign._id.toString(),
    name: campaign.name,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    discountType: campaign.discountType,
    value: campaign.value,
    scope: campaign.scope,
    categoryIds: campaign.categoryIds.map(String),
    productIds: campaign.productIds.map(String),
    excludedProductIds: campaign.excludedProductIds.map(String),
    priority: campaign.priority,
    stackWithCoupons: campaign.stackWithCoupons,
    active: campaign.active,
    pausedAt: campaign.pausedAt,
    endedAt: campaign.endedAt,
  }));
}

export async function getActiveCampaignDisplay(): Promise<StorefrontCampaign | null> {
  cacheLife("minutes");
  cacheTag("campaigns");

  await connectToDatabase();
  const now = new Date();
  const campaign = await Campaign.findOne({
    active: true,
    endedAt: null,
    pausedAt: null,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  if (!campaign) return null;

  return {
    id: campaign._id.toString(),
    name: campaign.name,
    slug: campaign.slug,
    startsAt: campaign.startsAt.toISOString(),
    endsAt: campaign.endsAt.toISOString(),
    discountType: campaign.discountType,
    value: campaign.value,
    storefront: campaign.storefront,
  };
}

export async function getHomeCategories(): Promise<CategoryType[]> {
  cacheLife("minutes");
  cacheTag("categories");

  await connectToDatabase();
  const [categories, counts] = await Promise.all([
    Category.find({ ...PUBLIC_CATEGORY, showOnHome: true }).sort({ order: 1 }).lean(),
    publicProductCounts(),
  ]);

  const countByCategory = new Map(counts.map((row) => [String(row._id), row.count]));

  return categories.map((category) =>
    serializeCategory(category, countByCategory.get(category._id.toString()) ?? 0),
  );
}

export async function getAllCategories(): Promise<CategoryType[]> {
  cacheLife("minutes");
  cacheTag("categories");

  await connectToDatabase();
  const [categories, counts] = await Promise.all([
    Category.find(PUBLIC_CATEGORY).sort({ order: 1 }).lean(),
    publicProductCounts(),
  ]);

  const countByCategory = new Map(counts.map((row) => [String(row._id), row.count]));

  return categories.map((category) =>
    serializeCategory(category, countByCategory.get(category._id.toString()) ?? 0),
  );
}

export async function getInStockCategories(): Promise<CategoryType[]> {
  cacheLife("minutes");
  cacheTag("categories");

  await connectToDatabase();
  const [categories, counts] = await Promise.all([
    Category.find(PUBLIC_CATEGORY).sort({ order: 1 }).lean(),
    publicInStockProductCounts(),
  ]);

  const countByCategory = new Map(counts.map((row) => [String(row._id), row.count]));

  return categories
    .map((category) => serializeCategory(category, countByCategory.get(category._id.toString()) ?? 0))
    .filter((category) => (countByCategory.get(category.id) ?? 0) > 0);
}

export async function getCategoryBySlug(slug: string): Promise<CategoryType | null> {
  cacheLife("minutes");
  cacheTag("categories", `category-${slug}`);

  await connectToDatabase();
  const category = await Category.findOne({ slug, ...PUBLIC_CATEGORY }).lean();
  if (!category) return null;

  const count = await Product.countDocuments({ category: category._id, ...PUBLIC_PRODUCT });
  return serializeCategory(category, count);
}

export async function getBestSellingProducts(productIds: string[] = []): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const manualIds = productIds.filter(isValidObjectId);

  const products = manualIds.length
    ? await Product.find({ _id: { $in: manualIds }, ...PUBLIC_PRODUCT })
        .populate("category")
        .lean()
    : await Product.find({ ...PUBLIC_PRODUCT, bestSellerOrder: { $ne: null } })
        .sort({ bestSellerOrder: 1 })
        .limit(HOME_PRODUCT_LIMIT)
        .populate("category")
        .lean();

  const ordered = manualIds.length
    ? manualIds
        .map((id) => products.find((product) => product._id.toString() === id))
        .filter((product): product is NonNullable<typeof product> => Boolean(product))
    : products;

  return ordered
    .slice(0, HOME_PRODUCT_LIMIT)
    .map((product) => withPricing(serializeProduct(product as never), context));
}

export async function getFeaturedProducts(productIds: string[] = []): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const manualIds = productIds.filter(isValidObjectId);

  const products = manualIds.length
    ? await Product.find({ _id: { $in: manualIds }, ...PUBLIC_PRODUCT })
        .populate("category")
        .lean()
    : await Product.find({ ...PUBLIC_PRODUCT, featuredOrder: { $ne: null } })
        .sort({ featuredOrder: 1 })
        .limit(HOME_PRODUCT_LIMIT)
        .populate("category")
        .lean();

  const ordered = manualIds.length
    ? manualIds
        .map((id) => products.find((product) => product._id.toString() === id))
        .filter((product): product is NonNullable<typeof product> => Boolean(product))
    : products;

  return ordered
    .slice(0, HOME_PRODUCT_LIMIT)
    .map((product) => withPricing(serializeProduct(product as never), context));
}

export async function getInStockProducts(
  limit = HOME_PRODUCT_LIMIT,
  page = 1,
): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const products = await Product.find({ ...PUBLIC_PRODUCT, stock: { $gt: 0 } })
    .sort({ stock: -1, bestSellerOrder: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("category")
    .lean();

  return products.map((product) => withPricing(serializeProduct(product as never), context));
}

export async function getInStockAllProducts(): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const products = await Product.find({ ...PUBLIC_PRODUCT, stock: { $gt: 0 } })
    .sort({ stock: -1, bestSellerOrder: 1 })
    .populate("category")
    .lean();

  return products.map((product) => withPricing(serializeProduct(product as never), context));
}

export async function getHeroProductsByCategory(): Promise<Record<string, HeroProductType[]>> {
  cacheLife("minutes");
  cacheTag("products", "categories");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const products = await Product.find(PUBLIC_PRODUCT)
    .sort({ createdAt: -1 })
    .populate("category")
    .lean();

  const grouped: Record<string, HeroProductType[]> = {};

  for (const product of products) {
    const serialized = withPricing(serializeProduct(product as never), context);
    const categoryId = serialized.category.id;
    if (!categoryId) continue;

    const group = (grouped[categoryId] ??= []);
    if (group.length >= HERO_SIDE_PRODUCT_LIMIT) continue;

    const price = serialized.pricing?.effectivePrice ?? serialized.price;
    const compareAtPrice =
      serialized.pricing && serialized.pricing.discountPercent > 0
        ? serialized.pricing.originalPrice
        : serialized.compareAtPrice ?? null;

    group.push({
      id: serialized.id,
      name: serialized.cardTitle || serialized.name,
      slug: serialized.slug,
      image: serialized.image,
      price,
      compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : null,
    });
  }

  return grouped;
}

export async function getProductBySlug(slug: string): Promise<ProductType | null> {
  cacheLife("minutes");
  cacheTag("products", `product-${slug}`);

  await connectToDatabase();
  const product = await Product.findOne({ slug, ...PUBLIC_PRODUCT }).populate("category").lean();
  if (!product) return null;
  const context = await storefrontPricingContext();
  return withPricing(serializeProduct(product as never), context);
}

export async function getProductById(id: string): Promise<ProductType | null> {
  if (!isValidObjectId(id)) return null;

  cacheLife("minutes");
  cacheTag("products", `product-${id}`);

  await connectToDatabase();
  const product = await Product.findOne({ _id: id, ...PUBLIC_PRODUCT }).populate("category").lean();
  if (!product) return null;
  const context = await storefrontPricingContext();
  return withPricing(serializeProduct(product as never), context);
}

export async function getProductBySlugOrId(value: string): Promise<ProductType | null> {
  if (isValidObjectId(value)) {
    return getProductById(value);
  }
  return getProductBySlug(value);
}

export async function getProductRedirect(slug: string): Promise<string | null> {
  cacheLife("minutes");
  cacheTag("products");

  await connectToDatabase();
  const product = await Product.findOne({ slugHistory: slug, ...PUBLIC_PRODUCT })
    .select("slug")
    .lean();
  return product?.slug ?? null;
}

export async function getCategoryRedirect(slug: string): Promise<string | null> {
  cacheLife("minutes");
  cacheTag("categories");

  await connectToDatabase();
  const category = await Category.findOne({ slugHistory: slug, ...PUBLIC_CATEGORY })
    .select("slug")
    .lean();
  return category?.slug ?? null;
}

export async function getPageRedirect(slug: string): Promise<string | null> {
  cacheLife("minutes");
  cacheTag("pages");

  await connectToDatabase();
  const page = await Page.findOne({ slugHistory: slug, status: "published" })
    .select("slug")
    .lean();
  return page?.slug ?? null;
}

export async function getRelatedProducts(
  productId: string,
  categorySlug: string,
  relatedIds: string[],
): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products", `related-${productId}`);

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const byId = new Map<string, ProductType>();

  if (relatedIds.length) {
    const products = await Product.find({ _id: { $in: relatedIds }, ...PUBLIC_PRODUCT })
      .populate("category")
      .lean();
    for (const product of products) {
      const serialized = withPricing(serializeProduct(product as never), context);
      byId.set(serialized.id, serialized);
    }
  }

  if (byId.size < 4) {
    const category = await Category.findOne({ slug: categorySlug }).select("_id").lean();
    if (category) {
      const fill = await Product.find({
        category: category._id,
        _id: { $ne: productId },
        ...PUBLIC_PRODUCT,
      })
        .sort({ createdAt: 1 })
        .limit(8)
        .populate("category")
        .lean();

      for (const product of fill) {
        const serialized = withPricing(serializeProduct(product as never), context);
        if (serialized.id !== productId && !byId.has(serialized.id)) {
          byId.set(serialized.id, serialized);
        }
        if (byId.size >= 4) break;
      }
    }
  }

  const ordered = relatedIds.map((id) => byId.get(id)).filter(Boolean) as ProductType[];
  const orderedIds = new Set(ordered.map((product) => product.id));
  const fallback = Array.from(byId.values()).filter((product) => !orderedIds.has(product.id));

  return [...ordered, ...fallback].slice(0, 4);
}

export async function getProductReviews(
  productId: string,
  page = 1,
  limit = 6,
): Promise<{ items: ReviewType[]; total: number; page: number; limit: number }> {
  cacheLife("minutes");
  cacheTag("reviews", `reviews-${productId}`);

  await connectToDatabase();
  if (!isValidObjectId(productId)) {
    return { items: [], total: 0, page, limit };
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 50);
  const [reviews, total] = await Promise.all([
    Review.find({ productId, status: "approved" })
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Review.countDocuments({ productId, status: "approved" }),
  ]);

  return {
    items: reviews.map((review) => serializeReview(review as never)),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

export async function getProductReviewSummary(productId: string): Promise<ReviewSummary> {
  cacheLife("minutes");
  cacheTag("reviews", `reviews-${productId}`);

  await connectToDatabase();
  if (!isValidObjectId(productId)) return { count: 0, average: 0 };

  const [summary] = await Review.aggregate<{ count: number; average: number }>([
    { $match: { productId: new Types.ObjectId(productId), status: "approved" } },
    { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } },
  ]);

  return {
    count: summary?.count ?? 0,
    average: summary?.average ?? 0,
  };
}

export async function getProductsByCategorySlug(slug: string): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products", `category-${slug}`);

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const category = await Category.findOne({ slug, ...PUBLIC_CATEGORY }).select("_id").lean();
  if (!category) return [];

  const products = await Product.find({ category: category._id, ...PUBLIC_PRODUCT })
    .sort({ createdAt: 1 })
    .populate("category")
    .lean();

  return products.map((product) => withPricing(serializeProduct(product as never), context));
}

export async function searchProducts(query: string): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const trimmed = query.trim();
  const matchingCategories = trimmed
    ? await Category.find({
        ...PUBLIC_CATEGORY,
        name: { $regex: escapeRegex(trimmed), $options: "i" },
      })
        .select("_id")
        .lean()
    : [];

  const searchConditions: QueryFilter<ProductDocument>[] = trimmed
    ? [
        { name: { $regex: escapeRegex(trimmed), $options: "i" } },
        { description: { $regex: escapeRegex(trimmed), $options: "i" } },
        { shortDescription: { $regex: escapeRegex(trimmed), $options: "i" } },
        { tags: { $regex: escapeRegex(trimmed), $options: "i" } },
      ]
    : [];

  if (matchingCategories.length) {
    searchConditions.push({
      category: { $in: matchingCategories.map((category) => category._id) },
    });
  }

  const filter: QueryFilter<ProductDocument> = trimmed
    ? { $and: [PUBLIC_PRODUCT, { $or: searchConditions }] }
    : PUBLIC_PRODUCT;

  const products = await Product.find(filter)
    .sort({ bestSellerOrder: 1, name: 1 })
    .limit(48)
    .populate("category")
    .lean();

  return products.map((product) => withPricing(serializeProduct(product as never), context));
}

export async function getProductSlugs(): Promise<string[]> {
  cacheLife("minutes");
  cacheTag("products");

  await connectToDatabase();
  const products = await Product.find(PUBLIC_PRODUCT).select("slug").lean();
  return products.map((product) => product.slug);
}

export async function getCategorySlugs(): Promise<string[]> {
  cacheLife("minutes");
  cacheTag("categories");

  await connectToDatabase();
  const categories = await Category.find(PUBLIC_CATEGORY).select("slug").lean();
  return categories.map((category) => category.slug);
}

export async function getPublishedPage(slug: string): Promise<StorePage | null> {
  cacheLife("minutes");
  cacheTag("pages", `page-${slug}`);

  await connectToDatabase();
  const page = await Page.findOne({ slug, status: "published" }).lean();
  if (!page) return null;
  return {
    id: page._id.toString(),
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt,
    content: page.content,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    noindex: page.noindex ?? false,
    faqs: (page.faqs ?? []).map((faq) => ({ question: faq.question, answer: faq.answer })),
    updatedAt: (page.updatedAt ?? new Date()).toISOString(),
  };
}

export async function getPublishedPages(): Promise<StorePage[]> {
  cacheLife("minutes");
  cacheTag("pages");

  await connectToDatabase();
  const pages = await Page.find({ status: "published" }).sort({ order: 1, title: 1 }).lean();
  return pages.map((page) => ({
    id: page._id.toString(),
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt,
    content: page.content,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    noindex: page.noindex ?? false,
    faqs: (page.faqs ?? []).map((faq) => ({ question: faq.question, answer: faq.answer })),
    updatedAt: (page.updatedAt ?? new Date()).toISOString(),
  }));
}

export async function getPublishedPageSlugs(): Promise<string[]> {
  cacheLife("minutes");
  cacheTag("pages");

  await connectToDatabase();
  const pages = await Page.find({ status: "published" }).select("slug").lean();
  return pages.map((page) => page.slug);
}

export async function getSitemapEntries() {
  cacheLife("minutes");
  cacheTag("products", "categories", "pages", "campaigns");

  await connectToDatabase();
  const now = new Date();
  const [products, categories, pages, campaigns] = await Promise.all([
    Product.find({ ...PUBLIC_PRODUCT, noindex: { $ne: true } })
      .select("slug updatedAt image gallery images category")
      .lean(),
    Category.find({ ...PUBLIC_CATEGORY, noindex: { $ne: true } })
      .select("slug updatedAt image")
      .lean(),
    Page.find({ status: "published", noindex: { $ne: true } })
      .select("slug updatedAt")
      .lean(),
    Campaign.find({
      active: true,
      endedAt: null,
      pausedAt: null,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .select("scope categoryIds productIds excludedProductIds updatedAt")
      .lean(),
  ]);

  const productEntries = products.map((product) => {
    let lastModified = product.updatedAt ?? null;
    const productId = String(product._id);
    const categoryId = String(product.category);

    for (const campaign of campaigns) {
      if (!campaign.updatedAt) continue;
      const excluded = campaign.excludedProductIds.map(String).includes(productId);
      const applies = !excluded && (
        campaign.scope === "store" ||
        (campaign.scope === "products" && campaign.productIds.map(String).includes(productId)) ||
        (campaign.scope === "categories" && campaign.categoryIds.map(String).includes(categoryId))
      );
      if (!applies) continue;
      if (!lastModified || campaign.updatedAt > lastModified) {
        lastModified = campaign.updatedAt;
      }
    }

    const images = product.images?.length
      ? product.images.map((image) => image.src)
      : product.gallery?.length
        ? product.gallery
        : [product.image];

    return { slug: product.slug, updatedAt: lastModified, images };
  });

  const staticPages = [
    { slug: "contact", updatedAt: null as Date | null, images: [] as string[] },
    { slug: "privacy-policy", updatedAt: null as Date | null, images: [] as string[] },
    { slug: "terms-and-conditions", updatedAt: null as Date | null, images: [] as string[] },
  ];

  return {
    products: productEntries,
    categories: categories.map((category) => ({
      slug: category.slug,
      updatedAt: category.updatedAt ?? null,
      images: category.image ? [category.image] : [],
    })),
    pages: [
      ...pages.map((page) => ({
        slug: page.slug,
        updatedAt: page.updatedAt ?? null,
        images: [],
      })),
      ...staticPages,
    ],
  };
}

export async function getMerchantFeedProducts(): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products", "categories", "campaigns");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const products = await Product.find(PUBLIC_PRODUCT)
    .sort({ createdAt: 1 })
    .populate("category")
    .lean();

  return products.map((product) => withPricing(serializeProduct(product as never), context));
}

export async function getBestSellerRanking(limit = 10): Promise<ProductType[]> {
  cacheLife("minutes");
  cacheTag("products", "campaigns");

  await connectToDatabase();
  const context = await storefrontPricingContext();
  const products = await Product.find(PUBLIC_PRODUCT)
    .sort({ bestSellerOrder: 1, createdAt: 1 })
    .limit(limit)
    .populate("category")
    .lean();

  return products.map((product) => withPricing(serializeProduct(product as never), context));
}

async function publicProductCounts() {
  return Product.aggregate<{ _id: unknown; count: number }>([
    { $match: PUBLIC_PRODUCT },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
}

async function publicInStockProductCounts() {
  return Product.aggregate<{ _id: unknown; count: number }>([
    { $match: { ...PUBLIC_PRODUCT, stock: { $gt: 0 } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
}

async function storefrontPricingContext(): Promise<PricingContext> {
  const campaigns = await getPricingCampaigns();
  return { campaigns, now: new Date(), couponApplied: false };
}

function withPricing(product: ProductType, context: PricingContext): ProductType {
  const base = {
    id: product.id,
    price: product.price,
    categoryId: product.category.id || null,
  };
  const pricing = getEffectivePrice(base, null, context);
  const variantPricing = quoteForVariants(
    base,
    product.variants.map((variant) => ({
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
    })),
    context,
  );
  return { ...product, pricing, variantPricing };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
