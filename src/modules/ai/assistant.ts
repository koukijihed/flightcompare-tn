import "server-only";
import type { FlightOfferDTO, ParsedSearchIntent, SearchSummaryDTO } from "@/types/flight";
import { formatDuration, formatMoney } from "@/lib/utils";
import { isAiConfigured, llmComplete } from "./llm";
import { extractSearchIntent, intentToSearchUrl } from "./service";

export type AssistantReply = {
  reply: string;
  intent: ParsedSearchIntent;
  source: "llm" | "rules";
  searchUrl: string | null;
  basedOnOffers: number;
};

type Copy = {
  route: (origin: string, destination: string) => string;
  missing: (fields: string) => string;
  cheapest: (airline: string, price: string, duration: string, stops: number) => string;
  noOffers: string;
  intro: string;
  demo: string;
};

const COPY: Record<string, Copy> = {
  fr: {
    route: (o, d) => `J'ai identifié un trajet ${o} → ${d}.`,
    missing: (fields) => `Il me manque encore : ${fields}.`,
    cheapest: (airline, price, duration, stops) =>
      `L'offre la moins chère actuellement est ${airline} à ${price}, durée ${duration}, ${stops === 0 ? "vol direct" : `${stops} escale(s)`}.`,
    noOffers: "Lancez une recherche pour que je puisse analyser des offres réelles.",
    intro: "Je peux vous aider à préparer votre recherche de vols.",
    demo: "Attention : ces offres proviennent du mode démonstration et ne sont pas réservables.",
  },
  en: {
    route: (o, d) => `I identified a ${o} → ${d} route.`,
    missing: (fields) => `I still need: ${fields}.`,
    cheapest: (airline, price, duration, stops) =>
      `The cheapest current offer is ${airline} at ${price}, duration ${duration}, ${stops === 0 ? "direct flight" : `${stops} stop(s)`}.`,
    noOffers: "Run a search so I can analyse real offers.",
    intro: "I can help you prepare your flight search.",
    demo: "Note: these offers come from demo mode and cannot be booked.",
  },
  ar: {
    route: (o, d) => `حددت مسار ${o} ← ${d}.`,
    missing: (fields) => `ما زلت بحاجة إلى: ${fields}.`,
    cheapest: (airline, price, duration, stops) =>
      `أرخص عرض حالي هو ${airline} بسعر ${price}، المدة ${duration}، ${stops === 0 ? "رحلة مباشرة" : `${stops} توقف`}.`,
    noOffers: "ابدأ بحثًا حتى أتمكن من تحليل عروض حقيقية.",
    intro: "يمكنني مساعدتك في تحضير بحث الرحلات.",
    demo: "تنبيه: هذه العروض من الوضع التجريبي وغير قابلة للحجز.",
  },
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  fr: { origin: "ville de départ", destination: "destination", departureDate: "date de départ" },
  en: { origin: "origin city", destination: "destination", departureDate: "departure date" },
  ar: { origin: "مدينة المغادرة", destination: "الوجهة", departureDate: "تاريخ المغادرة" },
};

function ruleReply(
  intent: ParsedSearchIntent,
  offers: FlightOfferDTO[] | undefined,
  searchSummary: SearchSummaryDTO | undefined,
  locale: string,
): string {
  const copy = COPY[locale] ?? COPY.fr!;
  const labels = FIELD_LABELS[locale] ?? FIELD_LABELS.fr!;
  const parts: string[] = [];

  if (intent.origin && intent.destination) {
    parts.push(copy.route(intent.origin, intent.destination));
  } else {
    parts.push(copy.intro);
  }

  if (intent.missing.length > 0) {
    parts.push(copy.missing(intent.missing.map((field) => labels[field] ?? field).join(", ")));
  }

  if (intent.budget) {
    parts.push(`Budget ${formatMoney(intent.budget, intent.currency ?? "TND")}.`);
  }

  if (offers && offers.length > 0) {
    const cheapest = [...offers].sort(
      (a, b) => (a.convertedPrice ?? a.originalPrice) - (b.convertedPrice ?? b.originalPrice),
    )[0]!;
    parts.push(
      copy.cheapest(
        cheapest.airline?.name ?? cheapest.provider.name,
        formatMoney(
          cheapest.convertedPrice ?? cheapest.originalPrice,
          cheapest.convertedCurrency ?? cheapest.originalCurrency,
        ),
        formatDuration(cheapest.durationMinutes),
        cheapest.stops,
      ),
    );
    if (offers.some((offer) => offer.isDemo)) parts.push(copy.demo);
  } else if (searchSummary) {
    parts.push(copy.noOffers);
  }

  return parts.join(" ");
}

/**
 * Answers a traveller message. When an LLM is configured it receives only real
 * offer data; otherwise a deterministic rule-based answer is produced.
 * In both cases prices/availability are never invented.
 */
export async function respondToMessage(input: {
  message: string;
  locale: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  offers?: FlightOfferDTO[];
  searchSummary?: SearchSummaryDTO;
}): Promise<AssistantReply> {
  const { message, locale, history = [], offers, searchSummary } = input;
  const { intent, source: extractionSource } = await extractSearchIntent(message, locale);

  if (!isAiConfigured()) {
    return {
      reply: ruleReply(intent, offers, searchSummary, locale),
      intent,
      source: "rules",
      searchUrl: intentToSearchUrl(intent, locale),
      basedOnOffers: offers?.length ?? 0,
    };
  }

  const offerFacts = (offers ?? []).slice(0, 6).map((offer) => ({
    airline: offer.airline?.name ?? "unknown",
    provider: offer.provider.name,
    price: offer.convertedPrice ?? offer.originalPrice,
    currency: offer.convertedCurrency ?? offer.originalCurrency,
    durationMinutes: offer.durationMinutes,
    stops: offer.stops,
    baggage: offer.baggage,
    isDemo: offer.isDemo,
  }));

  const reply = await llmComplete(
    [
      {
        role: "system",
        content: [
          "You are the FlightCompare TN travel assistant (Tunisia flight comparison).",
          "Only use the PROVIDED_DATA below. Never invent prices, availability, airlines or policies.",
          "If data is missing, ask the user for it or suggest running a search.",
          "Never advise buying or waiting based on predictions.",
          `Answer in ${locale === "ar" ? "Arabic" : locale === "en" ? "English" : "French"}, in at most 120 words.`,
          `PROVIDED_DATA: ${JSON.stringify({
            route: searchSummary
              ? { origin: searchSummary.origin.iataCode, destination: searchSummary.destination.iataCode, departure: searchSummary.departureDate, return: searchSummary.returnDate }
              : null,
            parsedRequest: intent,
            offers: offerFacts,
            demoMode: offerFacts.some((offer) => offer.isDemo),
          })}`,
        ].join("\n"),
      },
      ...history.slice(-6).map((entry) => ({ role: entry.role, content: entry.content })),
      { role: "user", content: message },
    ],
    { timeoutMs: 20000 },
  );

  if (!reply) {
    return {
      reply: ruleReply(intent, offers, searchSummary, locale),
      intent,
      source: "rules",
      searchUrl: intentToSearchUrl(intent, locale),
      basedOnOffers: offers?.length ?? 0,
    };
  }

  return {
    reply,
    intent,
    source: extractionSource === "llm" ? "llm" : "llm",
    searchUrl: intentToSearchUrl(intent, locale),
    basedOnOffers: offers?.length ?? 0,
  };
}
