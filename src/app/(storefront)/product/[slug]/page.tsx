import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductTabs } from "@/components/product/ProductTabs";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSetting } from "@/lib/admin/settings";
import { BASE_CURRENCY } from "@/lib/calculator";
import {
  getProductBySlugOrId,
  getProductRedirect,
  getProductReviews,
  getProductSlugs,
  getRelatedProducts,
  getSiteContent,
} from "@/lib/data";
import { buildBreadcrumbList } from "@/lib/jsonld/breadcrumb";
import { buildProductJsonLd } from "@/lib/jsonld/product";
import { getStoreIdentity } from "@/lib/jsonld/store";
import { pageMetadata } from "@/lib/seo/metadata";
import { priceString, seoTitle } from "@/lib/seo/text";
import { absoluteUrl, toAbsoluteUrl } from "@/lib/site";
import type { Product } from "@/types";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const instant = false;

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

async function resolveProduct(slug: string): Promise<Product | null> {
  const product = await getProductBySlugOrId(slug);
  if (product) {
    if (isValidObjectId(slug) && slug !== product.slug) {
      permanentRedirect(`/product/${product.slug}`);
    }
    return product;
  }

  const target = await getProductRedirect(slug);
  if (target) permanentRedirect(`/product/${target}`);
  return null;
}

function initialVariant(product: Product) {
  return (
    product.variants.find((variant) => variant.isDefault) ??
    product.variants.find((variant) => variant.stock > 0) ??
    product.variants[0] ??
    null
  );
}

function initialPrice(product: Product): number {
  const variant = initialVariant(product);
  const quote = variant ? product.variantPricing?.[variant.sku] : product.pricing;
  return quote?.effectivePrice ?? variant?.price ?? product.price;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveProduct(slug);

  if (!product) {
    return { title: "Product not found", robots: { index: false, follow: false } };
  }

  const image = product.images[0]?.src ?? product.image;
  return pageMetadata({
    title: seoTitle(product.seoTitle || product.pageTitle, product.name),
    description: product.shortDescription || product.description,
    path: `/product/${product.slug}`,
    image,
    imageAlt: product.images[0]?.alt ?? product.name,
    ogType: "product",
    noindex: product.noindex,
    price: { amount: priceString(initialPrice(product)), currency: BASE_CURRENCY },
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await resolveProduct(slug);

  if (!product) notFound();

  const [siteContent, reviewPage, relatedProducts, store, shipping] = await Promise.all([
    getSiteContent(),
    getProductReviews(product.id, 1, 6),
    getRelatedProducts(product.id, product.category.slug, product.relatedProductIds),
    getStoreIdentity(),
    getSetting("shipping"),
  ]);

  const productUrl = toAbsoluteUrl(`/product/${product.slug}`);
  const productSchema = buildProductJsonLd({
    product,
    store,
    reviews: reviewPage.items,
    ratingVisible: product.ratingCount > 0 && product.ratingAverage > 0,
    shippingZones: shipping.zones,
  });
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", url: absoluteUrl("/") },
    { name: product.category.name, url: toAbsoluteUrl(`/category/${product.category.slug}`) },
    { name: product.name, url: productUrl },
  ]);

  return (
    <div className="container-page pb-16 pt-5 lg:pb-[96px] lg:pt-[30px]">
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumb} />

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
