import type {
  Organization,
  SearchAction,
  Store,
  WebSite,
  WithContext,
} from "schema-dts";
import {
  organizationId,
  postalAddress,
  storeId,
  websiteId,
  type StoreIdentity,
} from "@/lib/jsonld/store";

export function buildOrganization(store: StoreIdentity): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId(store),
    name: store.name,
    legalName: store.legalName,
    url: store.url,
    logo: {
      "@type": "ImageObject",
      url: store.logo,
    },
    image: store.image,
    telephone: store.telephone,
    email: store.email,
    address: postalAddress(store),
    contactPoint: [
      {
        "@type": "ContactPoint" as const,
        contactType: "customer service",
        telephone: store.telephone,
        email: store.email,
        areaServed: "RW",
        availableLanguage: ["en", "fr", "rw"],
      },
      ...(store.whatsappNumber
        ? [
            {
              "@type": "ContactPoint" as const,
              contactType: "customer service",
              telephone: store.whatsappNumber,
              areaServed: "RW",
              availableLanguage: ["en", "fr", "rw"],
            },
          ]
        : []),
    ],
    ...(store.sameAs.length ? { sameAs: store.sameAs } : {}),
  };
}

export function buildWebSite(store: StoreIdentity): WithContext<WebSite> {
  const searchAction: SearchAction & { "query-input": string } = {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${store.url}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  };

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId(store),
    url: store.url,
    name: store.name,
    publisher: { "@id": organizationId(store) },
    potentialAction: searchAction,
  };
}

export function buildStore(store: StoreIdentity): WithContext<Store> {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": storeId(store),
    name: store.name,
    url: store.url,
    image: store.image,
    logo: store.logo,
    telephone: store.telephone,
    email: store.email,
    address: postalAddress(store),
    ...(store.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: store.geo.latitude,
            longitude: store.geo.longitude,
          },
        }
      : {}),
    ...(store.openingHours ? { openingHours: store.openingHours } : {}),
    currenciesAccepted: store.currency,
    parentOrganization: { "@id": organizationId(store) },
  };
}
