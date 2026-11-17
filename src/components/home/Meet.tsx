import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import type { StorefrontCampaign } from "@/lib/data";
import type { SiteContentData } from "@/types";

export function Meet({
  meet,
  campaign,
}: {
  meet: SiteContentData["meet"];
  campaign: StorefrontCampaign | null;
}) {
  const promo = campaign?.storefront;
  const showPromo = Boolean(promo?.promoEnabled);

  return (
    <section className="pt-10 lg:pt-[40px]">
      <div className="container-page">
        <h2 className="text-center text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">
          {meet.title}
        </h2>
        <div className={`mt-4 grid gap-4 ${showPromo ? "md:grid-cols-2" : "md:mx-auto md:max-w-[calc(50%-8px)]"}`}>
          {promo?.promoEnabled && campaign ? (
            <div className="relative flex min-h-[280px] min-w-0 flex-col justify-center overflow-hidden bg-navy px-6 py-8 text-white sm:min-h-[315px] sm:px-10 sm:py-9">
              {promo.promoImage ? (
                <Image
                  src={promo.promoImage}
                  alt=""
                  fill
                  sizes="660px"
                  className="object-cover object-right opacity-20"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,38,78,0.98)_0%,rgba(1,38,78,0.88)_50%,rgba(1,38,78,0.45)_100%)]" />
              <div className="relative z-10">
                <p className="text-[34px] font-light leading-none tracking-[-0.04em] sm:text-[42px]">
                  {promo.promoDiscountText || meet.navy.discount}
                </p>
                <h3 className="mt-4 text-[23px] font-semibold leading-8 sm:text-[27px]">
                  {promo.promoTitle || campaign.name}
                </h3>
                {promo.promoEyebrow ? (
                  <p className="mt-3 max-w-[300px] text-[13px] leading-5 text-white/75">{promo.promoEyebrow}</p>
                ) : null}
                <Link
                  href={promo.promoHref || "/search"}
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[5px] bg-white px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy transition-colors hover:bg-brand-light"
                >
                  {meet.navy.cta.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="flex min-h-[280px] min-w-0 flex-col justify-center bg-brand-light px-6 py-8 text-navy sm:min-h-[315px] sm:px-10 sm:py-9">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy/60">
              {meet.newsletter.eyebrow}
            </p>
            <h3 className="mt-2 text-[26px] font-semibold uppercase tracking-[-0.02em] sm:text-[32px]">{meet.newsletter.title}</h3>
            <p className="mt-3 text-[13px] leading-5 text-navy/70">{meet.newsletter.description}</p>
            <NewsletterForm copy={meet.newsletter} />
          </div>
        </div>
      </div>
    </section>
  );
}
