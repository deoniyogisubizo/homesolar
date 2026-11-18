import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSetting } from "@/lib/admin/settings";
import { buildContactPageJsonLd } from "@/lib/jsonld/page";
import { getStoreIdentity } from "@/lib/jsonld/store";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildWhatsAppLink, normalizePhone } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const [general, contact] = await Promise.all([getSetting("general"), getSetting("contact")]);
  return pageMetadata({
    title: `Contact ${general.storeName}`,
    description: `Contact ${general.storeName} for product advice, orders and delivery support. Phone ${contact.primaryPhone}, email ${contact.supportEmail}.`,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const [general, contact, store] = await Promise.all([
    getSetting("general"),
    getSetting("contact"),
    getStoreIdentity(),
  ]);

  const whatsappNumber = normalizePhone(contact.whatsappNumber);
  const whatsappLink = whatsappNumber
    ? buildWhatsAppLink(whatsappNumber, `Hello ${general.storeName}, I have a question.`)
    : null;
  const description = `Contact ${general.storeName} for product advice, orders and delivery support.`;

  return (
    <div className="container-page pb-16 pt-6 lg:pb-24 lg:pt-10">
      <JsonLd data={buildContactPageJsonLd({ store, description })} />

      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-muted">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-ink">Contact</span>
      </nav>

      <header className="mt-5 max-w-[820px] border-b border-line pb-6">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink lg:text-[38px]">
          Contact {general.storeName}
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-muted">
          Talk to our team about products, orders, delivery or installation advice. We reply during
          business hours.
        </p>
      </header>

      <div className="mt-8 grid max-w-[960px] gap-4 md:grid-cols-2">
        <section className="border border-line bg-tile px-5 py-6">
          <h2 className="text-[16px] font-semibold text-ink">Phone and WhatsApp</h2>
          <div className="mt-4 space-y-3 text-[14px] leading-6 text-muted">
            <p className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              <a href={`tel:${contact.primaryPhone.replace(/\s/g, "")}`} className="hover:text-ink">
                {contact.primaryPhone}
              </a>
            </p>
            {contact.secondaryPhone ? (
              <p className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                <a href={`tel:${contact.secondaryPhone.replace(/\s/g, "")}`} className="hover:text-ink">
                  {contact.secondaryPhone}
                </a>
              </p>
            ) : null}
            {whatsappLink ? (
              <p className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="hover:text-ink">
                  Chat on WhatsApp
                </a>
              </p>
            ) : null}
          </div>
        </section>

        <section className="border border-line bg-tile px-5 py-6">
          <h2 className="text-[16px] font-semibold text-ink">Email</h2>
          <div className="mt-4 space-y-3 text-[14px] leading-6 text-muted">
            <p className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              <a href={`mailto:${contact.supportEmail}`} className="hover:text-ink">
                {contact.supportEmail}
              </a>
            </p>
            {contact.salesEmail ? (
              <p className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                <a href={`mailto:${contact.salesEmail}`} className="hover:text-ink">
                  {contact.salesEmail}
                </a>
              </p>
            ) : null}
          </div>
        </section>

        <section className="border border-line bg-tile px-5 py-6">
          <h2 className="text-[16px] font-semibold text-ink">Visit or call in</h2>
          <div className="mt-4 space-y-3 text-[14px] leading-6 text-muted">
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              <span>{contact.address}</span>
            </p>
            {contact.mapUrl ? (
              <p>
                <a
                  href={contact.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-navy underline-offset-4 hover:underline"
                >
                  Open in Google Maps
                </a>
              </p>
            ) : null}
          </div>
        </section>

        <section className="border border-line bg-tile px-5 py-6">
          <h2 className="text-[16px] font-semibold text-ink">Business hours</h2>
          <div className="mt-4 space-y-3 text-[14px] leading-6 text-muted">
            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              <span>{contact.workingHours || "Contact us for current opening hours."}</span>
            </p>
            <p>
              For order-specific help, include your order number when you call or email so we can
              find your details faster.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
