import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { CopyableUrl } from "@/components/admin/CopyableUrl";
import { IndexNowButton } from "@/app/(admin)/admin/(dashboard)/seo-health/IndexNowButton";
import { getSetting } from "@/lib/admin/settings";
import { guardPage } from "@/lib/admin/page-guard";
import { BASE_CURRENCY } from "@/lib/calculator";
import { getAllCategories, getMerchantFeedProducts, getPublishedPages } from "@/lib/data";
import { buildMerchantFeed } from "@/lib/seo/merchant-feed";
import { indexNowKey } from "@/lib/seo/indexnow";
import { getSiteUrl } from "@/lib/site";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Page } from "@/models/Page";

export const metadata = { title: "SEO Health" };

type Issue = {
  id: string;
  label: string;
  detail?: string;
  href: string;
};

function IssueList({
  title,
  description,
  items,
  empty,
}: {
  title: string;
  description: string;
  items: Issue[];
  empty: string;
}) {
  return (
    <section className="rounded-[8px] border border-admin-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-[12px] text-admin-muted">{description}</p>
        </div>
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold ${
            items.length ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
          }`}
        >
          {items.length}
        </span>
      </div>

      {items.length ? (
        <ul className="mt-4 divide-y divide-admin-line">
          {items.slice(0, 12).map((item) => (
            <li key={`${item.href}-${item.id}`} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-ink">{item.label}</p>
                {item.detail ? <p className="truncate text-[11px] text-admin-muted">{item.detail}</p> : null}
              </div>
              <Link
                href={item.href}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-brand-deep hover:underline"
              >
                Fix
                <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-[12px] text-success">
          <CheckCircle2 className="h-4 w-4" />
          {empty}
        </p>
      )}

      {items.length > 12 ? (
        <p className="mt-2 text-[11px] text-admin-muted">And {items.length - 12} more.</p>
      ) : null}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[8px] border border-admin-line bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-5 text-admin-muted">{detail}</p> : null}
    </div>
  );
}

export default async function SeoHealthPage() {
  await guardPage("seo:read");

  const [products, categories, pages, seo, general, shipping] = await Promise.all([
    getMerchantFeedProducts(),
    getAllCategories(),
    getPublishedPages(),
    getSetting("seo"),
    getSetting("general"),
    getSetting("shipping"),
  ]);

  await connectToDatabase();
  const [productRedirects, categoryRedirects, pageRedirects] = await Promise.all([
    Product.countDocuments({ "slugHistory.0": { $exists: true } }),
    Category.countDocuments({ "slugHistory.0": { $exists: true } }),
    Page.countDocuments({ "slugHistory.0": { $exists: true } }),
  ]);

  const feed = buildMerchantFeed(products, {
    siteUrl: getSiteUrl(),
    storeName: general.storeName,
    currency: BASE_CURRENCY,
    shippingZones: shipping.zones,
    taxRate: shipping.taxRate,
  });

  const missingProductDescription = products
    .filter((product) => !product.seoDescription && !product.noindex)
    .map<Issue>((product) => ({
      id: product.id,
      label: product.name,
      detail: "No meta description",
      href: `/admin/products/${product.id}`,
    }));
  const missingProductTitle = products
    .filter((product) => !product.seoTitle && !product.noindex)
    .map<Issue>((product) => ({
      id: product.id,
      label: product.name,
      detail: "No SEO title",
      href: `/admin/products/${product.id}`,
    }));
  const missingIdentifiers = products
    .filter((product) => !product.gtin && !product.mpn)
    .map<Issue>((product) => ({
      id: product.id,
      label: product.name,
      detail: "No GTIN or MPN; feed sends identifier_exists=no",
      href: `/admin/products/${product.id}`,
    }));
  const categoryIssues = categories
    .filter((category) => !category.seoDescription || !category.seoTitle)
    .map<Issue>((category) => ({
      id: category.id,
      label: category.name,
      detail: !category.seoTitle ? "No SEO title" : "No meta description",
      href: `/admin/categories/${category.id}`,
    }));
  const pageIssues = pages
    .filter((page) => !page.noindex && (!page.seoDescription || !page.seoTitle))
    .map<Issue>((page) => ({
      id: page.id,
      label: page.title,
      detail: !page.seoTitle ? "No SEO title" : "No meta description",
      href: `/admin/storefront/pages/${page.id}`,
    }));
  const feedIssues = feed.skipped.map<Issue>((product) => ({
    id: product.id,
    label: product.name,
    detail: product.reason,
    href: `/admin/products/${product.id}`,
  }));

  const sitemapTime = seo.sitemapGeneratedAt
    ? new Date(seo.sitemapGeneratedAt).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: general.timezone || "Africa/Kigali",
      })
    : "Not recorded";

  const configurationWarnings = [
    !seo.indexable ? "Site indexing is disabled in SEO settings." : null,
    !seo.sitemapEnabled ? "sitemap.xml publishing is disabled." : null,
    !seo.googleSiteVerification ? "Google Search Console verification code is empty." : null,
    !seo.bingSiteVerification ? "Bing Webmaster verification code is empty." : null,
    !seo.legalName ? "Legal name is empty for Organization markup." : null,
    !seo.geoLatitude || !seo.geoLongitude ? "Store geo coordinates are incomplete." : null,
  ].filter((warning): warning is string => Boolean(warning));

  return (
    <>
      <PageHeader
        title="SEO Health"
        description="Indexing, structured data, redirects and Merchant Center feed readiness."
        breadcrumbs={[{ label: "Settings" }, { label: "SEO Health" }]}
      />
      <PageBody>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Live products"
              value={products.length}
              detail={`${products.filter((product) => product.noindex).length} marked noindex`}
            />
            <Stat
              label="Categories"
              value={categories.length}
              detail={`${categories.filter((category) => category.noindex).length} marked noindex`}
            />
            <Stat
              label="Published pages"
              value={pages.length}
              detail={`${pages.filter((page) => page.noindex).length} marked noindex`}
            />
            <Stat
              label="Active redirects"
              value={productRedirects + categoryRedirects + pageRedirects}
              detail={`${productRedirects} products, ${categoryRedirects} categories, ${pageRedirects} pages`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Sitemap generated" value={sitemapTime} detail={`${products.length + categories.length + pages.length + 1} URLs before exclusions`} />
            <Stat label="Feed items" value={feed.items.length} detail="One item per product variant" />
            <Stat label="Skipped from feed" value={feed.skipped.length} detail="Missing required product data" />
            <Stat
              label="Merchant currency"
              value={BASE_CURRENCY}
              detail="Feed prices use the stored base currency"
            />
          </div>

          {configurationWarnings.length ? (
            <section className="rounded-[8px] border border-warning/30 bg-warning-pale p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Configuration checks
              </h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] leading-6 text-ink">
                {configurationWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              <Link
                href="/admin/settings/seo"
                className="mt-3 inline-flex text-[12px] font-medium text-brand-deep hover:underline"
              >
                Open SEO settings
              </Link>
            </section>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <IssueList
              title="Products skipped from the Merchant feed"
              description="These products cannot be submitted until the missing data is added."
              items={feedIssues}
              empty="Every active product has the required feed data."
            />
            <IssueList
              title="Products without meta descriptions"
              description="Search engines will fall back to the short description."
              items={missingProductDescription}
              empty="Every indexable product has a meta description."
            />
            <IssueList
              title="Products without SEO titles"
              description="The product name is used when this is empty."
              items={missingProductTitle}
              empty="Every indexable product has an SEO title."
            />
            <IssueList
              title="Products without GTIN or MPN"
              description="Add an identifier, or the feed declares identifier_exists=no."
              items={missingIdentifiers}
              empty="Every product has a GTIN or MPN."
            />
            <IssueList
              title="Categories missing SEO fields"
              description="Category pages use these fields for their search listing."
              items={categoryIssues}
              empty="Every category has an SEO title and description."
            />
            <IssueList
              title="Published pages missing SEO fields"
              description="Policy and FAQ pages should have complete metadata."
              items={pageIssues}
              empty="Every indexable published page has metadata."
            />
          </div>

          <section className="rounded-[8px] border border-admin-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink">Discoverability URLs</h2>
            <p className="mt-1 text-[12px] text-admin-muted">
              Use these in Google Search Console, Bing Webmaster Tools and Google Merchant Center.
            </p>
            <div className="mt-3 max-w-2xl">
              <CopyableUrl label="robots.txt" path="/robots.txt" />
              <CopyableUrl label="Sitemap index" path="/sitemap.xml" />
              <CopyableUrl label="llms.txt" path="/llms.txt" />
              <CopyableUrl label="Google Merchant XML" path="/feeds/google-merchant.xml" />
              <CopyableUrl label="Google Merchant TSV" path="/feeds/google-merchant.tsv" />
              <CopyableUrl label="IndexNow key file" path="/indexnow.txt" />
            </div>
          </section>

          <IndexNowButton enabled={seo.indexNowEnabled} configured={Boolean(indexNowKey())} />
        </div>
      </PageBody>
    </>
  );
}
