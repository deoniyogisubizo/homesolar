import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Category } from "../src/models/Category";
import { Product } from "../src/models/Product";
import { SiteContent } from "../src/models/SiteContent";
import { Cart } from "../src/models/Cart";
import { Wishlist } from "../src/models/Wishlist";
import { Review } from "../src/models/Review";
import { AdminUser } from "../src/models/AdminUser";
import { Setting } from "../src/models/Setting";
import { EmailTemplate } from "../src/models/EmailTemplate";
import { Location } from "../src/models/Location";
import { Page } from "../src/models/Page";
import { RWANDA_PROVINCES } from "../src/lib/rwanda-locations";
import { DEFAULT_SETTINGS } from "../src/lib/admin/settings-defaults";
import { DEFAULT_EMAIL_TEMPLATES } from "../src/lib/emails/templates";
import type {
  ProductDetailBanner,
  ProductFeature,
  ProductImage,
  ProductSizeGuide,
  ProductVariant,
  SiteContentData,
  TrustBadge,
} from "../src/types";

dotenv.config({ path: ".env.local" });

type SeedProduct = {
  name: string;
  pageTitle?: string;
  slug: string;
  category: string;
  price: number;
  priceMax?: number;
  image: string;
  shortDescription: string;
  description: string;
  badge?: "top" | "sale";
  rating: number;
  reviewCount: number;
  stock: number;
  specs: Array<{ label: string; value: string }>;
  highlights: string[];
  featuredOrder?: number;
  bestSellerOrder?: number;
  status?: "in_stock" | "low_stock" | "out_of_stock";
  compareAtPrice?: number;
  images?: ProductImage[];
  options?: {
    colors: Array<{ value: string; label: string; hex: string }>;
    sizes: Array<{ value: string; label: string }>;
  };
  variants?: ProductVariant[];
  detailsIntro?: string;
  features?: ProductFeature[];
  detailBanner?: ProductDetailBanner;
  shippingReturns?: string;
  sizeGuide?: ProductSizeGuide;
  relatedSlugs?: string[];
  cardTitle?: string;
  cardSubtitle?: string;
};

const trustBadges: TrustBadge[] = [
  { icon: "truck", title: "Free Shipping", subtitle: "On orders over $50" },
  { icon: "shield", title: "Cash on Delivery", subtitle: "Pay at your doorstep" },
  { icon: "headset", title: "24/7 Customer Support", subtitle: "" },
];

const panelColors = [
  { value: "blue", label: "Blue", hex: "#005bb6" },
  { value: "light-gray", label: "Light Gray", hex: "#dbdcdf" },
  { value: "black", label: "Black", hex: "#020202" },
];

const panelSizes = [
  { value: "350w", label: "350W" },
  { value: "450w", label: "450W" },
  { value: "550w", label: "550W" },
  { value: "600w", label: "600W" },
];

const panelPriceBySize: Record<string, number> = {
  "350w": 199,
  "450w": 249,
  "550w": 299,
  "600w": 349,
};

const panelVariants: ProductVariant[] = ["550w", "450w", "350w", "600w"].flatMap((size) =>
  panelColors.map((color) => ({
    sku: `MSP-${size.toUpperCase()}-${color.value.toUpperCase()}`,
    color: color.value,
    size,
    price: panelPriceBySize[size],
    compareAtPrice: size === "550w" ? 399 : null,
    stock:
      size === "550w" && color.value === "blue"
        ? 24
        : size === "550w" && color.value === "light-gray"
          ? 8
          : size === "550w" && color.value === "black"
            ? 3
            : size === "600w" && color.value === "black"
              ? 0
              : 12,
    isDefault: size === "550w" && color.value === "blue",
  })),
);

const panelImages: ProductImage[] = [
  {
    src: "/images/products/monocrystalline-panel-main.jpg",
    thumbSrc: "/images/products/monocrystalline-panel-thumb-1.jpg",
    alt: "Monocrystalline solar panel installed on a roof",
  },
  {
    src: "/images/products/monocrystalline-panel-thumb-2.jpg",
    thumbSrc: "/images/products/monocrystalline-panel-thumb-2.jpg",
    alt: "Monocrystalline solar panel viewed from above",
  },
  {
    src: "/images/products/monocrystalline-panel-thumb-3.jpg",
    thumbSrc: "/images/products/monocrystalline-panel-thumb-3.jpg",
    alt: "Monocrystalline solar panel close-up",
  },
  {
    src: "/images/products/monocrystalline-panel-thumb-4.jpg",
    thumbSrc: "/images/products/monocrystalline-panel-thumb-4.jpg",
    alt: "Monocrystalline solar panel installation detail",
  },
];

const panelSizeGuide: ProductSizeGuide = {
  title: "Panel size guide",
  intro:
    "Panel dimensions vary by wattage. Measure your roof or mounting area before choosing a size, and leave space for airflow and maintenance.",
  rows: [
    { label: "350W", value: "1.7 m x 1.0 m / 22 kg" },
    { label: "450W", value: "2.0 m x 1.0 m / 25 kg" },
    { label: "550W", value: "2.3 m x 1.1 m / 28 kg" },
    { label: "600W", value: "2.4 m x 1.1 m / 31 kg" },
  ],
};

const productShipping =
  "Orders are processed within one business day. Delivery within Kigali usually takes 1-2 business days, while up-country deliveries take 3-5 business days. Shipping is free on orders over $50.\n\nIf something is not right, contact us within 30 days of delivery for a return or exchange. Products must be unused and in their original packaging. Faulty items are covered by the manufacturer's warranty.";

const categories = [
  {
    name: "Solar Panels",
    slug: "solar-panels",
    description: "High-efficiency panels built to turn sunlight into dependable power.",
    image: "/images/categories/panels.jpg",
    bannerImage: "/images/categories/banner-solar-panels.jpg",
    showOnHome: true,
    order: 1,
  },
  {
    name: "Inverters",
    slug: "inverters",
    description: "Clean, stable conversion for homes, offices, and off-grid systems.",
    image: "/images/categories/inverters.jpg",
    bannerImage: "/images/categories/banner-inverters.jpg",
    showOnHome: true,
    order: 2,
  },
  {
    name: "Batteries",
    slug: "batteries",
    description: "Reliable storage that keeps your energy available day and night.",
    image: "/images/categories/batteries.jpg",
    bannerImage: "/images/categories/banner-batteries.jpg",
    showOnHome: true,
    order: 3,
  },
  {
    name: "Lighting",
    slug: "lighting",
    description: "Solar-powered lighting for indoors, outdoors, and everything between.",
    image: "/images/products/led-solar-bulb.jpg",
    bannerImage: "/images/categories/banner-lighting.jpg",
    showOnHome: false,
    order: 4,
  },
  {
    name: "Water Heating",
    slug: "water-heating",
    description: "Efficient solar water heating for comfortable, lower-cost living.",
    image: "/images/products/solar-water-heater.jpg",
    bannerImage: "/images/categories/banner-water-heating.jpg",
    showOnHome: false,
    order: 5,
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "The cables, mounts, and tools that complete a safe installation.",
    image: "/images/products/solar-tool-kit.jpg",
    bannerImage: "/images/categories/banner-accessories.jpg",
    showOnHome: false,
    order: 6,
  },
];

