"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyableUrl({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const url = `${siteUrl}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-admin-line py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-ink">{label}</p>
        <p className="truncate text-[11px] text-admin-muted">{url || path}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[5px] border border-admin-line px-2.5 py-1 text-[11px] text-ink hover:bg-canvas"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
