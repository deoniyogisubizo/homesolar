import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { ShippingSettingsForm } from "@/components/admin/settings/ShippingSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";

export const metadata = { title: "Shipping and payments" };

export default async function ShippingSettingsPage() {
  await guardPage("shipping:write");
  const shipping = await getSetting("shipping");

  return (
    <>
      <PageHeader
        title="Shipping and payments"
        description="Delivery zones, tax, payment methods and product trust badges."
        breadcrumbs={[{ label: "Settings" }, { label: "Shipping and payments" }]}
      />
      <PageBody>
        <ShippingSettingsForm initial={shipping} />
      </PageBody>
    </>
  );
}
