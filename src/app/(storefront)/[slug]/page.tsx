import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPageRedirect, getPublishedPage } from "@/lib/data";
import { buildFaqJsonLd, buildWebPageJsonLd } from "@/lib/jsonld/page";
import { getStoreIdentity } from "@/lib/jsonld/store";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoTitle } from "@/lib/seo/text";
import { sanitizeRichText } from "@/lib/sanitize";
import type { StorePage } from "@/types";

export const instant = false;

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolvePage(slug: string): Promise<StorePage | null> {
  const page = await getPublishedPage(slug);
  if (page) return page;

  const target = await getPageRedirect(slug);
  if (target) permanentRedirect(`/${target}`);
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolvePage(slug);
  if (!page) return { title: "Page not found", robots: { index: false, follow: false } };

  const store = await getStoreIdentity();
  return pageMetadata({
    title: seoTitle(page.seoTitle, page.title),
    description: page.seoDescription || page.excerpt || store.name,
    path: `/${page.slug}`,
    image: store.image,
    imageAlt: store.name,
    ogType: "article",
    noindex: page.noindex,
  });
}

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await resolvePage(slug);
  if (!page) notFound();

  const store = await getStoreIdentity();
  const description = page.seoDescription || page.excerpt || store.name;
  const schema =
    page.faqs.length > 0
      ? buildFaqJsonLd({
          title: page.title,
          description,
          slug: page.slug,
          faqs: page.faqs,
          store,
        })
      : buildWebPageJsonLd({
          title: page.title,
          description,
          slug: page.slug,
          store,
        });

  return (
    <article className="container-page pb-16 pt-6 lg:pb-24 lg:pt-10">
      <JsonLd data={schema} />

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

      {page.faqs.length > 0 ? (
        <section className="mt-12 max-w-[820px] border-t border-line pt-8" aria-labelledby="page-faq-heading">
          <h2 id="page-faq-heading" className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
            Frequently asked questions
          </h2>
          <dl className="mt-6 space-y-6">
            {page.faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-[15px] font-semibold text-ink">{faq.question}</dt>
                <dd className="mt-2 whitespace-pre-line text-[14px] leading-7 text-muted">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </article>
  );
}
