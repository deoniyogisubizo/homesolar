import { Schema, model, models, type Model, type Types } from "mongoose";
import type {
  ProductDetailBanner,
  ProductFeature,
  ProductImage,
  ProductSizeGuide,
  ProductStatus,
  ProductVariant,
} from "@/types";

export type ProductDocument = {
  name: string;
  pageTitle?: string | null;
  slug: string;
  publishStatus: "draft" | "active" | "archived";
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  lowStockThreshold?: number | null;
  archivedAt?: Date | null;
  description: string;
  shortDescription: string;
  price: number;
  priceMax?: number | null;
  image: string;
  gallery: string[];
  category: Types.ObjectId;
  badge?: "top" | "sale" | null;
  rating: number;
  reviewCount: number;
  ratingAverage: number;
  ratingCount: number;
  stock: number;
  status: ProductStatus;
  compareAtPrice?: number | null;
  images: ProductImage[];
  options: {
    colors: Array<{ value: string; label: string; hex: string }>;
    sizes: Array<{ value: string; label: string }>;
  };
  variants: ProductVariant[];
  detailsIntro: string;
  features: ProductFeature[];
  detailBanner?: ProductDetailBanner | null;
  shippingReturns: string;
  sizeGuide?: ProductSizeGuide | null;
  relatedProductIds: Types.ObjectId[];
  cardTitle?: string | null;
  cardSubtitle?: string | null;
  specs: Array<{ label: string; value: string }>;
  highlights: string[];
  featuredOrder?: number | null;
  bestSellerOrder?: number | null;
  campaignIds: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

const specSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    src: { type: String, required: true },
    thumbSrc: { type: String, default: null },
    alt: { type: String, required: true },
  },
  { _id: false },
);

const colorOptionSchema = new Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
    hex: { type: String, required: true },
  },
  { _id: false },
);

const sizeOptionSchema = new Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const variantSchema = new Schema(
  {
    sku: { type: String, required: true },
    color: { type: String, default: null },
    size: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const featureSchema = new Schema(
  {
    icon: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const bannerSchema = new Schema(
  {
    image: { type: String, required: true },
    icon: { type: String, required: true },
    lines: { type: [String], default: [] },
  },
  { _id: false },
);

const sizeGuideRowSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const sizeGuideSchema = new Schema(
  {
    title: { type: String, required: true },
    intro: { type: String, required: true },
    rows: { type: [sizeGuideRowSchema], default: [] },
  },
  { _id: false },
);

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    pageTitle: { type: String, default: null, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    publishStatus: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    lowStockThreshold: { type: Number, default: null, min: 0 },
    archivedAt: { type: Date, default: null },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    priceMax: { type: Number, default: null, min: 0 },
    image: { type: String, required: true },
    gallery: { type: [String], default: [] },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    badge: { type: String, enum: ["top", "sale", null], default: null },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    ratingAverage: { type: Number, default: 5, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock",
    },
    compareAtPrice: { type: Number, default: null, min: 0 },
    images: { type: [imageSchema], default: [] },
    options: {
      colors: { type: [colorOptionSchema], default: [] },
      sizes: { type: [sizeOptionSchema], default: [] },
    },
    variants: { type: [variantSchema], default: [] },
    detailsIntro: { type: String, default: "" },
    features: { type: [featureSchema], default: [] },
    detailBanner: { type: bannerSchema, default: null },
    shippingReturns: { type: String, default: "" },
    sizeGuide: { type: sizeGuideSchema, default: null },
    relatedProductIds: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
    cardTitle: { type: String, default: null },
    cardSubtitle: { type: String, default: null },
    specs: { type: [specSchema], default: [] },
    highlights: { type: [String], default: [] },
    featuredOrder: { type: Number, default: null, index: true },
    bestSellerOrder: { type: Number, default: null, index: true },
    campaignIds: { type: [Schema.Types.ObjectId], ref: "Campaign", default: [] },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text", shortDescription: "text", tags: "text" });
productSchema.index({ publishStatus: 1, createdAt: -1 });
productSchema.index({ publishStatus: 1, category: 1, bestSellerOrder: 1 });

export const Product: Model<ProductDocument> =
  models.Product || model<ProductDocument>("Product", productSchema);
