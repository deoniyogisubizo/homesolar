import "server-only";

import { BASE_CURRENCY } from "@/lib/calculator";
import { normalizePhone } from "@/lib/whatsapp-core";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site";
import { getSetting } from "@/lib/admin/settings";

export type StoreIdentity = {
  name: string;
  legalName: string;
  url: string;
  logo: string;
  image: string;
  currency: string;
  telephone: string;
  whatsappNumber: string | null;
  email: string;
  address: string;
  geo: { latitude: number; longitude: number } | null;
  openingHours: string;
  sameAs: string[];
};

export async function getStoreIdentity(): Promise<StoreIdentity> {
  const [general, contact, seo] = await Promise.all([
    getSetting("general"),
    getSetting("contact"),
    getSetting("seo"),
  ]);

  const latitude = Number(seo.geoLatitude);
  const longitude = Number(seo.geoLongitude);
  const hasGeo =
    seo.geoLatitude.trim() !== "" &&
    seo.geoLongitude.trim() !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return {
    name: general.storeName,
    legalName: seo.legalName || general.storeName,
    url: getSiteUrl(),
    logo: toAbsoluteUrl(general.logo),
    image: toAbsoluteUrl(seo.ogImage || general.logo),
    currency: BASE_CURRENCY,
    telephone: contact.primaryPhone,
    whatsappNumber: normalizePhone(contact.whatsappNumber) ?? null,
    email: contact.supportEmail,
    address: contact.address,
    geo: hasGeo ? { latitude, longitude } : null,
    openingHours: seo.openingHours,
    sameAs: contact.socials.map((social) => social.href).filter(Boolean),
  };
}

export function organizationId(store: StoreIdentity): string {
  return `${store.url}/#organization`;
}

export function websiteId(store: StoreIdentity): string {
  return `${store.url}/#website`;
}

export function storeId(store: StoreIdentity): string {
  return `${store.url}/#store`;
}

export function postalAddress(store: StoreIdentity) {
  const parts = store.address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const country = parts.length > 1 ? parts[parts.length - 1] : "";
  const locality = parts.length > 2 ? parts[parts.length - 2] : "";
  const street = parts.slice(0, Math.max(0, parts.length - (country ? 1 : 0) - (locality ? 1 : 0))).join(", ");

  return {
    "@type": "PostalAddress" as const,
    ...(street ? { streetAddress: street } : {}),
    ...(locality ? { addressLocality: locality } : {}),
    addressCountry: /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : "RW",
  };
}
