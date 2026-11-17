import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { FooterManager } from "@/components/admin/content/FooterManager";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeSiteContent } from "@/lib/site-defaults";
import { SiteContent } from "@/models/SiteContent";

export const metadata = { title: "Footer" };

export default async function FooterPage() {
  await guardPage("footer:write");
  await connectToDatabase();
  const document = await SiteContent.findOne({ key: "home" }).lean();
  const content = normalizeSiteContent(document?.content);

  return (
    <>
      <PageHeader
        title="Footer"
        description="Link columns, Instagram card and copyright. Contact details are shared with the contact settings."
        breadcrumbs={[{ label: "Storefront" }, { label: "Footer" }]}
      />
      <PageBody>
        <FooterManager initial={content.footer} />
      </PageBody>
    </>
  );
}
