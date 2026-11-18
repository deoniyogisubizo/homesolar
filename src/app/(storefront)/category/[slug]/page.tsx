import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getCategoryBySlug,
  getCategoryRedirect,
  getCategorySlugs,
  getProductsByCategorySlug,
} from "@/lib/data";
import { buildBreadcrumbList } from "@/lib/jsonld/breadcrumb";
import { buildCategoryJsonLd } from "@/lib/jsonld/category";
import { getStoreIdentity } from "@/lib/jsonld/store";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoTitle } from "@/lib/seo/text";
import { absoluteUrl, toAbsoluteUrl } from "@/lib/site";
import type { Category } from "@/types";

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

async function resolveCategory(slug: string): Promise<Category | null> {
  const category = await getCategoryBySlug(slug);
  if (category) return category;

  const target = await getCategoryRedirect(slug);
  if (target) permanentRedirect(`/category/${target}`);
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await resolveCategory(slug);

  if (!category) {
    return { title: "Category not found", robots: { index: false, follow: false } };
  }

  return pageMetadata({
    title: seoTitle(category.seoTitle, category.name),
    description: category.seoDescription || category.description,
    path: `/category/${category.slug}`,
    image: category.bannerImage || category.image,
    imageAlt: category.name,
    noindex: category.noindex,
  });
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await resolveCategory(slug);
  if (!category) notFound();

  const [products, store] = await Promise.all([
    getProductsByCategorySlug(category.slug),
    getStoreIdentity(),
  ]);

  const categorySchema = buildCategoryJsonLd({ category, products, store });
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", url: absoluteUrl("/") },
    { name: category.name, url: toAbsoluteUrl(`/category/${category.slug}`) },
  ]);

  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd data={categorySchema} />
      <JsonLd data={breadcrumb} />

      <nav className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="hover:text-navy">Home</Link>
        <span>/</span>
        <span className="text-navy">{category.name}</span>
      </nav>

      <div className="mt-6 bg-brand-light px-5 py-7 text-navy sm:mt-8 sm:px-8 sm:py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy/80">Category</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] sm:text-[38px]">{category.name}</h1>
        <p className="mt-3 max-w-[640px] text-[13px] leading-6 text-navy/70">{category.description}</p>
      </div>

      <div className="mt-7 flex items-center justify-between gap-3 sm:mt-9">
        <p className="text-[12px] text-muted">{products.length} products</p>
        <Link href="/search" className="text-[12px] font-medium text-navy hover:text-brand">View all products</Link>
      </div>

      {products.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-10 bg-tile px-6 py-14 text-center text-[13px] text-muted">
          Products in this category are coming soon.
        </p>
      )}
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="container-page py-6 sm:py-10">
      <div className="h-40 animate-pulse bg-tile" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-[144/118] animate-pulse bg-tile" />
        ))}
      </div>
    </div>
  );
}
