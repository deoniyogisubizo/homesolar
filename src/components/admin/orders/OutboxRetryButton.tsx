"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { retryOutboxMessageAction } from "@/app/(admin)/admin/(dashboard)/orders/actions";
import { useToast } from "@/components/admin/ToastProvider";

export function OutboxRetryButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryOutboxMessageAction({ id });
          if (!result.ok) {
            toast(result.error, "error");
            return;
          }
          toast("Message queued for retry.");
          router.refresh();
        })
      }
      className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-admin-line bg-white px-2 text-[11px] font-medium text-ink hover:bg-tile disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      Retry
    </button>
  );
}
