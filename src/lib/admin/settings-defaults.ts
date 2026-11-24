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

export type InvoiceBusinessSettings = {
  businessName: string;
  tin: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  pricesIncludeVat: boolean;
  vatRate: number;
};

export type InvoiceTemplateKey = "order_invoice_customer" | "order_invoice_staff" | "order_delivered_customer";

export type InvoiceTemplateSetting = {
  metaTemplateName: string;
  languageCode: string;
  variableMapping: Record<string, string>;
};

export type WhatsAppApiSettings = {
  enabled: boolean;
};

export type WhatsAppRecipient = {
  number: string;
  label: string;
  events: string[];
};

export type InvoiceSettings = {
  business: InvoiceBusinessSettings;
  terms: string;
  invoicePrefix: string;
  reissueOnConfirm: boolean;
  tokenExpiryDays: number;
  confirmationMode: "pin_and_scan" | "scan_only";
  pinAttempts: number;
  pinLockMinutes: number;
  geolocationRequired: boolean;
  templates: Record<InvoiceTemplateKey, InvoiceTemplateSetting>;
  whatsappApi: WhatsAppApiSettings;
  recipients: WhatsAppRecipient[];
  autoSend: {
    onPlacement: boolean;
    onConfirmation: boolean;
    onDelivery: boolean;
  };
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

export const SEARCH_CRAWLERS = [
  { key: "googlebot", userAgent: "Googlebot", label: "Googlebot" },
  { key: "bingbot", userAgent: "Bingbot", label: "Bingbot" },
  { key: "oaiSearchBot", userAgent: "OAI-SearchBot", label: "OpenAI search" },
  { key: "chatgptUser", userAgent: "ChatGPT-User", label: "ChatGPT user visits" },
  { key: "perplexityBot", userAgent: "PerplexityBot", label: "Perplexity search" },
  { key: "perplexityUser", userAgent: "Perplexity-User", label: "Perplexity user visits" },
  { key: "claudeSearchBot", userAgent: "Claude-SearchBot", label: "Claude search" },
  { key: "claudeUser", userAgent: "Claude-User", label: "Claude user visits" },
] as const;

export const TRAINING_CRAWLERS = [
  { key: "gptBot", userAgent: "GPTBot", label: "GPTBot" },
  { key: "claudeBot", userAgent: "ClaudeBot", label: "ClaudeBot" },
  { key: "googleExtended", userAgent: "Google-Extended", label: "Google-Extended" },
  { key: "ccBot", userAgent: "CCBot", label: "CCBot" },
  { key: "applebotExtended", userAgent: "Applebot-Extended", label: "Applebot-Extended" },
] as const;

export type SearchCrawlerKey = (typeof SEARCH_CRAWLERS)[number]["key"];
export type TrainingCrawlerKey = (typeof TRAINING_CRAWLERS)[number]["key"];

export type RobotsSettings = {
  search: Record<SearchCrawlerKey, boolean>;
  training: Record<TrainingCrawlerKey, boolean>;
};

export const DEFAULT_ROBOTS_SETTINGS: RobotsSettings = {
  search: {
    googlebot: true,
    bingbot: true,
    oaiSearchBot: true,
    chatgptUser: true,
    perplexityBot: true,
    perplexityUser: true,
    claudeSearchBot: true,
    claudeUser: true,
  },
  training: {
    gptBot: false,
    claudeBot: false,
    googleExtended: false,
    ccBot: false,
    applebotExtended: false,
  },
};

export type SeoSettings = {
  titleTemplate: string;
  metaDescription: string;
  ogImage: string;
  indexable: boolean;
  sitemapEnabled: boolean;
  llmsSummary: string;
  legalName: string;
  geoLatitude: string;
  geoLongitude: string;
  openingHours: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  indexNowEnabled: boolean;
  robots: RobotsSettings;
  sitemapGeneratedAt: string;
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
  invoices: InvoiceSettings;
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
    primaryPhone: "0783110111",
    secondaryPhone: "+250788835517",
    whatsappNumber: "+250783110111",
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
    llmsSummary:
      "Solar Home System & Electronic supplies solar panels, inverters, batteries, lighting, water-heating systems and installation accessories for homes and businesses in Rwanda.",
    legalName: "Solar Home System & Electronic",
    geoLatitude: "",
    geoLongitude: "",
    openingHours: "Mo-Sa 08:00-18:00",
    googleSiteVerification: "",
    bingSiteVerification: "",
    indexNowEnabled: false,
    robots: DEFAULT_ROBOTS_SETTINGS,
    sitemapGeneratedAt: "",
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
  invoices: {
    business: {
      businessName: "Solar Home System & Electronic",
      tin: "",
      address: "123 Renewable Energy Way, Kigali, RW",
      phone: "0783110111",
      email: "info@solarhometech.rw",
      logo: "/images/brand/logo.png",
      pricesIncludeVat: false,
      vatRate: 0,
    },
    terms: "Thank you for your order. Delivery and payment terms are confirmed on WhatsApp before dispatch.",
    invoicePrefix: "INV",
    reissueOnConfirm: true,
    tokenExpiryDays: 60,
    confirmationMode: "pin_and_scan",
    pinAttempts: 5,
    pinLockMinutes: 15,
    geolocationRequired: false,
    templates: {
      order_invoice_customer: {
        metaTemplateName: "order_invoice_customer",
        languageCode: "en",
        variableMapping: { customerName: "1", orderNumber: "2", storeName: "3", total: "4", primaryNumber: "5", invoiceUrl: "6" },
      },
      order_invoice_staff: {
        metaTemplateName: "order_invoice_staff",
        languageCode: "en",
        variableMapping: { orderNumber: "1", customerName: "2", total: "3", invoiceUrl: "4" },
      },
      order_delivered_customer: {
        metaTemplateName: "order_delivered_customer",
        languageCode: "en",
        variableMapping: { customerName: "1", orderNumber: "2", storeName: "3" },
      },
    },
    whatsappApi: { enabled: false },
    recipients: [{ number: "0783110111", label: "Primary WhatsApp", events: ["new_order", "delivered"] }],
    autoSend: { onPlacement: true, onConfirmation: true, onDelivery: true },
  },
};
