import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { UsersManager } from "@/components/admin/UsersManager";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models/AdminUser";
import type { AdminRole } from "@/lib/admin/permissions";

export const metadata = { title: "Users and roles" };

export default async function UsersPage() {
  const session = await guardPage("users:read");
  await connectToDatabase();
  const users = await AdminUser.find({})
    .sort({ createdAt: 1 })
    .select("name email role active forcePasswordChange lastLoginAt createdAt")
    .lean();

  return (
    <>
      <PageHeader
        title="Users and roles"
        description="Invite staff, assign roles and reset passwords."
        breadcrumbs={[{ label: "Settings" }, { label: "Users and roles" }]}
      />
      <PageBody>
        <UsersManager
          currentUserId={session.id}
          users={users.map((user) => ({
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role as AdminRole,
            active: user.active,
            forcePasswordChange: user.forcePasswordChange,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            createdAt: user.createdAt?.toISOString() ?? null,
          }))}
        />
      </PageBody>
    </>
  );
}
