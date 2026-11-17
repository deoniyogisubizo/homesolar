import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { CouponEditor, type CouponFormValues } from "@/components/admin/discounts/CouponEditor";
import type { CategoryChoice } from "@/components/admin/discounts/CampaignEditor";
import type { ProductOption } from "@/components/admin/content/ProductPicker";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Coupon } from "@/models/Coupon";
import { Product } from "@/models/Product";

export const metadata = { title: "Edit coupon" };

function dateTimeLocal(value: Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("coupons:write");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) notFound();

  const [categories, selectedProducts] = await Promise.all([
    Category.find({ active: true }).sort({ name: 1 }).select("name").lean(),
    Product.find({ _id: { $in: coupon.productIds } }).select("name slug image").lean(),
  ]);

  const categoryChoices: CategoryChoice[] = categories.map((category) => ({
    id: String(category._id),
    name: category.name,
  }));
  const productOptions: ProductOption[] = selectedProducts.map((product) => ({
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    image: product.image,
  }));

  const initial: CouponFormValues = {
    id: String(coupon._id),
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: coupon.value,
    minSubtotal: coupon.minSubtotal,
    maxDiscount: coupon.maxDiscount ?? null,
    usageLimit: coupon.usageLimit ?? null,
    perCustomerLimit: coupon.perCustomerLimit,
    startsAt: dateTimeLocal(coupon.startsAt),
    endsAt: dateTimeLocal(coupon.endsAt),
    scope: coupon.scope,
    productIds: coupon.productIds.map((entry) => String(entry)),
    categoryIds: coupon.categoryIds.map((entry) => String(entry)),
    status: coupon.status,
  };

  return (
    <>
      <PageHeader
        title={coupon.code}
        description={coupon.description || "Checkout discount code."}
        breadcrumbs={[
          { label: "Sales" },
          { label: "Coupons", href: "/admin/discounts/coupons" },
          { label: coupon.code },
        ]}
      />
      <PageBody>
        <CouponEditor
          initial={initial}
          categories={categoryChoices}
          productOptions={productOptions}
          usageCount={coupon.usageCount}
        />
      </PageBody>
    </>
  );
}
