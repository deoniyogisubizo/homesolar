import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { ContactSettingsForm } from "@/components/admin/settings/ContactSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";

export const metadata = { title: "Contact and social" };

export default async function ContactSettingsPage() {
  await guardPage("contact:write");
  const contact = await getSetting("contact");

  return (
    <>
      <PageHeader
        title="Contact and social"
        description="Phone numbers, email addresses, address, working hours and social links."
        breadcrumbs={[{ label: "Settings" }, { label: "Contact and social" }]}
      />
      <PageBody>
        <ContactSettingsForm initial={contact} />
      </PageBody>
    </>
  );
}
