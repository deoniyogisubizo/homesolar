"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { CURRENCY_LIST, CURRENCIES, isCurrencyCode } from "@/lib/calculator";

export function CurrencySelector({ codes }: { codes?: string[] }) {
  const { currency, setCurrency } = useCurrency();
  const available = codes?.length
    ? codes.filter(isCurrencyCode).map((code) => CURRENCIES[code])
    : CURRENCY_LIST;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${CURRENCIES[currency].name}`}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 text-[16px] font-semibold uppercase tracking-[0.08em] text-ink"
      >
        {currency}
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Select currency"
          className="absolute left-0 top-full z-50 mt-2 max-h-72 w-[230px] overflow-y-auto rounded-[4px] border border-line bg-white p-1 shadow-[0_18px_45px_rgba(1,38,78,0.14)]"
        >
          {available.map((info) => {
            const selected = info.code === currency;
            return (
              <li key={info.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setCurrency(info.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-[3px] px-3 py-2 text-left transition-colors hover:bg-brand-pale ${
                    selected ? "bg-brand-pale" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">
                      {info.code}
                      <span className="ml-2 font-normal text-muted">{info.symbol}</span>
                    </span>
                    <span className="block truncate text-[12px] text-muted">{info.name}</span>
                  </span>
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-brand" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
