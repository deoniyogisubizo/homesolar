import type { SiteContentData } from "@/types";

export const DEFAULT_SITE_CONTENT: SiteContentData = {
  meta: {
    title: "Solar Home System & Electronic | Clean Energy for Every Home",
    description:
      "Shop solar panels, inverters, batteries, and accessories for a dependable clean-energy home.",
  },
  header: {
    storeName: "Solar Home System & Electronic",
    logo: "/images/brand/logo.png",
    logoLight: "/images/brand/logo-light.png",
    currency: "RWF",
    currencies: ["RWF", "USD", "KES", "TZS", "UGX"],
    language: "ENG",
    languages: ["ENG", "FR", "RW"],
    searchEnabled: true,
    searchPlaceholder: "Search products",
    accountLabel: "Account",
    wishlistLabel: "Wishlist",
    cartLabel: "Cart",
    nav: [
      { label: "Home", href: "/" },
      {
        label: "Categories",
        href: "/category/solar-panels",
        children: [
          { label: "Solar Panels", href: "/category/solar-panels" },
          { label: "Inverters", href: "/category/inverters" },
          { label: "Batteries", href: "/category/batteries" },
        ],
      },
      {
        label: "Products",
        href: "/search",
        children: [
          { label: "Best Selling", href: "/#best-selling" },
          { label: "Featured", href: "/#featured" },
          { label: "All Products", href: "/search" },
        ],
      },
      {
        label: "Pages",
        href: "/about-us",
        children: [
          { label: "About Us", href: "/about-us" },
          { label: "Contact Us", href: "/contact" },
          { label: "FAQs", href: "/faq" },
        ],
      },
    ],
  },
  hero: {
    eyebrow: "BEST SELLERS",
    titleStrong: "Solar Home System",
    titleLight: "for a Brighter Future",
    subtitle: "Clean Energy. Save More.",
    cta: { label: "SHOP NOW", href: "/search" },
    image: "/images/campaign/hero.jpg",
    imageAlt: "Solar panels installed on a home",
    sideImage: "/images/campaign/hero-side.jpg",
    sideImageAlt: "Solar energy solutions",
    sideEyebrow: "NEW COLLECTION",
    sideTitle: "SOLAR ENERGY",
    sideTitleAccent: "SOLUTIONS",
    sideSubtitle: "Power Your Home Sustainably",
    socials: [
      { platform: "facebook", label: "Facebook", href: "https://facebook.com" },
      { platform: "twitter", label: "X", href: "https://x.com" },
      { platform: "instagram", label: "Instagram", href: "https://instagram.com" },
      { platform: "linkedin", label: "LinkedIn", href: "https://linkedin.com" },
      { platform: "youtube", label: "YouTube", href: "https://youtube.com" },
    ],
  },
  sale: {
    title: "End of Summer Sale",
    description: "Seasonal offers on solar products and accessories.",
    buttons: [
      { label: "SHOP SOLAR", href: "/category/solar-panels" },
      { label: "SHOP ACCESSORIES", href: "/category/accessories" },
    ],
    manualOverride: false,
    enabled: true,
  },
  promos: [
    {
      id: "solar-power",
      eyebrow: "THE SMARTER CHOICE",
      title: "SOLAR POWER",
      discount: "SALE UP TO 30% OFF",
      cta: { label: "SHOP NOW", href: "/category/solar-panels" },
      image: "/images/campaign/promo-left.jpg",
      tone: "blue",
    },
    {
      id: "inverters",
      eyebrow: "PREMIUM INVERTERS",
      title: "FOR HOMES & BUSINESS",
      discount: "SALE UP TO 20% OFF",
      cta: { label: "SHOP NOW", href: "/category/inverters" },
      image: "/images/campaign/promo-right.jpg",
      tone: "pale",
    },
  ],
  categories: {
    eyebrow: "Explore",
    title: "Shop by Category",
    emptyLabel: "No categories yet.",
  },
  bestSelling: {
    eyebrow: "Our Products",
    title: "Best Selling",
    mode: "automatic",
    productIds: [],
    banner: {
      eyebrow: "Featured",
      title: "SOLAR PANELS",
      titleLight: "Collection",
      cta: { label: "SHOP NOW", href: "/category/solar-panels" },
      image: "/images/campaign/best-product.jpg",
    },
  },
  featured: {
    eyebrow: "Our Products",
    title: "Featured",
    mode: "automatic",
    productIds: [],
    banner: {
      eyebrow: "Featured",
      title: "SOLAR SYSTEM",
      titleLight: "2021 Collection",
      cta: { label: "SHOP NOW", href: "/category/inverters" },
      image: "/images/campaign/featured-product.jpg",
    },
  },
  meet: {
    title: "Meet Us in Real Life",
    navy: {
      discount: "20% OFF",
      title: "Solar Energy Products",
      description: "Enhance your home with clean energy.",
      cta: { label: "DISCOVER NOW", href: "/search" },
    },
    newsletter: {
      eyebrow: "SUBSCRIBE TO OUR",
      title: "NEWSLETTER",
      description: "Stay updated on the latest solar solutions.",
      placeholder: "Enter your email",
      button: "SUBSCRIBE",
      success: "Thanks for subscribing! Check your inbox for the latest solar offers.",
      error: "Please enter a valid email address.",
    },
  },
  clients: {
    title: "The Best Clients",
    logos: [
      { name: "Solar & Energy", image: "/images/clients/client-1.png", href: "#" },
      { name: "Green Power", image: "/images/clients/client-2.png", href: "#" },
      { name: "EcoSolar", image: "/images/clients/client-3.png", href: "#" },
      { name: "SunTech", image: "/images/clients/client-4.png", href: "#" },
      { name: "SolMax", image: "/images/clients/client-5.png", href: "#" },
      { name: "PowerGreen", image: "/images/clients/client-6.png", href: "#" },
    ],
  },
  settings: {
    trustBadges: [
      { icon: "truck", title: "Free Shipping", subtitle: "On orders over $50" },
      { icon: "shield", title: "Cash on Delivery", subtitle: "Pay at your doorstep" },
      { icon: "headset", title: "24/7 Customer Support", subtitle: "" },
    ],
  },
  sectionOrder: ["hero", "sale", "promos", "categories", "bestSelling", "featured", "inStock", "meet", "clients"],
  footer: {
    address: "123 Renewable Energy Way, Kigali, RW",
    phone: "+250 788 123 456",
    email: "info@solarhometech.rw",
    socials: [
      { platform: "facebook", label: "Facebook", href: "https://facebook.com" },
      { platform: "instagram", label: "Instagram", href: "https://instagram.com" },
      { platform: "twitter", label: "X", href: "https://x.com" },
      { platform: "linkedin", label: "LinkedIn", href: "https://linkedin.com" },
      { platform: "youtube", label: "YouTube", href: "https://youtube.com" },
    ],
    columns: [
      {
        title: "About Us",
        links: [
          { label: "About Us", href: "/about-us" },
          { label: "FAQs", href: "/faq" },
          { label: "Contact Us", href: "/contact" },
          { label: "Terms & Conditions", href: "/terms-and-conditions" },
        ],
      },
      {
        title: "Customer Service",
        links: [
          { label: "Shipping & Delivery", href: "/shipping-and-delivery" },
          { label: "Returns & Refunds", href: "/returns-and-refunds" },
          { label: "Warranty", href: "/warranty" },
          { label: "Privacy Policy", href: "/privacy-policy" },
        ],
      },
    ],
    instagram: {
      title: "Instagram",
      image: "/images/social/instagram-grid.jpg",
      href: "https://instagram.com",
    },
    copyright: "© 2024 Solar Home System & Electronic. All Rights Reserved.",
  },
};

function mergeValue<T>(fallback: T, stored: unknown): T {
  if (stored === undefined || stored === null) return fallback;
  if (Array.isArray(fallback)) return (Array.isArray(stored) ? stored : fallback) as T;
  if (typeof fallback === "object" && typeof stored === "object") {
    const result: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
    for (const key of Object.keys(fallback as Record<string, unknown>)) {
      result[key] = mergeValue(
        (fallback as Record<string, unknown>)[key],
        (stored as Record<string, unknown>)[key],
      );
    }
    return result as T;
  }
  return (typeof stored === typeof fallback ? stored : fallback) as T;
}

export function normalizeSiteContent(stored: unknown): SiteContentData {
  const content = mergeValue(DEFAULT_SITE_CONTENT, stored);
  if (!Array.isArray(content.sectionOrder) || !content.sectionOrder.length) {
    content.sectionOrder = [...DEFAULT_SITE_CONTENT.sectionOrder];
  }
  return content;
}
