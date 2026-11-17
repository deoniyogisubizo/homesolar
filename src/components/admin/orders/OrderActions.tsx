"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MessageCircle, Printer, Send } from "lucide-react";
import {
  changeOrderStatusAction,
  resendOrderEmailAction,
  updateOrderPaymentAction,
} from "@/app/(admin)/admin/(dashboard)/orders/actions";
import { useToast } from "@/components/admin/ToastProvider";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  nextStatuses,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/admin/order-status";

function paymentLabel(value: string) {
  if (!value) return "Not set";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

export function OrderActions({
  id,
  status,
  paymentStatus,
  paymentMethod,
  customerChatHref,
  summary,
  hasCustomerEmail,
}: {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customerChatHref: string | null;
  summary: string;
  hasCustomerEmail: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [changing, startChange] = useTransition();
  const [savingPayment, startPayment] = useTransition();
  const [sendingEmail, startEmail] = useTransition();
  const [nextPaymentStatus, setNextPaymentStatus] = useState<PaymentStatus>(paymentStatus);
  const [nextPaymentMethod, setNextPaymentMethod] = useState<PaymentMethod>(paymentMethod);

  const available = nextStatuses(status);

  const changeStatus = (next: OrderStatus) => {
    if (next === "cancelled" && !window.confirm("Cancel this order and restore any reserved stock?")) {
      return;
    }
    startChange(async () => {
      const result = await changeOrderStatusAction({ id, status: next });
      if (result.ok) {
        toast(`Order moved to ${ORDER_STATUS_LABELS[next].toLowerCase()}.`);
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  const savePayment = () => {
    startPayment(async () => {
      const result = await updateOrderPaymentAction({
        id,
        paymentStatus: nextPaymentStatus,
        paymentMethod: nextPaymentMethod,
      });
      if (result.ok) {
        toast("Payment details saved.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast("Order summary copied.");
    } catch {
      toast("The summary could not be copied.", "error");
    }
  };

  const resendEmail = () => {
    startEmail(async () => {
      const result = await resendOrderEmailAction({ id });
      if (result.ok) {
        toast("Confirmation email sent.");
      } else {
        toast(result.error, "error");
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[8px] border border-admin-line bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
          Order status
        </p>
        <p className="mt-1 text-[13px] font-medium text-ink">{ORDER_STATUS_LABELS[status]}</p>
        {available.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {available.map((next) => (
              <button
                key={next}
                type="button"
                onClick={() => changeStatus(next)}
                disabled={changing}
                className={`inline-flex h-8 items-center rounded-[6px] border px-3 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                  next === "cancelled"
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-admin-line bg-white text-ink hover:bg-tile"
                }`}
              >
                {changing ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                {next === "cancelled" ? "Cancel order" : ORDER_STATUS_LABELS[next]}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-admin-muted">This order is closed.</p>
        )}
      </section>

      <section className="rounded-[8px] border border-admin-line bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
          Payment
        </p>
        <div className="mt-2 space-y-2">
          <label className="block text-[11px] text-admin-muted" htmlFor="order-payment-status">
            Status
            <select
              id="order-payment-status"
              value={nextPaymentStatus}
              onChange={(event) => setNextPaymentStatus(event.target.value as PaymentStatus)}
              className="admin-field mt-1 w-full"
            >
              {PAYMENT_STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {paymentLabel(entry)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] text-admin-muted" htmlFor="order-payment-method">
            Method
            <select
              id="order-payment-method"
              value={nextPaymentMethod}
              onChange={(event) => setNextPaymentMethod(event.target.value as PaymentMethod)}
              className="admin-field mt-1 w-full"
            >
              {PAYMENT_METHODS.map((entry) => (
                <option key={entry || "unset"} value={entry}>
                  {paymentLabel(entry)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={savePayment}
          disabled={savingPayment}
          className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-[6px] bg-navy px-3 text-[12px] font-medium text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {savingPayment ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
          Save payment
        </button>
      </section>

      <section className="rounded-[8px] border border-admin-line bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
          Customer contact
        </p>
        <div className="mt-2 space-y-2">
          {customerChatHref ? (
            <a
              href={customerChatHref}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Open customer chat
            </a>
          ) : (
            <p className="text-[11px] text-admin-muted">No WhatsApp number on this order.</p>
          )}
          <button
            type="button"
            onClick={() => void copySummary()}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy summary
          </button>
          {hasCustomerEmail ? (
            <button
              type="button"
              onClick={resendEmail}
              disabled={sendingEmail}
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-60"
            >
              {sendingEmail ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Resend confirmation
            </button>
          ) : null}
          <a
            href={`/admin/orders/${id}/print?document=invoice`}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <Printer className="h-3.5 w-3.5" />
            Print invoice
          </a>
          <a
            href={`/admin/orders/${id}/print?document=packing-slip`}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <Printer className="h-3.5 w-3.5" />
            Print packing slip
          </a>
        </div>
      </section>
    </div>
  );
}
