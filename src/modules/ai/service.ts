import "server-only";
import { AIRPORTS } from "@/data/airports";
import type { ParsedSearchIntent } from "@/types/flight";
import { parseSearchIntent } from "./parse-search";
import { isAiConfigured, llmComplete } from "./llm";

const VALID_CABINS = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"];

type LlmIntent = Partial<{
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  budget: number | null;
  currency: string | null;
  adults: number | null;
  children: number | null;
  infants: number | null;
  cabinClass: string | null;
  checkedBaggage: boolean | null;
}>;

function isValidIata(code: unknown): code is string {
  return (
    typeof code === "string" &&
    code.length === 3 &&
    AIRPORTS.some((airport) => airport.iataCode === code.toUpperCase())
  );
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Extracts search parameters from natural language.
 * LLM output is always validated against the airport catalogue and date format;
 * the rule-based parser remains the source of truth for missing values.
 */
export async function extractSearchIntent(
  text: string,
  locale = "fr",
): Promise<{ intent: ParsedSearchIntent; source: "llm" | "rules" }> {
  const rules = parseSearchIntent(text);
  if (!isAiConfigured()) return { intent: rules, source: "rules" };

  const content = await llmComplete(
    [
      {
        role: "system",
        content: [
          "You extract flight search parameters from a traveller request.",
          "Return ONLY JSON with these keys: origin, destination (IATA 3-letter codes),",
          "departureDate (YYYY-MM-DD), returnDate (YYYY-MM-DD or null), budget (number or null),",
          "currency (TND/EUR/USD/GBP or null), adults, children, infants, cabinClass",
          "(ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST or null), checkedBaggage (boolean or null).",
          "Use null when the information is absent. Never invent dates or prices.",
          `Today is ${new Date().toISOString().slice(0, 10)}. Answer in ${locale === "ar" ? "Arabic" : locale === "en" ? "English" : "French"} context but only return JSON.`,
        ].join(" "),
      },
      { role: "user", content: text },
    ],
    { json: true, timeoutMs: 12000 },
  );

  if (!content) return { intent: rules, source: "rules" };

  try {
    const parsed = JSON.parse(content) as LlmIntent;
    const merged: ParsedSearchIntent = {
      ...rules,
      origin: isValidIata(parsed.origin) ? parsed.origin.toUpperCase() : rules.origin,
      destination: isValidIata(parsed.destination)
        ? parsed.destination.toUpperCase()
        : rules.destination,
      departureDate: isValidDate(parsed.departureDate)
        ? parsed.departureDate
        : rules.departureDate,
      returnDate: isValidDate(parsed.returnDate)
        ? parsed.returnDate
        : (parsed.returnDate === null ? undefined : rules.returnDate),
      budget:
        typeof parsed.budget === "number" && parsed.budget > 0
          ? Math.round(parsed.budget)
          : rules.budget,
      currency:
        typeof parsed.currency === "string" &&
        ["TND", "EUR", "USD", "GBP"].includes(parsed.currency.toUpperCase())
          ? parsed.currency.toUpperCase()
          : rules.currency,
      adults:
        typeof parsed.adults === "number" && parsed.adults >= 1
          ? Math.min(9, Math.round(parsed.adults))
          : rules.adults,
      children:
        typeof parsed.children === "number" ? Math.max(0, Math.round(parsed.children)) : rules.children,
      infants:
        typeof parsed.infants === "number" ? Math.max(0, Math.round(parsed.infants)) : rules.infants,
      cabinClass:
        typeof parsed.cabinClass === "string" && VALID_CABINS.includes(parsed.cabinClass)
          ? parsed.cabinClass
          : rules.cabinClass,
      checkedBaggage:
        typeof parsed.checkedBaggage === "boolean"
          ? parsed.checkedBaggage
          : rules.checkedBaggage,
    };

    merged.missing = [
      ...(!merged.origin ? ["origin"] : []),
      ...(!merged.destination ? ["destination"] : []),
      ...(!merged.departureDate ? ["departureDate"] : []),
    ];

    return { intent: merged, source: "llm" };
  } catch {
    return { intent: rules, source: "rules" };
  }
}

/** Builds the locale-aware search URL for a parsed intent. */
export function intentToSearchUrl(intent: ParsedSearchIntent, locale = "fr"): string | null {
  if (!intent.origin || !intent.destination || !intent.departureDate) return null;
  const params = new URLSearchParams({
    origin: intent.origin,
    destination: intent.destination,
    departureDate: intent.departureDate,
    tripType: intent.returnDate ? "ROUND_TRIP" : "ONE_WAY",
    adults: String(intent.adults ?? 1),
    children: String(intent.children ?? 0),
    infants: String(intent.infants ?? 0),
    cabinClass: intent.cabinClass ?? "ECONOMY",
    auto: "1",
  });
  if (intent.returnDate) params.set("returnDate", intent.returnDate);
  return `/${locale}/search?${params.toString()}`;
}
