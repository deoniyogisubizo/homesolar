import { getSiteContent } from "@/lib/data";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const content = await getSiteContent();
  const { header, hero } = content;
  const brandName = header.storeName;

  return (
    <AuthShell
      brandName={brandName}
      title="Forgot password?"
      description="Enter your email and we’ll send you a link to reset your password."
      tagline={hero.sideSubtitle || "Power your home with clean, reliable solar energy."}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
