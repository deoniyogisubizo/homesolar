export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const tones: Record<StatusTone, string> = {
  neutral: "border-admin-line bg-tile text-admin-muted",
  success: "border-success/20 bg-success-pale text-success",
  warning: "border-warning/20 bg-warning-pale text-warning",
  danger: "border-danger/20 bg-danger-pale text-danger",
  info: "border-brand/20 bg-brand-pale text-brand-deep",
  brand: "border-brand/20 bg-brand-pale text-brand-deep",
};

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium leading-5 ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

export function statusToneFor(value: string): StatusTone {
  if (["active", "published", "delivered", "approved", "sent", "paid", "confirmed", "replied"].includes(value)) {
    return "success";
  }
  if (["pending", "scheduled", "draft", "low_stock", "unpaid", "new"].includes(value)) return "warning";
  if (["cancelled", "refunded", "rejected", "failed", "out_of_stock", "expired"].includes(value)) return "danger";
  if (["archived", "paused", "unsubscribed", "read"].includes(value)) return "neutral";
  if (["processing", "out_for_delivery", "in_stock"].includes(value)) return "info";
  return "neutral";
}

export function labelize(value: string | undefined | null) {
  if (!value) return "—";
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