const products: SeedProduct[] = [
  {
    name: "Monocrystalline Solar Panel 550W",
    pageTitle: "Monocrystalline Solar Panel 550W",
    cardTitle: "Monocrystalline Solar Panel",
    slug: "monocrystalline-solar-panel",
    category: "solar-panels",
    price: 199,
    image: "/images/products/monocrystalline-panel.jpg",
    shortDescription:
      "High-efficiency solar panel with monocrystalline cells for maximum energy output and durability.",
    description:
      "Built with high-purity monocrystalline cells, this panel delivers strong output in a compact footprint. The tempered glass surface and anodized aluminium frame are made for long-term outdoor use, while the clean all-black finish keeps rooflines modern.",
    rating: 4.8,
    reviewCount: 120,
    stock: 72,
    status: "in_stock",
    compareAtPrice: 399,
    images: panelImages,
    options: {
      colors: panelColors,
      sizes: panelSizes,
    },
    variants: panelVariants,
    detailsIntro:
      "Harness the power of the sun with our high-efficiency monocrystalline solar panel. Designed for long-lasting performance, it delivers maximum energy conversion and is suitable for homes, businesses, and off-grid use.",
    features: [
      { icon: "sun", label: "550W high output" },
      { icon: "shield", label: "25-year performance warranty" },
      { icon: "cloud-sun", label: "Weather-resistant design" },
      { icon: "wrench", label: "Easy installation" },
    ],
    detailBanner: {
      image: "/images/products/solar-detail-banner.jpg",
      icon: "leaf",
      lines: ["CLEAN ENERGY", "BRIGHTER TOMORROW"],
    },
    shippingReturns: productShipping,
    sizeGuide: panelSizeGuide,
    relatedSlugs: [
      "solar-charge-controller",
      "hybrid-inverter",
      "lithium-battery-100ah",
      "solar-mounting-kit",
    ],
    specs: [
      { label: "Power", value: "550W" },
      { label: "Cell type", value: "Monocrystalline" },
      { label: "Efficiency", value: "22.8%" },
      { label: "Voltage", value: "24V" },
      { label: "Warranty", value: "25 years" },
    ],
    highlights: ["High-efficiency cells", "Weather-resistant frame", "Easy roof mounting"],
    bestSellerOrder: 1,
  },
  {
    name: "Bifacial Solar Panel 450W",
    slug: "bifacial-solar-panel-450w",
    category: "solar-panels",
    price: 229,
    priceMax: 279,
    image: "/images/products/monocrystalline-panel.jpg",
    shortDescription: "Double-sided generation for rooftops, carports, and ground mounts.",
    description:
      "The bifacial design captures light on both faces, adding output from reflected sunlight. A durable dual-glass construction protects the cells through heat, humidity, and daily temperature swings.",
    rating: 4.7,
    reviewCount: 86,
    stock: 28,
    options: {
      colors: [],
      sizes: [
        { value: "450w", label: "450W" },
        { value: "550w", label: "550W" },
      ],
    },
    variants: [
      { sku: "BSP-450W", color: null, size: "450w", price: 229, compareAtPrice: null, stock: 18, isDefault: true },
      { sku: "BSP-550W", color: null, size: "550w", price: 279, compareAtPrice: null, stock: 10 },
    ],
    specs: [
      { label: "Power", value: "450W" },
      { label: "Cell type", value: "Bifacial monocrystalline" },
      { label: "Efficiency", value: "23.1%" },
      { label: "Frame", value: "Dual glass" },
      { label: "Warranty", value: "30 years" },
    ],
    highlights: ["Dual-glass build", "Gain from reflected light", "Low degradation"],
  },
  {
    name: "Portable Solar Panel 200W",
    slug: "portable-solar-panel-200w",
    category: "solar-panels",
    price: 159,
    image: "/images/products/monocrystalline-panel.jpg",
    shortDescription: "Foldable 200W charging for camping, travel, and backup power.",
    description:
      "A foldable 200W panel that packs down into a carry case and sets up in seconds. The integrated stand angles toward the sun, and the weather-resistant surface handles unexpected rain.",
    rating: 4.6,
    reviewCount: 54,
    stock: 0,
    status: "out_of_stock",
    specs: [
      { label: "Power", value: "200W" },
      { label: "Folded size", value: "53 x 55 cm" },
      { label: "Output", value: "18V / 11.1A" },
      { label: "Weight", value: "5.4 kg" },
      { label: "Warranty", value: "2 years" },
    ],
    highlights: ["Folds into a carry case", "Built-in kickstand", "Weather-resistant"],
  },
  {
    name: "Solar Panel Cleaning Kit",
    slug: "solar-panel-cleaning-kit",
    category: "solar-panels",
    price: 39,
    image: "/images/products/solar-tool-kit.jpg",
    shortDescription: "A safe, streak-free cleaning set for keeping panel output high.",
    description:
      "Dust and pollen can quietly reduce panel output. This kit includes a soft rotating brush, a telescoping handle, and a gentle cleaning solution that lifts grime without scratching the glass.",
    rating: 4.5,
    reviewCount: 41,
    stock: 80,
    specs: [
      { label: "Handle reach", value: "3.6 m" },
      { label: "Brush", value: "Soft microfibre" },
      { label: "Solution", value: "500 ml" },
      { label: "Use", value: "All panel types" },
    ],
    highlights: ["Scratch-safe brush", "Extendable handle", "Streak-free finish"],
  },
  {
    name: "Solar Mounting Kit",
    slug: "solar-mounting-kit",
    category: "solar-panels",
    price: 59,
    priceMax: 99,
    image: "/images/products/solar-mounting-kit.jpg",
    shortDescription: "Corrosion-resistant rails and clamps for a secure panel install.",
    description:
      "A complete mounting set with aluminium rails, stainless fixings, and adjustable clamps. Choose the size that matches your array and install with confidence on pitched or flat roofs.",
    rating: 4.8,
    reviewCount: 63,
    stock: 50,
    specs: [
      { label: "Material", value: "Anodized aluminium" },
      { label: "Fixings", value: "Stainless steel" },
      { label: "Roof type", value: "Pitched or flat" },
      { label: "Warranty", value: "10 years" },
    ],
    highlights: ["Corrosion-resistant", "Adjustable clamps", "Complete fixing set"],
    featuredOrder: 6,
    cardSubtitle: "For Roof",
    images: [
      {
        src: "/images/products/related-solar-mounting-kit.jpg",
        thumbSrc: "/images/products/related-solar-mounting-kit.jpg",
        alt: "Solar mounting kit for roofs",
      },
    ],
    detailsIntro:
      "A complete mounting set with aluminium rails, stainless fixings, and adjustable clamps. Choose the size that matches your array and install with confidence on pitched or flat roofs.",
    shippingReturns: productShipping,
  },
  {
    name: "Solar Cable",
    slug: "solar-cable",
    category: "solar-panels",
    price: 49,
    priceMax: 79,
    image: "/images/products/solar-cable.jpg",
    shortDescription: "UV-rated twin-core cable with durable MC4 connectors.",
    description:
      "Engineered for outdoor solar wiring, this UV-resistant cable stays flexible in heat and cold. The included MC4 connectors lock securely and keep moisture out of the connection.",
    rating: 4.7,
    reviewCount: 112,
    stock: 120,
    options: {
      colors: [],
      sizes: [
        { value: "5m", label: "5 m" },
        { value: "10m", label: "10 m" },
      ],
    },
    variants: [
      { sku: "SC-5M", color: null, size: "5m", price: 49, compareAtPrice: null, stock: 80, isDefault: true },
      { sku: "SC-10M", color: null, size: "10m", price: 79, compareAtPrice: null, stock: 40 },
    ],
    specs: [
      { label: "Length", value: "5 m or 10 m" },
      { label: "Conductor", value: "Tinned copper" },
      { label: "Rating", value: "1500V DC" },
      { label: "Protection", value: "UV and ozone resistant" },
    ],
    highlights: ["UV-rated jacket", "MC4 connectors included", "Flexible in cold weather"],
    featuredOrder: 4,
  },
  {
    name: "Hybrid Solar Inverter",
    cardTitle: "Hybrid Inverter",
    slug: "hybrid-inverter",
    category: "inverters",
    price: 499,
    image: "/images/products/hybrid-inverter.jpg",
    shortDescription: "A 5kW hybrid inverter that manages solar, battery, and grid power.",
    description:
      "The 5kW hybrid inverter intelligently blends solar generation, battery storage, and grid supply. A clear display and mobile monitoring make it easy to see where your power is going.",
    rating: 4.9,
    reviewCount: 176,
    stock: 22,
    specs: [
      { label: "Capacity", value: "5kW" },
      { label: "Input", value: "Solar / grid / battery" },
      { label: "Efficiency", value: "97.6%" },
      { label: "Monitoring", value: "Wi-Fi app" },
      { label: "Warranty", value: "5 years" },
    ],
    highlights: ["Hybrid power management", "Wi-Fi monitoring", "Quiet operation"],
    bestSellerOrder: 2,
    cardSubtitle: "5KW",
    images: [
      {
        src: "/images/products/related-hybrid-inverter.jpg",
        thumbSrc: "/images/products/related-hybrid-inverter.jpg",
        alt: "Hybrid solar inverter",
      },
    ],
    detailsIntro:
      "The 5kW hybrid inverter intelligently blends solar generation, battery storage, and grid supply. A clear display and mobile monitoring make it easy to see where your power is going.",
    shippingReturns: productShipping,
  },
  {
    name: "Solar Charge Controller",
    slug: "solar-charge-controller",
    category: "inverters",
    price: 89,
    priceMax: 129,
    image: "/images/products/charge-controller.jpg",
    shortDescription: "MPPT charge control that protects batteries and improves harvest.",
    description:
      "An MPPT charge controller that tracks the panel's best operating point and safely manages battery charging. Multiple protection layers guard against overload, reverse polarity, and overheating.",
    rating: 4.8,
    reviewCount: 143,
    stock: 60,
    badge: "sale",
    options: {
      colors: [],
      sizes: [
        { value: "30a", label: "30A" },
        { value: "40a", label: "40A" },
        { value: "50a", label: "50A" },
      ],
    },
    variants: [
      { sku: "MPPT-30A", color: null, size: "30a", price: 89, compareAtPrice: null, stock: 24 },
      { sku: "MPPT-40A", color: null, size: "40a", price: 109, compareAtPrice: null, stock: 22, isDefault: true },
      { sku: "MPPT-50A", color: null, size: "50a", price: 129, compareAtPrice: null, stock: 14 },
    ],
    specs: [
      { label: "Current", value: "30A or 50A" },
      { label: "System", value: "12V / 24V auto" },
      { label: "Technology", value: "MPPT" },
      { label: "Display", value: "LCD" },
      { label: "Warranty", value: "3 years" },
    ],
    highlights: ["MPPT tracking", "Multi-layer protection", "LCD status display"],
    bestSellerOrder: 4,
    cardSubtitle: "MPPT 40A",
    images: [
      {
        src: "/images/products/related-charge-controller.jpg",
        thumbSrc: "/images/products/related-charge-controller.jpg",
        alt: "MPPT solar charge controller",
      },
    ],
    detailsIntro:
      "An MPPT charge controller that tracks the panel's best operating point and safely manages battery charging. Multiple protection layers guard against overload, reverse polarity, and overheating.",
    shippingReturns: productShipping,
  },
  {
    name: "Portable Power Station",
    slug: "portable-power-station",
    category: "inverters",
    price: 199,
    image: "/images/products/portable-power-station.jpg",
    shortDescription: "A compact 500Wh station for outages, travel, and outdoor work.",
    description:
      "Keep phones, lights, laptops, and small appliances running with a 500Wh portable station. Recharge from a wall outlet, a car, or a solar panel, and carry it with one hand.",
    rating: 4.7,
    reviewCount: 98,
    stock: 33,
    specs: [
      { label: "Capacity", value: "500Wh" },
      { label: "Output", value: "600W continuous" },
      { label: "Ports", value: "AC, USB-A, USB-C" },
      { label: "Recharge", value: "Wall / car / solar" },
      { label: "Warranty", value: "2 years" },
    ],
    highlights: ["Quiet, fume-free power", "Solar rechargeable", "Lightweight carry handle"],
    featuredOrder: 2,
  },
  {
    name: "Off-Grid Inverter 5kW",
    slug: "off-grid-inverter-5kw",
    category: "inverters",
    price: 899,
    image: "/images/products/hybrid-inverter.jpg",
    shortDescription: "Purpose-built off-grid power with a high surge rating.",
    description:
      "A robust 5kW off-grid inverter for homes and workshops beyond the grid. The high surge rating starts motors and pumps reliably, while the wide input range accepts varied battery banks.",
    rating: 4.8,
    reviewCount: 64,
    stock: 14,
    specs: [
      { label: "Capacity", value: "5kW" },
      { label: "Surge", value: "10kW" },
      { label: "Input", value: "48V DC" },
      { label: "Output", value: "230V AC" },
      { label: "Warranty", value: "3 years" },
    ],
    highlights: ["High surge capacity", "Off-grid ready", "Wide battery compatibility"],
  },
  {
    name: "Pure Sine Wave Inverter 3kW",
    slug: "pure-sine-wave-inverter-3kw",
    category: "inverters",
    price: 549,
    image: "/images/products/hybrid-inverter.jpg",
    shortDescription: "Clean 3kW output for sensitive electronics and appliances.",
    description:
      "A pure sine wave inverter that delivers stable power for televisions, computers, and modern appliances. The aluminium chassis and temperature-controlled fan keep it cool under load.",
    rating: 4.6,
    reviewCount: 52,
    stock: 18,
    specs: [
      { label: "Capacity", value: "3kW" },
      { label: "Waveform", value: "Pure sine" },
      { label: "Efficiency", value: "94%" },
      { label: "Input", value: "24V / 48V DC" },
      { label: "Warranty", value: "2 years" },
    ],
    highlights: ["Clean sine output", "Quiet cooling", "Compact chassis"],
  },
  {
    name: "MPPT Solar Inverter 3.6kW",
    slug: "mppt-solar-inverter-3-6kw",
    category: "inverters",
    price: 649,
    image: "/images/products/hybrid-inverter.jpg",
    shortDescription: "A grid-tied inverter with dual MPPT inputs and app monitoring.",
    description:
      "Designed for residential rooftop systems, this 3.6kW inverter uses dual MPPT trackers to get the most from panels on different roof faces. Monitor production from the companion app.",
    rating: 4.7,
    reviewCount: 71,
    stock: 16,
    specs: [
      { label: "Capacity", value: "3.6kW" },
      { label: "MPPT inputs", value: "Dual" },
      { label: "Efficiency", value: "97.3%" },
      { label: "Monitoring", value: "Wi-Fi app" },
      { label: "Warranty", value: "5 years" },
    ],
    highlights: ["Dual MPPT inputs", "App monitoring", "Grid-tied design"],
  },
  {
    name: "Lithium Battery 100Ah",
    slug: "lithium-battery-100ah",
    category: "batteries",
    price: 799,
    image: "/images/products/lithium-battery.jpg",
    shortDescription: "A 100Ah lithium battery with deep cycles and smart protection.",
    description:
      "Store more usable energy in a lighter package. This 100Ah lithium battery provides deep-cycle performance, a built-in battery management system, and stable output for everyday loads.",
    rating: 4.9,
    reviewCount: 201,
    stock: 25,
    badge: "top",
    specs: [
      { label: "Capacity", value: "100Ah" },
      { label: "Chemistry", value: "LiFePO4" },
      { label: "Cycle life", value: "4000+" },
      { label: "Voltage", value: "12.8V" },
      { label: "Warranty", value: "5 years" },
    ],
    highlights: ["Built-in BMS", "Lightweight design", "Long cycle life"],
    bestSellerOrder: 3,
    cardSubtitle: "LiFePO4",
    images: [
      {
        src: "/images/products/related-lithium-battery.jpg",
        thumbSrc: "/images/products/related-lithium-battery.jpg",
        alt: "Lithium battery 100Ah",
      },
    ],
    detailsIntro:
      "Store more usable energy in a lighter package. This 100Ah lithium battery provides deep-cycle performance, a built-in battery management system, and stable output for everyday loads.",
    shippingReturns: productShipping,
  },
  {
    name: "Deep Cycle Battery 200Ah",
    slug: "deep-cycle-battery-200ah",
    category: "batteries",
    price: 349,
    image: "/images/products/lithium-battery.jpg",
    shortDescription: "A dependable 200Ah lead-acid battery for daily cycling.",
    description:
      "A sealed deep-cycle battery built for repeated discharge and recharge. Thick plates and a rugged case make it a practical choice for backup and off-grid systems.",
    rating: 4.6,
    reviewCount: 88,
    stock: 30,
    specs: [
      { label: "Capacity", value: "200Ah" },
      { label: "Chemistry", value: "Sealed lead-acid" },
      { label: "Voltage", value: "12V" },
      { label: "Terminals", value: "M8 bolt" },
      { label: "Warranty", value: "2 years" },
    ],
    highlights: ["Deep-cycle plates", "Sealed maintenance-free case", "Rugged terminals"],
  },
  {
    name: "LiFePO4 Battery 200Ah",
    slug: "lifepo4-battery-200ah",
    category: "batteries",
    price: 1099,
    image: "/images/products/lithium-battery.jpg",
    shortDescription: "Large-capacity lithium storage for whole-home backup.",
    description:
      "A 200Ah LiFePO4 battery for larger solar systems and extended backup. The integrated BMS balances cells and protects against overcharge, over-discharge, and extreme temperatures.",
    rating: 4.8,
    reviewCount: 73,
    stock: 12,
    specs: [
      { label: "Capacity", value: "200Ah" },
      { label: "Chemistry", value: "LiFePO4" },
      { label: "Cycle life", value: "6000+" },
      { label: "Voltage", value: "12.8V" },
      { label: "Warranty", value: "8 years" },
    ],
    highlights: ["Whole-home capacity", "Smart cell balancing", "Temperature protection"],
  },
  {
    name: "Gel Battery 150Ah",
    slug: "gel-battery-150ah",
    category: "batteries",
    price: 279,
    image: "/images/products/lithium-battery.jpg",
    shortDescription: "Maintenance-free gel storage for solar and backup systems.",
    description:
      "Gel electrolyte makes this 150Ah battery tolerant of deeper discharges and hot climates. It is sealed, maintenance-free, and well suited to steady daily cycling.",
    rating: 4.5,
    reviewCount: 67,
    stock: 38,
    specs: [
      { label: "Capacity", value: "150Ah" },
      { label: "Chemistry", value: "Gel lead-acid" },
      { label: "Voltage", value: "12V" },
      { label: "Maintenance", value: "Free" },
      { label: "Warranty", value: "2 years" },
    ],
    highlights: ["Gel electrolyte", "Hot-climate tolerant", "Maintenance-free"],
  },
  {
    name: "Battery Rack",
    slug: "battery-rack",
    category: "batteries",
    price: 129,
    image: "/images/products/solar-mounting-kit.jpg",
    shortDescription: "A sturdy steel rack that keeps battery banks organized.",
    description:
      "Keep a multi-battery bank tidy and ventilated with a powder-coated steel rack. Adjustable shelves accommodate common battery sizes and the open frame simplifies wiring access.",
    rating: 4.4,
    reviewCount: 29,
    stock: 44,
    specs: [
      { label: "Material", value: "Powder-coated steel" },
      { label: "Shelves", value: "3 adjustable" },
      { label: "Load", value: "300 kg" },
      { label: "Assembly", value: "Bolt-together" },
    ],
    highlights: ["Adjustable shelves", "Open wiring access", "Rust-resistant finish"],
  },
  {
    name: "Battery Monitor Shunt",
    slug: "battery-monitor-shunt",
    category: "batteries",
    price: 79,
    image: "/images/products/solar-cable.jpg",
    shortDescription: "Track battery state of charge, voltage, and current draw.",
    description:
      "A precision shunt and monitor that show how much energy is left and where it is going. Set low-voltage alarms and keep an eye on the bank from a compact display.",
    rating: 4.6,
    reviewCount: 36,
    stock: 70,
    specs: [
      { label: "Current range", value: "0-500A" },
      { label: "Voltage", value: "12-48V" },
      { label: "Display", value: "Backlit LCD" },
      { label: "Alarm", value: "Low voltage" },
    ],
    highlights: ["State-of-charge display", "Low-voltage alarm", "Works with 12-48V banks"],
  },
  {
    name: "Solar LED Light",
    slug: "solar-led-light",
    category: "lighting",
    price: 49,
    image: "/images/products/solar-led-light.jpg",
    shortDescription: "A bright, weather-ready solar light for paths and patios.",
    description:
      "A self-contained solar LED light with a built-in panel and battery. It charges through the day and switches on automatically at dusk, with a warm glow that is easy on the eyes.",
    rating: 4.7,
    reviewCount: 156,
    stock: 90,
    specs: [
      { label: "Brightness", value: "800 lumens" },
      { label: "Runtime", value: "8-10 hours" },
      { label: "Rating", value: "IP65" },
      { label: "Install", value: "Wall or post" },
    ],
    highlights: ["Dusk-to-dawn sensor", "IP65 weather rating", "Tool-free install"],
    bestSellerOrder: 5,
  },
  {
    name: "LED Solar Bulb",
    slug: "led-solar-bulb",
    category: "lighting",
    price: 19,
    priceMax: 29,
    image: "/images/products/led-solar-bulb.jpg",
    shortDescription: "An efficient solar-charged bulb for sheds, stalls, and rooms.",
    description:
      "A low-energy LED bulb that pairs with a small solar panel and battery. Choose the single-pack or twin-pack to light spaces where grid power is unreliable or unavailable.",
    rating: 4.5,
    reviewCount: 132,
    stock: 140,
    options: {
      colors: [],
      sizes: [
        { value: "single", label: "Single" },
        { value: "twin", label: "Twin Pack" },
      ],
    },
    variants: [
      { sku: "LSB-SINGLE", color: null, size: "single", price: 19, compareAtPrice: null, stock: 90, isDefault: true },
      { sku: "LSB-TWIN", color: null, size: "twin", price: 29, compareAtPrice: null, stock: 50 },
    ],
    specs: [
      { label: "Power", value: "9W" },
      { label: "Brightness", value: "900 lumens" },
      { label: "Base", value: "E27" },
      { label: "Color", value: "Warm white" },
    ],
    highlights: ["Low running cost", "Warm white light", "E27 fit"],
    featuredOrder: 1,
  },
  {
    name: "Solar Garden Light",
    slug: "solar-garden-light",
    category: "lighting",
    price: 29,
    image: "/images/products/solar-garden-light.jpg",
    shortDescription: "Stake-mounted solar lighting that brightens garden beds.",
    description:
      "A stainless-steel stake light that gathers daylight and glows after dark. The compact head throws a focused pool of light along borders, steps, and driveways.",
    rating: 4.6,
    reviewCount: 118,
    stock: 110,
    specs: [
      { label: "Brightness", value: "300 lumens" },
      { label: "Runtime", value: "6-8 hours" },
      { label: "Rating", value: "IP65" },
      { label: "Material", value: "Stainless steel" },
    ],
    highlights: ["Weather-resistant", "Automatic on/off", "No wiring needed"],
    featuredOrder: 3,
  },
  {
    name: "Solar Water Heater",
    slug: "solar-water-heater",
    category: "water-heating",
    price: 299,
    image: "/images/products/solar-water-heater.jpg",
    shortDescription: "A rooftop solar heater that cuts water-heating bills.",
    description:
      "Use the sun to heat household water with a durable evacuated-tube collector and insulated tank. The system is designed for steady performance and low maintenance.",
    rating: 4.8,
    reviewCount: 97,
    stock: 20,
    badge: "top",
    specs: [
      { label: "Capacity", value: "150 L" },
      { label: "Collector", value: "Evacuated tube" },
      { label: "Tank", value: "Insulated stainless" },
      { label: "Install", value: "Rooftop" },
      { label: "Warranty", value: "5 years" },
    ],
    highlights: ["Lower water-heating bills", "Insulated storage tank", "Low maintenance"],
    bestSellerOrder: 6,
  },
  {
    name: "Solar Tool Kit",
    slug: "solar-tool-kit",
    category: "accessories",
    price: 59,
    image: "/images/products/solar-tool-kit.jpg",
    shortDescription: "The essential hand tools for safe solar installations.",
    description:
      "A compact tool roll with insulated cutters, strippers, crimpers, and a multimeter. Every tool is selected for the connections and measurements common in solar work.",
    rating: 4.5,
    reviewCount: 45,
    stock: 55,
    specs: [
      { label: "Pieces", value: "12" },
      { label: "Insulation", value: "1000V" },
      { label: "Case", value: "Canvas roll" },
      { label: "Multimeter", value: "Included" },
    ],
    highlights: ["Insulated tools", "Solar connector crimper", "Roll-up storage"],
    featuredOrder: 5,
  },
];

