import prisma from "@/lib/prisma";
import { jsonOk, safeErrorMessage, jsonError } from "@/lib/api";
import { requireAdminApi } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireAdminApi();
  if (!user) return response;

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalUsers, totalSearches, activeAlerts, totalOffers, apiErrors, providers] =
      await Promise.all([
        prisma.user.count(),
        prisma.flightSearch.count(),
        prisma.priceAlert.count({ where: { enabled: true } }),
        prisma.flightOffer.count(),
        prisma.apiRequestLog.count({
          where: { success: false, createdAt: { gte: since24h } },
        }),
        prisma.flightProvider.findMany({ orderBy: { name: "asc" } }),
      ]);

    const [topRoutes, topDestinations, searchesPerDay, priceTrend, performance, recentErrors] =
      await Promise.all([
        prisma.$queryRaw<Array<{ origin: string; destination: string; count: number }>>`
          SELECT o."iataCode" AS origin, d."iataCode" AS destination, COUNT(*)::int AS count
          FROM "FlightSearch" s
          JOIN "Airport" o ON o."id" = s."originAirportId"
          JOIN "Airport" d ON d."id" = s."destinationAirportId"
          GROUP BY o."iataCode", d."iataCode"
          ORDER BY count DESC
          LIMIT 6`,
        prisma.$queryRaw<Array<{ code: string; city: string; count: number }>>`
          SELECT d."iataCode" AS code, d."city" AS city, COUNT(*)::int AS count
          FROM "FlightSearch" s
          JOIN "Airport" d ON d."id" = s."destinationAirportId"
          GROUP BY d."iataCode", d."city"
          ORDER BY count DESC
          LIMIT 6`,
        prisma.$queryRaw<Array<{ day: string; count: number }>>`
          SELECT to_char(date_trunc('day', s."createdAt"), 'YYYY-MM-DD') AS day,
                 COUNT(*)::int AS count
          FROM "FlightSearch" s
          WHERE s."createdAt" >= now() - interval '7 days'
          GROUP BY 1
          ORDER BY 1`,
        prisma.$queryRaw<Array<{ day: string; avg: number }>>`
          SELECT to_char(date_trunc('day', p."recordedAt"), 'YYYY-MM-DD') AS day,
                 ROUND(AVG(p."price")::numeric, 2)::float8 AS avg
          FROM "PriceHistory" p
          WHERE p."recordedAt" >= now() - interval '14 days'
          GROUP BY 1
          ORDER BY 1`,
        prisma.apiRequestLog.groupBy({
          by: ["providerId"],
          _count: { _all: true },
          _avg: { durationMs: true },
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        }),
        prisma.apiRequestLog.findMany({
          where: { success: false },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { provider: { select: { name: true } } },
        }),
      ]);

    const providerNames = new Map(providers.map((provider) => [provider.id, provider.name]));

    const errorCounts = await prisma.apiRequestLog.groupBy({
      by: ["providerId"],
      _count: { _all: true },
      where: { success: false, createdAt: { gte: since24h } },
    });
    const errorsByProvider = new Map(
      errorCounts.map((entry) => [entry.providerId, entry._count._all]),
    );

    return jsonOk({
      totals: {
        totalUsers,
        totalSearches,
        activeAlerts,
        totalOffers,
        apiErrors,
      },
      topRoutes,
      topDestinations,
      searchesPerDay,
      priceTrend,
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        type: provider.providerType,
        enabled: provider.enabled,
        configuration: provider.configuration,
        errors24h: errorsByProvider.get(provider.id) ?? 0,
        requests7d:
          performance.find((entry) => entry.providerId === provider.id)?._count._all ?? 0,
        avgDurationMs: Math.round(
          performance.find((entry) => entry.providerId === provider.id)?._avg.durationMs ?? 0,
        ),
      })),
      providerPerformance: performance.map((entry) => ({
        provider: providerNames.get(entry.providerId) ?? "Inconnu",
        requests: entry._count._all,
        avgDurationMs: Math.round(entry._avg.durationMs ?? 0),
      })),
      recentErrors: recentErrors.map((log) => ({
        id: log.id,
        provider: log.provider.name,
        endpoint: log.endpoint,
        errorCode: log.errorCode,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return jsonError(
      safeErrorMessage(error, "Impossible de charger les statistiques."),
      500,
      "STATS_FAILED",
    );
  }
}
