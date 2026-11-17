"use client";

import { Printer } from "lucide-react";

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
    >
      <Printer className="h-4 w-4" />
      Print / Save as PDF
    </button>
  );
}
