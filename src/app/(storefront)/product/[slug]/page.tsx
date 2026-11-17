import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductTabs } from "@/components/product/ProductTabs";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import {
  getProductBySlugOrId,
  getProductReviews,
  getProductSlugs,
  getRelatedProducts,
  getSiteContent,
} from "@/lib/data";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const instant = false;

const FALLBACK_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);

  if (!product) return { title: "Product not found" };

  const image = product.images[0]?.src ?? product.image;
  const imageUrl = new URL(image, FALLBACK_SITE_URL).toString();

  return {
    title: product.pageTitle,
    description: product.shortDescription,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.pageTitle,
      description: product.shortDescription,
      url: `/product/${product.slug}`,
      images: [{ url: imageUrl, alt: product.images[0]?.alt ?? product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.pageTitle,
      description: product.shortDescription,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);

  if (!product) notFound();
  if (isValidObjectId(slug) && slug !== product.slug) {
    permanentRedirect(`/product/${product.slug}`);
  }

  const [siteContent, reviewPage, relatedProducts] = await Promise.all([
    getSiteContent(),
    getProductReviews(product.id, 1, 6),
    getRelatedProducts(product.id, product.category.slug, product.relatedProductIds),
  ]);

  return (
    <div className="container-page pb-16 pt-5 lg:pb-[96px] lg:pt-[30px]">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted lg:mb-[30px] lg:text-[12px]"
      >
        <Link href="/" className="transition-colors hover:text-ink">
          Home
        </Link>
        <span className="text-[#C4C7CC]" aria-hidden="true">
          /
        </span>
        <Link
          href={`/category/${product.category.slug}`}
          className="transition-colors hover:text-ink"
        >
          {product.category.name}
        </Link>
        <span className="text-[#C4C7CC]" aria-hidden="true">
          /
        </span>
        <span className="max-w-full truncate font-medium text-ink" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="product-shell">
        <div className="grid min-h-[80vh] gap-8 lg:min-h-0 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:items-start lg:gap-x-[3.6%] lg:gap-y-0">
          <ProductGallery images={product.images} productName={product.name} />
          <ProductBuyBox product={product} siteContent={siteContent} />
        </div>

        <ProductTabs
          product={product}
          initialReviews={reviewPage.items}
          initialReviewTotal={reviewPage.total}
        />

        <RelatedProducts products={relatedProducts} categorySlug={product.category.slug} />
      </div>
    </div>
  );
}
