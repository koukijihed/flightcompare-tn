import type { BaggageInfo } from "@/types/flight";

export type AirportRef = {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  timezone?: string | null;
};

export type AirlineRef = {
  iataCode: string;
  name: string;
  logoUrl?: string | null;
};

export type NormalizedSegment = {
  origin: AirportRef;
  destination: AirportRef;
  airline: AirlineRef | null;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  direction: "OUTBOUND" | "INBOUND";
  legIndex: number;
};

export type NormalizedOffer = {
  providerOfferId: string;
  airline: AirlineRef | null;
  /** Total price, in `currency`, exactly as returned by the provider. */
  totalPrice: number;
  currency: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  cabinClass: string;
  baggage: BaggageInfo | null;
  fareConditions: string | null;
  refundable: boolean | null;
  /** Provider deep link when available — never synthesized. */
  bookingUrl: string | null;
  retrievedAt: string;
  expiresAt: string | null;
  isDemo: boolean;
  isEstimated: boolean;
  segments: NormalizedSegment[];
};

export type ProviderSearchParams = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  children: number;
  infants: number;
  cabinClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  tripType: "ONE_WAY" | "ROUND_TRIP" | "MULTI_CITY";
  /** End-user public IP, required by some affiliate APIs. */
  userIp?: string | null;
};

export type ProviderContext = {
  max: number;
  signal?: AbortSignal;
};

export type ProviderSearchResult = {
  offers: NormalizedOffer[];
  warnings: string[];
};

export interface FlightProviderAdapter {
  readonly name: string;
  readonly type: string;
  /** True when the adapter has everything it needs (credentials, endpoint). */
  isConfigured(): boolean;
  /**
   * False when the provider's terms forbid non user-initiated (batch/cron)
   * queries. Defaults to true when omitted.
   */
  readonly supportsAutomatedQueries?: boolean;
  search(
    params: ProviderSearchParams,
    context: ProviderContext,
  ): Promise<ProviderSearchResult>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: string = "PROVIDER_ERROR",
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export const CABIN_MULTIPLIER: Record<string, number> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 1.6,
  BUSINESS: 3.1,
  FIRST: 4.6,
};

export const CABIN_LABELS: Record<string, string> = {
  ECONOMY: "Économique",
  PREMIUM_ECONOMY: "Premium",
  BUSINESS: "Affaires",
  FIRST: "Première",
};
