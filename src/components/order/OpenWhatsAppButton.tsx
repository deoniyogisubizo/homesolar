"use client";

import { MessageCircle } from "lucide-react";

export function OpenWhatsAppButton({
  orderNumber,
  token,
  href,
}: {
  orderNumber: string;
  token: string;
  href: string;
}) {
  const openChat = () => {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;

    void fetch(`/api/orders/${encodeURIComponent(orderNumber)}/whatsapp-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      keepalive: true,
    }).catch(() => undefined);

    if (popup) {
      popup.location.href = href;
    } else {
      window.location.href = href;
    }
  };

  return (
    <button
      type="button"
      onClick={openChat}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-navy px-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy sm:w-auto"
    >
      <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
      Open WhatsApp
    </button>
  );
}
