"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, RefreshCw, RotateCcw, Unlock } from "lucide-react";
import {
  regenerateDeliveryCodeAction,
  reissueInvoiceAction,
  resendInvoiceAction,
  unlockDeliveryCodeAction,
} from "@/app/(admin)/admin/(dashboard)/orders/actions";
import { useToast } from "@/components/admin/ToastProvider";

type InvoiceActionsProps = {
  orderId: string;
  invoiceNumber: string | null;
  hasEmail: boolean;
  hasDeliveryCode: boolean;
  locked: boolean;
  publicToken: string;
};

export function InvoiceActions({
  orderId,
  invoiceNumber,
  hasEmail,
  hasDeliveryCode,
  locked,
  publicToken,
}: InvoiceActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);

  const run = (key: string, action: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setActive(key);
    startTransition(async () => {
      const result = await action();
      setActive(null);
      if (!result.ok) {
        toast(result.error ?? "The action could not be completed.", "error");
        return;
      }
      toast(success);
      router.refresh();
    });
  };

  const busy = pending || active !== null;

  return (
    <div className="flex flex-wrap gap-2">
      {invoiceNumber ? (
        <>
          <a
            href={`/invoice/${encodeURIComponent(publicToken)}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>
          <a
            href={`/invoice/${encodeURIComponent(publicToken)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            Open invoice
          </a>
        </>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            "reissue",
            () => reissueInvoiceAction({ id: orderId }),
            invoiceNumber ? "Invoice reissued with the same number." : "Invoice issued.",
          )
        }
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${active === "reissue" ? "animate-spin" : ""}`} />
        {invoiceNumber ? "Reissue" : "Issue invoice"}
      </button>
      <button
        type="button"
        disabled={busy || !hasDeliveryCode}
        onClick={() =>
          run(
            "regenerate",
            () => regenerateDeliveryCodeAction({ id: orderId }),
            "Delivery code regenerated. Reprint the customer copy.",
          )
        }
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-60"
      >
        <RotateCcw className={`h-3.5 w-3.5 ${active === "regenerate" ? "animate-spin" : ""}`} />
        Regenerate code
      </button>
      {locked ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run("unlock", () => unlockDeliveryCodeAction({ id: orderId }), "Delivery code unlocked.")
          }
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-60"
        >
          <Unlock className="h-3.5 w-3.5" />
          Unlock
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy || !hasEmail || !invoiceNumber}
        onClick={() =>
          run("email", () => resendInvoiceAction({ id: orderId }), "Invoice emailed to the customer.")
        }
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-60"
      >
        <Mail className="h-3.5 w-3.5" />
        Email invoice
      </button>
    </div>
  );
}
