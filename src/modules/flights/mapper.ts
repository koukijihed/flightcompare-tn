import type { Prisma } from "@prisma/client";
import { convertAmount, exchangeRateBetween } from "@/modules/currency/constants";
import type {
  AirportDTO,
  BaggageInfo,
  FlightOfferDTO,
  FlightSegmentDTO,
  SearchSummaryDTO,
} from "@/types/flight";

export const offerInclude = {
  provider: true,
  airline: true,
  segments: {
    include: { originAirport: true, destinationAirport: true, airline: true },
    orderBy: [{ legIndex: "asc" }, { position: "asc" }],
  },
} satisfies Prisma.FlightOfferInclude;

export type OfferWithRelations = Prisma.FlightOfferGetPayload<{
  include: typeof offerInclude;
}>;

export const searchInclude = {
  originAirport: true,
  destinationAirport: true,
} satisfies Prisma.FlightSearchInclude;

export type SearchWithAirports = Prisma.FlightSearchGetPayload<{
  include: typeof searchInclude;
}>;

type AirportRow = {
  id: string;
  iataCode: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  timezone: string | null;
};

export function toAirportDTO(airport: AirportRow): AirportDTO {
  return {
    id: airport.id,
    iataCode: airport.iataCode,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    countryCode: airport.countryCode,
    timezone: airport.timezone,
  };
}

function toSegmentDTO(
  segment: OfferWithRelations["segments"][number],
): FlightSegmentDTO {
  return {
    id: segment.id,
    origin: toAirportDTO(segment.originAirport),
    destination: toAirportDTO(segment.destinationAirport),
    airline: segment.airline
      ? {
          iataCode: segment.airline.iataCode,
          name: segment.airline.name,
          logoUrl: segment.airline.logoUrl,
        }
      : null,
    flightNumber: segment.flightNumber,
    departureTime: segment.departureTime.toISOString(),
    arrivalTime: segment.arrivalTime.toISOString(),
    durationMinutes: segment.durationMinutes,
    direction: segment.direction,
    legIndex: segment.legIndex,
  };
}

export function toOfferDTO(
  offer: OfferWithRelations,
  rates: Record<string, number>,
  displayCurrency: string,
): FlightOfferDTO {
  const originalPrice = Number(offer.originalPrice);
  const converted = convertAmount(
    originalPrice,
    offer.originalCurrency,
    displayCurrency,
    rates,
  );

  return {
    id: offer.id,
    searchId: offer.searchId,
    provider: {
      id: offer.providerId,
      name: offer.provider.name,
      type: offer.provider.providerType,
    },
    providerOfferId: offer.providerOfferId,
    airline: offer.airline
      ? {
          iataCode: offer.airline.iataCode,
          name: offer.airline.name,
          logoUrl: offer.airline.logoUrl,
        }
      : null,
    originalPrice,
    originalCurrency: offer.originalCurrency,
    convertedPrice: converted,
    convertedCurrency: converted === null ? null : displayCurrency,
    exchangeRate: exchangeRateBetween(offer.originalCurrency, displayCurrency, rates),
    exchangeRateAt: offer.exchangeRateAt?.toISOString() ?? null,
    departureTime: offer.departureTime.toISOString(),
    arrivalTime: offer.arrivalTime.toISOString(),
    durationMinutes: offer.durationMinutes,
    stops: offer.stops,
    cabinClass: offer.cabinClass,
    baggage: (offer.baggageInformation as BaggageInfo | null) ?? null,
    fareConditions: offer.fareConditions,
    refundable: offer.refundable,
    bookingUrl: offer.bookingUrl,
    retrievedAt: offer.retrievedAt.toISOString(),
    expiresAt: offer.expiresAt?.toISOString() ?? null,
    status: offer.status,
    isDemo: offer.isDemo,
    isEstimated: offer.isEstimated,
    segments: offer.segments.map(toSegmentDTO),
  };
}

export function toSearchSummary(
  search: SearchWithAirports,
  displayCurrency: string,
): SearchSummaryDTO {
  return {
    id: search.id,
    origin: toAirportDTO(search.originAirport),
    destination: toAirportDTO(search.destinationAirport),
    departureDate: search.departureDate.toISOString().slice(0, 10),
    returnDate: search.returnDate?.toISOString().slice(0, 10) ?? null,
    tripType: search.tripType,
    adults: search.adults,
    children: search.children,
    infants: search.infants,
    cabinClass: search.cabinClass,
    displayCurrency,
    createdAt: search.createdAt.toISOString(),
  };
}
