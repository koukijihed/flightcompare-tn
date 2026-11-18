import "server-only";
import type { CabinClass, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";
import { AIRPORT_BY_IATA, AIRLINE_BY_IATA } from "@/data/airports";
import type { SearchInput } from "@/lib/validation/schemas";
import { getRateSnapshot } from "@/modules/currency/service";
import { resolveActiveAdapters } from "@/modules/providers/registry";
import { ProviderError, type AirportRef, type FlightProviderAdapter, type ProviderSearchResult } from "@/modules/providers/types";
import type {
  ProviderRunStatus,
  SearchResponseDTO,
  FlightOfferDTO,
} from "@/types/flight";
import {
  offerInclude,
  searchInclude,
  toOfferDTO,
  toSearchSummary,
  type OfferWithRelations,
} from "./mapper";

function startOfDayUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Discriminated outcome of a single provider call, used for error isolation. */
type ProviderOutcome =
  | {
      ok: true;
      adapter: FlightProviderAdapter;
      providerId: string;
      result: ProviderSearchResult;
      durationMs: number;
    }
  | {
      ok: false;
      adapter: FlightProviderAdapter;
      providerId: string;
      error: string;
      errorCode: string;
      durationMs: number;
    };

async function ensureAirport(
  iataCode: string,
  fallback?: AirportRef,
): Promise<{ id: string; iataCode: string; city: string }> {
  const code = iataCode.toUpperCase();
  const existing = await prisma.airport.findUnique({
    where: { iataCode: code },
    select: { id: true, iataCode: true, city: true },
  });
  if (existing) return existing;

  const known = AIRPORT_BY_IATA.get(code);
  const created = await prisma.airport.create({
    data: {
      iataCode: code,
      name: known?.name ?? fallback?.name ?? code,
      city: known?.city ?? fallback?.city ?? code,
      country: known?.country ?? fallback?.country ?? "",
      countryCode: known?.countryCode ?? "XX",
      latitude: known?.latitude ?? null,
      longitude: known?.longitude ?? null,
      timezone: known?.timezone ?? fallback?.timezone ?? null,
    },
    select: { id: true, iataCode: true, city: true },
  });
  return created;
}

async function ensureAirline(iataCode: string, name: string) {
  const code = iataCode.toUpperCase().slice(0, 3);
  const existing = await prisma.airline.findUnique({
    where: { iataCode: code },
    select: { id: true },
  });
  if (existing) return existing.id;

  const known = AIRLINE_BY_IATA.get(code);
  const created = await prisma.airline.create({
    data: { iataCode: code, name: known?.name ?? name ?? code, logoUrl: null },
    select: { id: true },
  });
  return created.id;
}

/** Runs all enabled providers with per-provider timeout and error isolation. */
export async function performFlightSearch(
  input: SearchInput,
  options: { userId?: string | null; displayCurrency: string; userIp?: string | null },
): Promise<SearchResponseDTO> {
  const { displayCurrency } = options;
  const origin = await ensureAirport(input.origin);
  const destination = await ensureAirport(input.destination);

  const search = await prisma.flightSearch.create({
    data: {
      userId: options.userId ?? null,
      originAirportId: origin.id,
      destinationAirportId: destination.id,
      departureDate: startOfDayUtc(input.departureDate),
      returnDate: input.returnDate ? startOfDayUtc(input.returnDate) : null,
      tripType: input.tripType,
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      cabinClass: input.cabinClass as CabinClass,
      currency: displayCurrency,
      legs: input.legs ? (input.legs as unknown as Prisma.InputJsonValue) : undefined,
    },
    include: searchInclude,
  });

  const adapters = await resolveActiveAdapters();
  const ratesSnapshot = await getRateSnapshot();
  const warnings = new Set<string>();
  const providerStatuses: ProviderRunStatus[] = [];
  const persisted: FlightOfferDTO[] = [];

  if (adapters.length === 0) {
    warnings.add(
      "Aucun fournisseur de vols réel n'est configuré. Ajoutez vos identifiants Travelpayouts ou Amadeus dans les variables d'environnement pour afficher des offres.",
    );
    if (config.travelpayouts.configured) {
      warnings.add(
        "Travelpayouts est configuré, mais l'API de recherche exige un domaine public : renseignez APP_URL (ou TRAVELPAYOUTS_HOST) avec un hôte accessible, pas localhost.",
      );
    }
  }

  const results = await Promise.allSettled(
    adapters.map(async ({ adapter, providerId }): Promise<ProviderOutcome> => {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
      try {
        const result = await adapter.search(
          {
            origin: input.origin,
            destination: input.destination,
            departureDate: input.departureDate,
            returnDate: input.returnDate ?? null,
            adults: input.adults,
            children: input.children,
            infants: input.infants,
            cabinClass: input.cabinClass,
            tripType: input.tripType,
            userIp: options.userIp ?? null,
          },
          { max: config.providerMaxOffers, signal: controller.signal },
        );
        return { ok: true, adapter, providerId, result, durationMs: Date.now() - startedAt };
      } catch (error) {
        const message =
          error instanceof ProviderError
            ? error.message
            : error instanceof Error && error.name === "AbortError"
              ? "Délai de réponse du fournisseur dépassé."
              : "Erreur du fournisseur.";
        return {
          ok: false,
          adapter,
          providerId,
          error: message,
          errorCode: error instanceof ProviderError ? error.code : "PROVIDER_ERROR",
          durationMs: Date.now() - startedAt,
        };
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  for (const settled of results) {
    if (settled.status === "rejected") {
      warnings.add("Un fournisseur a échoué de manière inattendue.");
      continue;
    }
    const value = settled.value;
    const durationMs = value.durationMs;

    if (!value.ok) {
      providerStatuses.push({
        name: value.adapter.name,
        type: value.adapter.type,
        state: "ERROR",
        count: 0,
        durationMs,
        message: value.error,
      });
      warnings.add(`${value.adapter.name} : ${value.error}`);
      await prisma.apiRequestLog.create({
        data: {
          providerId: value.providerId,
          endpoint: "/search",
          success: false,
          durationMs,
          errorCode: value.errorCode,
          errorMessage: value.error.slice(0, 500),
        },
      });
      continue;
    }

    const { result, adapter, providerId } = value;
    providerStatuses.push({
      name: adapter.name,
      type: adapter.type,
      state: result.offers.length > 0 ? "OK" : "EMPTY",
      count: result.offers.length,
      durationMs,
    });
    for (const warning of result.warnings) warnings.add(warning);

    await prisma.apiRequestLog.create({
      data: {
        providerId,
        endpoint: "/search",
        success: true,
        durationMs,
        status: 200,
      },
    });

    let cheapest: { id: string; price: number; currency: string; airlineId?: string | null } | null =
      null;

    for (const offer of result.offers.slice(0, config.providerMaxOffers)) {
      const airlineId = offer.airline
        ? await ensureAirline(offer.airline.iataCode, offer.airline.name)
        : null;

      const segmentData: Prisma.FlightSegmentCreateWithoutFlightOfferInput[] = [];
      for (let index = 0; index < offer.segments.length; index += 1) {
        const segment = offer.segments[index]!;
        const from = await ensureAirport(segment.origin.iataCode, segment.origin);
        const to = await ensureAirport(segment.destination.iataCode, segment.destination);
        const segmentAirlineId = segment.airline
          ? await ensureAirline(segment.airline.iataCode, segment.airline.name)
          : airlineId;

        segmentData.push({
          originAirport: { connect: { id: from.id } },
          destinationAirport: { connect: { id: to.id } },
          airline: segmentAirlineId ? { connect: { id: segmentAirlineId } } : undefined,
          flightNumber: segment.flightNumber,
          departureTime: new Date(segment.departureTime),
          arrivalTime: new Date(segment.arrivalTime),
          durationMinutes: segment.durationMinutes,
          direction: segment.direction,
          legIndex: segment.legIndex,
          position: index,
        });
      }

      const conversion = ratesSnapshot.rates;
      const convertedPrice =
        conversion[offer.currency] && conversion[displayCurrency]
          ? Number(
              (
                (offer.totalPrice * conversion[offer.currency]!) /
                conversion[displayCurrency]!
              ).toFixed(3),
            )
          : null;

      try {
        const created = await prisma.flightOffer.create({
          data: {
            searchId: search.id,
            providerId,
            providerOfferId: offer.providerOfferId.slice(0, 190),
            airlineId,
            originalPrice: offer.totalPrice,
            originalCurrency: offer.currency,
            convertedPrice,
            convertedCurrency: convertedPrice === null ? null : displayCurrency,
            exchangeRate:
              conversion[offer.currency] && conversion[displayCurrency]
                ? Number((conversion[offer.currency]! / conversion[displayCurrency]!).toFixed(6))
                : null,
            exchangeRateAt: ratesSnapshot.fetchedAt,
            departureTime: new Date(offer.departureTime),
            arrivalTime: new Date(offer.arrivalTime),
            durationMinutes: offer.durationMinutes,
            stops: offer.stops,
            cabinClass: offer.cabinClass as CabinClass,
            baggageInformation: offer.baggage
              ? (offer.baggage as unknown as Prisma.InputJsonValue)
              : undefined,
            fareConditions: offer.fareConditions,
            refundable: offer.refundable,
            bookingUrl: offer.bookingUrl,
            retrievedAt: new Date(offer.retrievedAt),
            expiresAt: offer.expiresAt ? new Date(offer.expiresAt) : null,
            status: "AVAILABLE",
            isDemo: offer.isDemo,
            isEstimated: offer.isEstimated,
            segments: { create: segmentData },
          },
          include: offerInclude,
        });

        persisted.push(toOfferDTO(created, ratesSnapshot.rates, displayCurrency));

        if (!cheapest || offer.totalPrice < cheapest.price) {
          cheapest = {
            id: created.id,
            price: offer.totalPrice,
            currency: offer.currency,
            airlineId,
          };
        }
      } catch {
        warnings.add(
          "Une offre n'a pas pu être enregistrée (doublon ou données invalides).",
        );
      }
    }

    if (cheapest) {
      await prisma.priceHistory.create({
        data: {
          route: `${input.origin}-${input.destination}`,
          originAirportId: origin.id,
          destinationAirportId: destination.id,
          departureDate: startOfDayUtc(input.departureDate),
          providerId,
          airlineId: cheapest.airlineId ?? null,
          price: cheapest.price,
          currency: cheapest.currency,
          source: adapter.type === "demo" ? "DEMO_PROVIDER" : "LIVE_PROVIDER",
        },
      });
    }
  }

  await prisma.flightSearch.update({
    where: { id: search.id },
    data: { resultCount: persisted.length },
  });

  const sorted = [...persisted].sort(
    (a, b) =>
      compareMoney(a.convertedPrice ?? Infinity, b.convertedPrice ?? Infinity) ||
      a.durationMinutes - b.durationMinutes,
  );

  const refreshed = await prisma.flightSearch.findUniqueOrThrow({
    where: { id: search.id },
    include: searchInclude,
  });

  return {
    search: toSearchSummary(refreshed, displayCurrency),
    offers: sorted,
    providers: providerStatuses,
    warnings: [...warnings],
    ratesSource: ratesSnapshot.source,
    demoMode: adapters.some(({ adapter }) => adapter.type === "demo"),
  };
}

function compareMoney(a: number, b: number) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export async function loadSearchForDisplay(
  searchId: string,
  displayCurrency: string,
): Promise<SearchResponseDTO | null> {
  const search = await prisma.flightSearch.findUnique({
    where: { id: searchId },
    include: {
      ...searchInclude,
      offers: { include: offerInclude, orderBy: { originalPrice: "asc" } },
    },
  });
  if (!search) return null;

  const rates = (await getRateSnapshot()).rates;
  return {
    search: toSearchSummary(search, displayCurrency),
    offers: search.offers.map((offer) => toOfferDTO(offer, rates, displayCurrency)),
    providers: [],
    warnings: [],
    ratesSource: (await getRateSnapshot()).source,
    demoMode: search.offers.some((offer) => offer.isDemo),
  };
}

export async function loadOfferById(
  offerId: string,
  displayCurrency: string,
): Promise<{ offer: FlightOfferDTO; search: SearchResponseDTO["search"] } | null> {
  const offer = await prisma.flightOffer.findUnique({
    where: { id: offerId },
    include: { ...offerInclude, search: { include: searchInclude } },
  });
  if (!offer) return null;

  const rates = (await getRateSnapshot()).rates;
  return {
    offer: toOfferDTO(offer as OfferWithRelations, rates, displayCurrency),
    search: toSearchSummary(offer.search, displayCurrency),
  };
}

export async function loadOffersByIds(
  ids: string[],
  displayCurrency: string,
): Promise<FlightOfferDTO[]> {
  if (ids.length === 0) return [];
  const offers = await prisma.flightOffer.findMany({
    where: { id: { in: ids.slice(0, 3) } },
    include: offerInclude,
  });
  const rates = (await getRateSnapshot()).rates;
  const byId = new Map(offers.map((offer) => [offer.id, offer]));
  return ids
    .map((id) => byId.get(id))
    .filter((offer): offer is OfferWithRelations => Boolean(offer))
    .map((offer) => toOfferDTO(offer, rates, displayCurrency));
}
