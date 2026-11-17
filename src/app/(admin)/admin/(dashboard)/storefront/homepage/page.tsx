import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { HomepageManager } from "@/components/admin/content/HomepageManager";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeSiteContent } from "@/lib/site-defaults";
import { Product } from "@/models/Product";
import { SiteContent } from "@/models/SiteContent";
import type { ProductOption } from "@/components/admin/content/ProductPicker";

export const metadata = { title: "Homepage" };

export default async function HomepageStorefrontPage() {
  await guardPage("homepage:write");
  await connectToDatabase();
  const document = await SiteContent.findOne({ key: "home" }).lean();
  const content = normalizeSiteContent(document?.content);

  const ids = Array.from(new Set([...content.bestSelling.productIds, ...content.featured.productIds])).filter((id) =>
    /^[a-f\d]{24}$/i.test(id),
  );

  const products = ids.length
    ? await Product.find({ _id: { $in: ids } })
        .select("name slug image")
        .lean()
    : [];

  const options: ProductOption[] = products.map((product) => ({
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    image: product.image,
  }));

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Edit every block on the storefront homepage, then check the live page."
        breadcrumbs={[{ label: "Storefront" }, { label: "Homepage" }]}
        action={
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile"
          >
            View homepage
          </a>
        }
      />
      <PageBody>
        <HomepageManager content={content} bestSellingOptions={options} featuredOptions={options} />
      </PageBody>
    </>
  );
}
