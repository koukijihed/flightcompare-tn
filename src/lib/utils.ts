import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a money amount using the active locale and currency. */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string,
  locale = "fr-TN",
): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "—";
  }
  const digits = currency === "TND" ? 3 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "TND" ? 0 : digits,
      maximumFractionDigits: digits,
    }).format(Number(amount));
  } catch {
    return `${Number(amount).toFixed(digits)} ${currency}`;
  }
}

/** 750 -> "12h30" */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function formatTime(iso: string | Date, locale = "fr-FR", timeZone?: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    hour12: false,
  }).format(new Date(iso));
}

export function formatDate(iso: string | Date, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | Date, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Returns a Date `days` days in the past. Used for rolling dashboard windows. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

/** Locale-aware number formatting used for charts and counters. */
export function formatNumber(value: number, locale = "fr-FR") {
  return new Intl.NumberFormat(locale).format(value);
}

export const LOCALE_TO_INTL: Record<string, string> = {
  fr: "fr-FR",
  ar: "ar-TN",
  en: "en-GB",
};

export function intlLocale(locale: string) {
  return LOCALE_TO_INTL[locale] ?? "fr-FR";
}

/** Builds the /search URL (query string only) from a stored search or form values. */
export function buildSearchHref(input: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  tripType: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
}): string {
  const params = new URLSearchParams({
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    tripType: input.tripType,
    adults: String(input.adults),
    children: String(input.children),
    infants: String(input.infants),
    cabinClass: input.cabinClass,
    auto: "1",
  });
  if (input.returnDate) params.set("returnDate", input.returnDate);
  return `/search?${params.toString()}`;
}
