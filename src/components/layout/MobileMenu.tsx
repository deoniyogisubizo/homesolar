"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { CurrencySelector } from "@/components/currency/CurrencySelector";
import { UserRound } from "lucide-react";
import type { SiteContentData } from "@/types";

export function MobileMenu({ header }: { header: SiteContentData["header"] }) {
  const [open, setOpen] = useState(false);
  const openedAt = useRef(0);

  const openMenu = () => {
    openedAt.current = Date.now();
    setOpen(true);
  };

  const closeFromBackdrop = () => {
    if (Date.now() - openedAt.current < 500) return;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflowX = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflowX = previousOverflowX;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") openMenu();
        }}
        onClick={openMenu}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="relative z-[70] flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-[4px] border border-line text-navy transition-colors hover:border-navy"
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} />
      </button>

      {open
        ? createPortal(
            <div id="mobile-menu" className="fixed inset-0 z-[100] overflow-hidden lg:hidden">
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeFromBackdrop}
                className="absolute inset-0 touch-manipulation bg-navy/45 backdrop-blur-[1px]"
              />

              <div className="absolute inset-y-0 left-0 flex h-full w-full max-w-[360px] flex-col overflow-hidden bg-white shadow-[0_20px_60px_rgba(1,38,78,0.28)]">
                <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-navy">Menu</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] text-navy transition-colors hover:bg-tile"
                  >
                    <X className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                  <form action="/search" className="relative mx-5 mt-5 flex shrink-0 items-center">
                    <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" strokeWidth={1.8} />
                    <input
                      type="search"
                      name="q"
                      aria-label={header.searchPlaceholder}
                      placeholder={header.searchPlaceholder}
                      className="h-11 w-full rounded-[4px] border border-line bg-white pl-9 pr-4 text-[14px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand"
                    />
                  </form>

                  <div className="mx-5 mt-4 flex shrink-0 items-center justify-between rounded-[4px] bg-tile px-4 py-3">
                    <CurrencySelector />
                    <span className="text-[14px] font-semibold uppercase tracking-wide text-ink">{header.language}</span>
                  </div>

                  <div className="mx-5 mt-3 flex shrink-0 items-center">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 text-[16px] font-semibold tracking-[0.06em] text-ink transition-colors hover:text-brand"
                    >
                      <UserRound className="h-[20px] w-[20px]" strokeWidth={1.8} />
                      <span>{header.accountLabel}</span>
                    </Link>
                  </div>

                  <nav className="mt-4 px-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                    {header.nav.map((item) => (
                      <div key={item.label} className="border-b border-line/70 py-1 last:border-0">
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block truncate px-3 py-2.5 text-[15px] font-semibold text-ink transition-colors hover:text-brand"
                        >
                          {item.label}
                        </Link>
                        {item.children?.length ? (
                          <div className="mb-1 space-y-0.5 pl-3">
                            {item.children.map((child) => (
                              <Link
                                key={child.label}
                                href={child.href}
                                onClick={() => setOpen(false)}
                                className="block truncate rounded-[3px] px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-brand-pale hover:text-navy"
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
