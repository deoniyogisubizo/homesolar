import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { EMPTY_PAGE, PageEditor } from "@/components/admin/content/PageEditor";
import { guardPage } from "@/lib/admin/page-guard";

export const metadata = { title: "New page" };

export default async function NewPage() {
  await guardPage("pages:write");

  return (
    <>
      <PageHeader
        title="New page"
        description="Create a storefront page and publish it when the content is ready."
        breadcrumbs={[{ label: "Storefront" }, { label: "Pages", href: "/admin/storefront/pages" }, { label: "New" }]}
      />
      <PageBody>
        <PageEditor initial={EMPTY_PAGE} />
      </PageBody>
    </>
  );
}
