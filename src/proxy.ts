import { NextResponse, type NextRequest } from "next/server";
import { createAdminToken, verifyAdminToken } from "@/lib/admin/token";

const COOKIE_NAME = "homesolar_admin";
const PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

function canonicalHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const canonical = canonicalHost();
  if (canonical) {
    const requestHost = request.headers.get("host")?.split(":")[0]?.toLowerCase();
    if (requestHost && requestHost === `www.${canonical.hostname.toLowerCase()}`) {
      const url = request.nextUrl.clone();
      url.protocol = canonical.protocol;
      url.host = canonical.host;
      return NextResponse.redirect(url, 308);
    }
  }

  const caseSensitivePath = ["/invoice/", "/delivery/", "/api/delivery/"].some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (!caseSensitivePath && pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ ok: false, error: "Cross-site request blocked." }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
      }
    }
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyAdminToken(token) : null;

  if (isAdminPage && isPublic) {
    if (payload && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!payload) {
    if (isAdminApi) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  const secondsLeft = payload.exp - Math.floor(Date.now() / 1000);
  const days = Number.parseInt(process.env.ADMIN_SESSION_DAYS ?? "7", 10);
  const sessionSeconds = (Number.isFinite(days) ? days : 7) * 86400;

  if (secondsLeft < sessionSeconds - 86400) {
    const refreshed = await createAdminToken({
      uid: payload.uid,
      role: payload.role,
      sv: payload.sv,
      exp: Math.floor(Date.now() / 1000) + sessionSeconds,
    });
    response.cookies.set(COOKIE_NAME, refreshed, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionSeconds,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
