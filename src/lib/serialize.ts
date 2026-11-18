import type { Types } from "mongoose";
import type { Category } from "@/types";
import type { CategoryDocument } from "@/models/Category";
import type { ProductDocument } from "@/models/Product";
import type { ReviewDocument } from "@/models/Review";
import type { Product, ProductImage, Review } from "@/types";

type LeanCategory = CategoryDocument & { _id: Types.ObjectId };

type LeanProduct = Omit<ProductDocument, "category" | "relatedProductIds"> & {
  _id: Types.ObjectId;
  category: LeanCategory;
  relatedProductIds?: Types.ObjectId[];
};

type LeanReview = ReviewDocument & { _id: Types.ObjectId };

export function serializeCategory(category: LeanCategory, productCount?: number): Category {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    slugHistory: category.slugHistory ?? [],
    description: category.description,
    image: category.image,
    bannerImage: category.bannerImage || category.image,
    showOnHome: category.showOnHome ?? false,
    order: category.order ?? 0,
    active: category.active ?? true,
    seoTitle: category.seoTitle ?? "",
    seoDescription: category.seoDescription ?? "",
    noindex: category.noindex ?? false,
    googleProductCategory: category.googleProductCategory ?? "",
    updatedAt: (category.updatedAt ?? new Date()).toISOString(),
    ...(typeof productCount === "number" ? { productCount } : {}),
  };
}

export function serializeProduct(product: LeanProduct): Product {
  const category = product.category;
  const images = normalizeImages(product);
  const stock = product.stock ?? 0;
  const ratingAverage = product.ratingAverage ?? product.rating ?? 5;
  const ratingCount = product.ratingCount ?? product.reviewCount ?? 0;

  return {
    id: product._id.toString(),
    name: product.name,
    pageTitle: product.pageTitle || product.name,
    slug: product.slug,
    slugHistory: product.slugHistory ?? [],
    publishStatus: product.publishStatus ?? "active",
    tags: product.tags ?? [],
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    noindex: product.noindex ?? false,
    brand: product.brand ?? "",
    gtin: product.gtin ?? "",
    mpn: product.mpn ?? "",
    lowStockThreshold: product.lowStockThreshold ?? null,
    description: product.description,
    shortDescription: product.shortDescription,
    price: product.price,
    priceMax: product.priceMax ?? null,
    image: product.image,
    gallery: product.gallery?.length ? product.gallery : [product.image],
    category: category
      ? {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
          googleProductCategory: category.googleProductCategory ?? "",
        }
      : { id: "", name: "Solar", slug: "solar-panels", googleProductCategory: "" },
    badge: product.badge ?? null,
    rating: ratingAverage,
    reviewCount: ratingCount,
    ratingAverage,
    ratingCount,
    stock,
    status: product.status ?? (stock <= 0 ? "out_of_stock" : stock <= 5 ? "low_stock" : "in_stock"),
    compareAtPrice: product.compareAtPrice ?? null,
    images,
    options: {
      colors: product.options?.colors ?? [],
      sizes: product.options?.sizes ?? [],
    },
    variants: (product.variants ?? []).map((variant) => ({
      sku: variant.sku,
      color: variant.color ?? null,
      size: variant.size ?? null,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      stock: variant.stock,
      isDefault: variant.isDefault ?? false,
    })),
    detailsIntro: product.detailsIntro || product.description,
    features: product.features ?? [],
    detailBanner: product.detailBanner ?? null,
    shippingReturns: product.shippingReturns || "",
    sizeGuide: product.sizeGuide ?? null,
    relatedProductIds: (product.relatedProductIds ?? []).map((id) => id.toString()),
    cardTitle: product.cardTitle ?? null,
    cardSubtitle: product.cardSubtitle ?? null,
    specs: product.specs ?? [],
    highlights: product.highlights ?? [],
    featuredOrder: product.featuredOrder ?? null,
    bestSellerOrder: product.bestSellerOrder ?? null,
    updatedAt: (product.updatedAt ?? new Date()).toISOString(),
  };
}

export function serializeReview(review: LeanReview): Review {
  return {
    id: review._id.toString(),
    productId: review.productId.toString(),
    author: review.author,
    rating: review.rating,
    title: review.title,
    body: review.body,
    reply: review.reply || null,
    createdAt: (review.createdAt ?? new Date()).toISOString(),
  };
}

function normalizeImages(product: LeanProduct): ProductImage[] {
  if (product.images?.length) {
    return product.images.map((image) => ({
      src: image.src,
      thumbSrc: image.thumbSrc ?? null,
      alt: image.alt || product.name,
    }));
  }

  const gallery = product.gallery?.length ? product.gallery : [product.image];
  return gallery.map((src, index) => ({
    src,
    thumbSrc: src,
    alt: `${product.name}${index ? ` view ${index + 1}` : ""}`,
  }));
}
