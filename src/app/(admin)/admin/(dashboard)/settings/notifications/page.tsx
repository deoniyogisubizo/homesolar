import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { NotificationSettingsForm } from "@/components/admin/settings/NotificationSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";

export const metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  await guardPage("notifications:write");
  const notifications = await getSetting("notifications");

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Choose who receives operational alerts and which events trigger them."
        breadcrumbs={[{ label: "Settings" }, { label: "Notifications" }]}
      />
      <PageBody>
        <NotificationSettingsForm initial={notifications} />
      </PageBody>
    </>
  );
}
