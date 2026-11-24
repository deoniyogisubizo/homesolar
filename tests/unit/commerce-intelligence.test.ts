import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Commerce Intelligence - Trending Scores", () => {
  const EVENT_WEIGHTS = { purchase: 5, cart_add: 2, wishlist: 1.5, view: 0.5 };
  const HALF_LIFE_DAYS = 10;

  function timeDecayWeight(ageDays: number): number {
    return Math.exp(-ageDays / HALF_LIFE_DAYS);
  }

  it("calculates time decay correctly", () => {
    expect(timeDecayWeight(0)).toBeCloseTo(1, 5);
    expect(timeDecayWeight(10)).toBeCloseTo(Math.exp(-1), 5);
    expect(timeDecayWeight(20)).toBeCloseTo(Math.exp(-2), 5);
    expect(timeDecayWeight(100)).toBeCloseTo(0, 3);
  });

  it("weights events correctly", () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const events = [
      { type: "purchase" as const, createdAt: new Date(now - 0 * dayMs) },
      { type: "cart_add" as const, createdAt: new Date(now - 5 * dayMs) },
      { type: "view" as const, createdAt: new Date(now - 15 * dayMs) },
    ];

    let score = 0;
    for (const evt of events) {
      const ageDays = (now - evt.createdAt.getTime()) / dayMs;
      const decay = timeDecayWeight(ageDays);
      score += EVENT_WEIGHTS[evt.type] * decay;
    }

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(5 + 2 + 0.5);
  });

  it("handles empty events", () => {
    let score = 0;
    const events: Array<{ type: string; createdAt: Date }> = [];
    for (const evt of events) {
      const ageDays = (Date.now() - evt.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      score += (EVENT_WEIGHTS[evt.type as keyof typeof EVENT_WEIGHTS] ?? 0) * Math.exp(-ageDays / HALF_LIFE_DAYS);
    }
    expect(score).toBe(0);
  });
});

describe("Commerce Intelligence - Search Ranking", () => {
  const WEIGHTS = { textRelevance: 0.6, popularity: 0.25, inStock: 0.1, recency: 0.05 };

  function calculateScore(textRel: number, pop: number, inStock: number, recencyDays: number): number {
    const recencyScore = Math.max(0, 1 - Math.min(recencyDays / 30, 1));
    return textRel * WEIGHTS.textRelevance + pop * WEIGHTS.popularity + inStock * WEIGHTS.inStock + recencyScore * WEIGHTS.recency;
  }

  it("ranks in-stock items higher", () => {
    const inStockScore = calculateScore(0.8, 0.5, 1, 5);
    const outOfStockScore = calculateScore(0.8, 0.5, 0, 5);
    expect(inStockScore).toBeGreaterThan(outOfStockScore);
  });

  it("weights text relevance highest", () => {
    const highTextScore = calculateScore(1, 0, 1, 0);
    const highPopScore = calculateScore(0, 1, 1, 0);
    expect(highTextScore).toBeGreaterThan(highPopScore);
  });

  it("penalizes old products", () => {
    const newScore = calculateScore(0.5, 0.5, 1, 1);
    const oldScore = calculateScore(0.5, 0.5, 1, 60);
    expect(newScore).toBeGreaterThan(oldScore);
  });

  it("handles edge case zero values", () => {
    // recencyScore = 1 when days=0, so score = 1 * 0.05 = 0.05
    expect(calculateScore(0, 0, 0, 0)).toBeCloseTo(0.05, 5);
  });
});

describe("Commerce Intelligence - Fraud Scoring", () => {
  const FACTORS = {
    newAccount: 15,
    shippingBillingMismatch: 15,
    orderValueHigh: 20,
    failedPayments: 25,
    multiAccountPhone: 25,
    multiAccountDevice: 25,
    rapidRepeatOrders: 10,
    highRiskCombo: 10,
  };

  const THRESHOLDS = { autoApprove: 39, manualReview: 69, hold: 70 };

  function getDecision(score: number): "auto_approve" | "manual_review" | "hold" {
    if (score <= THRESHOLDS.autoApprove) return "auto_approve";
    if (score <= THRESHOLDS.manualReview) return "manual_review";
    return "hold";
  }

  it("auto approves low scores", () => {
    expect(getDecision(0)).toBe("auto_approve");
    expect(getDecision(20)).toBe("auto_approve");
    expect(getDecision(39)).toBe("auto_approve");
  });

  it("flags medium scores for review", () => {
    expect(getDecision(40)).toBe("manual_review");
    expect(getDecision(50)).toBe("manual_review");
    expect(getDecision(69)).toBe("manual_review");
  });

  it("holds high scores", () => {
    expect(getDecision(70)).toBe("hold");
    expect(getDecision(85)).toBe("hold");
    expect(getDecision(100)).toBe("hold");
  });

  it("caps score at 100", () => {
    const factors = Object.values(FACTORS).reduce((a, b) => a + b, 0);
    expect(factors).toBeGreaterThan(100);
    const capped = Math.min(100, factors);
    expect(capped).toBe(100);
  });
});

