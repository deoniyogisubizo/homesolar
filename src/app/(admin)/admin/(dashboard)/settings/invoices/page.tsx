import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { InvoiceSettingsForm } from "@/components/admin/settings/InvoiceSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { whatsAppStatus } from "@/lib/whatsapp/config";

export const metadata = { title: "Invoices and delivery" };

export default async function InvoiceSettingsPage() {
  await guardPage("settings:write");
  const [invoices, general] = await Promise.all([getSetting("invoices"), getSetting("general")]);

  return (
    <>
      <PageHeader
        title="Invoices and delivery"
        description="Invoice numbering, PDF content, delivery confirmation, WhatsApp templates and staff recipients."
        breadcrumbs={[{ label: "Settings" }, { label: "Invoices and delivery" }]}
      />
      <PageBody>
        <InvoiceSettingsForm
          initial={invoices}
          status={whatsAppStatus()}
          currencySymbol={general.currencySymbol}
        />
      </PageBody>
    </>
  );
}
