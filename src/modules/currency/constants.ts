export const SUPPORTED_CURRENCIES = [
  "TND",
  "EUR",
  "USD",
  "GBP",
  "AED",
  "SAR",
  "CAD",
  "CHF",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const PRIMARY_CURRENCY: CurrencyCode = "TND";

/**
 * Indicative reference rates expressed as units of TND for 1 unit of currency.
 * These are ONLY fallbacks used to display indicative conversions; the original
 * provider price is always preserved untouched.
 */
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  TND: 1,
  EUR: 3.4,
  USD: 3.12,
  GBP: 3.95,
  AED: 0.85,
  SAR: 0.83,
  CAD: 2.29,
  CHF: 3.52,
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  TND: "Dinar tunisien",
  EUR: "Euro",
  USD: "Dollar US",
  GBP: "Livre sterling",
  AED: "Dirham",
  SAR: "Riyal saoudien",
  CAD: "Dollar canadien",
  CHF: "Franc suisse",
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Money rounding: TND uses millimes (3 decimals), others 2 decimals. */
export function roundMoney(amount: number, currency: string): number {
  const digits = currency === "TND" ? 3 : 2;
  const factor = 10 ** digits;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Converts between currencies using rates expressed in TND per unit.
 * Returns `null` when a rate is unavailable (never guesses).
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return roundMoney(amount, to);

  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;

  const inTnd = amount * fromRate;
  return roundMoney(inTnd / toRate, to);
}

export function exchangeRateBetween(
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  return Number((fromRate / toRate).toFixed(6));
}
