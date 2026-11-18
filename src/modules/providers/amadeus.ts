import { config } from "@/lib/config";
import { AIRPORT_BY_IATA, AIRLINE_BY_IATA } from "@/data/airports";
import {
  ProviderError,
  type AirportRef,
  type AirlineRef,
  type FlightProviderAdapter,
  type NormalizedOffer,
  type NormalizedSegment,
  type ProviderSearchParams,
} from "./types";
import { parseIsoDurationMinutes } from "@/modules/flights/duration";

/**
 * Amadeus for Developers adapter (Flight Offers Search v2).
 * Docs: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search
 *
 * Sandbox prices are NOT bookable prices. Sandbox responses are flagged as
 * live-provider data only when credentials point at the production host.
 */

type AmadeusToken = { token: string; expiresAt: number };

let tokenCache: AmadeusToken | null = null;

async function getAccessToken(signal?: AbortSignal): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }
  if (!config.amadeus.configured) {
    throw new ProviderError("Identifiants Amadeus non configurés.", "NOT_CONFIGURED");
  }

  const response = await fetch(`${config.amadeus.baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.amadeus.clientId,
      client_secret: config.amadeus.clientSecret,
    }),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ProviderError(
      `Authentification Amadeus refusée (HTTP ${response.status}).`,
      "AUTH_FAILED",
      response.status,
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!payload.access_token) {
    throw new ProviderError("Réponse d'authentification Amadeus invalide.", "AUTH_INVALID");
  }

  tokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 1800) * 1000,
  };
  return tokenCache.token;
}

type AmadeusSegment = {
  departure?: { iataCode?: string; at?: string; terminal?: string };
  arrival?: { iataCode?: string; at?: string; terminal?: string };
  carrierCode?: string;
  number?: string;
  duration?: string;
  numberOfStops?: number;
};

type AmadeusOffer = {
  id?: string;
  price?: { grandTotal?: string; total?: string; currency?: string };
  validatingAirlineCodes?: string[];
  numberOfBookableSeats?: number;
  itineraries?: Array<{
    duration?: string;
    segments?: AmadeusSegment[];
  }>;
  travelerPricings?: Array<{
    fareDetailsBySegment?: Array<{
      cabin?: string;
      fareBasis?: string;
      brandedFare?: string;
      includedCheckedBags?: { quantity?: number; weight?: number; weightUnit?: string };
      includedCabinBags?: { quantity?: number };
    }>;
  }>;
};

type AmadeusSearchResponse = {
  data?: AmadeusOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
    locations?: Record<string, { cityCode?: string; countryCode?: string }>;
  };
  errors?: Array<{ title?: string; detail?: string; status?: number; code?: string }>;
};

function airportRefFromIata(iataCode: string): AirportRef {
  const known = AIRPORT_BY_IATA.get(iataCode);
  if (known) {
    return {
      iataCode: known.iataCode,
      name: known.name,
      city: known.city,
      country: known.country,
      timezone: known.timezone,
    };
  }
  return { iataCode, name: iataCode, city: iataCode, country: "" };
}

function airlineRef(code: string | undefined, dictionaries?: AmadeusSearchResponse["dictionaries"]): AirlineRef | null {
  if (!code) return null;
  const known = AIRLINE_BY_IATA.get(code);
  const name = dictionaries?.carriers?.[code] ?? known?.name ?? code;
  return { iataCode: code, name, logoUrl: null };
}

function mapCabin(amadeusCabin: string | undefined, fallback: ProviderSearchParams["cabinClass"]) {
  const cabin = (amadeusCabin ?? "").toUpperCase();
  if (cabin === "BUSINESS") return "BUSINESS";
  if (cabin === "FIRST") return "FIRST";
  if (cabin === "PREMIUM_ECONOMY") return "PREMIUM_ECONOMY";
  if (cabin === "ECONOMY") return "ECONOMY";
  return fallback;
}

export function normalizeAmadeusOffer(
  offer: AmadeusOffer,
  params: ProviderSearchParams,
  dictionaries?: AmadeusSearchResponse["dictionaries"],
  retrievedAt = new Date().toISOString(),
): NormalizedOffer | null {
  const itineraries = offer.itineraries ?? [];
  if (itineraries.length === 0) return null;

  const segments: NormalizedSegment[] = [];
  let totalDuration = 0;
  let stops = 0;

  itineraries.forEach((itinerary, legIndex) => {
    const direction = legIndex === 0 ? "OUTBOUND" : "INBOUND";
    const itinerarySegments = itinerary.segments ?? [];
    stops += Math.max(0, itinerarySegments.length - 1);
    totalDuration +=
      parseIsoDurationMinutes(itinerary.duration) ||
      itinerarySegments.reduce(
        (sum, segment) => sum + parseIsoDurationMinutes(segment.duration),
        0,
      );

    itinerarySegments.forEach((segment) => {
      const fromCode = segment.departure?.iataCode;
      const toCode = segment.arrival?.iataCode;
      if (!fromCode || !toCode || !segment.departure?.at || !segment.arrival?.at) return;

      segments.push({
        origin: airportRefFromIata(fromCode),
        destination: airportRefFromIata(toCode),
        airline: airlineRef(segment.carrierCode, dictionaries),
        flightNumber: `${segment.carrierCode ?? ""}${segment.number ?? ""}`.trim(),
        departureTime: segment.departure.at,
        arrivalTime: segment.arrival.at,
        durationMinutes: parseIsoDurationMinutes(segment.duration),
        direction,
        legIndex,
      });
    });
  });

  if (segments.length === 0) return null;

  const firstFare = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
  const checked = firstFare?.includedCheckedBags;
  const cabinBags = firstFare?.includedCabinBags;

  const totalPrice = Number(offer.price?.grandTotal ?? offer.price?.total);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return null;

  return {
    providerOfferId: offer.id ?? `${params.origin}-${params.destination}-${retrievedAt}`,
    // Amadeus prices are per traveler in `grandTotal` only when request is for 1 adult;
    // the API already returns the total for the requested passengers.
    airline: airlineRef(offer.validatingAirlineCodes?.[0], dictionaries),
    totalPrice,
    currency: offer.price?.currency ?? "EUR",
    departureTime: segments[0]!.departureTime,
    arrivalTime: segments[segments.length - 1]!.arrivalTime,
    durationMinutes: totalDuration,
    stops,
    cabinClass: mapCabin(firstFare?.cabin, params.cabinClass),
    baggage:
      checked || cabinBags
        ? {
            checkedBags: checked?.quantity ?? null,
            checkedWeightKg: checked?.weight ?? null,
            cabinBags: cabinBags?.quantity ?? null,
            note:
              checked?.quantity !== undefined
                ? `${checked.quantity} bagage(s) en soute inclus`
                : checked?.weight
                  ? `${checked.weight} ${checked.weightUnit ?? "KG"} en soute inclus`
                  : "Bagage en soute non inclus",
          }
        : null,
    fareConditions: firstFare?.brandedFare
      ? `${mapCabin(firstFare.cabin, params.cabinClass)} — ${firstFare.brandedFare}${firstFare.fareBasis ? ` (${firstFare.fareBasis})` : ""}`
      : firstFare?.fareBasis
        ? `${mapCabin(firstFare.cabin, params.cabinClass)} — base tarifaire ${firstFare.fareBasis}`
        : null,
    refundable: null,
    bookingUrl: null,
    retrievedAt,
    expiresAt: null,
    isDemo: false,
    // Sandbox data is not a bookable price.
    isEstimated: config.amadeus.baseUrl.includes("test.api.amadeus.com"),
    segments,
  };
}

async function amadeusFetch(
  path: string,
  signal?: AbortSignal,
  retry = 1,
): Promise<Response> {
  const token = await getAccessToken(signal);
  const response = await fetch(`${config.amadeus.baseUrl}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    signal,
    cache: "no-store",
  });

  if ((response.status === 429 || response.status >= 500) && retry > 0) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return amadeusFetch(path, signal, retry - 1);
  }
  return response;
}

