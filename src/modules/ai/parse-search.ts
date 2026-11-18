import { AIRPORTS } from "@/data/airports";
import type { ParsedSearchIntent } from "@/types/flight";

/**
 * Rule-based extraction of structured search parameters from free text.
 * Runs without any AI credentials and is also used as the fallback/validator
 * for LLM output. It never invents offers, only interprets the request.
 */

const CITY_ALIASES: Array<{ code: string; aliases: string[] }> = [
  { code: "TUN", aliases: ["tunis", "tunisie", "carthage", "تونس", "قرطاج"] },
  { code: "DJE", aliases: ["djerba", "jerba", "zarzis", "جربة", "جرجيس"] },
  { code: "SFA", aliases: ["sfax", "صفاقس"] },
  { code: "NBE", aliases: ["enfidha", "hammamet", "الحمامات"] },
  { code: "TOE", aliases: ["tozeur", "توزر"] },
  { code: "CDG", aliases: ["paris", "باريس"] },
  { code: "ORY", aliases: ["orly"] },
  { code: "LYS", aliases: ["lyon", "ليون"] },
  { code: "MRS", aliases: ["marseille", "مرسيليا"] },
  { code: "NCE", aliases: ["nice", "نيس"] },
  { code: "IST", aliases: ["istanbul", "اسطنبول", "إسطنبول"] },
  { code: "FCO", aliases: ["rome", "roma", "روما"] },
  { code: "MXP", aliases: ["milan", "ميلانو"] },
  { code: "BCN", aliases: ["barcelone", "barcelona", "برشلونة"] },
  { code: "MAD", aliases: ["madrid", "مدريد"] },
  { code: "LHR", aliases: ["londres", "london", "لندن"] },
  { code: "AMS", aliases: ["amsterdam", "امستردام", "أمستردام"] },
  { code: "BRU", aliases: ["bruxelles", "brussels", "بروكسل"] },
  { code: "FRA", aliases: ["francfort", "frankfurt"] },
  { code: "MUC", aliases: ["munich", "ميونخ"] },
  { code: "ZRH", aliases: ["zurich", "زيورخ"] },
  { code: "GVA", aliases: ["geneve", "geneva", "جنيف"] },
  { code: "VIE", aliases: ["vienne", "vienna", "فيينا"] },
  { code: "ATH", aliases: ["athenes", "athens", "أثينا"] },
  { code: "LIS", aliases: ["lisbonne", "lisbon", "لشبونة"] },
  { code: "CPH", aliases: ["copenhague"] },
  { code: "DXB", aliases: ["dubai", "دبي"] },
  { code: "AUH", aliases: ["abu dhabi", "ابوظبي", "أبوظبي"] },
  { code: "DOH", aliases: ["doha", "الدوحة"] },
  { code: "JED", aliases: ["djeddah", "jeddah", "جدة"] },
  { code: "RUH", aliases: ["riyad", "riyadh", "الرياض"] },
  { code: "MCT", aliases: ["mascate", "muscat", "مسقط"] },
  { code: "CAI", aliases: ["caire", "cairo", "القاهرة"] },
  { code: "AMM", aliases: ["amman", "عمان"] },
  { code: "BEY", aliases: ["beyrouth", "beirut", "بيروت"] },
  { code: "ALG", aliases: ["alger", "algiers", "الجزائر"] },
  { code: "CMN", aliases: ["casablanca", "الدار البيضاء"] },
  { code: "RAK", aliases: ["marrakech", "marrakesh", "مراكش"] },
  { code: "TIP", aliases: ["tripoli", "طرابلس"] },
  { code: "NBO", aliases: ["nairobi", "نيروبي"] },
  { code: "DKR", aliases: ["dakar", "داكار"] },
  { code: "ADD", aliases: ["addis", "أديس"] },
  { code: "JFK", aliases: ["new york", "نيويورك"] },
  { code: "MIA", aliases: ["miami", "ميامي"] },
  { code: "YUL", aliases: ["montreal", "مونتريال"] },
  { code: "YYZ", aliases: ["toronto", "تورونتو"] },
  { code: "GRU", aliases: ["sao paulo", "ساو باولو"] },
  { code: "BKK", aliases: ["bangkok", "بانكوك"] },
  { code: "SIN", aliases: ["singapour", "singapore", "سنغافورة"] },
  { code: "KUL", aliases: ["kuala lumpur"] },
  { code: "HKG", aliases: ["hong kong"] },
  { code: "PEK", aliases: ["pekin", "beijing", "بكين"] },
  { code: "DEL", aliases: ["delhi", "دلهي"] },
  { code: "NRT", aliases: ["tokyo", "طوكيو"] },
];

const MONTHS: Record<string, number> = {
  janvier: 0, january: 0, jan: 0, جانفي: 0, يناير: 0,
  fevrier: 1, february: 1, feb: 1, فيفري: 1, فبراير: 1,
  mars: 2, march: 2, mar: 2, مارس: 2,
  avril: 3, april: 3, apr: 3, افريل: 3, أبريل: 3, ابريل: 3,
  mai: 4, may: 4, ماي: 4, مايو: 4,
  juin: 5, june: 5, jun: 5, جوان: 5, يونيو: 5,
  juillet: 6, july: 6, jul: 6, جويلية: 6, يوليو: 6,
  aout: 7, august: 7, aug: 7, اوت: 7, أوت: 7, أغسطس: 7,
  septembre: 8, september: 8, sep: 8, سبتمبر: 8,
  octobre: 9, october: 9, oct: 9, اكتوبر: 9, أكتوبر: 9,
  novembre: 10, november: 10, nov: 10, نوفمبر: 10,
  decembre: 11, december: 11, dec: 11, ديسمبر: 11,
};

