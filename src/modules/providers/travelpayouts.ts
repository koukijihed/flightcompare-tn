import { createHash } from "node:crypto";
import { config } from "@/lib/config";
import { AIRPORT_BY_IATA, AIRLINE_BY_IATA } from "@/data/airports";
import {
  CABIN_LABELS,
  ProviderError,
  type AirportRef,
  type AirlineRef,
  type FlightProviderAdapter,
  type NormalizedOffer,
  type NormalizedSegment,
  type ProviderSearchParams,
} from "./types";
import type { BaggageInfo } from "@/types/flight";

/**
 * Travelpayouts / Aviasales adapter.
 *
 * Two distinct APIs are used:
 *  - Flights Search API (real-time, per-user searches, affiliate "Buy" link
 *    resolved only when the user clicks). Requires Travelpayouts approval.
 *  - Flight Data API (cached price signals, free for affiliates), used only
 *    by the price-alert monitor because it must not perform non user-initiated
 *    real-time searches.
 *
 * Docs: https://travelpayouts.github.io/slate/
 */

const SEARCH_LINK_TTL_MS = 15 * 60 * 1000;

type TpTerm = {
  price?: number | string;
  unified_price?: number | string;
  currency?: string;
  url?: number | string;
  flights_baggage?: unknown;
  flights_handbags?: unknown;
};

type TpFlight = {
  departure?: string;
  arrival?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_date?: string;
  arrival_time?: string;
  local_departure_timestamp?: number;
  local_arrival_timestamp?: number;
  duration?: number;
  number?: number | string;
  operating_carrier?: string;
  marketing_carrier?: string;
};

type TpProposal = {
  segment?: Array<{ flight?: TpFlight[] }>;
  terms?: Record<string, TpTerm>;
  total_duration?: number;
  max_stops?: number;
  sign?: string;
  validating_carrier?: string;
  carriers?: string[];
};

type TpGate = {
  search_id?: string;
  proposals?: TpProposal[];
  airports?: Record<
    string,
    { name?: string; city?: string; country?: string; time_zone?: string }
  >;
  airlines?: Record<string, { name?: string }>;
  gates_info?: Record<string, { label?: string }>;
  meta?: { uuid?: string; gates?: Array<{ id?: number | string }> };
  validating_carrier?: string;
};

type TpSearchResponse = {
  search_id?: string;
  error?: string;
  message?: string;
};

export type TravelpayoutsBookingCode = {
  /** Travelpayouts search id. */
  s: string;
  /** Opaque terms.url value used by the click endpoint. */
  u: string;
  o: string;
  d: string;
  dd: string;
  rd: string | null;
  a: number;
};

/* -------------------------------------------------------------------------- */
/* Signature                                                                  */
/* -------------------------------------------------------------------------- */

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "variant" });
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      naturalCompare(a, b),
    );
    const result: Record<string, unknown> = {};
    for (const [key, entry] of entries) result[key] = sortKeysDeep(entry);
    return result;
  }
  return value;
}

function flattenValues(value: unknown): string[] {
  if (value === null || value === undefined) return [""];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(flattenValues);
  }
  if (typeof value === "boolean") return [value ? "true" : "false"];
  return [String(value)];
}

/**
 * Signature = md5(token + ":" + values of the recursively key-sorted body).
 * Verified against the published Travelpayouts SDK test vectors.
 */
export function createTravelpayoutsSignature(
  token: string,
  params: Record<string, unknown>,
): string {
  const sorted = sortKeysDeep(params) as Record<string, unknown>;
  return createHash("md5")
    .update(`${token}:${flattenValues(sorted).join(":")}`)
    .digest("hex");
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function airportRef(iataCode: string, gate?: TpGate): AirportRef {
  const fromResponse = gate?.airports?.[iataCode];
  const known = AIRPORT_BY_IATA.get(iataCode);
  return {
    iataCode,
    name: fromResponse?.name ?? known?.name ?? iataCode,
    city: fromResponse?.city ?? known?.city ?? iataCode,
    country: fromResponse?.country ?? known?.country ?? "",
    timezone: fromResponse?.time_zone ?? known?.timezone ?? null,
  };
}

function airlineRef(
  code: string | undefined,
  gate?: TpGate,
): AirlineRef | null {
  if (!code) return null;
  const known = AIRLINE_BY_IATA.get(code);
  return {
    iataCode: code,
    name: gate?.airlines?.[code]?.name ?? known?.name ?? code,
    logoUrl: null,
  };
}

function offsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}