const siteContent: SiteContentData = {
  meta: {
    title: "Solar Home System & Electronic | Clean Energy for Every Home",
    description:
      "Shop solar panels, inverters, batteries, and accessories for a dependable clean-energy home.",
  },
  header: {
    currency: "RWF",
    language: "ENG",
    searchPlaceholder: "Search products",
    accountLabel: "Account",
    wishlistLabel: "Wishlist",
    cartLabel: "Cart",
    nav: [
      { label: "Home", href: "/" },
      {
        label: "Categories",
        href: "/category/solar-panels",
        children: categories.map((category) => ({
          label: category.name,
          href: `/category/${category.slug}`,
        })),
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
        href: "#",
        children: [
          { label: "About Us", href: "#" },
          { label: "Contact Us", href: "#" },
          { label: "FAQs", href: "#" },
        ],
      },
      { label: "Blog", href: "#" },
      { label: "Elements", href: "#" },
      { label: "About Us", href: "#" },
      { label: "Buy Rider", href: "#" },
    ],
  },
  hero: {
    eyebrow: "BEST SELLERS",
    titleStrong: "Solar Home System",
    titleLight: "for a Brighter Future",
    subtitle: "Clean Energy. Save More.",
    cta: { label: "SHOP NOW", href: "/search" },
    image: "/images/campaign/hero.jpg",
    sideImage: "/images/campaign/hero-side.jpg",
    sideEyebrow: "NEW COLLECTION",
    sideTitle: "SOLAR ENERGY",
    sideTitleAccent: "SOLUTIONS",
    sideSubtitle: "Power Your Home Sustainably",
    socials: [
      { platform: "facebook", label: "Facebook", href: "#" },
      { platform: "twitter", label: "X", href: "#" },
      { platform: "instagram", label: "Instagram", href: "#" },
      { platform: "linkedin", label: "LinkedIn", href: "#" },
      { platform: "youtube", label: "YouTube", href: "#" },
    ],
  },
  sale: {
    title: "End of Summer Sale",
    description:
      "Get 20% off all solar products and accessories. Use promo code SOLAR20 through 9/20. Limitations apply.",
    buttons: [
      { label: "SHOP SOLAR", href: "/category/solar-panels" },
      { label: "SHOP ACCESSORIES", href: "/category/accessories" },
    ],
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
    banner: {
      eyebrow: "Featured",
      title: "SOLAR SYSTEM",
      titleLight: "2021 Collection",
      cta: { label: "SHOP NOW", href: "/category/inverters" },
      image: "/images/campaign/featured-product.jpg",
    },
  },
  meet: {
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
      { name: "Nyarugenge Service Center", image: "/images/clients/client-1.png", href: "#" },
      { name: "Gasabo Solar Cooperative", image: "/images/clients/client-2.png", href: "#" },
      { name: "Kicukiro Electricians", image: "/images/clients/client-3.png", href: "#" },
      { name: "Nyamirambo Installers", image: "/images/clients/client-4.png", href: "#" },
      { name: "Remera Renewables", image: "/images/clients/client-5.png", href: "#" },
      { name: "Kigali Heights Homes", image: "/images/clients/client-6.png", href: "#" },
    ],
  },
  settings: {
    trustBadges,
  },
  footer: {
    address: "123 Renewable Energy Way, Kigali, RW",
    phone: "+250 783 110 111",
    email: "info@solarhometech.rw",
    socials: [
      { platform: "facebook", label: "Facebook", href: "#" },
      { platform: "instagram", label: "Instagram", href: "#" },
      { platform: "twitter", label: "X", href: "#" },
      { platform: "linkedin", label: "LinkedIn", href: "#" },
      { platform: "youtube", label: "YouTube", href: "#" },
    ],
    columns: [
      {
        title: "About Us",
        links: [
          { label: "About Us", href: "/about-us" },
          { label: "FAQs", href: "/faq" },
          { label: "Contact Us", href: "/contact" },
          { label: "Shipping & Delivery", href: "/shipping-and-delivery" },
          { label: "Terms & Conditions", href: "/terms-and-conditions" },
        ],
      },
      {
        title: "Customer Service",
        links: [
          { label: "Returns & Refunds", href: "/returns-and-refunds" },
          { label: "Warranty", href: "/warranty" },
          { label: "Privacy Policy", href: "/privacy-policy" },
          { label: "Terms & Conditions", href: "/terms-and-conditions" },
        ],
      },
    ],
    instagram: {
      title: "Instagram",
      image: "/images/social/instagram-grid.jpg",
      href: "#",
    },
    copyright: "© 2024 Solar Home System & Electronic. All Rights Reserved.",
  },
};

