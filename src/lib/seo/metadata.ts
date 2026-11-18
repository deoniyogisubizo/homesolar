import type { Metadata } from "next";
import { absoluteUrl, canonicalPath } from "@/lib/site";
import { truncateDescription } from "@/lib/seo/text";

export type MetadataInput = {
  title: string;
  description: string;
  path: string;
  page?: number | string | null;
  image?: string | null;
  imageAlt?: string;
  ogType?: "website" | "article" | "product";
  noindex?: boolean;
  price?: { amount: string; currency: string };
};

export function pageMetadata({
  title,
  description,
  path,
  page,
  image,
  imageAlt,
  ogType = "website",
  noindex = false,
  price,
}: MetadataInput): Metadata {
  const descriptionText = truncateDescription(description);
  const imageUrl = image ? absoluteUrl(image) : undefined;
  const canonical = canonicalPath(path, page);

  const openGraphType = ogType === "product" ? "website" : ogType;

  return {
    title,
    description: descriptionText,
    alternates: { canonical },
    openGraph: {
      type: openGraphType,
      title,
      description: descriptionText,
      url: canonical,
      ...(imageUrl ? { images: [{ url: imageUrl, alt: imageAlt ?? title }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description: descriptionText,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    ...(price || ogType === "product"
      ? {
          other: {
            ...(ogType === "product" ? { "og:type": "product" } : {}),
            ...(price
              ? {
                  "product:price:amount": price.amount,
                  "product:price:currency": price.currency,
                }
              : {}),
          },
        }
      : {}),
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
