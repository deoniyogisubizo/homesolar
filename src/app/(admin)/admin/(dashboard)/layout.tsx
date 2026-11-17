import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { AdminShell } from "@/components/admin/AdminShell";

export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.forcePasswordChange) redirect("/admin/change-password");

  const nav = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(session.role, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <AdminShell session={{ name: session.name, email: session.email, role: session.role }} nav={nav}>
      {children}
    </AdminShell>
  );
}
