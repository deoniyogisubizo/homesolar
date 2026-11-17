export const BASE_CURRENCY = "USD" as const;
export const DEFAULT_CURRENCY = "RWF" as const;

export type CurrencyCode =
  | "RWF"
  | "USD"
  | "KES"
  | "TZS"
  | "UGX"
  | "BIF"
  | "CDF"
  | "SOS"
  | "SSP"
  | "ETB"
  | "ERN"
  | "DJF"
  | "MGA"
  | "MWK"
  | "MZN"
  | "ZMW";

export type CurrencyInfo = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
};

export type ExchangeRates = Record<CurrencyCode, number>;

export const CURRENCY_CODES: CurrencyCode[] = [
  "RWF",
  "USD",
  "KES",
  "TZS",
  "UGX",
  "BIF",
  "CDF",
  "SOS",
  "SSP",
  "ETB",
  "ERN",
  "DJF",
  "MGA",
  "MWK",
  "MZN",
  "ZMW",
];

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  RWF: { code: "RWF", name: "Rwandan Franc", symbol: "FRw", decimals: 0 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  KES: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimals: 2 },
  TZS: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", decimals: 0 },
  UGX: { code: "UGX", name: "Ugandan Shilling", symbol: "USh", decimals: 0 },
  BIF: { code: "BIF", name: "Burundian Franc", symbol: "FBu", decimals: 0 },
  CDF: { code: "CDF", name: "Congolese Franc", symbol: "FC", decimals: 2 },
  SOS: { code: "SOS", name: "Somali Shilling", symbol: "Sh", decimals: 0 },
  SSP: { code: "SSP", name: "South Sudanese Pound", symbol: "£", decimals: 2 },
  ETB: { code: "ETB", name: "Ethiopian Birr", symbol: "Br", decimals: 2 },
  ERN: { code: "ERN", name: "Eritrean Nakfa", symbol: "Nfk", decimals: 2 },
  DJF: { code: "DJF", name: "Djiboutian Franc", symbol: "Fdj", decimals: 0 },
  MGA: { code: "MGA", name: "Malagasy Ariary", symbol: "Ar", decimals: 0 },
  MWK: { code: "MWK", name: "Malawian Kwacha", symbol: "MK", decimals: 2 },
  MZN: { code: "MZN", name: "Mozambican Metical", symbol: "MT", decimals: 2 },
  ZMW: { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", decimals: 2 },
};

export const CURRENCY_LIST = CURRENCY_CODES.map((code) => CURRENCIES[code]);

// Fallback rates (units per 1 USD) used when the live market feed is unavailable.
export const RATES_UPDATED_AT = "2026-11-14T00:00:00.000Z";

export const FALLBACK_RATES: ExchangeRates = {
  RWF: 1479.74,
  USD: 1,
  KES: 129.99,
  TZS: 2642.09,
  UGX: 4024.6,
  BIF: 3008.88,
  CDF: 2250.68,
  SOS: 571.81,
  SSP: 5751.93,
  ETB: 161.22,
  ERN: 15,
  DJF: 177.72,
  MGA: 4574.23,
  MWK: 1747.01,
  MZN: 63.74,
  ZMW: 20.44,
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODES.includes(value as CurrencyCode);
}

export function sanitizeRates(input: Record<string, unknown> | null | undefined): ExchangeRates {
  const rates: ExchangeRates = { ...FALLBACK_RATES };
  if (!input) return rates;

  for (const code of CURRENCY_CODES) {
    const value = input[code];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      rates[code] = value;
    }
  }

  return rates;
}

export function getRate(currency: CurrencyCode, rates: ExchangeRates = FALLBACK_RATES) {
  const rate = rates[currency] ?? FALLBACK_RATES[currency];
  return Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_RATES[currency];
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates = FALLBACK_RATES,
) {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;

  const fromRate = getRate(from, rates);
  const toRate = getRate(to, rates);
  return (amount / fromRate) * toRate;
}

export function convertToCurrency(
  amountInBaseCurrency: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  rates: ExchangeRates = FALLBACK_RATES,
) {
  return convertCurrency(amountInBaseCurrency, BASE_CURRENCY, currency, rates);
}

export function formatCurrency(
  amountInBaseCurrency: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  rates: ExchangeRates = FALLBACK_RATES,
  display: "code" | "symbol" = "code",
) {
  const info = CURRENCIES[currency];
  const value = convertToCurrency(amountInBaseCurrency, currency, rates);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: display,
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  }).format(value);
}

export function formatCurrencyRange(
  price: number,
  priceMax?: number | null,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  rates: ExchangeRates = FALLBACK_RATES,
) {
  return priceMax && priceMax > price
    ? `${formatCurrency(price, currency, rates)} \u2013 ${formatCurrency(priceMax, currency, rates)}`
    : formatCurrency(price, currency, rates);
}

const MARKET_RATES_URL = "https://open.er-api.com/v6/latest/USD";

type MarketRatesPayload = {
  result?: string;
  rates?: Record<string, unknown>;
  time_last_update_utc?: string;
};

export type MarketRatesResult = {
  rates: ExchangeRates;
  updatedAt: string;
  source: "market" | "fallback";
};

export async function fetchMarketRates(): Promise<MarketRatesResult> {
  try {
    const response = await fetch(MARKET_RATES_URL);

    if (!response.ok) {
      throw new Error(`Market rate feed returned ${response.status}`);
    }

    const payload = (await response.json()) as MarketRatesPayload;

    if (payload.result && payload.result !== "success") {
      throw new Error(`Market rate feed returned ${payload.result}`);
    }

    if (!payload.rates) {
      throw new Error("Market rate feed did not include rates");
    }

    return {
      rates: sanitizeRates(payload.rates),
      updatedAt: payload.time_last_update_utc ?? new Date().toISOString(),
      source: "market",
    };
  } catch {
    return {
      rates: FALLBACK_RATES,
      updatedAt: RATES_UPDATED_AT,
      source: "fallback",
    };
  }
}
