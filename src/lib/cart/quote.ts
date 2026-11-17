import "server-only";

import { Coupon } from "@/models/Coupon";
import { getSetting } from "@/lib/admin/settings";
import { getPricingCampaigns } from "@/lib/data";
import { evaluateCoupon, normalizeCouponCode, type CouponRules } from "@/lib/coupons";
import { getEffectivePrice, roundMoney, type PricingContext } from "@/lib/pricing";
import { serializeProduct } from "@/lib/serialize";
import type { CartResponse } from "@/types";

type PopulatedProduct = Parameters<typeof serializeProduct>[0];

export type CartQuoteItem = {
  product: PopulatedProduct;
  variantSku?: string | null;
  color?: string | null;
  size?: string | null;
  quantity: number;
};

export type CartQuoteOptions = {
  district?: string | null;
  province?: string | null;
  couponCode?: string | null;
};

export type CartQuote = CartResponse & {
  validItems: Array<{
    productId: string;
    categoryId: string;
    name: string;
    slug: string;
    image: string;
    variantSku: string | null;
    color: string | null;
    size: string | null;
    unitPrice: number;
    originalPrice: number;
    quantity: number;
    lineTotal: number;
    campaignId: string | null;
    campaignName: string | null;
    discount: number;
  }>;
  taxRate: number;
  shippingRate: number;
  hasUnavailable: boolean;
  hasStockIssue: boolean;
};

export async function quoteCart(
  items: CartQuoteItem[],
  options: CartQuoteOptions = {},
): Promise<CartQuote> {
  const [shipping, campaigns] = await Promise.all([getSetting("shipping"), getPricingCampaigns()]);
  const couponCode = options.couponCode ? normalizeCouponCode(options.couponCode) : "";
  const context: PricingContext = {
    campaigns,
    now: new Date(),
    couponApplied: Boolean(couponCode),
  };

  const coupon = couponCode
    ? await Coupon.findOne({ codeLower: couponCode.toLowerCase() }).lean()
    : null;
  const couponRules = coupon ? toCouponRules(coupon) : null;

  const lines = items.map((item) => {
    const product = serializeProduct(item.product);
    const variant = item.variantSku
      ? product.variants.find((option) => option.sku === item.variantSku) ?? null
      : null;
    const quote = getEffectivePrice(
      { id: product.id, price: product.price, categoryId: product.category.id || null },
      variant,
      context,
    );
    const stock = variant ? variant.stock : product.stock;
    const unavailable = product.publishStatus !== "active" || (product.variants.length > 0 && !variant);
    const stockIssue = !unavailable && stock < item.quantity;
    const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice ?? null;

    return {
      serialized: product,
      variant,
      quote,
      stock,
      unavailable,
      stockIssue,
      compareAtPrice,
      unitPrice: quote.effectivePrice,
      lineTotal: roundMoney(quote.effectivePrice * item.quantity),
      campaignDiscount: roundMoney((quote.originalPrice - quote.effectivePrice) * item.quantity),
      quantity: item.quantity,
    };
  });

  const valid = lines.filter((line) => !line.unavailable && !line.stockIssue);
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + roundMoney(line.quote.originalPrice * line.quantity), 0),
  );
  const campaignDiscount = roundMoney(lines.reduce((sum, line) => sum + line.campaignDiscount, 0));
  const validSubtotal = roundMoney(valid.reduce((sum, line) => sum + line.lineTotal, 0));

  const couponLines = valid.map((line) => ({
    productId: line.serialized.id,
    categoryId: line.serialized.category.id || null,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
  }));
  const evaluation = couponRules
    ? evaluateCoupon(couponRules, couponLines, validSubtotal)
    : null;
  const couponDiscount = evaluation?.ok ? evaluation.discount : 0;
  const freeShipping = Boolean(evaluation?.ok && evaluation.freeShipping);
  const payableSubtotal = Math.max(0, roundMoney(subtotal - campaignDiscount - couponDiscount));

  const shippingRate = shippingRateFor(options.district ?? null, options.province ?? null, shipping.zones);
  const shippingPending = !options.district;
  const thresholdMet =
    shipping.freeShippingThreshold > 0 && payableSubtotal >= shipping.freeShippingThreshold;
  const shippingCost = shippingPending
    ? 0
    : freeShipping || thresholdMet
      ? 0
      : shipping.zones.length
        ? shippingRate
        : 0;
  const tax = roundMoney((payableSubtotal * shipping.taxRate) / 100);

  return {
    items: lines.map((line) => ({
      key: `${line.serialized.id}:${line.variant?.sku ?? ""}`,
      product: { ...line.serialized, pricing: line.quote },
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      compareAtPrice: line.compareAtPrice,
      lineTotal: line.lineTotal,
      variant: line.variant
        ? { sku: line.variant.sku, color: line.variant.color ?? null, size: line.variant.size ?? null }
        : null,
      stock: line.stock,
      notice: line.unavailable ? "unavailable" : line.stockIssue ? "stock" : null,
    })),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    campaignDiscount,
    couponDiscount,
    shipping: shippingCost,
    tax,
    total: roundMoney(payableSubtotal + shippingCost + tax),
    freeShipping: freeShipping || thresholdMet,
    shippingPending,
    coupon:
      evaluation?.ok && coupon
        ? { code: coupon.code, discount: couponDiscount, freeShipping: evaluation.freeShipping }
        : null,
    couponError: couponCode && !evaluation?.ok ? evaluation?.error ?? "Coupon not found." : null,
    validItems: valid.map((line) => ({
      productId: line.serialized.id,
      categoryId: line.serialized.category.id,
      name: line.serialized.name,
      slug: line.serialized.slug,
      image: line.serialized.image,
      variantSku: line.variant?.sku ?? null,
      color: line.variant?.color ?? null,
      size: line.variant?.size ?? null,
      unitPrice: line.unitPrice,
      originalPrice: line.quote.originalPrice,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
      campaignId: line.quote.campaignId ?? null,
      campaignName: line.quote.campaignName ?? null,
      discount: line.campaignDiscount,
    })),
    taxRate: shipping.taxRate,
    shippingRate,
    hasUnavailable: lines.some((line) => line.unavailable),
    hasStockIssue: lines.some((line) => line.stockIssue),
  };
}

function shippingRateFor(
  district: string | null,
  province: string | null,
  zones: Array<{ district: string; rate: number }>,
) {
  if (!district && !province) return 0;
  const candidates = [district, province].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const normalized = candidate.trim().toLowerCase();
    const exact = zones.find((zone) => zone.district.trim().toLowerCase() === normalized);
    if (exact) return exact.rate;
    if (normalized === "kigali city") {
      const kigali = zones.find((zone) => zone.district.trim().toLowerCase() === "kigali");
      if (kigali) return kigali.rate;
    }
  }
  return 0;
}

function toCouponRules(coupon: {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotal: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit: number;
  usageCount: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  scope: "all" | "products" | "categories";
  productIds: unknown[];
  categoryIds: unknown[];
  status: "active" | "paused" | "archived";
}): CouponRules {
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minSubtotal: coupon.minSubtotal,
    maxDiscount: coupon.maxDiscount ?? null,
    usageLimit: coupon.usageLimit ?? null,
    perCustomerLimit: coupon.perCustomerLimit,
    usageCount: coupon.usageCount,
    startsAt: coupon.startsAt ?? null,
    endsAt: coupon.endsAt ?? null,
    scope: coupon.scope,
    productIds: coupon.productIds.map(String),
    categoryIds: coupon.categoryIds.map(String),
    status: coupon.status,
  };
}
