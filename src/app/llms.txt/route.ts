import { BASE_CURRENCY } from "@/lib/calculator";
import { getSetting } from "@/lib/admin/settings";
import { getAllCategories, getBestSellerRanking, getPublishedPages } from "@/lib/data";
import { priceString } from "@/lib/seo/text";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

const POLICY_SLUGS = new Set([
  "about-us",
  "about",
  "faq",
  "faqs",
  "shipping-and-delivery",
  "shipping",
  "returns-and-refunds",
  "returns",
  "warranty",
]);

export async function GET() {
  const [general, contact, seo, categories, pages, products] = await Promise.all([
    getSetting("general"),
    getSetting("contact"),
    getSetting("seo"),
    getAllCategories(),
    getPublishedPages(),
    getBestSellerRanking(10),
  ]);

  const siteUrl = getSiteUrl();
  const visibleCategories = categories.filter(
    (category) => category.active && !category.noindex && (category.productCount ?? 0) > 0,
  );
  const policyPages = pages.filter((page) => !page.noindex && POLICY_SLUGS.has(page.slug));
  const otherPages = pages.filter(
    (page) => !page.noindex && !POLICY_SLUGS.has(page.slug) && page.slug.length > 0,
  );

  const lines: string[] = [
    `# ${general.storeName}`,
    "",
    `> ${seo.llmsSummary || seo.metaDescription || general.tagline}`,
    "",
    "## Categories",
    "",
  ];

  for (const category of visibleCategories) {
    lines.push(
      `- [${category.name}](${absoluteUrl(`/category/${category.slug}`)}): ${category.productCount} products. ${category.description}`,
    );
  }

  if (policyPages.length || otherPages.length) {
    lines.push("", "## Pages", "");
    for (const page of [...policyPages, ...otherPages]) {
      lines.push(`- [${page.title}](${absoluteUrl(`/${page.slug}`)}): ${page.excerpt || page.title}`);
    }
  }

  if (products.length) {
    lines.push("", "## Best-selling products", "");
    for (const product of products) {
      const price = product.pricing?.effectivePrice ?? product.price;
      lines.push(
        `- [${product.name}](${absoluteUrl(`/product/${product.slug}`)}): ${BASE_CURRENCY} ${priceString(price)}. ${product.shortDescription}`,
      );
    }
  }

  lines.push(
    "",
    "## Contact",
    "",
    `- Store: ${contact.address}`,
    `- Phone: ${contact.primaryPhone}`,
    `- Email: ${contact.supportEmail}`,
    ...(contact.workingHours ? [`- Opening hours: ${contact.workingHours}`] : []),
    "",
    "## Sitemap",
    "",
    `- ${siteUrl}/sitemap.xml`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