function featureIcon(label: string) {
  if (/warranty|shield|protect|resistant|corrosion|glass|sealed/i.test(label)) return "shield";
  if (/monitor|display|app|wifi|smart|track/i.test(label)) return "activity";
  if (/install|mount|handle|fold|carry|tool|fixing|clamp/i.test(label)) return "wrench";
  if (/battery|storage|cycle|charge|capacity/i.test(label)) return "battery";
  return "sun";
}

const bannerLinesByCategory: Record<string, string[]> = {
  "solar-panels": ["CLEAN ENERGY", "BRIGHTER TOMORROW"],
  inverters: ["POWER THAT", "WORKS QUIETLY"],
  batteries: ["STORE THE SUN", "USE IT AFTER DARK"],
  lighting: ["LIGHT AFTER", "SUNSET"],
  "water-heating": ["HOT WATER", "FROM SUNLIGHT"],
  accessories: ["BUILT FOR", "EVERY INSTALLATION"],
};

const seedPages = [
  {
    title: "About Us",
    slug: "about-us",
    excerpt:
      "Solar Home System & Electronic supplies solar and electrical equipment for homes and businesses in Rwanda.",
    seoTitle: "About Solar Home System & Electronic",
    seoDescription:
      "Learn what Solar Home System & Electronic supplies, who we serve and how to get product advice before you buy.",
    content: `<p>Solar Home System &amp; Electronic supplies solar panels, inverters, batteries, lighting, water-heating systems and installation accessories for homes and businesses in Rwanda.</p>
<h2>What we do</h2>
<p>We help customers choose equipment that matches their energy needs, budget and installation plans. Our catalogue covers complete solar home systems as well as the components needed to extend or repair an existing installation.</p>
<h2>Who we serve</h2>
<p>We work with homeowners, renters, shops, offices, installers and small businesses. If you are unsure which panel, inverter or battery suits your load, contact us before ordering so we can check compatibility.</p>
<h2>How to buy</h2>
<p>Browse the catalogue, add products to your cart and complete checkout. For orders that need delivery or installation advice, our team will confirm the details with you before dispatch.</p>
<h2>Contact</h2>
<p>Our phone, email and business address are shown on the contact page and in the footer of every page.</p>`,
    faqs: [],
    order: 1,
  },
  {
    title: "Frequently Asked Questions",
    slug: "faq",
    excerpt:
      "Answers about ordering, delivery, payment, returns, warranty and product compatibility.",
    seoTitle: "Frequently Asked Questions",
    seoDescription:
      "Find answers about ordering, delivery across Rwanda, payment, returns, warranty and choosing compatible solar equipment.",
    content: `<p>These are the questions customers ask most often. If your question is not covered here, contact our team and include your order number when you have one.</p>`,
    faqs: [
      {
        question: "How do I place an order?",
        answer:
          "Add the products you need to your cart, choose your delivery location at checkout and submit the order. Our team will contact you to confirm the details before dispatch.",
      },
      {
        question: "Which payment methods can I use?",
        answer:
          "Available payment methods are shown at checkout and may include cash on delivery, mobile money or card payment. The options shown at checkout are the ones currently available for your order.",
      },
      {
        question: "Do you deliver outside Kigali?",
        answer:
          "Yes. Delivery is available to districts across Rwanda. The delivery fee and estimated time depend on the destination and are confirmed during checkout.",
      },
      {
        question: "How long does delivery take?",
        answer:
          "Kigali deliveries usually arrive within 1 to 2 business days. Other provinces usually take 2 to 4 business days. These estimates can change during busy periods or when a product needs to be transferred between locations.",
      },
      {
        question: "What happens if a product arrives damaged or incorrect?",
        answer:
          "Contact us within 30 days of delivery with your order number and photos of the item and packaging. We will arrange a replacement, repair or refund after checking the issue.",
      },
      {
        question: "Can I return a product I no longer need?",
        answer:
          "Unused products in their original packaging can be returned within 30 days, subject to inspection. Delivery fees are non-refundable unless the return is due to our error or a faulty product.",
      },
      {
        question: "Is installation included?",
        answer:
          "Installation is not automatically included with every product. If you need installation, contact us before ordering so we can confirm whether it is available in your area and what it costs.",
      },
      {
        question: "How do I check whether panels, batteries and inverters are compatible?",
        answer:
          "Send us the panel voltage and current ratings, battery type and inverter model you plan to use. We will check the specifications before you order. Incorrect compatibility can damage equipment and is not covered by warranty.",
      },
      {
        question: "What does the warranty cover?",
        answer:
          "Warranty terms depend on the manufacturer and product type. The warranty covers manufacturing defects under normal use. Physical damage, incorrect installation, water damage and unauthorised repairs are not covered.",
      },
    ],
    order: 2,
  },
  {
    title: "Shipping & Delivery",
    slug: "shipping-and-delivery",
    excerpt:
      "Delivery areas, estimated times and shipping fees for orders across Rwanda.",
    seoTitle: "Shipping & Delivery in Rwanda",
    seoDescription:
      "Delivery areas, estimated times and shipping fees for solar equipment orders across Kigali and the provinces of Rwanda.",
    content: `<h2>Delivery areas</h2>
<p>We deliver across Rwanda. Delivery options and fees are calculated from the destination you select at checkout.</p>
<h2>Estimated delivery times</h2>
<ul>
<li>Kigali: 1 to 2 business days.</li>
<li>Northern, Southern, Eastern and Western provinces: 2 to 4 business days.</li>
</ul>
<p>These are estimates, not guarantees. Large items, stock transfers and public holidays can add time. Our team will contact you if a delay affects your order.</p>
<h2>Shipping fees</h2>
<p>Shipping fees depend on the destination. Orders above the free-shipping threshold shown at checkout qualify for free standard delivery. Any fee is displayed before you submit your order.</p>
<h2>Order confirmation</h2>
<p>After you order, our team confirms the products, delivery address and payment method. Please make sure the phone number on your order is reachable so the courier can arrange delivery.</p>
<h2>Receiving your order</h2>
<p>Check the packaging and contents when they arrive. If something is damaged, missing or incorrect, contact us within 30 days with your order number and photos so we can resolve it.</p>`,
    faqs: [],
    order: 3,
  },
  {
    title: "Returns & Refunds",
    slug: "returns-and-refunds",
    excerpt:
      "How to return an item, when a refund applies and what to expect after we receive a return.",
    seoTitle: "Returns & Refunds",
    seoDescription:
      "How to return solar products, when refunds apply, inspection requirements and delivery-fee rules for orders in Rwanda.",
    content: `<h2>Return window</h2>
<p>You may return an unused product in its original packaging within 30 days of delivery. Contact us first so we can confirm the return address and whether the item needs to be inspected before collection.</p>
<h2>Damaged, faulty or incorrect items</h2>
<p>If a product arrives damaged, faulty or different from what you ordered, contact us within 30 days with your order number and photos. We will arrange a replacement, repair or refund after inspection.</p>
<h2>Condition requirements</h2>
<p>Returned products must be unused, complete and in their original packaging with accessories, manuals and labels. Items that have been installed, modified, damaged by incorrect installation or show signs of use may not qualify for a refund.</p>
<h2>Refund timing</h2>
<p>Refunds are processed after we receive and inspect the returned product. The time for the money to appear depends on the original payment method and your bank or mobile-money provider.</p>
<h2>Delivery fees</h2>
<p>Original delivery fees are non-refundable unless the return is caused by our error or a faulty product. You may be responsible for the cost of returning an item that is not faulty.</p>
<h2>Warranty claims</h2>
<p>Faults covered by a manufacturer warranty are handled as warranty claims rather than change-of-mind returns. See the warranty page for details.</p>`,
    faqs: [],
    order: 4,
  },
  {
    title: "Warranty",
    slug: "warranty",
    excerpt:
      "How manufacturer warranty claims work, what is covered and how to contact support.",
    seoTitle: "Product Warranty",
    seoDescription:
      "How manufacturer warranty claims work for solar panels, inverters, batteries and accessories, including exclusions and support contacts.",
    content: `<h2>Warranty coverage</h2>
<p>Warranty periods and terms are set by the manufacturer and can differ by product. The applicable terms are those supplied with the product or stated on its product page.</p>
<h2>What is covered</h2>
<p>A warranty generally covers manufacturing defects that appear during normal use within the warranty period. Keep your order number, product serial number and proof of purchase ready when you contact us.</p>
<h2>What is not covered</h2>
<ul>
<li>Physical damage, cracks, corrosion or water damage caused by accident or misuse.</li>
<li>Damage from incorrect installation, incorrect wiring, overload or incompatible equipment.</li>
<li>Normal wear, cosmetic changes that do not affect operation, or damage during unauthorised repair.</li>
<li>Products that have been modified or used outside the manufacturer's instructions.</li>
</ul>
<h2>How to make a claim</h2>
<p>Contact us with your order number, the product model and serial number, a description of the fault and clear photos. We will check the claim with the manufacturer or supplier and explain the next step.</p>
<h2>Installation safety</h2>
<p>Solar equipment should be installed by a qualified electrician or technician. Incorrect installation can be dangerous and may void the warranty.</p>`,
    faqs: [],
    order: 5,
  },
];


