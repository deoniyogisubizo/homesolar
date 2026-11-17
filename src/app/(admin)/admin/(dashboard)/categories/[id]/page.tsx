import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { CategoryEditor, type CategoryFormValues } from "@/components/admin/catalog/CategoryEditor";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("categories:write");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const category = await Category.findById(id).lean();
  if (!category) notFound();
  const productCount = await Product.countDocuments({ category: category._id });

  const initial: CategoryFormValues = {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    bannerImage: category.bannerImage ?? "",
    showOnHome: category.showOnHome ?? false,
    order: category.order ?? 0,
    active: category.active ?? true,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
  };

  return (
    <>
      <PageHeader
        title={category.name}
        description={`Editing /category/${category.slug}.`}
        breadcrumbs={[
          { label: "Catalog" },
          { label: "Categories", href: "/admin/categories" },
          { label: category.name },
        ]}
      />
      <PageBody>
        <CategoryEditor initial={initial} productCount={productCount} />
      </PageBody>
    </>
  );
}