/** Converts an airport-local wall time to a true UTC instant. */
export function zonedTimeToUtc(
  date: string | undefined,
  time: string | undefined,
  timeZone: string | null | undefined,
): string | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (![year, month, day, hour, minute].every((value) => Number.isFinite(value))) {
    return null;
  }

  const wallClock = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);
  if (!timeZone) return new Date(wallClock).toISOString();

  try {
    let guess = wallClock;
    for (let index = 0; index < 3; index += 1) {
      const next = wallClock - offsetMs(timeZone, new Date(guess));
      if (next === guess) break;
      guess = next;
    }
    return new Date(guess).toISOString();
  } catch {
    return new Date(wallClock).toISOString();
  }
}

function timestampToIso(timestamp: number | undefined): string | null {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  return new Date(timestamp * 1000).toISOString();
}

type ParsedBags = { bags: number | null; weightKg: number | null };

function firstLeaf(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const leaf = firstLeaf(item);
      if (leaf !== undefined) return leaf;
    }
    return undefined;
  }
  return value;
}

function parseBags(value: unknown): ParsedBags {
  const leaf = firstLeaf(value);
  if (leaf === undefined || leaf === null || leaf === "") {
    return { bags: null, weightKg: null };
  }
  if (typeof leaf === "boolean") return { bags: leaf ? 1 : 0, weightKg: null };
  if (typeof leaf === "number" && Number.isFinite(leaf)) {
    return { bags: leaf, weightKg: null };
  }
  if (typeof leaf === "string") {
    const match = /^(\d+)PC(\d+)?$/i.exec(leaf.trim());
    if (match) {
      return {
        bags: Number(match[1]),
        weightKg: match[2] ? Number(match[2]) : null,
      };
    }
    if (/^\d+$/.test(leaf.trim())) {
      return { bags: Number(leaf.trim()), weightKg: null };
    }
  }
  return { bags: null, weightKg: null };
}

function parseBaggage(term: TpTerm): BaggageInfo | null {
  const checked = parseBags(term.flights_baggage);
  const cabin = parseBags(term.flights_handbags);
  if (checked.bags === null && cabin.bags === null) return null;

  let note = "Informations bagages non communiquées";
  if (checked.bags === 0) note = "Bagage en soute non inclus";
  else if (checked.bags !== null && checked.weightKg) {
    note = `${checked.bags} bagage(s) en soute de ${checked.weightKg} kg inclus`;
  } else if (checked.bags !== null) {
    note = `${checked.bags} bagage(s) en soute inclus`;
  }

  return {
    checkedBags: checked.bags,
    checkedWeightKg: checked.weightKg,
    cabinBags: cabin.bags,
    note,
  };
}

function buildSegments(
  proposal: TpProposal,
  gate: TpGate,
): { segments: NormalizedSegment[]; departureTime: string; arrivalTime: string; stops: number } | null {
  const legs = proposal.segment ?? [];
  const segments: NormalizedSegment[] = [];
  let stops = 0;

  legs.forEach((leg, legIndex) => {
    const flights = leg.flight ?? [];
    stops += Math.max(0, flights.length - 1);
    const direction = legIndex === 0 ? "OUTBOUND" : "INBOUND";

    for (const flight of flights) {
      const fromCode = flight.departure;
      const toCode = flight.arrival;
      if (!fromCode || !toCode) continue;

      const origin = airportRef(fromCode, gate);
      const destination = airportRef(toCode, gate);
      const departureTime =
        zonedTimeToUtc(flight.departure_date, flight.departure_time, origin.timezone) ??
        timestampToIso(flight.local_departure_timestamp);
      const arrivalTime =
        zonedTimeToUtc(flight.arrival_date, flight.arrival_time, destination.timezone) ??
        timestampToIso(flight.local_arrival_timestamp);
      if (!departureTime || !arrivalTime) continue;

      const carrier = flight.marketing_carrier || flight.operating_carrier;
      segments.push({
        origin,
        destination,
        airline: airlineRef(carrier, gate),
        flightNumber: `${carrier ?? ""}${flight.number ?? ""}`.trim(),
        departureTime,
        arrivalTime,
        durationMinutes:
          Number.isFinite(flight.duration) && (flight.duration ?? 0) > 0
            ? Number(flight.duration)
            : Math.max(
                0,
                Math.round(
                  (new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 60000,
                ),
              ),
        direction,
        legIndex,
      });
    }
  });

  if (segments.length === 0) return null;

  return {
    segments,
    departureTime: segments[0]!.departureTime,
    arrivalTime: segments[segments.length - 1]!.arrivalTime,
    stops,
  };
}

function gateKey(gate: TpGate): string {
  const id = gate.meta?.gates?.[0]?.id;
  return id === undefined ? "0" : String(id);
}

function isEndMarker(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const keys = Object.keys(item as Record<string, unknown>);
  return keys.length === 1 && keys[0] === "search_id";
}

export function encodeTravelpayoutsBookingCode(code: TravelpayoutsBookingCode): string {
  return Buffer.from(JSON.stringify(code), "utf8").toString("base64url");
}

export function decodeTravelpayoutsBookingCode(
  value: string,
): TravelpayoutsBookingCode | null {
  // Reject oversized payloads before parsing (cheap abuse guard).
  if (!value || value.length > 512) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<TravelpayoutsBookingCode>;
    if (
      typeof parsed.s !== "string" ||
      typeof parsed.u !== "string" ||
      typeof parsed.o !== "string" ||
      typeof parsed.d !== "string" ||
      typeof parsed.dd !== "string" ||
      typeof parsed.a !== "number"
    ) {
      return null;
    }
    return {
      s: parsed.s,
      u: parsed.u,
      o: parsed.o,
      d: parsed.d,
      dd: parsed.dd,
      rd: typeof parsed.rd === "string" ? parsed.rd : null,
      a: parsed.a,
    };
  } catch {
    return null;
  }
}

