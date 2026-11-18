import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getSetting } from "@/lib/admin/settings";
import { getSiteContent } from "@/lib/data";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [content, general, contact] = await Promise.all([
    getSiteContent(),
    getSetting("general"),
    getSetting("contact"),
  ]);

  if (general.maintenanceMode) {
    return (
      <main className="container-page flex min-h-screen items-center justify-center py-20">
        <div className="max-w-[520px] text-center">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-navy">{general.storeName}</h1>
          <p className="mt-4 text-[15px] leading-7 text-muted">{general.maintenanceMessage}</p>
          <p className="mt-6 text-[12px] text-muted">
            {contact.supportEmail} · {contact.primaryPhone}
          </p>
        </div>
      </main>
    );
  }

  return (
    <CurrencyProvider>
      <Header content={content} brand={{ name: general.storeName, logo: general.logo }} contact={contact} />
      <main className="flex-1">{children}</main>
      <Footer
        content={content}
        contact={contact}
        brand={{ name: general.storeName, logo: general.logoLight || general.logo }}
      />
    </CurrencyProvider>
  );
}
