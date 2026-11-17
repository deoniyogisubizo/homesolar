import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { SmtpSettingsForm } from "@/components/admin/settings/SmtpSettingsForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";

export const metadata = { title: "Email settings" };

export default async function EmailSettingsPage() {
  await guardPage("smtp:write");
  const smtp = await getSetting("smtp");

  const envConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  return (
    <>
      <PageHeader
        title="Email"
        description="SMTP connection used for transactional and marketing email."
        breadcrumbs={[{ label: "Settings" }, { label: "Email" }]}
      />
      <PageBody>
        <SmtpSettingsForm
          initial={{
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            username: smtp.username,
            password: "",
            fromName: smtp.fromName,
            fromEmail: smtp.fromEmail,
            replyTo: smtp.replyTo,
          }}
          hasPassword={Boolean(smtp.passwordEncrypted)}
          envConfigured={envConfigured}
        />
      </PageBody>
    </>
  );
}
