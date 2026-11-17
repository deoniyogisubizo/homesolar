import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { CouponEditor, type CouponFormValues } from "@/components/admin/discounts/CouponEditor";
import type { CategoryChoice } from "@/components/admin/discounts/CampaignEditor";
import type { ProductOption } from "@/components/admin/content/ProductPicker";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const metadata = { title: "New coupon" };

export default async function NewCouponPage() {
  await guardPage("coupons:write");
  await connectToDatabase();

  const [categories, products] = await Promise.all([
    Category.find({ active: true }).sort({ name: 1 }).select("name").lean(),
    Product.find({ publishStatus: { $ne: "archived" } })
      .sort({ name: 1 })
      .limit(300)
      .select("name slug image")
      .lean(),
  ]);

  const categoryChoices: CategoryChoice[] = categories.map((category) => ({
    id: String(category._id),
    name: category.name,
  }));
  const productOptions: ProductOption[] = products.map((product) => ({
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    image: product.image,
  }));

  const initial: CouponFormValues = {
    code: "",
    description: "",
    type: "percent",
    value: 10,
    minSubtotal: 0,
    maxDiscount: null,
    usageLimit: null,
    perCustomerLimit: 1,
    startsAt: "",
    endsAt: "",
    scope: "all",
    productIds: [],
    categoryIds: [],
    status: "active",
  };

  return (
    <>
      <PageHeader
        title="New coupon"
        description="Create a checkout code with limits, scheduling and product targeting."
        breadcrumbs={[
          { label: "Sales" },
          { label: "Coupons", href: "/admin/discounts/coupons" },
          { label: "New" },
        ]}
      />
      <PageBody>
        <CouponEditor
          initial={initial}
          categories={categoryChoices}
          productOptions={productOptions}
          usageCount={0}
        />
      </PageBody>
    </>
  );
}