function bookingUrl(code: TravelpayoutsBookingCode): string {
  // Relative on purpose: the redirect endpoint lives on the current host, so
  // the link keeps working even if APP_URL is misconfigured.
  return `/api/booking/travelpayouts?code=${encodeTravelpayoutsBookingCode(code)}`;
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

export function normalizeTravelpayoutsGates(
  gates: TpGate[],
  params: ProviderSearchParams,
  retrievedAt = new Date().toISOString(),
  max = 25,
): NormalizedOffer[] {
  const offers: NormalizedOffer[] = [];
  const seen = new Set<string>();
  const expiresAt = new Date(Date.now() + SEARCH_LINK_TTL_MS).toISOString();

  for (const gate of gates) {
    const searchId = gate.search_id ?? gate.meta?.uuid;
    if (!searchId) continue;

    for (const [proposalIndex, proposal] of (gate.proposals ?? []).entries()) {
      const itinerary = buildSegments(proposal, gate);
      if (!itinerary) continue;

      const carrierCode =
        proposal.validating_carrier ??
        gate.validating_carrier ??
        proposal.carriers?.[0] ??
        itinerary.segments[0]?.airline?.iataCode;
      const airline = airlineRef(carrierCode, gate);

      for (const [termGate, term] of Object.entries(proposal.terms ?? {})) {
        if (!term || typeof term !== "object") continue;
        const price = Number(term.price);
        const urlCode = term.url === undefined ? "" : String(term.url);
        if (!Number.isFinite(price) || price <= 0 || !urlCode) continue;

        const providerOfferId = [
          searchId,
          termGate,
          urlCode,
          proposal.sign ?? String(proposalIndex),
        ]
          .join(":")
          .slice(0, 190);
        if (seen.has(providerOfferId)) continue;
        seen.add(providerOfferId);

        const label = gate.gates_info?.[termGate]?.label;
        const cabin = CABIN_LABELS[params.cabinClass] ?? "Économique";
        const duration =
          Number.isFinite(proposal.total_duration) && (proposal.total_duration ?? 0) > 0
            ? Number(proposal.total_duration)
            : Math.max(
                0,
                Math.round(
                  (new Date(itinerary.arrivalTime).getTime() -
                    new Date(itinerary.departureTime).getTime()) /
                    60000,
                ),
              );

        offers.push({
          providerOfferId,
          airline,
          totalPrice: price,
          currency: (term.currency ?? config.travelpayouts.currency).toUpperCase(),
          departureTime: itinerary.departureTime,
          arrivalTime: itinerary.arrivalTime,
          durationMinutes: duration,
          stops: itinerary.stops,
          cabinClass: params.cabinClass,
          baggage: parseBaggage(term),
          fareConditions: `${cabin} — ${label ?? "Agence partenaire"} (tarif en temps réel)`,
          refundable: null,
          bookingUrl: bookingUrl({
            s: searchId,
            u: urlCode,
            o: params.origin,
            d: params.destination,
            dd: params.departureDate,
            rd: params.returnDate ?? null,
            a: params.adults,
          }),
          retrievedAt,
          expiresAt,
          isDemo: false,
          isEstimated: false,
          segments: itinerary.segments,
        });
      }
    }
  }

  return offers
    .sort((a, b) => a.totalPrice - b.totalPrice)
    .slice(0, max);
}

/* -------------------------------------------------------------------------- */
/* Search API                                                                 */
/* -------------------------------------------------------------------------- */

function resolveHost(): string {
  const configured = config.travelpayouts.host.trim();
  if (configured) return configured;
  try {
    return new URL(config.appUrl).host;
  } catch {
    return "";
  }
}

function isLocalHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.startsWith("localhost:") ||
    normalized.startsWith("127.") ||
    normalized === "[::1]" ||
    normalized.startsWith("[::1]:")
  );
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip.toLowerCase() === "local") return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!match) return false; // IPv6 public addresses are accepted.
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && b === 168)
  );
}

