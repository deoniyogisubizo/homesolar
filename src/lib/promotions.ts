import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { PromotionRule, type PromotionRuleDocument, type PromotionRuleType } from "@/models/PromotionRule";
import { PromotionUsage } from "@/models/PromotionUsage";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { promotions } = COMMERCE_CONFIG;

interface CartItem {
  productId: Types.ObjectId;
  quantity: number;
  price: number;
  categoryId?: Types.ObjectId;
  stock?: number;
}

interface EvaluationContext {
  userId?: Types.ObjectId | null;
  phone?: string | null;
  deviceFingerprint?: string | null;
  isFirstOrder: boolean;
  customerSegment: "new" | "returning" | "vip" | "at_risk";
  cartItems: CartItem[];
  cartSubtotal: number;
  cartWeight: number;
}

interface LeanPromotionRule {
  _id: Types.ObjectId;
  name: string;
  description: string;
  type: PromotionRuleType;
  value: number;
  maxDiscount?: number | null;
  conditions: {
    minCart?: number;
    categories?: Types.ObjectId[];
    segment?: "all" | "new" | "returning" | "vip" | "at_risk";
    firstOrder?: boolean;
    stockAbove?: number;
    stockBelow?: number;
    startsAt?: Date | null;
    endsAt?: Date | null;
  };
  usageLimitTotal?: number | null;
  usageLimitPerUser: number;
  stackable: boolean;
  active: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ApplicableRule {
  rule: LeanPromotionRule;
  discount: number;
  freeShipping: boolean;
  applicableItems: Types.ObjectId[];
}

async function getCustomerSegment(userId: Types.ObjectId): Promise<"new" | "returning" | "vip" | "at_risk"> {
  const customer = await Customer.findById(userId).select("orderCount lifetimeValue createdAt").lean();
  if (!customer) return "new";

  if (customer.orderCount === 0) return "new";
  if (customer.lifetimeValue > 500000) return "vip";

  const daysSinceLastOrder = customer.lastOrderAt
    ? (Date.now() - new Date(customer.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24)
    : 365;

  if (daysSinceLastOrder > 90) return "at_risk";

  return "returning";
}

async function isFirstOrder(userId: Types.ObjectId): Promise<boolean> {
  const count = await Order.countDocuments({ customerId: userId, status: { $in: ["delivered", "confirmed"] } });
  return count === 0;
}

function checkConditions(rule: LeanPromotionRule, context: EvaluationContext): { valid: boolean; applicableItems: Types.ObjectId[] } {
  const { conditions } = rule;
  const applicableItems: Types.ObjectId[] = [];

  if (conditions.minCart && context.cartSubtotal < conditions.minCart) {
    return { valid: false, applicableItems: [] };
  }

  if (conditions.segment && conditions.segment !== "all" && conditions.segment !== context.customerSegment) {
    return { valid: false, applicableItems: [] };
  }

  if (conditions.firstOrder && !context.isFirstOrder) {
    return { valid: false, applicableItems: [] };
  }

  const now = new Date();
  if (conditions.startsAt && new Date(conditions.startsAt) > now) {
    return { valid: false, applicableItems: [] };
  }
  if (conditions.endsAt && new Date(conditions.endsAt) < now) {
    return { valid: false, applicableItems: [] };
  }

  for (const item of context.cartItems) {
    let itemValid = true;

    if (conditions.categories?.length && item.categoryId) {
      if (!conditions.categories.some((catId) => catId.equals(item.categoryId))) {
        itemValid = false;
      }
    }

    if (conditions.stockAbove && item.stock !== undefined && item.stock <= conditions.stockAbove) {
      itemValid = false;
    }
    if (conditions.stockBelow && item.stock !== undefined && item.stock >= conditions.stockBelow) {
      itemValid = false;
    }

    if (itemValid) {
      applicableItems.push(item.productId);
    }
  }

  return { valid: applicableItems.length > 0, applicableItems };
}

function calculateDiscount(rule: LeanPromotionRule, context: EvaluationContext, applicableItems: Types.ObjectId[]): { discount: number; freeShipping: boolean } {
  let discount = 0;
  let freeShipping = false;

  const applicableSubtotal = context.cartItems
    .filter((item) => applicableItems.some((id) => id.equals(item.productId)))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  switch (rule.type) {
    case "percent": {
      discount = (applicableSubtotal * rule.value) / 100;
      if (rule.maxDiscount) discount = Math.min(discount, rule.maxDiscount);
      break;
    }
    case "fixed": {
      discount = Math.min(rule.value, applicableSubtotal);
      break;
    }
    case "free_shipping": {
      freeShipping = true;
      break;
    }
    case "bogo": {
      const items = context.cartItems
        .filter((item) => applicableItems.some((id) => id.equals(item.productId)))
        .sort((a, b) => a.price - b.price);

      let freeCount = 0;
      for (const item of items) {
        const pairs = Math.floor(item.quantity / 2);
        freeCount += pairs;
      }
      if (freeCount > 0) {
        const cheapestPrice = items[0]?.price ?? 0;
        discount = cheapestPrice * freeCount;
      }
      break;
    }
  }

  return { discount, freeShipping };
}

async function checkUsageLimits(rule: LeanPromotionRule, context: EvaluationContext): Promise<boolean> {
  if (rule.usageLimitTotal && rule.usageCount >= rule.usageLimitTotal) {
    return false;
  }

  const windowStart = new Date(Date.now() - promotions.abusePrevention.windowDays * 24 * 60 * 60 * 1000);

  if (context.userId) {
    const userUsage = await PromotionUsage.countDocuments({
      ruleId: rule._id,
      userId: context.userId,
      createdAt: { $gte: windowStart },
    });
    if (userUsage >= Math.min(rule.usageLimitPerUser, promotions.abusePrevention.perUserLimit)) {
      return false;
    }
  }

  if (context.phone) {
    const phoneUsage = await PromotionUsage.countDocuments({
      ruleId: rule._id,
      phone: context.phone,
      createdAt: { $gte: windowStart },
    });
    if (phoneUsage >= promotions.abusePrevention.perPhoneLimit) {
      return false;
    }
  }

  if (context.deviceFingerprint) {
    const deviceUsage = await PromotionUsage.countDocuments({
      ruleId: rule._id,
      deviceFingerprint: context.deviceFingerprint,
      createdAt: { $gte: windowStart },
    });
    if (deviceUsage >= promotions.abusePrevention.perDeviceLimit) {
      return false;
    }
  }

  return true;
}

export async function evaluatePromotions(context: EvaluationContext): Promise<ApplicableRule[]> {
  await connectToDatabase();

  const rules = await PromotionRule.find({ active: true })
    .sort({ createdAt: -1 })
    .lean<LeanPromotionRule[]>();

  const applicableRules: ApplicableRule[] = [];

  for (const rule of rules) {
    const { valid, applicableItems } = checkConditions(rule, context);
    if (!valid) continue;

    const canUse = await checkUsageLimits(rule, context);
    if (!canUse) continue;

    const { discount, freeShipping } = calculateDiscount(rule, context, applicableItems);
    if (discount <= 0 && !freeShipping) continue;

    applicableRules.push({ rule, discount, freeShipping, applicableItems });
  }

  return applicableRules;
}

export async function applyBestPromotion(
  context: EvaluationContext,
  allowStacking = false,
): Promise<{ discount: number; freeShipping: boolean; appliedRules: Types.ObjectId[] }> {
  const applicable = await evaluatePromotions(context);

  if (applicable.length === 0) {
    return { discount: 0, freeShipping: false, appliedRules: [] };
  }

  if (!allowStacking) {
    const best = applicable.reduce((prev, curr) => (curr.discount > prev.discount ? curr : prev));
    return {
      discount: best.discount,
      freeShipping: best.freeShipping,
      appliedRules: [best.rule._id],
    };
  }

  const stackable = applicable.filter((r) => r.rule.stackable);
  if (stackable.length === 0) {
    const best = applicable.reduce((prev, curr) => (curr.discount > prev.discount ? curr : prev));
    return {
      discount: best.discount,
      freeShipping: best.freeShipping,
      appliedRules: [best.rule._id],
    };
  }

  let totalDiscount = 0;
  let freeShipping = false;
  const appliedRules: Types.ObjectId[] = [];

  for (const rule of stackable) {
    totalDiscount += rule.discount;
    if (rule.freeShipping) freeShipping = true;
    appliedRules.push(rule.rule._id);
  }

  const maxPossible = context.cartSubtotal;
  if (totalDiscount > maxPossible) totalDiscount = maxPossible;

  return { discount: totalDiscount, freeShipping, appliedRules };
}

export async function recordPromotionUsage(
  ruleId: Types.ObjectId,
  context: EvaluationContext,
  discountAmount: number,
  orderId?: Types.ObjectId,
): Promise<void> {
  await connectToDatabase();

  await PromotionUsage.create({
    ruleId,
    userId: context.userId ?? null,
    phone: context.phone ?? null,
    deviceFingerprint: context.deviceFingerprint ?? null,
    orderId: orderId ?? null,
    discountAmount,
  });

  await PromotionRule.updateOne({ _id: ruleId }, { $inc: { usageCount: 1 } });
}

export async function getSlowMoverSuggestions(limit = 20): Promise<Array<{
  productId: Types.ObjectId;
  name: string;
  stock: number;
  salesVelocity: number;
  suggestedDiscount: number;
}>> {
  await connectToDatabase();

  const { autoSuggestThreshold } = promotions;
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const products = await Product.find({
    publishStatus: "active",
    stock: { $gte: autoSuggestThreshold.stockMin },
  })
    .select("_id name stock price")
    .lean();

  const productIds = products.map((p) => p._id);

  const sales = await Order.aggregate<{ _id: Types.ObjectId; quantity: number }>([
    { $match: { createdAt: { $gte: windowStart }, status: { $in: ["delivered", "confirmed"] } } },
    { $unwind: "$items" },
    { $match: { "items.productId": { $in: productIds } } },
    { $group: { _id: "$items.productId", quantity: { $sum: "$items.quantity" } } },
  ]).exec();

  const salesMap = new Map(sales.map((s) => [s._id.toString(), s.quantity]));

  const suggestions = products
    .map((p) => {
      const sold = salesMap.get(p._id.toString()) ?? 0;
      const velocity = sold / 30;
      return {
        productId: p._id,
        name: p.name,
        stock: p.stock,
        salesVelocity: velocity,
        suggestedDiscount: velocity < autoSuggestThreshold.salesVelocityMax ? 10 : 0,
      };
    })
    .filter((s) => s.suggestedDiscount > 0)
    .sort((a, b) => a.salesVelocity - b.salesVelocity)
    .slice(0, limit);

  return suggestions;
}