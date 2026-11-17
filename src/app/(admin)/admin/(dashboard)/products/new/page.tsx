import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { EMPTY_PRODUCT, ProductEditor, type CategoryOption } from "@/components/admin/catalog/ProductEditor";
import type { ProductOption } from "@/components/admin/content/ProductPicker";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await guardPage("products:write");
  await connectToDatabase();

  const [categories, products] = await Promise.all([
    Category.find({ active: true }).sort({ name: 1 }).select("name").lean(),
    Product.find({ publishStatus: { $ne: "archived" } })
      .sort({ name: 1 })
      .limit(200)
      .select("name slug image")
      .lean(),
  ]);

  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    id: String(category._id),
    name: category.name,
  }));
  const relatedOptions: ProductOption[] = products.map((product) => ({
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    image: product.image,
  }));

  return (
    <>
      <PageHeader
        title="New product"
        description="Add photos, pricing, stock and the details shoppers need before publishing."
        breadcrumbs={[{ label: "Catalog" }, { label: "Products", href: "/admin/products" }, { label: "New" }]}
      />
      <PageBody>
        <ProductEditor initial={EMPTY_PRODUCT} categories={categoryOptions} relatedOptions={relatedOptions} />
      </PageBody>
    </>
  );
}