async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from .env.local");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });

  const existingCategoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const category of categories) {
    const document = await Category.findOneAndUpdate(
      { slug: category.slug },
      { $set: { ...category, active: true } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).select("_id slug");
    if (document) existingCategoryIds.set(category.slug, document._id);
  }

  const productDocs = products.map(({ category, relatedSlugs, ...product }) => {
    // Related ids are linked in a second pass once every product exists.
    void relatedSlugs;

    return {
      ...product,
      pageTitle: product.pageTitle ?? product.name,
      publishStatus: "active",
      category: existingCategoryIds.get(category),
      gallery: [product.image],
      ratingAverage: product.rating,
      ratingCount: product.reviewCount,
      status:
        product.status ??
        (product.stock <= 0 ? "out_of_stock" : product.stock <= 5 ? "low_stock" : "in_stock"),
      images: product.images ?? [],
      options: product.options ?? { colors: [], sizes: [] },
      variants: product.variants ?? [],
      detailsIntro: product.detailsIntro ?? product.description,
      features:
        product.features ??
        product.highlights.slice(0, 4).map((label) => ({ icon: featureIcon(label), label })),
      detailBanner: product.detailBanner ?? {
        image: "/images/products/solar-detail-banner.jpg",
        icon: "leaf",
        lines: bannerLinesByCategory[category] ?? [],
      },
      shippingReturns: product.shippingReturns ?? productShipping,
      sizeGuide: product.sizeGuide ?? null,
      relatedProductIds: [],
      cardTitle: product.cardTitle ?? null,
      cardSubtitle: product.cardSubtitle ?? null,
    };
  });

  for (const product of productDocs) {
    await Product.updateOne(
      { slug: product.slug },
      { $set: product },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const productDocsById = await Product.find({ slug: { $in: products.map((product) => product.slug) } })
    .select("_id slug")
    .lean();
  const productIds = new Map(productDocsById.map((product) => [product.slug, product._id]));

  for (const product of products) {
    if (!product.relatedSlugs?.length) continue;
    await Product.updateOne(
      { slug: product.slug },
      {
        $set: {
          relatedProductIds: product.relatedSlugs
            .map((slug) => productIds.get(slug))
            .filter((id): id is NonNullable<typeof id> => Boolean(id)),
        },
      },
    );
  }

  await SiteContent.updateOne(
    { key: "home" },
    { $set: { content: siteContent } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  const districts = RWANDA_PROVINCES.flatMap((province) =>
    province.districts.map((district) => ({
      name: district.name,
      slug: district.name.toLowerCase().replace(/\s+/g, "-"),
      province: province.name === "Kigali City" ? "Kigali City" : province.name,
      sectors: [...district.sectors],
    })),
  ).sort((left, right) => left.name.localeCompare(right.name));

  for (const [index, district] of districts.entries()) {
    await Location.updateOne(
      { name: district.name },
      {
        $setOnInsert: {
          ...district,
          active: true,
          order: index,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await Setting.updateOne(
      { key },
      { $setOnInsert: { value, updatedBy: "seed" } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  await EmailTemplate.deleteMany({
    key: { $in: ["order_status_shipped", "order_status_refunded"] },
  });

  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    await EmailTemplate.updateOne(
      { key: template.key },
      {
        $setOnInsert: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          active: true,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  await Review.deleteMany({});

  for (const page of seedPages) {
    await Page.updateOne(
      { slug: page.slug },
      {
        $setOnInsert: {
          ...page,
          slugHistory: [],
          noindex: false,
          status: "published",
          showInFooter: false,
          publishedAt: new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  // Create admin user if not exists
  const adminEmail = "admin@solarhome.com";
  const existingAdmin = await AdminUser.findOne({ email: adminEmail }).lean();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123!", 12);
    await AdminUser.create({
      name: "Admin",
      email: adminEmail,
      role: "owner",
      passwordHash,
      active: true,
      forcePasswordChange: false,
      sessionVersion: 1,
    });
    console.log("Admin user created: admin@solarhome.com / admin123!");
  } else {
    console.log("Admin user already exists");
  }

  const [
    categoryCount,
    productCount,
    reviewCount,
    contentCount,
    cartCount,
    wishlistCount,
    locationCount,
    settingCount,
    templateCount,
    pageCount,
  ] = await Promise.all([
    Category.countDocuments({}),
    Product.countDocuments({}),
    Review.countDocuments({}),
    SiteContent.countDocuments({}),
    Cart.countDocuments({}),
    Wishlist.countDocuments({}),
    Location.countDocuments({}),
    Setting.countDocuments({}),
    EmailTemplate.countDocuments({}),
    Page.countDocuments({}),
  ]);

  console.log(`categories: ${categoryCount}`);
  console.log(`products: ${productCount}`);
  console.log(`reviews: ${reviewCount}`);
  console.log(`sitecontents: ${contentCount}`);
  console.log(`carts: ${cartCount}`);
  console.log(`wishlists: ${wishlistCount}`);
  console.log(`locations: ${locationCount}`);
  console.log(`settings: ${settingCount}`);
  console.log(`email templates: ${templateCount}`);
  console.log(`pages: ${pageCount}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
