import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { GeneralSettingsForm } from "@/components/admin/settings/GeneralSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";

export const metadata = { title: "General settings" };

export default async function GeneralSettingsPage() {
  await guardPage("settings:write");
  const general = await getSetting("general");

  return (
    <>
      <PageHeader
        title="General"
        description="Store identity, currency and maintenance mode."
        breadcrumbs={[{ label: "Settings" }, { label: "General" }]}
      />
      <PageBody>
        <GeneralSettingsForm initial={general} />
      </PageBody>
    </>
  );
}
