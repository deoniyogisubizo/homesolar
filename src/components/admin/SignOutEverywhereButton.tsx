"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOutEverywhereAction } from "@/app/(admin)/admin/auth-actions";
import { useToast } from "@/components/admin/ToastProvider";

export function SignOutEverywhereButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await signOutEverywhereAction();
          if (result.ok) {
            router.replace("/admin/login");
            router.refresh();
          } else {
            toast(result.error, "error");
          }
        })
      }
      className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-danger/30 bg-white px-3.5 text-[13px] font-medium text-danger hover:bg-danger-pale disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      Sign out everywhere
    </button>
  );
}
