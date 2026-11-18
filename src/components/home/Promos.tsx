import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteContentData } from "@/types";

export function Promos({ promos }: { promos: SiteContentData["promos"] }) {
  return (
    <section>
      <div className="container-page grid gap-4 md:grid-cols-2">
        {promos.map((promo) => (
          <Link
            key={promo.id}
            href={promo.cta.href}
            className={`group relative flex h-[300px] overflow-hidden sm:h-[340px] md:h-[360px] ${
              promo.tone === "blue" ? "bg-promo-blue" : "bg-promo-pale"
            }`}
          >
            <div className="relative z-10 flex w-[64%] flex-col items-start justify-center px-5 sm:w-[55%] sm:px-8 md:w-[52%] lg:px-10">
              <p className="text-[10px] font-medium tracking-[0.12em] text-navy/70">{promo.eyebrow}</p>
              <h2 className="mt-3 text-[22px] font-semibold uppercase leading-[1.05] tracking-[-0.02em] text-navy sm:text-[26px] lg:text-[30px]">
                {promo.title}
              </h2>
              <p className="mt-3 text-[13px] font-medium text-navy/80">{promo.discount}</p>
              <span className="mt-5 inline-flex h-9 sm:mt-7 sm:h-10 items-center justify-center gap-2 rounded-[4px] border border-orange px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange transition-colors group-hover:bg-orange group-hover:text-white">
                {promo.cta.label}
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="absolute inset-y-0 right-0 w-[52%]">
              <Image
                src={promo.image}
                alt={promo.title}
                fill
                sizes="(min-width: 1440px) 340px, 45vw"
                className="object-cover object-left"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
