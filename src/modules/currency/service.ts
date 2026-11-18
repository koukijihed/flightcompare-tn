import "server-only";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";
import {
  FALLBACK_RATES,
  PRIMARY_CURRENCY,
  SUPPORTED_CURRENCIES,
  convertAmount,
  exchangeRateBetween,
  roundMoney,
  type CurrencyCode,
} from "./constants";

export type RateSnapshot = {
  rates: Record<string, number>;
  fetchedAt: Date;
  source: string;
  isLive: boolean;
};

let cache: { snapshot: RateSnapshot; expires: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Returns TND-based conversion rates: `rates[X]` = TND per 1 X.
 * Priority: optional live FX API (stored in ExchangeRate) > DB rows > static fallback.
 */
export async function getRateSnapshot(force = false): Promise<RateSnapshot> {
  if (!force && cache && cache.expires > Date.now()) return cache.snapshot;

  const rates: Record<string, number> = { ...FALLBACK_RATES };
  let source = "static-indicative";
  let isLive = false;
  let fetchedAt = new Date();

  try {
    const rows = await prisma.exchangeRate.findMany({
      where: { quoteCurrency: PRIMARY_CURRENCY },
      orderBy: { fetchedAt: "desc" },
    });
    for (const row of rows) {
      const value = Number(row.rate);
      if (value > 0) {
        rates[row.baseCurrency] = value;
        source = row.source;
        isLive = row.source !== "static";
        fetchedAt = row.fetchedAt;
      }
    }
  } catch {
    // Database unavailable -> fall back to static indicative rates.
  }

  const snapshot: RateSnapshot = { rates, fetchedAt, source, isLive };
  cache = { snapshot, expires: Date.now() + CACHE_TTL_MS };
  return snapshot;
}

/** Optional live refresh from a configured FX endpoint (never required). */
export async function refreshRatesFromApi(): Promise<{ updated: number; source: string }> {
  if (!config.exchangeRateApiUrl) {
    return { updated: 0, source: "not-configured" };
  }
  try {
    const response = await fetch(config.exchangeRateApiUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return { updated: 0, source: `http-${response.status}` };

    const payload = (await response.json()) as { rates?: Record<string, number> };
    const base = config.exchangeRateBase;
    const payloadRates = payload.rates ?? {};
    const baseToTnd = base === PRIMARY_CURRENCY ? 1 : payloadRates[PRIMARY_CURRENCY];
    if (!baseToTnd) return { updated: 0, source: "invalid-payload" };

    let updated = 0;
    for (const currency of SUPPORTED_CURRENCIES) {
      const perBase = currency === base ? 1 : payloadRates[currency];
      if (!perBase || !Number.isFinite(perBase)) continue;
      // payload: 1 base = perBase currency  =>  1 currency = baseToTnd / perBase TND
      const tndPerUnit = baseToTnd / perBase;
      await prisma.exchangeRate.upsert({
        where: {
          baseCurrency_quoteCurrency: {
            baseCurrency: currency,
            quoteCurrency: PRIMARY_CURRENCY,
          },
        },
        create: {
          baseCurrency: currency,
          quoteCurrency: PRIMARY_CURRENCY,
          rate: tndPerUnit,
          source: "fx-api",
          fetchedAt: new Date(),
        },
        update: { rate: tndPerUnit, source: "fx-api", fetchedAt: new Date() },
      });
      updated += 1;
    }
    cache = null;
    return { updated, source: "fx-api" };
  } catch {
    return { updated: 0, source: "error" };
  }
}

export type ConversionResult = {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number | null;
  convertedCurrency: string;
  rate: number | null;
  rateAt: Date;
  isIndicative: boolean;
  rateSource: string;
};

export async function convertForDisplay(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<ConversionResult> {
  const snapshot = await getRateSnapshot();
  const from = fromCurrency.toUpperCase();
  const to = (toCurrency || PRIMARY_CURRENCY).toUpperCase();
  const converted = convertAmount(amount, from, to, snapshot.rates);

  return {
    originalAmount: roundMoney(amount, from),
    originalCurrency: from,
    convertedAmount: converted,
    convertedCurrency: to,
    rate: exchangeRateBetween(from, to, snapshot.rates),
    rateAt: snapshot.fetchedAt,
    // Any conversion performed with non-live rates is indicative.
    isIndicative: from !== to,
    rateSource: snapshot.source,
  };
}

export async function conversionRates() {
  const snapshot = await getRateSnapshot();
  return {
    rates: snapshot.rates,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    isLive: snapshot.isLive,
    currencies: SUPPORTED_CURRENCIES,
  };
}

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
