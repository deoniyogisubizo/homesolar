import type { Permission } from "@/lib/admin/permissions";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: string;
  permission: Permission;
  exact?: boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: "gauge", permission: "dashboard:read", exact: true }],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: "receipt", permission: "orders:read" },
      { label: "Customers", href: "/admin/customers", icon: "users", permission: "customers:read" },
      { label: "Campaigns", href: "/admin/discounts/campaigns", icon: "megaphone", permission: "campaigns:read" },
      { label: "Coupons", href: "/admin/discounts/coupons", icon: "tag", permission: "coupons:read" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: "package", permission: "products:read" },
      { label: "Categories", href: "/admin/categories", icon: "layers", permission: "categories:read" },
      { label: "Inventory", href: "/admin/inventory", icon: "boxes", permission: "inventory:read" },
      { label: "Reviews", href: "/admin/reviews", icon: "star", permission: "reviews:read" },
    ],
  },
  {
    label: "Storefront",
    items: [
      { label: "Homepage", href: "/admin/storefront/homepage", icon: "layout", permission: "homepage:read" },
      { label: "Navigation", href: "/admin/storefront/navigation", icon: "menu", permission: "navigation:read" },
      { label: "Footer", href: "/admin/storefront/footer", icon: "panel-bottom", permission: "footer:read" },
      { label: "Pages", href: "/admin/storefront/pages", icon: "file-text", permission: "pages:read" },
      { label: "Media library", href: "/admin/media", icon: "image", permission: "media:read" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Newsletter", href: "/admin/newsletter", icon: "send", permission: "newsletter:read" },
      { label: "Email templates", href: "/admin/emails", icon: "mail", permission: "emails:read" },
      { label: "Messages", href: "/admin/messages", icon: "message-square", permission: "messages:read" },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", href: "/admin/reports", icon: "bar-chart", permission: "reports:read" }],
  },
  {
    label: "Settings",
    items: [
      { label: "General", href: "/admin/settings/general", icon: "settings", permission: "settings:read" },
      { label: "Contact and social", href: "/admin/settings/contact", icon: "phone", permission: "contact:read" },
      {
        label: "Checkout and WhatsApp",
        href: "/admin/settings/whatsapp",
        icon: "message-square",
        permission: "contact:read",
      },
      {
        label: "Invoices and delivery",
        href: "/admin/settings/invoices",
        icon: "file-text",
        permission: "settings:read",
      },
      {
        label: "Notifications",
        href: "/admin/settings/notifications",
        icon: "bell",
        permission: "notifications:read",
      },
      {
        label: "Shipping and payments",
        href: "/admin/settings/shipping",
        icon: "truck",
        permission: "shipping:read",
      },
      { label: "Email", href: "/admin/settings/email", icon: "at-sign", permission: "smtp:read" },
      { label: "SEO", href: "/admin/settings/seo", icon: "search", permission: "seo:read" },
      { label: "SEO Health", href: "/admin/seo-health", icon: "gauge", permission: "seo:read" },
      { label: "Users and roles", href: "/admin/users", icon: "shield", permission: "users:read" },
      { label: "Audit log", href: "/admin/audit", icon: "history", permission: "audit:read" },
    ],
  },
];
