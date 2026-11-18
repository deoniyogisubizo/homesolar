"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSideProduct } from "@/components/home/HeroSideProduct";
import { SocialIcon } from "@/components/ui/SocialIcon";
import type { Category, HeroProduct, SiteContentData } from "@/types";

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

export function Hero({
  hero,
  categories,
  productsByCategory,
}: {
  hero: SiteContentData["hero"];
  categories: Category[];
  productsByCategory: Record<string, HeroProduct[]>;
}) {
  const slides = [
    {
      key: "hero",
      image: hero.image,
      imageAlt: hero.imageAlt || "Solar panels on a home",
      eyebrow: hero.eyebrow,
      titleStrong: hero.titleStrong,
      titleLight: hero.titleLight,
      subtitle: hero.subtitle,
      cta: hero.cta,
    } as HeroSlide,
    ...categories
      .filter((category) => category.bannerImage || category.image)
      .map<HeroSlide>((category) => ({
        key: `category-${category.id}`,
        image: category.bannerImage || category.image,
        imageAlt: `${category.name} solar solutions`,
        eyebrow: "Shop by category",
        titleStrong: category.name,
        titleLight: "",
        subtitle: category.description,
        cta: { label: `Explore ${category.name}`, href: `/category/${category.slug}` },
        categoryId: category.id,
        categoryName: category.name,
      })),
  ];

  const activeSlide = slides[0];
  const sideImage = activeSlide?.categoryName ? activeSlide.image : hero.sideImage;
  const sideEyebrow = activeSlide?.categoryName ? "Featured collection" : hero.sideEyebrow;
  const sideTitle = activeSlide?.categoryName ?? hero.sideTitle;
  const sideTitleAccent = activeSlide?.categoryName ? "Collection" : hero.sideTitleAccent;
  const sideSubtitle = activeSlide?.categoryName
    ? activeSlide.subtitle || `Explore our ${activeSlide.categoryName.toLowerCase()} range.`
    : hero.sideSubtitle;

  const sideProducts =
    activeSlide?.categoryId
      ? productsByCategory[activeSlide.categoryId] ?? []
      : Object.values(productsByCategory).flat().slice(0, 5);
  const sideProduct = sideProducts[0] ?? null;

  return (
    <section className="relative" aria-label="Featured solar solutions">
      <div className="container-page">
        <div className="grid overflow-visible lg:grid-cols-[minmax(0,1fr)_437px] lg:gap-4">
          <div className="relative h-[430px] overflow-hidden bg-navy lg:h-[514px]">
            <Image
              src={activeSlide.image}
              alt={activeSlide.imageAlt}
              fill
              priority
              sizes="(min-width: 1440px) 890px, 65vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,38,78,0.06)_0%,rgba(1,38,78,0.16)_38%,rgba(1,38,78,0.54)_100%)]" />

            <div className="absolute inset-x-5 top-6 text-right text-white sm:inset-x-auto sm:right-9 sm:top-[38px] sm:max-w-[520px] lg:right-10 lg:top-[42px] translate-y-0 opacity-100">
<div className="text-[10px] font-medium tracking-[0.12em] text-white/90 sm:text-[12px]">
        {activeSlide.eyebrow}
      </div>
              <h2 className="mt-3 font-semibold leading-[1.04] tracking-[-0.03em]">
                <span className="text-[30px] sm:text-[40px] lg:text-[56px]">
                  {activeSlide.titleStrong}
                  {activeSlide.titleLight ? <span className="block font-light">{activeSlide.titleLight}</span> : null}
                </span>
              </h2>
              <div className="mt-4 line-clamp-3 max-w-[500px] font-light tracking-[-0.02em] text-white sm:mt-6">
                {activeSlide.subtitle}
              </div>
              <Link
                href={activeSlide.cta.href}
                className="mt-5 inline-flex h-[42px] items-center justify-center gap-2 rounded-[5px] bg-orange px-6 text-[10px] font-semibold tracking-[0.16em] text-white transition-colors hover:bg-orange-bright sm:mt-7 sm:h-[44px] sm:px-8 sm:text-[11px]"
              >
                {activeSlide.cta.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="relative mt-4 hidden overflow-hidden bg-[linear-gradient(180deg,#005ABE_0%,#0081F1_100%)] text-white lg:mt-0 lg:block lg:h-[514px]">
            <div className="relative z-20 px-8 pt-9">
              <p className="text-[10px] font-medium tracking-[0.12em] text-white/80">{sideEyebrow}</p>
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
                activeSlide?.categoryName ? `${activeSlide.categoryName} category` : hero.sideImageAlt || "Solar energy solutions"
              }
            />
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
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-[3px] w-full overflow-hidden bg-white/20"
      >
        <div
          className="h-full w-full origin-left bg-orange"
          style={{ animation: "hero-progress 5s linear forwards" }}
        />
      </div>
    </section>
  );
}
