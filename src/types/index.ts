export type ProductBadge = "top" | "sale";
export type ProductStatus = "in_stock" | "low_stock" | "out_of_stock";
export type PublishStatus = "draft" | "active" | "archived";

export type PriceQuote = {
  originalPrice: number;
  effectivePrice: number;
  discountPercent: number;
  campaignId?: string | null;
  campaignName?: string | null;
  campaignEndsAt?: string | null;
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type ProductImage = {
  src: string;
  thumbSrc?: string | null;
  alt: string;
};

export type ProductColorOption = {
  value: string;
  label: string;
  hex: string;
};

export type ProductSizeOption = {
  value: string;
  label: string;
};

export type ProductVariant = {
  sku: string;
  color?: string | null;
  size?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  isDefault?: boolean;
};

export type ProductFeature = {
  icon: string;
  label: string;
};

export type ProductDetailBanner = {
  image: string;
  icon: string;
  lines: string[];
};

export type ProductSizeGuide = {
  title: string;
  intro: string;
  rows: Array<{ label: string; value: string }>;
};

export type TrustBadge = {
  icon: string;
  title: string;
  subtitle: string;
};

export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  reply?: string | null;
  createdAt: string;
};

export type ReviewSummary = {
  count: number;
  average: number;
};

export type Product = {
  id: string;
  name: string;
  pageTitle: string;
  slug: string;
  publishStatus: PublishStatus;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  lowStockThreshold?: number | null;
  description: string;
  shortDescription: string;
  price: number;
  priceMax?: number | null;
  image: string;
  gallery: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  badge?: ProductBadge | null;
  rating: number;
  reviewCount: number;
  ratingAverage: number;
  ratingCount: number;
  stock: number;
  status: ProductStatus;
  compareAtPrice?: number | null;
  images: ProductImage[];
  options: {
    colors: ProductColorOption[];
    sizes: ProductSizeOption[];
  };
  variants: ProductVariant[];
  detailsIntro: string;
  features: ProductFeature[];
  detailBanner?: ProductDetailBanner | null;
  shippingReturns: string;
  sizeGuide?: ProductSizeGuide | null;
  relatedProductIds: string[];
  cardTitle?: string | null;
  cardSubtitle?: string | null;
  specs: ProductSpec[];
  highlights: string[];
  featuredOrder?: number | null;
  bestSellerOrder?: number | null;
  pricing?: PriceQuote;
  variantPricing?: Record<string, PriceQuote>;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  bannerImage: string;
  showOnHome: boolean;
  order: number;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
  productCount?: number;
};

export type HeroProduct = {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice?: number | null;
};

export type NavChild = {
  label: string;
  href: string;
};

export type NavLink = {
  label: string;
  href: string;
  children?: NavChild[];
};

export type CtaLink = {
  label: string;
  href: string;
};

export type SocialLink = {
  label: string;
  href: string;
  platform: "facebook" | "instagram" | "twitter" | "linkedin" | "youtube";
};

export type FooterColumn = {
  title: string;
  links: NavChild[];
};

export type ClientLogo = {
  name: string;
  image: string;
  href: string;
};

export type SiteContentData = {
  meta: {
    title: string;
    description: string;
  };
  header: {
    storeName: string;
    logo: string;
    logoLight: string;
    currency: string;
    currencies: string[];
    language: string;
    languages: string[];
    searchEnabled: boolean;
    searchPlaceholder: string;
    accountLabel: string;
    wishlistLabel: string;
    cartLabel: string;
    nav: NavLink[];
  };
  hero: {
    eyebrow: string;
    titleStrong: string;
    titleLight: string;
    subtitle: string;
    cta: CtaLink;
    image: string;
    imageAlt: string;
    sideImage: string;
    sideImageAlt: string;
    sideEyebrow: string;
    sideTitle: string;
    sideTitleAccent: string;
    sideSubtitle: string;
    socials: SocialLink[];
  };
  sale: {
    title: string;
    description: string;
    buttons: CtaLink[];
    manualOverride: boolean;
    enabled: boolean;
  };
  promos: Array<{
    id: string;
    eyebrow: string;
    title: string;
    discount: string;
    cta: CtaLink;
    image: string;
    tone: "blue" | "pale";
  }>;
  categories: {
    eyebrow: string;
    title: string;
    emptyLabel: string;
  };
  bestSelling: {
    eyebrow: string;
    title: string;
    mode: "manual" | "automatic";
    productIds: string[];
    banner: {
      eyebrow: string;
      title: string;
      titleLight: string;
      cta: CtaLink;
      image: string;
    };
  };
  featured: {
    eyebrow: string;
    title: string;
    mode: "manual" | "automatic";
    productIds: string[];
    banner: {
      eyebrow: string;
      title: string;
      titleLight: string;
      cta: CtaLink;
      image: string;
    };
  };
  meet: {
    title: string;
    navy: {
      discount: string;
      title: string;
      description: string;
      cta: CtaLink;
    };
    newsletter: {
      eyebrow: string;
      title: string;
      description: string;
      placeholder: string;
      button: string;
      success: string;
      error: string;
    };
  };
  clients: {
    title: string;
    logos: ClientLogo[];
  };
  settings: {
    trustBadges: TrustBadge[];
  };
  sectionOrder: Array<
    "hero" | "sale" | "promos" | "categories" | "bestSelling" | "featured" | "inStock" | "meet" | "clients"
  >;
  footer: {
    address: string;
    phone: string;
    email: string;
    socials: SocialLink[];
    columns: FooterColumn[];
    instagram: {
      title: string;
      image: string;
      href: string;
    };
    copyright: string;
  };
};

export type CartLineVariant = {
  sku: string;
  color?: string | null;
  size?: string | null;
};

export type CartLine = {
  key: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  compareAtPrice?: number | null;
  lineTotal: number;
  variant?: CartLineVariant | null;
  stock: number;
  notice?: "stock" | "unavailable" | "price" | null;
};

export type CartCoupon = {
  code: string;
  discount: number;
  freeShipping: boolean;
};

export type CartResponse = {
  items: CartLine[];
  count: number;
  subtotal: number;
  campaignDiscount: number;
  couponDiscount: number;
  shipping: number;
  tax: number;
  total: number;
  freeShipping: boolean;
  shippingPending?: boolean;
  coupon: CartCoupon | null;
  couponError?: string | null;
};

export type WishlistResponse = {
  items: Product[];
  count: number;
};
