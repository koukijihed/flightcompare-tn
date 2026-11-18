import type { FlightOfferDTO } from "@/types/flight";

/**
 * Transparent weighted scoring used for the "best overall value" badge.
 * Weights are exposed in the UI so the recommendation is auditable.
 */
export const WEIGHTS = {
  price: 0.45,
  duration: 0.25,
  stops: 0.2,
  baggage: 0.1,
} as const;

export type ScoredOffer = {
  id: string;
  score: number;
  priceScore: number;
  durationScore: number;
  stopsScore: number;
  baggageScore: number;
};

function displayPrice(offer: FlightOfferDTO): number {
  return offer.convertedPrice ?? offer.originalPrice;
}

const STOPS_SCORE: Record<number, number> = { 0: 100, 1: 55, 2: 20 };

export function scoreOffers(offers: FlightOfferDTO[]): ScoredOffer[] {
  if (offers.length === 0) return [];

  const prices = offers.map(displayPrice).filter((value) => value > 0);
  const durations = offers.map((offer) => offer.durationMinutes).filter((value) => value > 0);

  const minPrice = Math.min(...prices);
  const minDuration = Math.min(...durations);

  return offers.map((offer) => {
    const price = displayPrice(offer);
    // Lower price relative to the cheapest gets a higher score.
    const priceScore = price > 0 ? clamp((minPrice / price) * 100) : 0;
    const durationScore =
      offer.durationMinutes > 0 ? clamp((minDuration / offer.durationMinutes) * 100) : 0;

    const stopsScore = STOPS_SCORE[Math.min(offer.stops, 2)] ?? 0;

    const checked = offer.baggage?.checkedBags ?? 0;
    const baggageScore = checked > 0 ? 100 : 0;

    const score =
      priceScore * WEIGHTS.price +
      durationScore * WEIGHTS.duration +
      stopsScore * WEIGHTS.stops +
      baggageScore * WEIGHTS.baggage;

    return {
      id: offer.id,
      score: Math.round(score * 10) / 10,
      priceScore: Math.round(priceScore),
      durationScore: Math.round(durationScore),
      stopsScore,
      baggageScore,
    };
  });
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export type CompareHighlights = {
  cheapestId: string | null;
  fastestId: string | null;
  bestValueId: string | null;
  scores: Record<string, number>;
};

export function compareHighlights(offers: FlightOfferDTO[]): CompareHighlights {
  if (offers.length === 0) {
    return { cheapestId: null, fastestId: null, bestValueId: null, scores: {} };
  }

  const cheapest = offers.reduce((best, offer) =>
    displayPrice(offer) < displayPrice(best) ? offer : best,
  );
  const fastest = offers.reduce((best, offer) =>
    offer.durationMinutes < best.durationMinutes ? offer : best,
  );

  const scored = scoreOffers(offers);
  const best = scored.reduce((winner, current) =>
    current.score > winner.score ? current : winner,
  );

  return {
    cheapestId: cheapest.id,
    fastestId: fastest.id,
    bestValueId: best.id,
    scores: Object.fromEntries(scored.map((entry) => [entry.id, entry.score])),
  };
}

/** Groups segments into outbound/inbound legs for display. */
export function groupSegments(offer: FlightOfferDTO) {
  const legs = new Map<number, FlightOfferDTO["segments"]>();
  for (const segment of offer.segments) {
    const list = legs.get(segment.legIndex) ?? [];
    list.push(segment);
    legs.set(segment.legIndex, list);
  }
  return [...legs.entries()]
    .sort(([a], [b]) => a - b)
    .map(([legIndex, segments]) => ({
      legIndex,
      segments,
      direction: segments[0]?.direction ?? "OUTBOUND",
      departureTime: segments[0]?.departureTime,
      arrivalTime: segments[segments.length - 1]?.arrivalTime,
      stops: Math.max(0, segments.length - 1),
    }));
}
