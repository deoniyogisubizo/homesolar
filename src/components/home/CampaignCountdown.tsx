"use client";

import { useEffect, useState } from "react";

function remainingLabel(endsAt: string) {
  const remaining = Math.max(0, new Date(endsAt).getTime() - Date.now());
  if (remaining <= 0) return "Offer ended";
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return days > 0 ? `${days}d ${hours}h ${minutes}m left` : `${hours}h ${minutes}m ${seconds}s left`;
}

export function CampaignCountdown({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState(() => remainingLabel(endsAt));

  useEffect(() => {
    const timer = window.setInterval(() => setLabel(remainingLabel(endsAt)), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return (
    <p className="mt-3 text-[11px] font-semibold tracking-[0.12em] text-orange" aria-live="off">
      {label}
    </p>
  );
}
