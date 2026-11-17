import { ResetPasswordForm } from "@/components/admin/AuthForms";

export const instant = false;

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Set a new password</h1>
          <p className="mt-1 text-[13px] text-admin-muted">Choose a password you have not used before.</p>
        </div>
        <div className="rounded-[8px] border border-admin-line bg-white p-6">
          <ResetPasswordForm token={params.token ?? ""} />
        </div>
      </div>
    </div>
  );
}
