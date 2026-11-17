import { getCustomerSession } from "@/lib/auth/customer";
import { AccountLayout } from "@/components/account/AccountLayout";
import ProfileForm from "./ProfileForm";
import SecuritySection from "./SecuritySection";

export const instant = false;

export const metadata = { title: "Profile & Security" };

export default async function ProfilePage() {
  const session = await getCustomerSession();

  if (!session) {
    return null;
  }

  return (
    <AccountLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Profile & Security</h1>
          <p className="mt-1 text-muted">Manage your personal information and account security</p>
        </div>

        <ProfileForm initialName={session.name} initialPhone={session.phone} initialEmail={session.email} />
        <SecuritySection />
      </div>
    </AccountLayout>
  );
}