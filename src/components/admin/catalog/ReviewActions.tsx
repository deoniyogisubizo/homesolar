"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2, X } from "lucide-react";
import {
  deleteReviewAction,
  moderateReviewAction,
  replyToReviewAction,
} from "@/app/(admin)/admin/(dashboard)/reviews/actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, FormSection } from "@/components/admin/FormSection";
import { useToast } from "@/components/admin/ToastProvider";

export function ReviewActions({
  id,
  status,
  reply,
}: {
  id: string;
  status: "pending" | "approved" | "rejected";
  reply: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState(reply);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const moderate = (next: "pending" | "approved" | "rejected") => {
    startTransition(async () => {
      const result = await moderateReviewAction({ id, status: next });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(
        next === "approved" ? "Review approved." : next === "rejected" ? "Review rejected." : "Review returned to pending.",
        "success",
      );
      router.refresh();
    });
  };

  const saveReply = () => {
    startTransition(async () => {
      const result = await replyToReviewAction({ id, reply: draft });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(draft ? "Reply saved." : "Reply removed.", "success");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <FormSection
        title="Moderation"
        description="Approved reviews are public and count toward the product rating. Pending and rejected reviews stay hidden."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => moderate("approved")}
            disabled={pending || status === "approved"}
            className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-success px-3.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => moderate("rejected")}
            disabled={pending || status === "rejected"}
            className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-danger/30 bg-white px-3.5 text-[13px] font-medium text-danger hover:bg-danger-pale disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => moderate("pending")}
            disabled={pending || status === "pending"}
            className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile disabled:opacity-40"
          >
            Return to pending
          </button>
        </div>
      </FormSection>

      <FormSection
        title="Public reply"
        description="Shown under the review on the product page. Leave empty to remove the reply."
      >
        <Field label="Reply" htmlFor="review-reply" hint="Plain text up to 2000 characters.">
          <textarea
            id="review-reply"
            className="admin-field admin-textarea min-h-[110px]"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
          />
        </Field>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={saveReply}
            disabled={pending || draft === reply}
            className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save reply
          </button>
        </div>
      </FormSection>

      <div className="rounded-[8px] border border-danger/25 bg-white p-4">
        <p className="text-[12px] font-semibold text-ink">Delete review</p>
        <p className="mt-1 text-[11px] leading-5 text-admin-muted">
          Permanently removes the review and recalculates the product rating. This cannot be undone.
        </p>
        <div className="mt-3">
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-danger/30 bg-white px-3 text-[11px] font-medium text-danger hover:bg-danger-pale"
              >
                <Trash2 className="h-3 w-3" />
                Delete review
              </button>
            }
            title="Delete this review"
            description="The review will be removed permanently and the product rating will be recalculated."
            confirmLabel="Delete"
            pending={deleting}
            onConfirm={() =>
              startDelete(async () => {
                const result = await deleteReviewAction({ id });
                if (!result.ok) {
                  toast(result.error, "error");
                  return;
                }
                toast("Review deleted.");
                router.push("/admin/reviews");
                router.refresh();
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
