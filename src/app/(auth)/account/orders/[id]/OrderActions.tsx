"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, X } from "lucide-react";
import { cancelOrder, reorderAction } from "@/app/(auth)/actions/dashboard-actions";

export default function OrderActions({
  orderId,
  canCancel,
  hasInvoice,
}: {
  orderId: string;
  canCancel: boolean;
  hasInvoice: boolean;
}) {
  const router = useRouter();

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order? Reserved stock will be released.")) return;
    const response = await cancelOrder(orderId);
    if (response.ok) {
      router.refresh();
    } else {
      window.alert(response.error);
    }
  };

  const handleReorder = async () => {
    const response = await reorderAction(orderId);
    if (response.ok) {
      router.push(response.data.cartUrl);
    } else {
      window.alert(response.error);
    }
  };

  return (
    <div className="space-y-3">
      {hasInvoice ? (
        <Link
          href={`/account/orders/${orderId}/invoice`}
          className="flex items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-tile"
        >
          <Download className="h-4 w-4" />
          View invoice
        </Link>
      ) : null}
      {canCancel ? (
        <button
          type="button"
          onClick={() => void handleCancel()}
          className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-danger/30 bg-danger-pale px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <X className="h-4 w-4" />
          Cancel order
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void handleReorder()}
        className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-tile"
      >
        <RefreshCw className="h-4 w-4" />
        Buy again
      </button>
    </div>
  );
}
