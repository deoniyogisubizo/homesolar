"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";

export function Price({
  value,
  className,
  compact = false,
}: {
  value: number;
  className?: string;
  compact?: boolean;
}) {
  const { format, formatCompact } = useCurrency();
  return <span className={className}>{compact ? formatCompact(value) : format(value)}</span>;
}

export function PriceRange({
  price,
  priceMax,
  className,
}: {
  price: number;
  priceMax?: number | null;
  className?: string;
}) {
  const { format } = useCurrency();
  const label =
    priceMax && priceMax > price
      ? `${format(price)} \u2013 ${format(priceMax)}`
      : format(price);

  return <span className={className}>{label}</span>;
}
