"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  convertToCurrency,
  formatCurrency,
  isCurrencyCode,
  sanitizeRates,
  type CurrencyCode,
  type ExchangeRates,
} from "@/lib/calculator";

const STORAGE_KEY = "homesolar.currency";

type RatesPayload = {
  rates?: Record<string, unknown> | null;
};

type CurrencyContextValue = {
  currency: CurrencyCode;
  rates: ExchangeRates;
  ratesSource: "market" | "fallback";
  updatedAt: string | null;
  setCurrency: (currency: CurrencyCode) => void;
  convert: (amountInBaseCurrency: number) => number;
  format: (amountInBaseCurrency: number) => string;
  formatCompact: (amountInBaseCurrency: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [ratesSource, setRatesSource] = useState<"market" | "fallback">("fallback");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isCurrencyCode(stored)) {
        queueMicrotask(() => setCurrencyState(stored));
      }
    } catch {
      // Storage can be unavailable in private browsing; the default is still valid.
    }

    let active = true;

    fetch("/api/rates", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: RatesPayload & { source?: string; updatedAt?: string } | null) => {
        if (!active || !data) return;
        setRates(sanitizeRates(data.rates));
        setRatesSource(data.source === "market" ? "market" : "fallback");
        setUpdatedAt(data.updatedAt ?? null);
      })
      .catch(() => {
        // Keep the fallback rates when the live feed cannot be reached.
      });

    return () => {
      active = false;
    };
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting the choice is optional.
    }
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      rates,
      ratesSource,
      updatedAt,
      setCurrency,
      convert: (amount: number) => convertToCurrency(amount, currency, rates),
      format: (amount: number) => formatCurrency(amount, currency, rates),
      formatCompact: (amount: number) => formatCurrency(amount, currency, rates, "symbol"),
    }),
    [currency, rates, ratesSource, updatedAt, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
