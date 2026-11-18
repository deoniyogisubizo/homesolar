import type {
  ContactPage,
  FAQPage,
  Organization,
  Question,
  WebPage,
  WithContext,
} from "schema-dts";
import type { PageFaq } from "@/types";
import type { StoreIdentity } from "@/lib/jsonld/store";
import { organizationId, websiteId } from "@/lib/jsonld/store";
import { toAbsoluteUrl } from "@/lib/site";
import { stripHtml } from "@/lib/seo/text";

export function buildWebPageJsonLd({
  title,
  description,
  slug,
  store,
}: {
  title: string;
  description: string;
  slug: string;
  store: StoreIdentity;
}): WithContext<WebPage> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: stripHtml(description),
    url: toAbsoluteUrl(`/${slug}`),
    isPartOf: { "@id": websiteId(store) },
    publisher: { "@id": organizationId(store) },
  };
}

export function buildFaqJsonLd({
  title,
  description,
  slug,
  faqs,
  store,
}: {
  title: string;
  description: string;
  slug: string;
  faqs: PageFaq[];
  store: StoreIdentity;
}): WithContext<FAQPage> {
  const questions: Question[] = faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: stripHtml(faq.answer),
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: title,
    description: stripHtml(description),
    url: toAbsoluteUrl(`/${slug}`),
    isPartOf: { "@id": websiteId(store) },
    publisher: { "@id": organizationId(store) },
    mainEntity: questions,
  };
}

export function buildContactPageJsonLd({
  store,
  description,
}: {
  store: StoreIdentity;
  description: string;
}): WithContext<ContactPage> {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${store.name}`,
    description: stripHtml(description),
    url: toAbsoluteUrl("/contact"),
    isPartOf: { "@id": websiteId(store) },
    mainEntity: {
      "@type": "Organization",
      "@id": organizationId(store),
      name: store.name,
      telephone: store.telephone,
      email: store.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: store.address,
        addressCountry: "RW",
      },
    } satisfies Organization,
  };
}
