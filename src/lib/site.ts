const DEVELOPMENT_SITE_URL = "http://localhost:3000";

function fail(message: string): never {
  throw new Error(`[site] ${message}`);
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      fail("NEXT_PUBLIC_SITE_URL is required in production. Set it to your canonical origin, for example https://yourdomain.com.");
    }
    return DEVELOPMENT_SITE_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`NEXT_PUBLIC_SITE_URL is not a valid absolute URL: ${raw}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    fail("NEXT_PUBLIC_SITE_URL must use http or https.");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    fail("NEXT_PUBLIC_SITE_URL must be an origin only, without a path, query or trailing slash.");
  }

  return parsed.origin;
}

export function getSiteHost(): string {
  return new URL(getSiteUrl()).host;
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path) return base;
  return new URL(path.startsWith("/") ? path : `/${path}`, base).toString();
}

export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function toAbsoluteUrl(value: string): string {
  return isAbsoluteUrl(value) ? value : absoluteUrl(value);
}

export function canonicalPath(pathname: string, page?: number | string | null): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const pageNumber = typeof page === "string" ? Number.parseInt(page, 10) : page;
  if (pageNumber && Number.isFinite(pageNumber) && pageNumber > 1) {
    return `${clean}?page=${pageNumber}`;
  }
  return clean;
}

export function canonicalUrl(pathname: string, page?: number | string | null): string {
  return absoluteUrl(canonicalPath(pathname, page));
}

export function normalizePathname(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}
