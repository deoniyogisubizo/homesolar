import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { SeoSettingsForm } from "@/components/admin/settings/SeoSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";

export const metadata = { title: "SEO settings" };

export default async function SeoSettingsPage() {
  await guardPage("seo:write");
  const seo = await getSetting("seo");

  return (
    <>
      <PageHeader
        title="SEO"
        description="Default titles, descriptions, social sharing image and indexing."
        breadcrumbs={[{ label: "Settings" }, { label: "SEO" }]}
      />
      <PageBody>
        <SeoSettingsForm initial={seo} />
      </PageBody>
    </>
  );
}
