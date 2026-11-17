"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSideProduct } from "@/components/home/HeroSideProduct";
import { SocialIcon } from "@/components/ui/SocialIcon";
import type { Category, HeroProduct, SiteContentData } from "@/types";

// Keep in sync with the hero-progress animation duration in globals.css.
const SLIDE_INTERVAL = 5000;

type HeroSlide = {
  key: string;
  image: string;
  imageAlt: string;
  eyebrow: string;
  titleStrong: string;
  titleLight: string;
  subtitle: string;
  cta: { label: string; href: string };
  categoryId?: string;
  categoryName?: string;
};

type SideSelection = {
  categoryKey: string;
  product: HeroProduct;
};

export function Hero({
  hero,
  categories,
  productsByCategory,
}: {
  hero: SiteContentData["hero"];
  categories: Category[];
  productsByCategory: Record<string, HeroProduct[]>;
}) {
  const slides = useMemo<HeroSlide[]>(() => {
    const first: HeroSlide = {
      key: "hero",
      image: hero.image,
      imageAlt: hero.imageAlt || "Solar panels on a home",
      eyebrow: hero.eyebrow,
      titleStrong: hero.titleStrong,
      titleLight: hero.titleLight,
      subtitle: hero.subtitle,
      cta: hero.cta,
    };

    const categorySlides = categories
      .filter((category) => category.bannerImage || category.image)
      .map<HeroSlide>((category) => ({
        key: `category-${category.id}`,
        image: category.bannerImage || category.image,
        imageAlt: `${category.name} solar solutions`,
        eyebrow: "SHOP BY CATEGORY",
        titleStrong: category.name,
        titleLight: "",
        subtitle: category.description,
        cta: { label: `Explore ${category.name}`, href: `/category/${category.slug}` },
        categoryId: category.id,
        categoryName: category.name,
      }));

    return [first, ...categorySlides];
  }, [hero, categories]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progressCycle, setProgressCycle] = useState(0);
  const [sideSelection, setSideSelection] = useState<SideSelection | null>(() => {
    const pool = Object.values(productsByCategory).flat().slice(0, 5);
    return pool[0] ? { categoryKey: "all", product: pool[0] } : null;
  });
  const sideUsed = useRef<Set<string>>(new Set(sideSelection ? [sideSelection.product.id] : []));

  const pickSideProduct = useCallback(
    (categoryId: string | null): SideSelection | null => {
      const categoryKey = categoryId ?? "all";
      const pool = categoryId
        ? productsByCategory[categoryId] ?? []
        : Object.values(productsByCategory).flat().slice(0, 5);
      if (!pool.length) return null;

      let candidates = pool.filter((product) => !sideUsed.current.has(product.id));
      if (!candidates.length) {
        // Every product in this pool has been shown; start a fresh pass for it.
        for (const product of pool) sideUsed.current.delete(product.id);
        candidates = pool;
      }

      const product = candidates[Math.floor(Math.random() * candidates.length)];
      sideUsed.current.add(product.id);
      return { categoryKey, product };
    },
    [productsByCategory],
  );

  const showSlide = useCallback(
    (index: number) => {
      setActiveIndex(index);
      setProgressCycle((cycle) => cycle + 1);
      setSideSelection(pickSideProduct(slides[index]?.categoryId ?? null));
    },
    [pickSideProduct, slides],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const nextIndex = (activeIndex + 1) % slides.length;
    const timer = window.setTimeout(() => showSlide(nextIndex), SLIDE_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [activeIndex, progressCycle, paused, reducedMotion, showSlide, slides.length]);

  const pause = () => setPaused(true);
  const resume = () => {
    setPaused(false);
    setProgressCycle((cycle) => cycle + 1);
  };

  const activeSlide = slides[activeIndex] ?? slides[0];
  const activeCategoryId = activeSlide?.categoryId ?? null;
  const sideImage = activeSlide?.categoryName ? activeSlide.image : hero.sideImage;
  const sideKey = activeSlide?.categoryId ?? "all";
  const sideEyebrow = activeSlide?.categoryName ? "Featured Collection" : hero.sideEyebrow;
  const sideTitle = activeSlide?.categoryName ?? hero.sideTitle;
  const sideTitleAccent = activeSlide?.categoryName ? "Collection" : hero.sideTitleAccent;
  const sideSubtitle = activeSlide?.categoryName
    ? activeSlide.subtitle || `Explore our ${activeSlide.categoryName.toLowerCase()} range.`
    : hero.sideSubtitle;

  const sideProducts = useMemo(() => {
    if (activeCategoryId) {
      return productsByCategory[activeCategoryId] ?? [];
    }
    return Object.values(productsByCategory).flat().slice(0, 5);
  }, [activeCategoryId, productsByCategory]);

  const sideProduct =
    sideSelection?.categoryKey === sideKey &&
    sideProducts.some((product) => product.id === sideSelection.product.id)
      ? sideSelection.product
      : sideProducts[0] ?? null;

  return (
    <section
      className="relative"
      aria-roledescription="carousel"
      aria-label="Featured solar solutions"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resume();
      }}
    >
      <div className="container-page">
        <div className="grid overflow-visible lg:grid-cols-[minmax(0,1fr)_437px] lg:gap-4">
          <div className="relative h-[430px] overflow-hidden bg-navy lg:h-[514px]">
            {slides.map((slide, index) => {
              const isActive = index === activeIndex;
              const Heading = index === 0 ? "h1" : "h2";

              return (
                <div
                  key={slide.key}
                  className={`absolute inset-0 transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive ? "z-10 scale-100 opacity-100" : "z-0 scale-[1.06] opacity-0"
                  }`}
                  aria-hidden={!isActive}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${slides.length}`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1440px) 890px, 65vw"
                    className={`object-cover transition-transform duration-[6000ms] ease-out ${
                      isActive && !reducedMotion ? "scale-[1.04]" : "scale-100"
                    }`}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,38,78,0.06)_0%,rgba(1,38,78,0.16)_38%,rgba(1,38,78,0.54)_100%)]" />

                  <div
                    className={`absolute inset-x-5 top-6 text-right text-white transition-all duration-700 sm:inset-x-auto sm:right-9 sm:top-[38px] sm:max-w-[520px] lg:right-10 lg:top-[42px] ${
                      isActive ? "translate-y-0 opacity-100 delay-150" : "translate-y-4 opacity-0"
                    }`}
                  >
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/90 sm:text-[12px]">
                      {slide.eyebrow}
                    </div>
                    <Heading className="mt-3 font-semibold leading-[1.04] tracking-[-0.03em]">
                      <span className="text-[30px] sm:text-[40px] lg:text-[56px]">
                        {slide.titleStrong}
                        {slide.titleLight ? <span className="block font-light">{slide.titleLight}</span> : null}
                      </span>
                    </Heading>
                    <div
                      className={`mt-4 line-clamp-3 max-w-[500px] font-light tracking-[-0.02em] text-white sm:mt-6 ${
                        slide.categoryName
                          ? "text-[15px] leading-6 sm:text-[18px] sm:leading-7 lg:text-[21px]"
                          : "text-[18px] leading-7 sm:text-[24px] sm:leading-8 lg:text-[28px]"
                      }`}
                    >
                      {slide.subtitle}
                    </div>
                    <Link
                      href={slide.cta.href}
                      tabIndex={isActive ? 0 : -1}
                      className="mt-5 inline-flex h-[42px] items-center justify-center gap-2 rounded-[5px] bg-orange px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-orange-bright sm:mt-7 sm:h-[44px] sm:px-8 sm:text-[11px]"
                    >
                      {slide.cta.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {slides.length > 1 ? (
              <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 sm:left-9">
                {slides.map((slide, index) => (
                  <button
                    key={slide.key}
                    type="button"
                    onClick={() => showSlide(index)}
                    aria-label={`Show slide ${index + 1}: ${slide.categoryName || "Featured"}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    className={`h-[3px] rounded-full transition-all duration-500 ${
                      index === activeIndex ? "w-8 bg-white" : "w-4 bg-white/45 hover:bg-white/75"
                    }`}
                  />
                ))}
              </div>
            ) : null}

            {slides.length > 1 && !reducedMotion ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-white/25" aria-hidden="true">
                <div
                  key={`hero-progress-${activeIndex}-${progressCycle}`}
                  data-hero-progress
                  className="h-full w-full origin-left bg-orange shadow-[0_0_12px_rgba(245,130,32,0.75)] animate-[hero-progress_5s_linear_forwards]"
                  style={{ animationPlayState: paused ? "paused" : "running" }}
                />
              </div>
            ) : null}
          </div>

          <div className="relative mt-4 hidden overflow-hidden bg-[linear-gradient(180deg,#005ABE_0%,#0081F1_100%)] text-white lg:mt-0 lg:block lg:h-[514px]">
            <div
              key={`side-copy-${sideKey}`}
              className="relative z-20 px-8 pt-9 animate-[hero-copy-in_700ms_ease-out]"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/80">{sideEyebrow}</p>
              <h2 className="mt-5 max-w-[330px] text-[32px] font-semibold leading-[1.02] tracking-[-0.02em]">
                {sideTitle}
                <span className="mt-1 block font-light">{sideTitleAccent}</span>
              </h2>
              <p className="mt-5 line-clamp-2 max-w-[300px] text-[16px] font-light leading-6 text-white/90">{sideSubtitle}</p>
            </div>
            <HeroSideProduct
              products={sideProducts}
              activeProduct={sideProduct}
              fallbackImage={sideImage}
              fallbackAlt={
                activeSlide?.categoryName
                  ? `${activeSlide.categoryName} category`
                  : hero.sideImageAlt || "Solar energy solutions"
              }
            />
          </div>
        </div>

        <div className="absolute right-4 top-[37px] z-20 hidden flex-col gap-2 lg:flex">
          {hero.socials.map((social) => (
            <a
              key={social.platform}
              href={social.href}
              aria-label={social.label}
              className="flex h-10 w-10 items-center justify-center bg-navy text-white transition-colors hover:bg-brand"
            >
              <SocialIcon platform={social.platform} className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
