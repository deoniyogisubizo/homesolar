import { safeAdminRedirect } from "@/lib/admin/redirect";
import { LoginForm } from "@/components/admin/AuthForms";

export const instant = false;

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-deep">Homesolar</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink">Sign in to the dashboard</h1>
          <p className="mt-1 text-[13px] text-admin-muted">Manage products, orders and storefront content.</p>
        </div>
        <div className="rounded-[8px] border border-admin-line bg-white p-6">
          <LoginForm nextPath={safeAdminRedirect(params.next)} />
        </div>
        <p className="mt-4 text-center text-[11px] text-admin-muted">
          Access is restricted to authorised staff accounts.
        </p>
      </div>
    </div>
  );
}
