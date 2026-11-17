import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { getSetting } from "@/lib/admin/settings";
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
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: general.storeName,
      template: seo.titleTemplate,
    },
    description: seo.metaDescription,
    icons: general.favicon ? { icon: general.favicon } : undefined,
    openGraph: {
      title: general.storeName,
      description: seo.metaDescription,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
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
