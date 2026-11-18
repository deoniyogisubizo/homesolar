"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { submitIndexNowAction } from "@/app/(admin)/admin/(dashboard)/seo-health/actions";
import { useToast } from "@/components/admin/ToastProvider";

export function IndexNowButton({ enabled, configured }: { enabled: boolean; configured: boolean }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const disabled = pending || !enabled || !configured;

  return (
    <div className="rounded-[8px] border border-admin-line bg-white p-4">
      <p className="text-[12px] font-semibold text-ink">IndexNow</p>
      <p className="mt-1 text-[11px] leading-5 text-admin-muted">
        {!enabled
          ? "IndexNow is disabled in SEO settings."
          : !configured
            ? "Set INDEXNOW_KEY in the server environment to enable submissions."
            : "Submit the current sitemap URLs to IndexNow so Bing and other partners can recrawl them."}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          startTransition(async () => {
            const result = await submitIndexNowAction();
            if (result.ok) {
              toast(`${result.data.submitted} URLs submitted to IndexNow.`);
            } else {
              toast(result.error, "error");
            }
          })
        }
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[11px] font-medium text-ink hover:bg-tile disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-3 w-3" />
        {pending ? "Submitting…" : "Submit URLs"}
      </button>
    </div>
  );
}
