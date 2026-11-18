import type { Product, Review } from "@/types";
import type { StoreIdentity } from "@/lib/jsonld/store";

export const store: StoreIdentity = {
  name: "Solar Home System & Electronic",
  legalName: "Solar Home System & Electronic Ltd",
  url: "https://shop.example",
  logo: "https://shop.example/images/logo.png",
  image: "https://shop.example/images/og.jpg",
  currency: "USD",
  telephone: "+250 783 110 111",
  whatsappNumber: "+250783110111",
  email: "info@shop.example",
  address: "123 Renewable Energy Way, Kigali, RW",
  geo: { latitude: -1.9441, longitude: 30.0619 },
  openingHours: "Mo-Sa 08:00-18:00",
  sameAs: ["https://facebook.com/shop"],
};

export function productFixture(overrides: Partial<Product> = {}): Product {
  const base: Product = {
    id: "64b7f0c2f1a2b3c4d5e6f701",
    name: "Monocrystalline Solar Panel",
    pageTitle: "Monocrystalline Solar Panel",
    slug: "monocrystalline-solar-panel",
    slugHistory: [],
    publishStatus: "active",
    tags: ["solar"],
    seoTitle: "",
    seoDescription: "",
    noindex: false,
    brand: "SunPower",
    gtin: "0123456789012",
    mpn: "SP-450",
    lowStockThreshold: null,
    description: "<p>A reliable panel for home systems.</p>",
    shortDescription: "A reliable panel for home systems.",
    price: 229,
    priceMax: null,
    image: "/images/products/panel.jpg",
    gallery: ["/images/products/panel.jpg"],
    category: {
      id: "64b7f0c2f1a2b3c4d5e6f702",
      name: "Solar Panels",
      slug: "solar-panels",
      googleProductCategory: "Home & Garden > Lighting",
    },
    badge: null,
    rating: 4.8,
    reviewCount: 2,
    ratingAverage: 4.8,
    ratingCount: 2,
    stock: 12,
    status: "in_stock",
    compareAtPrice: null,
    images: [{ src: "/images/products/panel.jpg", alt: "Solar panel" }],
    options: { colors: [], sizes: [] },
    variants: [
      {
        sku: "SP-450",
        color: null,
        size: null,
        price: 229,
        compareAtPrice: null,
        stock: 12,
        isDefault: true,
      },
    ],
    detailsIntro: "",
    features: [],
    detailBanner: null,
    shippingReturns: "",
    sizeGuide: null,
    relatedProductIds: [],
    cardTitle: null,
    cardSubtitle: null,
    specs: [],
    highlights: [],
    featuredOrder: null,
    bestSellerOrder: null,
    pricing: {
      originalPrice: 229,
      effectivePrice: 229,
      discountPercent: 0,
      campaignId: null,
      campaignName: null,
      campaignStartsAt: null,
      campaignEndsAt: null,
    },
    variantPricing: {
      "SP-450": {
        originalPrice: 229,
        effectivePrice: 229,
        discountPercent: 0,
        campaignId: null,
        campaignName: null,
        campaignStartsAt: null,
        campaignEndsAt: null,
      },
    },
    updatedAt: "2026-11-18T08:00:00.000Z",
  };

  return { ...base, ...overrides };
}

export const reviewFixture: Review = {
  id: "64b7f0c2f1a2b3c4d5e6f703",
  productId: "64b7f0c2f1a2b3c4d5e6f701",
  author: "Aline",
  rating: 5,
  title: "Works well",
  body: "Installed without problems.",
  reply: null,
  createdAt: "2026-10-02T09:00:00.000Z",
};

export const shippingZones = [
  { district: "Kigali", rate: 0, eta: "1-2 business days" },
  { district: "Northern Province", rate: 8, eta: "2-4 business days" },
];