describe("Commerce Intelligence - Inventory Forecasting", () => {
  const VELOCITY_WINDOWS = [7, 14, 30];
  const VELOCITY_WEIGHTS = [0.5, 0.3, 0.2];
  const SAFETY_STOCK_DAYS = 7;
  const LEAD_TIME_DAYS = 14;

  function calculateVelocity(dailySales: number[], days: number): number {
    const relevant = dailySales.slice(-days);
    return relevant.reduce((a, b) => a + b, 0) / days;
  }

  function weightedVelocity(dailySales: number[]): number {
    const v7 = calculateVelocity(dailySales, 7);
    const v14 = calculateVelocity(dailySales, 14);
    const v30 = calculateVelocity(dailySales, 30);
    return v7 * VELOCITY_WEIGHTS[0] + v14 * VELOCITY_WEIGHTS[1] + v30 * VELOCITY_WEIGHTS[2];
  }

  it("calculates weighted velocity correctly", () => {
    const dailySales = Array(30).fill(2);
    const vel = weightedVelocity(dailySales);
    expect(vel).toBeCloseTo(2, 5);
  });

  it("handles increasing trend", () => {
    const dailySales = [...Array(7).fill(1), ...Array(7).fill(2), ...Array(16).fill(3)];
    const vel = weightedVelocity(dailySales);
    expect(vel).toBeGreaterThan(2);
    expect(vel).toBeLessThan(3);
  });

  it("calculates days of stock left", () => {
    const velocity = 5;
    const stock = 100;
    const daysLeft = stock / velocity;
    expect(daysLeft).toBe(20);
  });

  it("calculates reorder point", () => {
    const velocity = 5;
    const reorderPoint = velocity * LEAD_TIME_DAYS + velocity * SAFETY_STOCK_DAYS;
    expect(reorderPoint).toBe(5 * 14 + 5 * 7);
  });

  it("triggers alert when days left < lead time", () => {
    const velocity = 10;
    const stock = 100;
    const daysLeft = stock / velocity;
    expect(daysLeft < LEAD_TIME_DAYS).toBe(true);
  });
});

describe("Commerce Intelligence - RFM Scoring", () => {
  const RECENCY_BINS = [7, 30, 90, 180, 365];
  const FREQUENCY_BINS = [1, 2, 4, 8, 16];
  const MONETARY_BINS = [10000, 50000, 150000, 500000, 1000000];

  function calculateRFM(daysSinceLastOrder: number, orderCount: number, totalSpent: number) {
    let recencyScore = 1;
    for (let i = 0; i < RECENCY_BINS.length; i++) {
      if (daysSinceLastOrder <= RECENCY_BINS[i]) {
        recencyScore = 5 - i;
        break;
      }
    }

    let frequencyScore = 1;
    for (let i = 0; i < FREQUENCY_BINS.length; i++) {
      if (orderCount >= FREQUENCY_BINS[i]) {
        frequencyScore = Math.min(i + 2, 5);
      } else break;
    }

    let monetaryScore = 1;
    for (let i = 0; i < MONETARY_BINS.length; i++) {
      if (totalSpent >= MONETARY_BINS[i]) {
        monetaryScore = Math.min(i + 2, 5);
      } else break;
    }

    return { recencyScore, frequencyScore, monetaryScore };
  }

  it("scores recent buyers high on recency", () => {
    const rfm = calculateRFM(3, 5, 100000);
    expect(rfm.recencyScore).toBe(5);
  });

  it("scores old buyers low on recency", () => {
    const rfm = calculateRFM(400, 5, 100000);
    expect(rfm.recencyScore).toBe(1);
  });

  it("scores frequent buyers high on frequency", () => {
    const rfm = calculateRFM(10, 20, 100000);
    expect(rfm.frequencyScore).toBe(5);
  });

  it("scores high spenders high on monetary", () => {
    const rfm = calculateRFM(10, 5, 2000000);
    expect(rfm.monetaryScore).toBe(5);
  });

  it("handles new customers", () => {
    const rfm = calculateRFM(365, 0, 0);
    expect(rfm.recencyScore).toBe(1);
    expect(rfm.frequencyScore).toBe(1);
    expect(rfm.monetaryScore).toBe(1);
  });
});

