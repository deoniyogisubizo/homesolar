import { Check } from "lucide-react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/admin/order-status";

export type OrderTimelineEvent = {
  status: OrderStatus;
  at: Date | string;
  by: string;
  note?: string;
};

const FLOW: OrderStatus[] = [
  "new",
  "contacted",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
];

function formatEventTime(value: Date | string, timezone: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function OrderTimeline({
  status,
  history,
  timezone = "Africa/Kigali",
}: {
  status: OrderStatus;
  history: OrderTimelineEvent[];
  timezone?: string;
}) {
  const events = new Map(history.map((event) => [event.status, event]));
  const cancelled = status === "cancelled" ? events.get("cancelled") : null;
  const steps = cancelled ? [...FLOW, "cancelled" as OrderStatus] : FLOW;
  const lastReachedIndex = steps.reduce(
    (last, step, index) => (events.has(step) ? index : last),
    -1,
  );

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const event = events.get(step);
        const reached = Boolean(event);
        const current = step === status;
        const isLast = index === steps.length - 1;
        const isCancelled = step === "cancelled";

        return (
          <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden="true"
                className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${
                  index < lastReachedIndex ? "bg-navy" : "bg-line"
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border ${
                isCancelled && reached
                  ? "border-red-600 bg-red-600 text-white"
                  : reached
                    ? "border-navy bg-navy text-white"
                    : "border-line bg-white text-transparent"
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-[13px] font-medium ${
                  current ? "text-ink" : reached ? "text-ink" : "text-muted"
                }`}
              >
                {ORDER_STATUS_LABELS[step]}
              </p>
              {event ? (
                <p className="mt-0.5 text-[11px] text-muted">
                  {formatEventTime(event.at, timezone)}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              ) : isCancelled ? null : (
                <p className="mt-0.5 text-[11px] text-muted">Pending</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