function resolveUserIp(params: ProviderSearchParams): string {
  const candidate = (params.userIp ?? "").trim() || config.travelpayouts.userIp.trim();
  if (isPrivateIp(candidate)) {
    throw new ProviderError(
      "Travelpayouts exige l'adresse IP publique du visiteur. Renseignez TRAVELPAYOUTS_USER_IP pour les tests locaux.",
      "USER_IP_REQUIRED",
    );
  }
  return candidate;
}

function tripClass(cabinClass: ProviderSearchParams["cabinClass"]): "Y" | "C" {
  return cabinClass === "BUSINESS" || cabinClass === "FIRST" ? "C" : "Y";
}

async function searchRequest(
  params: ProviderSearchParams,
  signal: AbortSignal | undefined,
): Promise<string> {
  const marker = config.travelpayouts.marker;
  const token = config.travelpayouts.token;
  const host = resolveHost();
  const userIp = resolveUserIp(params);

  if (!marker || !token) {
    throw new ProviderError("Identifiants Travelpayouts non configurés.", "NOT_CONFIGURED");
  }
  if (!host) {
    throw new ProviderError(
      "Hôte public introuvable. Configurez APP_URL ou TRAVELPAYOUTS_HOST.",
      "HOST_REQUIRED",
    );
  }
  if (isLocalHost(host)) {
    throw new ProviderError(
      "Travelpayouts refuse les recherches depuis localhost. Déployez le site ou configurez TRAVELPAYOUTS_HOST.",
      "HOST_REQUIRED",
    );
  }

  const segments = [
    { origin: params.origin, destination: params.destination, date: params.departureDate },
  ];
  if (params.tripType === "ROUND_TRIP" && params.returnDate) {
    segments.push({
      origin: params.destination,
      destination: params.origin,
      date: params.returnDate,
    });
  }

  const body: Record<string, unknown> = {
    marker,
    host,
    user_ip: userIp,
    locale: config.travelpayouts.locale,
    trip_class: tripClass(params.cabinClass),
    passengers: {
      adults: params.adults,
      children: params.children,
      infants: params.infants,
    },
    segments,
    currency: config.travelpayouts.currency,
    know_english: false,
  };
  body.signature = createTravelpayoutsSignature(token, body);

  const response = await fetch(`${config.travelpayouts.baseUrl}/v1/flight_search`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as TpSearchResponse;
      detail = payload.error ?? payload.message ?? detail;
    } catch {
      /* keep the HTTP status */
    }
    throw new ProviderError(`Travelpayouts : ${detail}`, "TRAVELPAYOUTS_SEARCH_FAILED", response.status);
  }

  const payload = (await response.json()) as TpSearchResponse;
  if (!payload.search_id) {
    throw new ProviderError(
      `Travelpayouts : ${payload.error ?? payload.message ?? "identifiant de recherche absent"}.`,
      "TRAVELPAYOUTS_SEARCH_FAILED",
    );
  }
  return payload.search_id;
}

