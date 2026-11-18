import {
  AIRLINE_BY_IATA,
  AIRPORT_BY_IATA,
  AIRLINES,
} from "@/data/airports";
import {
  CABIN_LABELS,
  CABIN_MULTIPLIER,
  type AirportRef,
  type AirlineRef,
  type FlightProviderAdapter,
  type NormalizedOffer,
  type NormalizedSegment,
  type ProviderSearchParams,
} from "./types";

/**
 * DEMO provider.
 *
 * Produces deterministic, clearly flagged sample offers so the product is fully
 * explorable without API credentials. These are NOT real flights: UI surfaces
 * (`isDemo`) mark them, and booking links are never fabricated.
 */

const HUBS = ["IST", "CDG", "FCO", "DXB", "DOH", "AMS", "FRA", "MAD", "CAI"];

const LOW_COST = new Set(
  AIRLINES.filter((airline) => airline.lowCost).map((airline) => airline.iataCode),
);

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function airportRef(iataCode: string): AirportRef {
  const found = AIRPORT_BY_IATA.get(iataCode);
  if (!found) {
    return { iataCode, name: iataCode, city: iataCode, country: "" };
  }
  return {
    iataCode: found.iataCode,
    name: found.name,
    city: found.city,
    country: found.country,
    timezone: found.timezone,
  };
}

function airlineRef(iataCode: string): AirlineRef | null {
  const found = AIRLINE_BY_IATA.get(iataCode);
  if (!found) return null;
  return { iataCode: found.iataCode, name: found.name, logoUrl: null };
}

function distanceKm(origin: string, destination: string): number {
  const from = AIRPORT_BY_IATA.get(origin);
  const to = AIRPORT_BY_IATA.get(destination);
  if (!from || !to) return 1500;
  const value = haversineKm(from, to);
  return value < 80 ? 400 : value;
}

function chooseAirlines(longHaul: boolean, rng: () => number): string[] {
  const pool = longHaul
    ? ["TU", "AF", "TK", "EK", "QR", "EY", "SV", "MS", "LH", "KL", "AT"]
    : ["TU", "BJ", "TO", "AF", "AZ", "IB", "VY", "FR", "U2", "TK", "A3", "AH"];
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, 5);
}

function buildItinerary(options: {
  origin: string;
  destination: string;
  departureIso: string;
  distance: number;
  stops: number;
  airlineCode: string;
  direction: "OUTBOUND" | "INBOUND";
  legIndex: number;
  rng: () => number;
}): { segments: NormalizedSegment[]; departureTime: string; arrivalTime: string; durationMinutes: number } {
  const { origin, destination, departureIso, distance, stops, airlineCode, direction, legIndex, rng } = options;

  const flightMinutes = Math.round((distance / 780) * 60 + 35 + rng() * 25);
  const layoverMinutes = stops > 0 ? Math.round(55 + rng() * 130) : 0;
  const segmentsCount = stops + 1;
  const perSegment = Math.max(45, Math.round(flightMinutes / segmentsCount));

  const hubs = HUBS.filter((hub) => hub !== origin && hub !== destination);
  const via: string[] = [];
  for (let index = 0; index < stops; index += 1) {
    via.push(hubs[Math.floor(rng() * hubs.length)] ?? "IST");
  }

  const path = [origin, ...via, destination];
  const segments: NormalizedSegment[] = [];
  let cursor = new Date(departureIso).getTime();
  let totalMinutes = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index]!;
    const to = path[index + 1]!;
    const departureTime = new Date(cursor).toISOString();
    const segmentMinutes = perSegment + Math.round(rng() * 20);
    const arrivalTime = new Date(cursor + segmentMinutes * 60000).toISOString();

    segments.push({
      origin: airportRef(from),
      destination: airportRef(to),
      airline: airlineRef(airlineCode),
      flightNumber: `${airlineCode}${100 + Math.floor(rng() * 880)}`,
      departureTime,
      arrivalTime,
      durationMinutes: segmentMinutes,
      direction,
      legIndex,
    });

    totalMinutes += segmentMinutes;
    cursor += segmentMinutes * 60000;

    if (index < path.length - 2) {
      cursor += layoverMinutes * 60000;
      totalMinutes += layoverMinutes;
    }
  }

  return {
    segments,
    departureTime: segments[0]!.departureTime,
    arrivalTime: segments[segments.length - 1]!.arrivalTime,
    durationMinutes: totalMinutes,
  };
}

