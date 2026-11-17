import type { SocialLink, TrustBadge } from "@/types";

export type GeneralSettings = {
  storeName: string;
  tagline: string;
  logo: string;
  logoLight: string;
  favicon: string;
  currency: string;
  currencySymbol: string;
  currencyFormat: "code" | "symbol";
  timezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

export type ContactSettings = {
  primaryPhone: string;
  secondaryPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  salesEmail: string;
  address: string;
  mapUrl: string;
  workingHours: string;
  socials: SocialLink[];
};

export type WhatsAppOrderSettings = {
  messageTemplate: string;
  staffReplyTemplate: string;
  orderPrefix: string;
  followUpMinutes: number;
  cartHelperText: string;
  checkoutHelperText: string;
  customerOrderEmail: boolean;
};

export type NotificationEvent = "orders" | "lowStock" | "messages" | "reviews";

export type NotificationSettings = {
  recipients: Record<NotificationEvent, string[]>;
  enabled: Record<NotificationEvent, boolean>;
};

export type ShippingZone = {
  district: string;
  rate: number;
  eta: string;
};

export type PaymentSettings = {
  cashOnDelivery: boolean;
  mobileMoney: boolean;
  card: boolean;
};

export type ShippingSettings = {
  freeShippingThreshold: number;
  zones: ShippingZone[];
  taxRate: number;
  payments: PaymentSettings;
  trustBadges: TrustBadge[];
  shippingNote: string;
};

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordEncrypted: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

export type SeoSettings = {
  titleTemplate: string;
  metaDescription: string;
  ogImage: string;
  indexable: boolean;
  sitemapEnabled: boolean;
};

export type NewsletterSettings = {
  doubleOptIn: boolean;
};

export type SettingsMap = {
  general: GeneralSettings;
  contact: ContactSettings;
  notifications: NotificationSettings;
  shipping: ShippingSettings;
  smtp: SmtpSettings;
  seo: SeoSettings;
  newsletter: NewsletterSettings;
  whatsappOrder: WhatsAppOrderSettings;
};

export const DEFAULT_ORDER_MESSAGE_TEMPLATE = `Hello {{customerName}},
I would like to confirm my order {{orderNumber}} from {{storeName}}.

{{items}}

Items: {{itemCount}}
Subtotal: {{subtotal}}
Discount: {{discount}}
Total: {{total}}

Delivery: {{deliveryLocation}}
{{notes}}`;

export const DEFAULT_STAFF_REPLY_TEMPLATE =
  "Hello {{customerName}}, this is {{storeName}} about order {{orderNumber}}. Is now a good time to confirm your delivery details?";

export const STORE_TZ = "Africa/Kigali";

export const DEFAULT_SETTINGS: SettingsMap = {
  general: {
    storeName: "Solar Home System & Electronic",
    tagline: "Clean Energy. Save More.",
    logo: "/images/brand/logo.png",
    logoLight: "/images/brand/logo-light.png",
    favicon: "/favicon.ico",
    currency: "RWF",
    currencySymbol: "FRw",
    currencyFormat: "code",
    timezone: STORE_TZ,
    maintenanceMode: false,
    maintenanceMessage: "We are updating the store. Please check back shortly.",
  },
  contact: {
    primaryPhone: "+250788123456",
    secondaryPhone: "",
    whatsappNumber: "+250788123456",
    supportEmail: "info@solarhometech.rw",
    salesEmail: "info@solarhometech.rw",
    address: "123 Renewable Energy Way, Kigali, RW",
    mapUrl: "https://maps.google.com/?q=Kigali,Rwanda",
    workingHours: "Monday to Saturday, 8:00 to 18:00",
    socials: [
      { platform: "facebook", label: "Facebook", href: "https://facebook.com" },
      { platform: "instagram", label: "Instagram", href: "https://instagram.com" },
      { platform: "twitter", label: "X", href: "https://x.com" },
      { platform: "linkedin", label: "LinkedIn", href: "https://linkedin.com" },
      { platform: "youtube", label: "YouTube", href: "https://youtube.com" },
    ],
  },
  notifications: {
    recipients: { orders: [], lowStock: [], messages: [], reviews: [] },
    enabled: { orders: true, lowStock: true, messages: true, reviews: true },
  },
  shipping: {
    freeShippingThreshold: 50,
    zones: [
      { district: "Kigali", rate: 0, eta: "1-2 business days" },
      { district: "Northern Province", rate: 8, eta: "2-4 business days" },
      { district: "Southern Province", rate: 8, eta: "2-4 business days" },
      { district: "Eastern Province", rate: 8, eta: "2-4 business days" },
      { district: "Western Province", rate: 10, eta: "3-5 business days" },
    ],
    taxRate: 0,
    payments: { cashOnDelivery: true, mobileMoney: false, card: false },
    trustBadges: [
      { icon: "truck", title: "Free Shipping", subtitle: "On orders over $50" },
      { icon: "shield", title: "Cash on Delivery", subtitle: "Pay at your doorstep" },
      { icon: "headset", title: "24/7 Customer Support", subtitle: "" },
    ],
    shippingNote: "Delivery within Kigali usually takes 1-2 business days.",
  },
  smtp: {
    host: "",
    port: 587,
    secure: false,
    username: "",
    passwordEncrypted: "",
    fromName: "Solar Home System & Electronic",
    fromEmail: "",
    replyTo: "",
  },
  seo: {
    titleTemplate: "%s | Solar Home System & Electronic",
    metaDescription:
      "Shop solar panels, inverters, batteries, and accessories for a dependable clean-energy home.",
    ogImage: "/images/campaign/hero.jpg",
    indexable: true,
    sitemapEnabled: true,
  },
  newsletter: {
    doubleOptIn: false,
  },
  whatsappOrder: {
    messageTemplate: DEFAULT_ORDER_MESSAGE_TEMPLATE,
    staffReplyTemplate: DEFAULT_STAFF_REPLY_TEMPLATE,
    orderPrefix: "SH",
    followUpMinutes: 30,
    cartHelperText: "Orders are confirmed on WhatsApp before delivery.",
    checkoutHelperText:
      "Your order is saved first. WhatsApp opens with the details so our team can confirm delivery.",
    customerOrderEmail: false,
  },
};
