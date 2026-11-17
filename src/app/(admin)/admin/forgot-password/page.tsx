import Link from "next/link";
import { ForgotPasswordForm } from "@/components/admin/AuthForms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Reset your password</h1>
          <p className="mt-1 text-[13px] text-admin-muted">We will email a reset link if the account exists.</p>
        </div>
        <div className="rounded-[8px] border border-admin-line bg-white p-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-4 text-center text-[12px] text-admin-muted">
          <Link href="/admin/login" className="font-medium text-brand-deep hover:underline">
            Return to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
