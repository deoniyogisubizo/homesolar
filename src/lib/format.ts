import {
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  formatCurrency,
  formatCurrencyRange,
  type CurrencyCode,
  type ExchangeRates,
} from "@/lib/calculator";

export function formatPrice(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  rates: ExchangeRates = FALLBACK_RATES,
) {
  return formatCurrency(value, currency, rates);
}

export function formatPriceRange(
  price: number,
  priceMax?: number | null,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  rates: ExchangeRates = FALLBACK_RATES,
) {
  return formatCurrencyRange(price, priceMax, currency, rates);
}
