import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { getSetting } from "@/lib/admin/settings";
import { getSiteUrl } from "@/lib/site";
import { AuthProvider } from "@/components/auth/AuthProvider";
import RouteProgress from "@/components/RouteProgress";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [general, seo] = await Promise.all([getSetting("general"), getSetting("seo")]);
  const verification = {
    ...(seo.googleSiteVerification ? { google: seo.googleSiteVerification } : {}),
    ...(seo.bingSiteVerification
      ? { other: { "msvalidate.01": seo.bingSiteVerification } }
      : {}),
  };

  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: general.storeName,
    title: {
      default: general.storeName,
      template: seo.titleTemplate,
    },
    description: seo.metaDescription,
    icons: general.favicon ? { icon: general.favicon } : undefined,
    openGraph: {
      type: "website",
      siteName: general.storeName,
      locale: "en_RW",
      title: general.storeName,
      description: seo.metaDescription,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
    twitter: {
      card: seo.ogImage ? "summary_large_image" : "summary",
      title: general.storeName,
      description: seo.metaDescription,
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    ...(Object.keys(verification).length ? { verification } : {}),
    robots: seo.indexable ? undefined : { index: false, follow: false },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <body className="flex min-h-screen flex-col bg-white font-sans text-ink antialiased">
        <RouteProgress />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
