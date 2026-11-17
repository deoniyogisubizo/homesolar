export const ADMIN_ROLES = ["owner", "admin", "editor", "support"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  editor: "Editor",
  support: "Support",
};

export const PERMISSIONS = [
  "dashboard:read",
  "orders:read",
  "orders:write",
  "customers:read",
  "customers:write",
  "products:read",
  "products:write",
  "categories:read",
  "categories:write",
  "inventory:read",
  "inventory:write",
  "reviews:read",
  "reviews:write",
  "campaigns:read",
  "campaigns:write",
  "coupons:read",
  "coupons:write",
  "homepage:read",
  "homepage:write",
  "navigation:read",
  "navigation:write",
  "footer:read",
  "footer:write",
  "pages:read",
  "pages:write",
  "media:read",
  "media:write",
  "newsletter:read",
  "newsletter:write",
  "emails:read",
  "emails:write",
  "messages:read",
  "messages:write",
  "reports:read",
  "settings:read",
  "settings:write",
  "contact:read",
  "contact:write",
  "notifications:read",
  "notifications:write",
  "shipping:read",
  "shipping:write",
  "smtp:read",
  "smtp:write",
  "seo:read",
  "seo:write",
  "users:read",
  "users:write",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const ADMIN_DENIED: Permission[] = [
  "users:read",
  "users:write",
  "smtp:read",
  "smtp:write",
];

const EDITOR_ALLOWED: Permission[] = [
  "dashboard:read",
  "products:read",
  "products:write",
  "categories:read",
  "categories:write",
  "inventory:read",
  "inventory:write",
  "reviews:read",
  "reviews:write",
  "campaigns:read",
  "campaigns:write",
  "coupons:read",
  "coupons:write",
  "homepage:read",
  "homepage:write",
  "navigation:read",
  "navigation:write",
  "footer:read",
  "footer:write",
  "pages:read",
  "pages:write",
  "media:read",
  "media:write",
  "reports:read",
  "settings:read",
  "contact:read",
  "notifications:read",
  "shipping:read",
  "seo:read",
  "seo:write",
];

const SUPPORT_ALLOWED: Permission[] = [
  "dashboard:read",
  "orders:read",
  "orders:write",
  "customers:read",
  "customers:write",
  "messages:read",
  "messages:write",
  "reviews:read",
  "reviews:write",
  "products:read",
  "categories:read",
  "inventory:read",
  "campaigns:read",
  "coupons:read",
  "homepage:read",
  "navigation:read",
  "footer:read",
  "pages:read",
  "media:read",
  "newsletter:read",
  "emails:read",
  "reports:read",
  "settings:read",
  "contact:read",
  "notifications:read",
  "shipping:read",
  "seo:read",
];

const MATRIX: Record<AdminRole, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((permission) => !ADMIN_DENIED.includes(permission)),
  editor: EDITOR_ALLOWED,
  support: SUPPORT_ALLOWED,
};

export function permissionsFor(role: AdminRole): Permission[] {
  return MATRIX[role];
}

export function can(role: AdminRole, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}