const CURRENCY_TOKENS: Array<{ pattern: RegExp; currency: string }> = [
  { pattern: /(dt|tnd|dinar|dinars|دينار)\b/i, currency: "TND" },
  { pattern: /(eur|€|euro|euros|يورو)\b/i, currency: "EUR" },
  { pattern: /(usd|\$|dollar|dollars|دولار)\b/i, currency: "USD" },
  { pattern: /(gbp|£|livre sterling)\b/i, currency: "GBP" },
];

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatDate(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayString = String(day).padStart(2, "0");
  return `${year}-${month}-${dayString}`;
}

export function parseSearchIntent(
  text: string,
  today: Date = new Date(),
): ParsedSearchIntent {
  const rawText = text.trim();
  const normalized = normalizeText(rawText);

  // ---- airports --------------------------------------------------------
  const found: Array<{ code: string; index: number }> = [];
  for (const entry of CITY_ALIASES) {
    for (const alias of entry.aliases) {
      const index = normalized.indexOf(normalizeText(alias));
      if (index >= 0) {
        found.push({ code: entry.code, index });
        break;
      }
    }
  }

  // Explicit IATA codes, e.g. "TUN CDG"
  const iataMatches = rawText.toUpperCase().match(/\b[A-Z]{3}\b/g) ?? [];
  for (const code of iataMatches) {
    if (AIRPORTS.some((airport) => airport.iataCode === code)) {
      if (!found.some((entry) => entry.code === code)) {
        const index = rawText.toUpperCase().indexOf(code);
        found.push({ code, index });
      }
    }
  }

  const ordered = found.sort((a, b) => a.index - b.index);
  const origin = ordered[0]?.code;
  const destination = ordered[1]?.code ?? (ordered.length === 1 ? undefined : undefined);

  // ---- dates -----------------------------------------------------------
  let departureDate: string | undefined;
  let returnDate: string | undefined;

  const explicitDate = normalized.match(/(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
  if (explicitDate) {
    const day = Number(explicitDate[1]);
    const month = Number(explicitDate[2]);
    let year = explicitDate[3] ? Number(explicitDate[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      departureDate = formatDate(year, month - 1, day);
    }
  }

  const monthMentions: Array<{ month: number; index: number }> = [];
  for (const [name, monthIndex] of Object.entries(MONTHS)) {
    const index = normalized.indexOf(normalizeText(name));
    if (index >= 0) monthMentions.push({ month: monthIndex, index });
  }
  monthMentions.sort((a, b) => a.index - b.index);

  if (!departureDate && monthMentions.length > 0) {
    const first = monthMentions[0]!;
    let year = today.getFullYear();
    // A month already passed this year means next year's trip.
    if (first.month < today.getMonth()) year += 1;
    departureDate = formatDate(year, first.month, 15);
  }

  if (monthMentions.length > 1 && !returnDate) {
    const second = monthMentions[1]!;
    let year = departureDate
      ? Number(departureDate.slice(0, 4))
      : today.getFullYear();
    const departureMonth = departureDate ? Number(departureDate.slice(5, 7)) - 1 : 0;
    if (second.month < departureMonth) year += 1;
    returnDate = formatDate(year, second.month, 22);
  }

  // ---- budget ----------------------------------------------------------
  let budget: number | undefined;
  let currency: string | undefined;

  for (const token of CURRENCY_TOKENS) {
    const match = normalized.match(new RegExp(`(\\d{2,6})\\s*${token.pattern.source}`, "i"));
    if (match) {
      budget = Number(match[1]);
      currency = token.currency;
      break;
    }
  }

  // ---- passengers ------------------------------------------------------
  const adultsMatch = normalized.match(/(\d{1,2})\s*(adulte|adultes|adults?|personnes?|اشخاص|بالغ)/);
  const childrenMatch = normalized.match(/(\d{1,2})\s*(enfant|enfants|children|child|اطفال|أطفال)/);
  const infantsMatch = normalized.match(/(\d{1,2})\s*(bebe|bebes|infant|infants|enfant en bas age|رضيع|رضع)/);

  // ---- cabin / baggage / trip type ------------------------------------
  let cabinClass: string | undefined;
  if (/(business|affaires|classe affaires|درجة الاعمال|درجة الأعمال)/.test(normalized)) {
    cabinClass = "BUSINESS";
  } else if (/(premiere classe|first class|الدرجة الاولى|الدرجة الأولى)/.test(normalized)) {
    cabinClass = "FIRST";
  } else if (/(premium|economie premium)/.test(normalized)) {
    cabinClass = "PREMIUM_ECONOMY";
  } else if (/(economique|economy|classe eco|اقتصادية)/.test(normalized)) {
    cabinClass = "ECONOMY";
  }

  const checkedBaggage = /(soute|bagage en soute|bagage inclus|checked bag|حقيبة مسجلة|امتعة مسجلة)/.test(
    normalized,
  );

  const missing: string[] = [];
  if (!origin) missing.push("origin");
  if (!destination) missing.push("destination");
  if (!departureDate) missing.push("departureDate");

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    budget,
    currency,
    adults: adultsMatch ? Number(adultsMatch[1]) : undefined,
    children: childrenMatch ? Number(childrenMatch[1]) : undefined,
    infants: infantsMatch ? Number(infantsMatch[1]) : undefined,
    cabinClass,
    checkedBaggage: checkedBaggage || undefined,
    missing,
    rawText,
  };
}