export const demoProvider: FlightProviderAdapter = {
  name: "Demo Provider",
  type: "demo",

  isConfigured() {
    return true;
  },

  async search(params: ProviderSearchParams, context) {
    const seed = hashString(
      `${params.origin}|${params.destination}|${params.departureDate}|${params.returnDate ?? ""}|${params.cabinClass}|${params.adults}`,
    );
    const rng = createRng(seed);
    const distance = distanceKm(params.origin, params.destination);
    const longHaul = distance > 2600;
    const airlines = chooseAirlines(longHaul, rng);
    const roundTrip = params.tripType === "ROUND_TRIP" && Boolean(params.returnDate);
    const retrievedAt = new Date().toISOString();
    const offers: NormalizedOffer[] = [];
    const count = Math.min(context.max, 8);

    for (let index = 0; index < count; index += 1) {
      const airlineCode = airlines[index % airlines.length]!;
      const stopsRoll = rng();
      const stops = stopsRoll < 0.42 ? 0 : stopsRoll < 0.86 ? 1 : 2;
      const departHour = 5 + Math.floor(rng() * 17);
      const departure = new Date(`${params.departureDate}T00:00:00.000Z`);
      departure.setUTCHours(departHour, Math.floor(rng() * 4) * 15, 0, 0);

      const outbound = buildItinerary({
        origin: params.origin,
        destination: params.destination,
        departureIso: departure.toISOString(),
        distance,
        stops,
        airlineCode,
        direction: "OUTBOUND",
        legIndex: 0,
        rng,
      });

      const segments = [...outbound.segments];
      let totalMinutes = outbound.durationMinutes;
      let arrivalTime = outbound.arrivalTime;

      if (roundTrip && params.returnDate) {
        const inboundDeparture = new Date(`${params.returnDate}T00:00:00.000Z`);
        inboundDeparture.setUTCHours(8 + Math.floor(rng() * 12), 0, 0, 0);
        const inbound = buildItinerary({
          origin: params.destination,
          destination: params.origin,
          departureIso: inboundDeparture.toISOString(),
          distance,
          stops: stops === 2 ? 1 : stops,
          airlineCode,
          direction: "INBOUND",
          legIndex: 1,
          rng,
        });
        segments.push(...inbound.segments);
        totalMinutes += inbound.durationMinutes;
        arrivalTime = inbound.arrivalTime;
      }

      const base = 78 + distance * 0.29;
      const stopFactor = stops === 0 ? 1.16 : stops === 1 ? 1 : 0.93;
      const cabinMultiplier = CABIN_MULTIPLIER[params.cabinClass] ?? 1;
      const seasonal = 0.82 + rng() * 0.45;
      const roundTripFactor = roundTrip ? 1.88 : 1;
      const price = Math.max(
        89,
        Math.round(base * stopFactor * cabinMultiplier * seasonal * roundTripFactor),
      );

      const lowCost = LOW_COST.has(airlineCode);
      offers.push({
        providerOfferId: `DEMO-${params.origin}${params.destination}-${params.departureDate}-${index}`,
        airline: airlineRef(airlineCode),
        totalPrice: price,
        currency: "TND",
        departureTime: outbound.departureTime,
        arrivalTime,
        durationMinutes: totalMinutes,
        stops: roundTrip ? stops * 2 : stops,
        cabinClass: params.cabinClass,
        baggage: lowCost
          ? {
              checkedBags: 0,
              checkedWeightKg: null,
              cabinBags: 1,
              note: "Bagage en soute non inclus dans ce tarif",
            }
          : {
              checkedBags: 1,
              checkedWeightKg: 23,
              cabinBags: 1,
              note: "1 bagage en soute de 23 kg inclus",
            },
        fareConditions: `${CABIN_LABELS[params.cabinClass] ?? "Économique"} — tarif de démonstration, conditions non contractuelles`,
        refundable: params.cabinClass === "BUSINESS" || params.cabinClass === "FIRST",
        bookingUrl: null,
        retrievedAt,
        expiresAt: null,
        isDemo: true,
        isEstimated: true,
        segments,
      });
    }

    return {
      offers,
      warnings: [
        "Mode démonstration actif : les offres sont des exemples générés localement et ne correspondent à aucun vol réel.",
      ],
    };
  },
};