async function pollResults(
  searchId: string,
  signal: AbortSignal | undefined,
): Promise<{ gates: TpGate[]; complete: boolean; lastError: string | null }> {
  const polls = Math.max(1, Math.min(12, Math.round(config.travelpayouts.maxPolls)));
  const interval = Math.max(250, Math.min(3000, Math.round(config.travelpayouts.pollIntervalMs)));
  const gates = new Map<string, TpGate>();
  let complete = false;
  let lastError: string | null = null;

  for (let poll = 0; poll < polls; poll += 1) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    if (signal?.aborted) break;

    let response: Response;
    try {
      response = await fetch(
        `${config.travelpayouts.baseUrl}/v1/flight_search_results?uuid=${encodeURIComponent(searchId)}`,
        { headers: { accept: "application/json" }, signal, cache: "no-store" },
      );
    } catch (error) {
      if (signal?.aborted) break;
      lastError = error instanceof Error ? error.message : "réseau indisponible";
      continue;
    }

    if (!response.ok) {
      lastError = `HTTP ${response.status}`;
      continue;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      lastError = "réponse JSON invalide";
      continue;
    }

    const items = Array.isArray(payload) ? payload : [payload];
    for (const item of items) {
      if (isEndMarker(item)) {
        complete = true;
        continue;
      }
      const gate = item as TpGate;
      if (!Array.isArray(gate?.proposals) || gate.proposals.length === 0) continue;
      const key = `${gate.search_id ?? gate.meta?.uuid ?? searchId}:${gateKey(gate)}`;
      gates.set(key, gate);
    }

    if (complete) break;
  }

  return { gates: [...gates.values()], complete, lastError };
}

export const travelpayoutsProvider: FlightProviderAdapter = {
  name: "Travelpayouts (Aviasales)",
  type: "travelpayouts",
  // The Search API may only be queried from a user-initiated search.
  supportsAutomatedQueries: false,

  isConfigured() {
    return config.travelpayouts.searchConfigured;
  },

  async search(params: ProviderSearchParams, context) {
    const searchId = await searchRequest(params, context.signal);
    const { gates, complete, lastError } = await pollResults(searchId, context.signal);
    const retrievedAt = new Date().toISOString();
    const offers = normalizeTravelpayoutsGates(
      gates,
      params,
      retrievedAt,
      Math.min(context.max, 50),
    );

    const warnings: string[] = [];
    if (offers.length === 0) {
      if (!complete && lastError) {
        throw new ProviderError(
          `Travelpayouts n'a pas répondu à temps (${lastError}).`,
          "TRAVELPAYOUTS_TIMEOUT",
        );
      }
      warnings.push(
        "Travelpayouts n'a retourné aucune offre pour ces critères. Vérifiez que l'accès à l'API Flights Search est approuvé.",
      );
    } else if (!complete) {
      warnings.push(
        "Travelpayouts a retourné des résultats partiels (délai de recherche atteint).",
      );
    }

    return { offers, warnings };
  },
};

/* -------------------------------------------------------------------------- */
/* Flight Data API (cached price signals, used by price alerts)               */
/* -------------------------------------------------------------------------- */

export type TravelpayoutsPriceSignal = {
  price: number;
  currency: string;
  airline: string | null;
  transfers: number | null;
  departureAt: string | null;
};

/**
 * Cached price for one route/date from the free Flight Data API.
 * This is a price signal, not a bookable offer: it is never shown as a flight.
 */
export async function fetchTravelpayoutsPriceSignal(input: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  currency: string;
}): Promise<TravelpayoutsPriceSignal | null> {
  if (!config.travelpayouts.token) return null;

  const query = new URLSearchParams({
    origin: input.origin,
    destination: input.destination,
    depart_date: input.departureDate.slice(0, 7),
    calendar_type: "departure_date",
    currency: input.currency,
    token: config.travelpayouts.token,
  });
  if (input.returnDate) {
    query.set("return_date", input.returnDate);
  }

  let response: Response;
  try {
    response = await fetch(`${config.travelpayouts.baseUrl}/v1/prices/calendar?${query}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    success?: boolean;
    data?: Record<
      string,
      {
        price?: number | string;
        airline?: string;
        transfers?: number;
        departure_at?: string;
      }
    >;
  };
  if (!payload.success || !payload.data) return null;

  const entry =
    payload.data[input.departureDate] ??
    Object.entries(payload.data).find(([date]) => date.startsWith(input.departureDate))?.[1];
  if (!entry) return null;

  const price = Number(entry.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    price,
    currency: input.currency,
    airline: entry.airline ?? null,
    transfers: entry.transfers ?? null,
    departureAt: entry.departure_at ?? null,
  };
}
