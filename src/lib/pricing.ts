import type { PriceQuote, ProductVariant } from "@/types";

export type CampaignStatus = "draft" | "scheduled" | "active" | "expired" | "paused";

export type PricingCampaign = {
  id: string;
  name: string;
  startsAt: Date | string;
  endsAt: Date | string;
  discountType: "percent" | "fixed";
  value: number;
  scope: "store" | "categories" | "products";
  categoryIds: string[];
  productIds: string[];
  excludedProductIds: string[];
  priority: number;
  stackWithCoupons: boolean;
  active: boolean;
  pausedAt?: Date | string | null;
  endedAt?: Date | string | null;
};

export type PricingProduct = {
  id: string;
  price: number;
  categoryId?: string | null;
  compareAtPrice?: number | null;
};

export type PricingVariant = Pick<ProductVariant, "sku" | "price" | "compareAtPrice">;

export type PricingContext = {
  now?: Date;
  campaigns: PricingCampaign[];
  couponApplied?: boolean;
};

export type CampaignQuote = {
  campaign: PricingCampaign;
  effectivePrice: number;
  discountAmount: number;
  discountPercent: number;
};

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function timestamp(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function getCampaignStatus(
  campaign: Pick<PricingCampaign, "active" | "startsAt" | "endsAt" | "pausedAt" | "endedAt">,
  now: Date = new Date(),
): CampaignStatus {
  if (campaign.endedAt) return "expired";
  if (!campaign.active) return "paused";
  if (campaign.pausedAt) return "paused";

  const current = now.getTime();
  const starts = timestamp(campaign.startsAt);
  const ends = timestamp(campaign.endsAt);

  if (current < starts) return "scheduled";
  if (current > ends) return "expired";
  return "active";
}

export function isCampaignActive(campaign: PricingCampaign, now: Date = new Date()) {
  return getCampaignStatus(campaign, now) === "active";
}

export function campaignAppliesToProduct(
  campaign: Pick<
    PricingCampaign,
    "scope" | "categoryIds" | "productIds" | "excludedProductIds"
  >,
  product: Pick<PricingProduct, "id" | "categoryId" | "price">,
): boolean {
  if (campaign.excludedProductIds.includes(product.id)) return false;
  if (campaign.scope === "store") return true;
  if (campaign.scope === "products") return campaign.productIds.includes(product.id);
  if (campaign.scope === "categories") {
    return Boolean(product.categoryId && campaign.categoryIds.includes(product.categoryId));
  }
  return false;
}

export function campaignDiscountAmount(basePrice: number, campaign: PricingCampaign) {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  const raw =
    campaign.discountType === "percent"
      ? (basePrice * Math.min(Math.max(campaign.value, 0), 100)) / 100
      : Math.max(campaign.value, 0);
  return roundMoney(Math.min(raw, basePrice));
}

export function executableCampaigns(context: PricingContext): PricingCampaign[] {
  const now = context.now ?? new Date();
  return context.campaigns.filter((campaign) => {
    if (!isCampaignActive(campaign, now)) return false;
    if (context.couponApplied && !campaign.stackWithCoupons) return false;
    return true;
  });
}

export function bestCampaignForProduct(
  product: PricingProduct,
  context: PricingContext,
): CampaignQuote | null {
  const basePrice = product.price;
  if (!Number.isFinite(basePrice) || basePrice <= 0) return null;

  let best: CampaignQuote | null = null;

  for (const campaign of executableCampaigns(context)) {
    if (!campaignAppliesToProduct(campaign, product)) continue;
    const discountAmount = campaignDiscountAmount(basePrice, campaign);
    if (discountAmount <= 0) continue;

    const quote: CampaignQuote = {
      campaign,
      effectivePrice: roundMoney(basePrice - discountAmount),
      discountAmount,
      discountPercent: Math.round((discountAmount / basePrice) * 100),
    };

    if (!best) {
      best = quote;
      continue;
    }

    if (quote.campaign.priority > best.campaign.priority) {
      best = quote;
    } else if (quote.campaign.priority === best.campaign.priority && quote.discountAmount > best.discountAmount) {
      best = quote;
    }
  }

  return best;
}

export function getEffectivePrice(
  product: PricingProduct,
  variant: PricingVariant | null | undefined,
  context: PricingContext,
): PriceQuote {
  const basePrice = roundMoney(variant?.price ?? product.price);
  const campaignProduct: PricingProduct = { ...product, price: basePrice };
  const quote = bestCampaignForProduct(campaignProduct, context);

  if (!quote) {
    return {
      originalPrice: basePrice,
      effectivePrice: basePrice,
      discountPercent: 0,
      campaignId: null,
      campaignName: null,
      campaignStartsAt: null,
      campaignEndsAt: null,
    };
  }

  return {
    originalPrice: basePrice,
    effectivePrice: quote.effectivePrice,
    discountPercent: quote.discountPercent,
    campaignId: quote.campaign.id,
    campaignName: quote.campaign.name,
    campaignStartsAt: new Date(quote.campaign.startsAt).toISOString(),
    campaignEndsAt: new Date(quote.campaign.endsAt).toISOString(),
  };
}

export function quoteForVariants(
  product: PricingProduct,
  variants: PricingVariant[],
  context: PricingContext,
): Record<string, PriceQuote> {
  return Object.fromEntries(
    variants.map((variant) => [variant.sku, getEffectivePrice(product, variant, context)]),
  );
}

export function applyPricingContext(product: {
  price: number;
  categoryId?: string | null;
  variants?: PricingVariant[];
}, context: PricingContext) {
  const pricing = getEffectivePrice(
    { id: "", price: product.price, categoryId: product.categoryId ?? null },
    null,
    context,
  );
  return pricing;
}

export function campaignOverlaps(
  left: Pick<PricingCampaign, "startsAt" | "endsAt">,
  right: Pick<PricingCampaign, "startsAt" | "endsAt">,
) {
  return timestamp(left.startsAt) <= timestamp(right.endsAt) && timestamp(right.startsAt) <= timestamp(left.endsAt);
}

export function campaignsSharingProducts(left: PricingCampaign, right: PricingCampaign) {
  if (left.scope === "store" || right.scope === "store") return true;
  if (left.scope === "products" && right.scope === "products") {
    return left.productIds.some((id) => right.productIds.includes(id) && !right.excludedProductIds.includes(id));
  }
  if (left.scope === "categories" && right.scope === "categories") {
    return left.categoryIds.some((id) => right.categoryIds.includes(id));
  }
  return false;
}

export function campaignsForProduct(
  productId: string,
  context: PricingContext,
): PricingCampaign[] {
  return executableCampaigns(context).filter((campaign) =>
    campaignAppliesToProduct(campaign, { id: productId, price: 0, categoryId: null }),
  );
}

export function getActiveCampaignsForProducts(
  productIds: string[],
  context: PricingContext,
): PricingCampaign[] {
  return executableCampaigns(context).filter((campaign) =>
    campaignAppliesToProduct(campaign, { id: productIds[0], price: 0, categoryId: null }),
  );
}

export function findCampaignConflicts(
  campaign: PricingCampaign,
  others: PricingCampaign[],
): PricingCampaign[] {
  return others.filter(
    (other) =>
      other.id !== campaign.id &&
      isCampaignActive(other) &&
      campaignOverlaps(campaign, other) &&
      campaignsSharingProducts(campaign, other),
  );
}
