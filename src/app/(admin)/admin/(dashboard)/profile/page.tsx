import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { SignOutEverywhereButton } from "@/components/admin/SignOutEverywhereButton";
import { guardPage } from "@/lib/admin/page-guard";
import { ROLE_LABELS } from "@/lib/admin/permissions";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await guardPage("dashboard:read");

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account details and session controls."
        breadcrumbs={[{ label: "Profile" }]}
      />
      <PageBody>
        <div className="max-w-2xl space-y-4">
          <section className="rounded-[8px] border border-admin-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink">Account</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">Name</dt>
                <dd className="text-[13px] text-ink">{session.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">Email</dt>
                <dd className="text-[13px] text-ink">{session.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">Role</dt>
                <dd className="text-[13px] text-ink">{ROLE_LABELS[session.role]}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-[8px] border border-admin-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink">Security</h2>
            <p className="mt-1 text-[12px] text-admin-muted">
              Changing your password signs out other sessions. Use the button below to sign out every device immediately.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/change-password"
                className="inline-flex h-9 items-center rounded-[6px] bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-deep"
              >
                Change password
              </Link>
              <SignOutEverywhereButton />
            </div>
          </section>
        </div>
      </PageBody>
    </>
  );
}
