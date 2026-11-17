import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { EMPTY_CATEGORY, CategoryEditor } from "@/components/admin/catalog/CategoryEditor";
import { guardPage } from "@/lib/admin/page-guard";

export const metadata = { title: "New category" };

export default async function NewCategoryPage() {
  await guardPage("categories:write");

  return (
    <>
      <PageHeader
        title="New category"
        description="Groups products across the storefront, navigation and homepage."
        breadcrumbs={[
          { label: "Catalog" },
          { label: "Categories", href: "/admin/categories" },
          { label: "New" },
        ]}
      />
      <PageBody>
        <CategoryEditor initial={EMPTY_CATEGORY} />
      </PageBody>
    </>
  );
}