export const amadeusProvider: FlightProviderAdapter = {
  name: "Amadeus",
  type: "amadeus",

  isConfigured() {
    return config.amadeus.configured;
  },

  async search(params: ProviderSearchParams, context) {
    const query = new URLSearchParams({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: String(params.adults),
      travelClass: params.cabinClass,
      // Amadeus does not guarantee TND support; request EUR and convert locally.
      currencyCode: "EUR",
      max: String(Math.min(context.max, 50)),
      nonStop: "false",
    });
    if (params.children > 0) query.set("children", String(params.children));
    if (params.infants > 0) query.set("infants", String(params.infants));
    if (params.returnDate) query.set("returnDate", params.returnDate);

    const response = await amadeusFetch(`/v2/shopping/flight-offers?${query}`, context.signal);

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as AmadeusSearchResponse;
        if (body.errors?.[0]?.detail) detail = body.errors[0].detail;
        else if (body.errors?.[0]?.title) detail = body.errors[0].title;
      } catch {
        /* keep the HTTP status */
      }
      throw new ProviderError(`Amadeus : ${detail}`, "AMADEUS_SEARCH_FAILED", response.status);
    }

    const payload = (await response.json()) as AmadeusSearchResponse;
    const retrievedAt = new Date().toISOString();
    const offers = (payload.data ?? [])
      .map((offer) => normalizeAmadeusOffer(offer, params, payload.dictionaries, retrievedAt))
      .filter((offer): offer is NormalizedOffer => offer !== null);

    const warnings: string[] = [];
    if (offers.length === 0) {
      warnings.push("Amadeus n'a retourné aucune offre pour ces critères.");
    }
    if (config.amadeus.baseUrl.includes("test.api.amadeus.com")) {
      warnings.push(
        "Amadeus Sandbox : les tarifs retournés ne sont pas des prix réservables.",
      );
    }
    warnings.push(
      "Amadeus ne fournit pas de lien de réservation direct : aucune URL n'est inventée.",
    );

    return { offers, warnings };
  },
};

/**
 * Airport / city autocomplete through Amadeus reference data.
 * Used as a fallback when the local airport table has no match.
 */
export async function amadeusSearchLocations(
  keyword: string,
  signal?: AbortSignal,
): Promise<AirportRef[]> {
  if (!config.amadeus.configured || keyword.trim().length < 2) return [];

  const query = new URLSearchParams({
    subType: "AIRPORT,CITY",
    keyword: keyword.trim(),
    "page[limit]": "8",
    view: "LIGHT",
  });

  const response = await amadeusFetch(`/v1/reference-data/locations?${query}`, signal);
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    data?: Array<{
      iataCode?: string;
      name?: string;
      address?: { cityName?: string; countryName?: string };
    }>;
  };

  return (payload.data ?? [])
    .filter((item) => item.iataCode)
    .map((item) => ({
      iataCode: item.iataCode!,
      name: item.name ?? item.iataCode!,
      city: item.address?.cityName ?? "",
      country: item.address?.countryName ?? "",
    }));
}
