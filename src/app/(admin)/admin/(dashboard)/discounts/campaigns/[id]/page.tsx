import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
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
import { Campaign } from "@/models/Campaign";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const metadata = { title: "Edit campaign" };

function dateTimeLocal(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("campaigns:write");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const campaign = await Campaign.findById(id).lean();
  if (!campaign) notFound();

  const [categories, selectedProducts] = await Promise.all([
    Category.find({ active: true }).sort({ name: 1 }).select("name").lean(),
    Product.find({
      _id: { $in: [...campaign.productIds, ...campaign.excludedProductIds] },
    })
      .select("name slug image")
      .lean(),
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

  const initial: CampaignFormValues = {
    id: String(campaign._id),
    name: campaign.name,
    slug: campaign.slug,
    description: campaign.description,
    startsAt: dateTimeLocal(campaign.startsAt),
    endsAt: dateTimeLocal(campaign.endsAt),
    discountType: campaign.discountType,
    value: campaign.value,
    scope: campaign.scope,
    categoryIds: campaign.categoryIds.map((entry) => String(entry)),
    productIds: campaign.productIds.map((entry) => String(entry)),
    excludedProductIds: campaign.excludedProductIds.map((entry) => String(entry)),
    priority: campaign.priority,
    stackWithCoupons: campaign.stackWithCoupons,
    promoCode: campaign.promoCode,
    usageLimit: campaign.usageLimit ?? null,
    active: campaign.active,
    notes: campaign.notes,
    storefront: { ...EMPTY_STOREFRONT, ...campaign.storefront },
  };

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={`Editing the ${campaign.discountType === "percent" ? `${campaign.value}%` : "fixed"} campaign. Saved changes apply to the storefront immediately.`}
        breadcrumbs={[
          { label: "Sales" },
          { label: "Campaigns", href: "/admin/discounts/campaigns" },
          { label: campaign.name },
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
