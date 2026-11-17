"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, UserRound } from "lucide-react";
import { CurrencySelector } from "@/components/currency/CurrencySelector";
import { HeaderCounts } from "@/components/layout/HeaderCounts";
import { MobileMenu } from "@/components/layout/MobileMenu";
import type { SiteContentData } from "@/types";

export function Header({
  content,
  brand,
}: {
  content: SiteContentData;
  brand: { name: string; logo: string };
}) {
  const { header } = content;
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith("/product/") ?? false;
  const isSearchPage = pathname === "/search" || (pathname?.startsWith("/search/") ?? false);
  const hideNav = isProductPage || isSearchPage;
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const navVisibleRef = useRef(true);
  const directionAnchor = useRef(0);
  const SCROLL_DIRECTION_THRESHOLD = 40;

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const currentY = Math.max(0, window.scrollY);

      let nextExpanded = navVisibleRef.current;

      if (currentY <= 24) {
        nextExpanded = true;
        directionAnchor.current = currentY;
      } else {
        const delta = currentY - directionAnchor.current;

        if (delta >= SCROLL_DIRECTION_THRESHOLD) {
          nextExpanded = false;
          directionAnchor.current = currentY;
        } else if (delta <= -SCROLL_DIRECTION_THRESHOLD) {
          nextExpanded = true;
          directionAnchor.current = currentY;
        }
      }

      if (nextExpanded !== navVisibleRef.current) {
        navVisibleRef.current = nextExpanded;
        setNavVisible(nextExpanded);
        setSearchCollapsed(!nextExpanded);
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    directionAnchor.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    frame = window.requestAnimationFrame(update);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="container-page lg:hidden">
        <div className="flex h-[66px] items-center justify-between gap-3">
          <div className={`flex items-center ${searchCollapsed ? "gap-1.5" : "gap-0"}`}>
            <MobileMenu header={header} />
            {header.searchEnabled ? (
              <Link
                href="/search"
                aria-label="Search products"
                aria-hidden={!searchCollapsed}
                inert={!searchCollapsed}
                className={`flex h-9 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-[4px] text-navy transition-all duration-300 ease-out ${
                  searchCollapsed
                    ? "w-9 border border-line opacity-100"
                    : "pointer-events-none w-0 border-0 opacity-0"
                }`}
              >
                <Search className="h-5 w-5 shrink-0" strokeWidth={1.8} />
              </Link>
            ) : null}
          </div>
          <Link href="/" className="flex shrink-0 items-center justify-center" aria-label={brand.name}>
            <Image
              src={header.logo || brand.logo}
              alt={brand.name}
              width={1998}
              height={514}
              priority
              className="h-[36px] w-auto sm:h-[40px]"
            />
          </Link>
          <HeaderCounts labels={{ wishlist: header.wishlistLabel, cart: header.cartLabel }} />
        </div>

        {header.searchEnabled ? (
          <div
            aria-hidden={searchCollapsed}
            inert={searchCollapsed}
            className={`overflow-hidden transition-all duration-300 ease-out ${
              searchCollapsed ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
            }`}
          >
            <form action="/search" className="relative flex items-center pb-3">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" strokeWidth={1.8} />
            <input
              type="search"
              name="q"
              aria-label={header.searchPlaceholder}
              placeholder={header.searchPlaceholder}
              className="h-10 w-full rounded-[4px] border border-line bg-white pl-9 pr-4 text-[12px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand"
              />
            </form>
          </div>
        ) : null}
      </div>

      <div className={`container-page hidden grid-cols-[1fr_auto_1fr] items-center gap-6 transition-all duration-300 ease-out lg:grid ${navVisible ? "h-[96px]" : "h-[70px]"}`}>
        <div className="flex items-center gap-4">
          <CurrencySelector codes={header.currencies} />
          {header.languages.length > 1 ? (
            <>
              <span className="h-4 w-px bg-line" />
              <span className="flex items-center gap-1 text-[16px] font-semibold uppercase tracking-[0.08em] text-ink">
                {header.language}
                <ChevronDown className="h-4 w-4" />
              </span>
            </>
          ) : null}
          {header.searchEnabled ? (
            <form action="/search" className="relative ml-2 hidden items-center md:flex">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" strokeWidth={1.8} />
              <input
                type="search"
                name="q"
                aria-label={header.searchPlaceholder}
                placeholder={header.searchPlaceholder}
                className="h-10 w-[210px] rounded-[4px] border border-line bg-white pl-9 pr-4 text-[14px] font-medium text-ink outline-none transition-colors placeholder:font-normal placeholder:text-muted focus:border-brand"
              />
            </form>
          ) : null}
        </div>

        <Link href="/" className={`flex items-center justify-self-center transition-all duration-300 ease-out ${navVisible ? "self-start pt-2" : "self-center"}`} aria-label={brand.name}>
          <Image
            src={header.logo || brand.logo}
            alt={brand.name}
            width={1998}
            height={514}
            priority
            className={`w-auto transition-all duration-300 ease-out ${navVisible ? "h-[46px] xl:h-[52px]" : "h-[40px]"}`}
          />
        </Link>

        <div className="flex items-center justify-end gap-5">
          <Link
            href="/login"
            className="hidden items-center gap-2 text-[18px] font-semibold tracking-[0.06em] text-ink transition-colors hover:text-brand lg:flex"
          >
            <UserRound className="h-[24px] w-[24px]" strokeWidth={1.8} />
            <span className="hidden xl:inline">{header.accountLabel}</span>
          </Link>
          <HeaderCounts labels={{ wishlist: header.wishlistLabel, cart: header.cartLabel }} />
        </div>
      </div>

      {hideNav ? null : (
        <nav
          aria-hidden={!navVisible}
          inert={!navVisible}
          className={`hidden bg-transparent transition-all duration-300 ease-out lg:block ${
            navVisible
              ? "mb-0 translate-y-0 opacity-100"
              : "pointer-events-none -mb-[48px] -translate-y-1 opacity-0"
          }`}
        >
          <div className="container-page no-scrollbar flex h-[48px] items-center justify-start gap-6 overflow-x-auto whitespace-nowrap sm:justify-center xl:gap-8">
            {header.nav.map((item) => (
              <div key={item.label} className="group relative flex h-full items-center">
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[0.05em] text-ink transition-colors hover:text-brand"
                >
                  {item.label}
                  {item.children?.length ? <ChevronDown className="h-4 w-4" strokeWidth={1.9} /> : null}
                </Link>
                {item.children?.length ? (
                  <div className="pointer-events-none absolute left-1/2 top-[calc(100%-2px)] z-50 w-[230px] -translate-x-1/2 translate-y-2 rounded-[4px] border border-line bg-white p-2 opacity-0 shadow-[0_18px_45px_rgba(1,38,78,0.12)] transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block rounded-[3px] px-3 py-2.5 text-[14px] font-medium tracking-[0.02em] text-muted transition-colors hover:bg-brand-pale hover:text-navy"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
