import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

const noindexHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const privatePaths = [
  "/cart",
  "/checkout",
  "/account/:path*",
  "/order/:path*",
  "/search",
  "/wishlist",
  "/admin/:path*",
  "/api/:path*",
];

const noindexPaths = ["/invoice/:path*", "/delivery/:path*"];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["sharp", "nodemailer", "bcryptjs", "mongoose", "@react-pdf/renderer", "qrcode"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...privatePaths.map((source) => ({ source, headers: noindexHeaders })),
      ...noindexPaths.map((source) => ({
        source,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      })),
      {
        source: "/delivery/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }],
      },
    ];
  },
};

export default nextConfig;
