import { clearSessionCookie } from "@/lib/auth/customer";
import { redirect } from "next/navigation";

export async function POST() {
  await clearSessionCookie();
  redirect("/login");
}