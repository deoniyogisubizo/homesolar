import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { ChangePasswordForm } from "@/components/admin/AuthForms";

export const instant = false;

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Password and security</h1>
          <p className="mt-1 text-[13px] text-admin-muted">
            Signed in as {session.email}. Changing your password signs out other sessions.
          </p>
        </div>
        <div className="rounded-[8px] border border-admin-line bg-white p-6">
          <ChangePasswordForm forced={session.forcePasswordChange} />
        </div>
      </div>
    </div>
  );
}
