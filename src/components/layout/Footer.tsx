import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SocialIcon } from "@/components/ui/SocialIcon";
import type { ContactSettings } from "@/lib/admin/settings-defaults";
import { buildWhatsAppLink, normalizePhone } from "@/lib/whatsapp";
import type { SiteContentData } from "@/types";

const KNOWN_LINK_HREFS: Record<string, string> = {
  "about us": "/about-us",
  "faqs": "/faq",
  "contact us": "/contact",
  "shipping & delivery": "/shipping-and-delivery",
  "shipping and delivery": "/shipping-and-delivery",
  "returns & refunds": "/returns-and-refunds",
  "returns and refunds": "/returns-and-refunds",
  "warranty": "/warranty",
  "terms & conditions": "/terms-and-conditions",
  "terms and conditions": "/terms-and-conditions",
  "privacy policy": "/privacy-policy",
};

function footerHref(link: { label: string; href: string }) {
  const canonical = KNOWN_LINK_HREFS[link.label.trim().toLowerCase()];
  const legacyHref =
    !link.href ||
    link.href === "#" ||
    link.href === "/terms" ||
    link.href === "/privacy";
  if (canonical && legacyHref) return canonical;
  return link.href || "#";
}

export function Footer({
  content,
  contact,
  brand,
}: {
  content: SiteContentData;
  contact: ContactSettings;
  brand: { name: string; logo: string };
}) {
  const { footer } = content;
  const socials = contact.socials;
  const whatsappNumber = normalizePhone(contact.whatsappNumber);
  const whatsappLink = whatsappNumber
    ? buildWhatsAppLink(whatsappNumber, `Hello ${brand.name}, I have a question.`)
    : null;

  return (
    <footer className="mt-2 bg-navy text-white">
      <div className="container-page pt-[52px]">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.35fr_0.72fr_1fr_0.88fr]">
          <div>
            <Link href="/" aria-label={brand.name}>
              <Image
                src={brand.logo}
                alt={brand.name}
                width={588}
                height={111}
                className="h-auto w-[240px] max-w-full sm:w-[300px] lg:w-[330px]"
              />
            </Link>

            <div className="mt-6 space-y-3 text-[12.5px] leading-5 text-white/75">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white" strokeWidth={1.7} />
                <span>{contact.address}</span>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-white" strokeWidth={1.7} />
                <a href={`tel:${contact.primaryPhone.replace(/\s/g, "")}`} className="transition-colors hover:text-white">
                  {contact.primaryPhone}
                </a>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-white" strokeWidth={1.7} />
                <a href={`mailto:${contact.supportEmail}`} className="transition-colors hover:text-white">
                  {contact.supportEmail}
                </a>
              </p>
              <p className="mt-3 text-[11px] font-medium tracking-[0.1em] text-white/90 uppercase">
                Murakaza neza &middot; Welcome
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2">
              {socials.map((social) => (
                <a
                  key={`${social.platform}-${social.href}`}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white hover:text-white"
                >
                  <SocialIcon platform={social.platform} className="h-3.5 w-3.5" />
                </a>
              ))}
              {whatsappLink ? (
                <a
                  href={whatsappLink}
                  aria-label="WhatsApp"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white hover:text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>

          {footer.columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white">{column.title}</h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={footerHref(link)}
                      className="text-[12.5px] text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white">
              {footer.instagram.title}
            </h3>
            <Link href={footer.instagram.href} className="mt-5 block overflow-hidden" aria-label="Instagram">
              <Image
                src={footer.instagram.image}
                alt="Solar Home System Instagram"
                width={471}
                height={225}
                className="h-auto w-full max-w-[300px] object-cover transition-transform duration-300 hover:scale-[1.03]"
              />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:mt-20 lg:mt-[142px] items-center justify-between gap-4 border-t border-white/15 py-[34px] sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <p className="text-center text-[11.5px] text-white/60 sm:text-left">{footer.copyright}</p>
            <span className="hidden h-3 w-px bg-white/20 sm:block" aria-hidden="true" />
            <Link
              href="/admin/login"
              title="Admin sign in"
              className="text-[12px] font-semibold text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              I am admin
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {socials.slice(0, 4).map((social) => (
              <a
                key={`bottom-${social.platform}-${social.href}`}
                href={social.href}
                aria-label={social.label}
                className="text-white/60 transition-colors hover:text-white"
              >
                <SocialIcon platform={social.platform} className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
