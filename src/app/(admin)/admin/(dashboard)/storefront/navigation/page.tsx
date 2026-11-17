import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { NavigationManager } from "@/components/admin/content/NavigationManager";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeSiteContent } from "@/lib/site-defaults";
import { SiteContent } from "@/models/SiteContent";

export const metadata = { title: "Navigation" };

export default async function NavigationPage() {
  await guardPage("navigation:write");
  await connectToDatabase();
  const document = await SiteContent.findOne({ key: "home" }).lean();
  const content = normalizeSiteContent(document?.content);

  return (
    <>
      <PageHeader
        title="Navigation"
        description="Primary menu, dropdown links, search visibility and header display options."
        breadcrumbs={[{ label: "Storefront" }, { label: "Navigation" }]}
      />
      <PageBody>
        <NavigationManager initial={content.header} />
      </PageBody>
    </>
  );
}
