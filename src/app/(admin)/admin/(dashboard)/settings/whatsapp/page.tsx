import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { WhatsAppSettingsForm } from "@/components/admin/settings/WhatsAppSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { normalizePhone } from "@/lib/whatsapp";

export const metadata = { title: "Checkout and WhatsApp" };

export default async function WhatsAppSettingsPage() {
  await guardPage("contact:write");
  const [general, shipping, contact, whatsappOrder] = await Promise.all([
    getSetting("general"),
    getSetting("shipping"),
    getSetting("contact"),
    getSetting("whatsappOrder"),
  ]);
  const whatsappNumber = normalizePhone(contact.whatsappNumber);

  return (
    <>
      <PageHeader
        title="Checkout and WhatsApp"
        description="Order messages, staff replies, numbering, follow-up timing and checkout copy."
        breadcrumbs={[{ label: "Settings" }, { label: "Checkout and WhatsApp" }]}
      />
      <PageBody>
        {!whatsappNumber ? (
          <div className="mb-4 flex items-start gap-3 rounded-[8px] border border-warning/30 bg-warning-pale px-4 py-3 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              WhatsApp ordering is disabled because no valid number is saved.{" "}
              <Link href="/admin/settings/contact" className="font-semibold underline underline-offset-2">
                Add the WhatsApp number
              </Link>{" "}
              under Contact and social.
            </p>
          </div>
        ) : null}
        <WhatsAppSettingsForm
          initial={{ whatsappOrder, freeShippingThreshold: shipping.freeShippingThreshold }}
          whatsappNumber={contact.whatsappNumber}
          storeName={general.storeName}
        />
      </PageBody>
    </>
  );
}
