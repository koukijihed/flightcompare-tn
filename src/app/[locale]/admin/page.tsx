import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Activity,
  AlertTriangle,
  BellRing,
  MapPin,
  Plane,
  Users,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { AdminMonitorButton } from "@/components/dashboard/admin-monitor-button";
import { Badge } from "@/components/ui/badge";
import { daysAgo, formatDateTime, formatNumber, intlLocale } from "@/lib/utils";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("admin");
  const since24h = daysAgo(1);
  const since7d = daysAgo(7);
  const intl = intlLocale(locale);

  const [totalUsers, totalSearches, activeAlerts, totalOffers, apiErrors, providers] =
    await Promise.all([
      prisma.user.count(),
      prisma.flightSearch.count(),
      prisma.priceAlert.count({ where: { enabled: true } }),
      prisma.flightOffer.count(),
      prisma.apiRequestLog.count({ where: { success: false, createdAt: { gte: since24h } } }),
      prisma.flightProvider.findMany({ orderBy: { name: "asc" } }),
    ]);

  const [topRoutes, topDestinations, performance, recentErrors] = await Promise.all([
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
    prisma.apiRequestLog.groupBy({
      by: ["providerId"],
      _count: { _all: true },
      _avg: { durationMs: true },
      where: { createdAt: { gte: since7d } },
    }),
    prisma.apiRequestLog.findMany({
      where: { success: false },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { provider: { select: { name: true } } },
    }),
  ]);

  const errorCounts = await prisma.apiRequestLog.groupBy({
    by: ["providerId"],
    _count: { _all: true },
    where: { success: false, createdAt: { gte: since24h } },
  });
  const errorsByProvider = new Map(
    errorCounts.map((entry) => [entry.providerId, entry._count._all]),
  );

  const stats = [
    { label: t("totalUsers"), value: totalUsers, icon: Users },
    { label: t("totalSearches"), value: totalSearches, icon: Plane },
    { label: t("activeAlerts"), value: activeAlerts, icon: BellRing },
    { label: t("totalOffers"), value: totalOffers, icon: Activity },
    { label: t("apiErrors"), value: apiErrors, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <stat.icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-3 font-display text-2xl font-extrabold text-navy-900">
              {formatNumber(stat.value, intl)}
            </p>
            <p className="text-[11px] font-medium text-navy-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-bold text-navy-900">{t("topRoutes")}</h2>
          {topRoutes.length === 0 ? (
            <p className="mt-3 text-sm text-navy-500">{t("noData")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topRoutes.map((route) => (
                <li
                  key={`${route.origin}-${route.destination}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-semibold text-navy-800">
                    {route.origin} → {route.destination}
                  </span>
                  <Badge variant="outline">{formatNumber(route.count, intl)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-900">
            <MapPin className="h-4 w-4 text-sky-600" aria-hidden />
            {t("topDestinations")}
          </h2>
          {topDestinations.length === 0 ? (
            <p className="mt-3 text-sm text-navy-500">{t("noData")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topDestinations.map((destination) => (
                <li
                  key={destination.code}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-semibold text-navy-800">
                    {destination.city} ({destination.code})
                  </span>
                  <Badge variant="outline">{formatNumber(destination.count, intl)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-navy-900">
            {t("providerPerformance")}
          </h2>
          <AdminMonitorButton />
        </div>

        {providers.length === 0 ? (
          <p className="mt-3 text-sm text-navy-500">{t("noData")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-[11px] tracking-wide text-navy-500 uppercase">
                  <th className="p-2 text-start font-semibold">{t("name")}</th>
                  <th className="p-2 text-start font-semibold">{t("status")}</th>
                  <th className="p-2 text-start font-semibold">{t("requests")}</th>
                  <th className="p-2 text-start font-semibold">{t("errorRate")}</th>
                  <th className="p-2 text-start font-semibold">{t("avgDuration")}</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => {
                  const entry = performance.find((row) => row.providerId === provider.id);
                  const requests = entry?._count._all ?? 0;
                  const errors = errorsByProvider.get(provider.id) ?? 0;
                  return (
                    <tr key={provider.id} className="border-t border-navy-100">
                      <td className="p-2 font-semibold text-navy-800">{provider.name}</td>
                      <td className="p-2">
                        <Badge variant={provider.enabled ? "success" : "outline"}>
                          {provider.enabled ? t("enabled") : t("disabled")}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-navy-600">{formatNumber(requests, intl)}</td>
                      <td className="p-2 text-xs text-navy-600">{errors}</td>
                      <td className="p-2 text-xs text-navy-600">
                        {Math.round(entry?._avg.durationMs ?? 0)} ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-[11px] text-navy-400">{t("monitorLimitation")}</p>
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-navy-900">{t("recentErrors")}</h2>
        {recentErrors.length === 0 ? (
          <p className="mt-3 text-sm text-navy-500">{t("noData")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-100">
            {recentErrors.map((log) => (
              <li key={log.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800">
                    {log.provider.name} · {log.endpoint}
                  </p>
                  <p className="truncate text-xs text-navy-500">
                    {log.errorCode ?? "ERROR"} — {log.errorMessage ?? "—"}
                  </p>
                </div>
                <span className="text-[11px] text-navy-400">
                  {formatDateTime(log.createdAt, intl)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-navy-400">{t("analyticsNote")}</p>
      </section>
    </div>
  );
}
