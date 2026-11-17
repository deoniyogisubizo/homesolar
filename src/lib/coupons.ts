import { roundMoney } from "@/lib/pricing";

export type CouponType = "percent" | "fixed" | "free_shipping";

export type CouponRules = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit: number;
  usageCount: number;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  status: "active" | "paused" | "archived";
};

export type CouponLine = {
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
  quantity: number;
};

export type CouponContext = {
  now?: Date;
  customerUsageCount?: number;
  customerEmail?: string;
};

export type CouponEvaluation =
  | {
      ok: true;
      code: string;
      discount: number;
      freeShipping: boolean;
      eligibleSubtotal: number;
    }
  | { ok: false; error: string };

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export function couponStatus(
  coupon: Pick<CouponRules, "status" | "startsAt" | "endsAt" | "usageLimit" | "usageCount">,
  now: Date = new Date(),
): "active" | "scheduled" | "expired" | "paused" | "archived" | "exhausted" {
  if (coupon.status === "archived") return "archived";
  if (coupon.status === "paused") return "paused";
  if (typeof coupon.usageLimit === "number" && coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return "exhausted";
  }
  const current = now.getTime();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > current) return "scheduled";
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < current) return "expired";
  return "active";
}

export function lineTotal(line: CouponLine) {
  return roundMoney(line.unitPrice * line.quantity);
}

export function eligibleSubtotal(coupon: Pick<CouponRules, "scope" | "productIds" | "categoryIds">, lines: CouponLine[]) {
  const matching = lines.filter((line) => {
    if (coupon.scope === "all") return true;
    if (coupon.scope === "products") return coupon.productIds.includes(line.productId);
    return Boolean(line.categoryId && coupon.categoryIds.includes(line.categoryId));
  });
  return roundMoney(matching.reduce((total, line) => total + lineTotal(line), 0));
}

export function evaluateCoupon(
  coupon: CouponRules | null,
  lines: CouponLine[],
  subtotal: number,
  context: CouponContext = {},
): CouponEvaluation {
  if (!coupon) return { ok: false, error: "Coupon not found." };
  const status = couponStatus(coupon, context.now);
  if (status === "paused") return { ok: false, error: "This coupon is not active." };
  if (status === "archived") return { ok: false, error: "This coupon is no longer available." };
  if (status === "scheduled") return { ok: false, error: "This coupon is not active yet." };
  if (status === "expired") return { ok: false, error: "This coupon has expired." };
  if (status === "exhausted") return { ok: false, error: "This coupon has reached its usage limit." };

  if (subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      error: `This coupon requires a subtotal of at least ${coupon.minSubtotal.toFixed(2)}.`,
    };
  }

  if ((context.customerUsageCount ?? 0) >= coupon.perCustomerLimit) {
    return { ok: false, error: "This coupon has already been used the maximum number of times." };
  }

  const eligible = eligibleSubtotal(coupon, lines);
  if (coupon.scope !== "all" && eligible <= 0) {
    return { ok: false, error: "This coupon does not apply to the items in your cart." };
  }

  if (coupon.type === "free_shipping") {
    return {
      ok: true,
      code: normalizeCouponCode(coupon.code),
      discount: 0,
      freeShipping: true,
      eligibleSubtotal: eligible,
    };
  }

  const raw =
    coupon.type === "percent"
      ? (eligible * Math.min(Math.max(coupon.value, 0), 100)) / 100
      : Math.max(coupon.value, 0);

  let discount = roundMoney(Math.min(raw, eligible));
  if (typeof coupon.maxDiscount === "number" && coupon.maxDiscount > 0) {
    discount = roundMoney(Math.min(discount, coupon.maxDiscount));
  }

  return {
    ok: true,
    code: normalizeCouponCode(coupon.code),
    discount,
    freeShipping: false,
    eligibleSubtotal: eligible,
  };
}
