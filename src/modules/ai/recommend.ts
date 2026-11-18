import type { FlightOfferDTO } from "@/types/flight";

export type RecommendationReason =
  | "CHEAPEST"
  | "FASTEST"
  | "DIRECT"
  | "BAGGAGE_INCLUDED";

export type Recommendation = {
  offer: FlightOfferDTO;
  score: number;
  reasons: RecommendationReason[];
};

export type RecommendationPreferences = {
  budget?: number | null;
  preferredAirlines?: string[];
  maxStops?: number | null;
  cabinClass?: string | null;
};

function price(offer: FlightOfferDTO) {
  return offer.convertedPrice ?? offer.originalPrice;
}

/**
 * Personalized ranking. Preferences adjust the base scoring used by the
 * comparison module; each recommendation carries human-readable reasons.
 */
export function recommendOffers(
  offers: FlightOfferDTO[],
  preferences: RecommendationPreferences = {},
): Recommendation[] {
  if (offers.length === 0) return [];

  const minPrice = Math.min(...offers.map(price));
  const minDuration = Math.min(...offers.map((offer) => offer.durationMinutes));
  const airlines = new Set((preferences.preferredAirlines ?? []).map((code) => code.toUpperCase()));

  return offers
    .map((offer) => {
      const reasons: RecommendationReason[] = [];

      let score = 0;
      score += (minPrice / Math.max(price(offer), 1)) * 40;
      score += (minDuration / Math.max(offer.durationMinutes, 1)) * 25;
      score += offer.stops === 0 ? 20 : offer.stops === 1 ? 11 : 4;
      score += (offer.baggage?.checkedBags ?? 0) > 0 ? 10 : 0;
      score += offer.refundable === true ? 5 : 0;

      if (price(offer) === minPrice) reasons.push("CHEAPEST");
      if (offer.durationMinutes === minDuration) reasons.push("FASTEST");
      if (offer.stops === 0) reasons.push("DIRECT");
      if ((offer.baggage?.checkedBags ?? 0) > 0) reasons.push("BAGGAGE_INCLUDED");

      if (airlines.size > 0 && offer.airline && airlines.has(offer.airline.iataCode.toUpperCase())) {
        score += 8;
      }
      if (preferences.maxStops != null && offer.stops > preferences.maxStops) {
        score -= 15;
      }
      if (preferences.budget && price(offer) > preferences.budget) {
        score -= 25;
      }
      if (preferences.cabinClass && offer.cabinClass !== preferences.cabinClass) {
        score -= 5;
      }

      return { offer, score: Math.round(score * 10) / 10, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
