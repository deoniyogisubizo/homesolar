import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import {
  CampaignEditor,
  EMPTY_STOREFRONT,
  type CampaignFormValues,
  type CategoryChoice,
} from "@/components/admin/discounts/CampaignEditor";
import type { ProductOption } from "@/components/admin/content/ProductPicker";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const metadata = { title: "New campaign" };

function dateTimeLocal(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function NewCampaignPage() {
  await guardPage("campaigns:write");
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

  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const end = new Date(now);
  end.setDate(end.getDate() + 7);

  const initial: CampaignFormValues = {
    name: "",
    slug: "",
    description: "",
    startsAt: dateTimeLocal(now),
    endsAt: dateTimeLocal(end),
    discountType: "percent",
    value: 10,
    scope: "store",
    categoryIds: [],
    productIds: [],
    excludedProductIds: [],
    priority: 0,
    stackWithCoupons: false,
    promoCode: "",
    usageLimit: null,
    active: true,
    notes: "",
    storefront: { ...EMPTY_STOREFRONT },
  };

  return (
    <>
      <PageHeader
        title="New campaign"
        description="Schedule a discount and the promotional content that runs with it."
        breadcrumbs={[
          { label: "Sales" },
          { label: "Campaigns", href: "/admin/discounts/campaigns" },
          { label: "New" },
        ]}
      />
      <PageBody>
        <CampaignEditor
          initial={initial}
          categories={categoryChoices}
          productOptions={productOptions}
          excludedOptions={productOptions}
        />
      </PageBody>
    </>
  );
}
