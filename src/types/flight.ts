/** Serializable shapes exchanged between the API and the UI. */

export type AirportDTO = {
  id?: string;
  iataCode: string;
  name: string;
  city: string;
  country: string;
  countryCode?: string;
  timezone?: string | null;
};

export type AirlineDTO = {
  iataCode: string;
  name: string;
  logoUrl?: string | null;
};

export type BaggageInfo = {
  checkedBags?: number | null;
  checkedWeightKg?: number | null;
  cabinBags?: number | null;
  note?: string | null;
};

export type FlightSegmentDTO = {
  id?: string;
  origin: AirportDTO;
  destination: AirportDTO;
  airline: AirlineDTO | null;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  direction: "OUTBOUND" | "INBOUND";
  legIndex: number;
};

export type FlightOfferDTO = {
  id: string;
  searchId: string;
  provider: { id?: string; name: string; type?: string };
  providerOfferId: string;
  airline: AirlineDTO | null;
  originalPrice: number;
  originalCurrency: string;
  convertedPrice: number | null;
  convertedCurrency: string | null;
  exchangeRate: number | null;
  exchangeRateAt: string | null;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  cabinClass: string;
  baggage: BaggageInfo | null;
  fareConditions: string | null;
  refundable: boolean | null;
  bookingUrl: string | null;
  retrievedAt: string;
  expiresAt: string | null;
  status: string;
  isDemo: boolean;
  isEstimated: boolean;
  segments: FlightSegmentDTO[];
};

export type ProviderRunStatus = {
  name: string;
  type: string;
  state: "OK" | "EMPTY" | "ERROR" | "SKIPPED";
  count: number;
  durationMs: number;
  message?: string;
};

export type SearchSummaryDTO = {
  id: string;
  origin: AirportDTO;
  destination: AirportDTO;
  departureDate: string;
  returnDate: string | null;
  tripType: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
  displayCurrency: string;
  createdAt: string;
};

export type SearchResponseDTO = {
  search: SearchSummaryDTO;
  offers: FlightOfferDTO[];
  providers: ProviderRunStatus[];
  warnings: string[];
  ratesSource: string;
  demoMode: boolean;
};

export type AirportSuggestion = AirportDTO & { label: string };

export type ParsedSearchIntent = {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  budget?: number;
  currency?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabinClass?: string;
  checkedBaggage?: boolean;
  missing: string[];
  rawText: string;
};

export type PricePredictionDTO = {
  currentPrice: number | null;
  currency: string;
  observedMin: number | null;
  observedMax: number | null;
  observedMedian: number | null;
  trend: "DOWN" | "UP" | "STABLE" | "UNKNOWN";
  estimatedChangePct: number | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  sampleCount: number;
  coverageDays: number;
  modelUpdatedAt: string;
  disclaimer: string;
};
