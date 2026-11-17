import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteContentData } from "@/types";

export function CampaignBanner({
  banner,
  tone,
  className = "",
}: {
  banner: SiteContentData["bestSelling"]["banner"];
  tone: "navy" | "blue";
  className?: string;
}) {
  return (
    <Link
      href={banner.cta.href}
      className={`group relative flex min-h-[520px] flex-col justify-start overflow-hidden p-8 text-white ${
        tone === "navy"
          ? "bg-[linear-gradient(145deg,#01264E_0%,#013B78_100%)]"
          : "bg-[linear-gradient(180deg,#007DEF_0%,#0089F8_100%)]"
      } ${className}`}
    >
      <Image
        src={banner.image}
        alt={banner.title}
        fill
        sizes="(min-width: 1440px) 430px, 40vw"
        className="object-cover object-bottom opacity-70"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,38,78,0.94)_0%,rgba(1,38,78,0.82)_46%,rgba(1,38,78,0.12)_100%)]" />
      <div className="relative z-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/75">{banner.eyebrow}</p>
        <h3 className="mt-3 text-[28px] font-semibold uppercase leading-[1.05] tracking-[-0.02em] lg:text-[31px]">
          {banner.title}
          <span className="mt-1 block font-light normal-case tracking-normal">{banner.titleLight}</span>
        </h3>
        <span className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-white/60 px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors group-hover:border-white group-hover:bg-white group-hover:text-navy">
          {banner.cta.label}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
