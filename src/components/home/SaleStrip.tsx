import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CampaignCountdown } from "@/components/home/CampaignCountdown";
import type { StorefrontCampaign } from "@/lib/data";
import type { SiteContentData } from "@/types";

export function SaleStrip({
  sale,
  campaign,
}: {
  sale: SiteContentData["sale"];
  campaign: StorefrontCampaign | null;
}) {
  // The strip is the promotional band directly below the hero. It is hidden
  // only when the admin turns it off or when there is nothing to show.
  if (!sale.enabled) return null;

  const useCampaign = !sale.manualOverride && campaign?.storefront.saleEnabled;
  const campaignDisplay = useCampaign
    ? {
        title: campaign?.storefront.saleHeading || campaign?.name || "",
        description: campaign?.storefront.saleText || "",
        buttons: [
          ...(campaign?.storefront.primaryCtaLabel
            ? [{ label: campaign.storefront.primaryCtaLabel, href: campaign.storefront.primaryCtaHref }]
            : []),
          ...(campaign?.storefront.secondaryCtaLabel
            ? [{ label: campaign.storefront.secondaryCtaLabel, href: campaign.storefront.secondaryCtaHref }]
            : []),
        ],
        endsAt: campaign?.endsAt ?? null,
        countdown: campaign?.storefront.countdownEnabled ?? false,
      }
    : null;
  const display = campaignDisplay ?? {
    title: sale.title,
    description: sale.description,
    buttons: sale.buttons,
    endsAt: null,
    countdown: false,
  };

  if (!display.title && !display.description && !display.buttons.length) {
    return null;
  }

  return (
    <section className="bg-white">
      <div className="container-page flex flex-col items-center justify-center py-8 text-center sm:py-9">
        <h2 className="text-[23px] font-bold tracking-[-0.02em] text-ink sm:text-[27px] lg:text-[31px]">{display.title}</h2>
        <p className="mt-2.5 max-w-[820px] text-[13px] leading-5 text-muted">{display.description}</p>
        {display.countdown && display.endsAt ? <CampaignCountdown endsAt={display.endsAt} /> : null}
        {display.buttons.length ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {display.buttons.map((button) => (
              <Link
                key={`${button.label}-${button.href}`}
                href={button.href}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[5px] bg-navy px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-deep"
              >
                {button.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
