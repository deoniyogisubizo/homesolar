import { AccountLayout } from "@/components/account/AccountLayout";
import PreferencesForm from "./PreferencesForm";

export const instant = false;

export const metadata = { title: "Preferences" };

export default async function PreferencesPage() {
  return (
    <AccountLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Preferences</h1>
          <p className="mt-1 text-muted">Manage your notification and communication preferences</p>
        </div>

        <PreferencesForm />
      </div>
    </AccountLayout>
  );
}