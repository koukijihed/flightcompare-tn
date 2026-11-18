import "server-only";
import prisma from "@/lib/prisma";
import type { PricePredictionDTO } from "@/types/flight";
import { computePricePrediction } from "./prediction";

/**
 * Builds a prediction for a route/date from stored observations.
 * Only real rows in PriceHistory are used — no synthetic data is generated.
 */
export async function getPricePredictionForRoute(input: {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  currency: string;
}): Promise<PricePredictionDTO> {
  const [origin, destination] = await Promise.all([
    prisma.airport.findUnique({
      where: { iataCode: input.originIata.toUpperCase() },
      select: { id: true },
    }),
    prisma.airport.findUnique({
      where: { iataCode: input.destinationIata.toUpperCase() },
      select: { id: true },
    }),
  ]);

  if (!origin || !destination) {
    return computePricePrediction([], input.currency);
  }

  const departure = new Date(`${input.departureDate}T00:00:00.000Z`);
  const from = new Date(departure.getTime() - 3 * 86400000);
  const to = new Date(departure.getTime() + 3 * 86400000);

  const rows = await prisma.priceHistory.findMany({
    where: {
      originAirportId: origin.id,
      destinationAirportId: destination.id,
      departureDate: { gte: from, lte: to },
    },
    select: { price: true, currency: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
    take: 300,
  });

  const usable = rows
    .filter((row) => row.currency === input.currency)
    .map((row) => ({ price: Number(row.price), recordedAt: row.recordedAt }));

  return computePricePrediction(usable, input.currency);
}
