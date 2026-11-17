import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { can, type Permission } from "@/lib/admin/permissions";

export async function guardPage(permission: Permission) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.forcePasswordChange) redirect("/admin/change-password");
  if (!can(session.role, permission)) redirect("/admin?denied=1");
  return session;
}