describe("Commerce Intelligence - Personalized Feed Scoring", () => {
  const WEIGHTS = { interest: 0.6, popularity: 0.3, novelty: 0.1 };
  const MAX_CATEGORY_SHARE = 0.4;

  function calculateFeedScore(interest: number, popularity: number, novelty: number): number {
    return interest * WEIGHTS.interest + popularity * WEIGHTS.popularity + novelty * WEIGHTS.novelty;
  }

  it("weights interest highest", () => {
    const highInterest = calculateFeedScore(1, 0, 0);
    const highPop = calculateFeedScore(0, 1, 0);
    expect(highInterest).toBeGreaterThan(highPop);
  });

  it("applies category diversification", () => {
    const items = [
      { category: "A", score: 10 },
      { category: "A", score: 9 },
      { category: "A", score: 8 },
      { category: "B", score: 7 },
      { category: "C", score: 6 },
    ];
    const limit = 4;
    const maxPerCategory = Math.ceil(limit * MAX_CATEGORY_SHARE);

    const selected: typeof items = [];
    const catCounts = new Map<string, number>();

    for (const item of items) {
      if (selected.length >= limit) break;
      const count = catCounts.get(item.category) ?? 0;
      if (count >= maxPerCategory) continue;
      selected.push(item);
      catCounts.set(item.category, count + 1);
    }

    const catAcount = selected.filter((i) => i.category === "A").length;
    expect(catAcount).toBeLessThanOrEqual(maxPerCategory);
    expect(selected.length).toBe(limit);
  });
});

describe("Commerce Intelligence - Delivery Calculation", () => {
  const DISTRICTS: Record<string, { baseFee: number; perKgFee: number; standardDays: number; expressDays: number }> = {
    nyarugenge: { baseFee: 2000, perKgFee: 500, standardDays: 1, expressDays: 0 },
    gasabo: { baseFee: 2500, perKgFee: 600, standardDays: 1, expressDays: 0 },
    rubavu: { baseFee: 4000, perKgFee: 800, standardDays: 2, expressDays: 1 },
  };
  const FREE_SHIPPING_THRESHOLD = 50000;

  function calculateDelivery(district: string, weightKg: number, itemsValue: number, isExpress = false) {
    const config = DISTRICTS[district.toLowerCase()] || { baseFee: 5000, perKgFee: 1000, standardDays: 3, expressDays: 2 };
    const isFree = itemsValue >= FREE_SHIPPING_THRESHOLD;
    const fee = isFree ? 0 : config.baseFee + weightKg * config.perKgFee;
    const days = isExpress ? config.expressDays : config.standardDays;
    return { fee, days, isFree, freeRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - itemsValue) };
  }

  it("calculates fee correctly", () => {
    const result = calculateDelivery("nyarugenge", 2, 30000);
    expect(result.fee).toBe(2000 + 2 * 500);
    expect(result.isFree).toBe(false);
  });

  it("applies free shipping threshold", () => {
    const result = calculateDelivery("nyarugenge", 10, 60000);
    expect(result.fee).toBe(0);
    expect(result.isFree).toBe(true);
  });

  it("uses express days when requested", () => {
    const standard = calculateDelivery("rubavu", 1, 10000, false);
    const express = calculateDelivery("rubavu", 1, 10000, true);
    expect(express.days).toBeLessThan(standard.days);
  });

  it("handles unknown districts with defaults", () => {
    const result = calculateDelivery("unknown", 5, 20000);
    expect(result.fee).toBe(5000 + 5 * 1000);
    expect(result.days).toBe(3);
  });
});

describe("Commerce Intelligence - Promotion Evaluation", () => {
  interface Rule {
    type: "percent" | "fixed" | "free_shipping" | "bogo";
    value: number;
    minCart?: number;
    maxDiscount?: number;
  }

  function evaluateRule(rule: Rule, subtotal: number, itemPrices: number[]): { discount: number; freeShipping: boolean } {
    if (rule.minCart && subtotal < rule.minCart) return { discount: 0, freeShipping: false };

    switch (rule.type) {
      case "percent": {
        let discount = (subtotal * rule.value) / 100;
        if (rule.maxDiscount) discount = Math.min(discount, rule.maxDiscount);
        return { discount, freeShipping: false };
      }
      case "fixed": {
        return { discount: Math.min(rule.value, subtotal), freeShipping: false };
      }
      case "free_shipping": {
        return { discount: 0, freeShipping: true };
      }
      case "bogo": {
        const sorted = [...itemPrices].sort((a, b) => a - b);
        const freeCount = Math.floor(sorted.length / 2);
        const discount = sorted.slice(0, freeCount).reduce((a, b) => a + b, 0);
        return { discount, freeShipping: false };
      }
    }
  }

  it("calculates percent discount", () => {
    const result = evaluateRule({ type: "percent", value: 10, maxDiscount: 5000 }, 10000, []);
    expect(result.discount).toBe(1000);
  });

  it("respects max discount", () => {
    const result = evaluateRule({ type: "percent", value: 50, maxDiscount: 5000 }, 100000, []);
    expect(result.discount).toBe(5000);
  });

  it("calculates fixed discount", () => {
    const result = evaluateRule({ type: "fixed", value: 2000 }, 1500, []);
    expect(result.discount).toBe(1500);
  });

  it("handles BOGO", () => {
    const result = evaluateRule({ type: "bogo", value: 0 }, 0, [1000, 2000, 3000, 4000]);
    expect(result.discount).toBe(1000 + 2000);
  });

  it("returns free shipping flag", () => {
    const result = evaluateRule({ type: "free_shipping", value: 0 }, 10000, []);
    expect(result.freeShipping).toBe(true);
    expect(result.discount).toBe(0);
  });
});