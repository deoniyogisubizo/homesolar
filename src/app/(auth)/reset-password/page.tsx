import { Suspense } from "react";
import { getSiteContent } from "@/lib/data";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const instant = false;

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage() {
  const content = await getSiteContent();
  const { header, hero } = content;
  const brandName = header.storeName;

  return (
    <AuthShell
      brandName={brandName}
      title="Reset password"
      description="Enter your new password below."
      tagline={hero.sideSubtitle || "Power your home with clean, reliable solar energy."}
    >
      <Suspense
        fallback={<div className="h-44 animate-pulse rounded-[8px] bg-tile" aria-hidden="true" />}
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
