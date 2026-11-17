import Link from "next/link";
import { Suspense } from "react";
import { getSiteContent } from "@/lib/data";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthErrorBanner } from "@/components/auth/AuthErrorBanner";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const content = await getSiteContent();
  const { header, hero } = content;
  const brandName = header.storeName;
  const googleConfigured = isGoogleAuthConfigured();

  return (
    <AuthShell
      brandName={brandName}
      title="Welcome back"
      description="Sign in to continue to your account"
      tagline={hero.sideSubtitle || "Power your home with clean, reliable solar energy."}
    >
      <Suspense fallback={null}>
        <AuthErrorBanner searchParams={searchParams} />
      </Suspense>

      <LoginForm />

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <GoogleSignInButton configured={googleConfigured} />
        </div>
      </div>

      <p className="mt-8 text-center text-gray-500">
        <span className="text-[14px]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Create one
          </Link>
        </span>
      </p>
    </AuthShell>
  );
}
