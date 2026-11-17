import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getPublishedPage } from "@/lib/data";
import { sanitizeRichText } from "@/lib/sanitize";

export const instant = false;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return { title: "Page not found" };

  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/${page.slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  return (
    <article className="container-page pb-16 pt-6 lg:pb-24 lg:pt-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-muted">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-ink">{page.title}</span>
      </nav>

      <header className="mt-5 max-w-[820px] border-b border-line pb-6">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink lg:text-[38px]">
          {page.title}
        </h1>
        {page.excerpt ? <p className="mt-3 text-[14px] leading-6 text-muted">{page.excerpt}</p> : null}
      </header>

      <div
        className="rich-text mt-7 max-w-[820px] text-[14px] leading-7 text-ink"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(page.content) }}
      />
    </article>
  );
}
