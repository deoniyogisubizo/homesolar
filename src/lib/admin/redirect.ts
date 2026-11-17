export function safeAdminRedirect(value: string | null | undefined) {
  if (!value) return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value.startsWith("/admin/login") || value.startsWith("/admin/forgot-password")) return "/admin";
  return value;
}
