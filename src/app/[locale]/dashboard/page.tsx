import { Link, redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BellRing, Heart, Search, Target } from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { MarkAllRead } from "@/components/dashboard/mark-all-read";
import {
  buildSearchHref,
  formatDate,
  formatDateTime,
  formatMoney,
  intlLocale,
} from "@/lib/utils";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login?next=/dashboard", locale: locale as Locale });
    return null;
  }

  const [t, tSearch, searchesCount, favoritesCount, alertsCount, unreadCount] =
    await Promise.all([
      getTranslations("dashboard"),
      getTranslations("search"),
      prisma.flightSearch.count({ where: { userId: user.id } }),
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.priceAlert.count({ where: { userId: user.id, enabled: true } }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);

  const [searches, alerts, notifications] = await Promise.all([
    prisma.flightSearch.findMany({
      where: { userId: user.id },
      include: { originAirport: true, destinationAirport: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.priceAlert.findMany({
      where: { userId: user.id },
      include: { originAirport: true, destinationAirport: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const intl = intlLocale(locale);

  const stats = [
    { label: t("searchesCount"), value: searchesCount, icon: Search, href: "/dashboard/searches" },
    { label: t("favoritesCount"), value: favoritesCount, icon: Heart, href: "/dashboard/favorites" },
    { label: t("alertsCount"), value: alertsCount, icon: BellRing, href: "/dashboard/alerts" },
    { label: t("notifications"), value: unreadCount, icon: Target, href: "/dashboard" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h1 className="font-display text-xl font-extrabold text-navy-900">
          {t("welcome", { name: user.firstName })}
        </h1>
        <p className="mt-1 text-sm text-navy-500">{t("title")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lifted"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <stat.icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-3 font-display text-2xl font-extrabold text-navy-900">
              {stat.value}
            </p>
            <p className="text-xs font-medium text-navy-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-navy-900">
              {t("recentSearches")}
            </h2>
            <Link
              href="/dashboard/searches"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
            >
              {t("mySearches")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
            </Link>
          </div>

          {searches.length === 0 ? (
            <p className="mt-4 text-sm text-navy-500">{t("noSearches")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-navy-100">
              {searches.map((search) => (
                <li key={search.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {search.originAirport.iataCode} → {search.destinationAirport.iataCode}
                      <span className="ms-2 text-xs font-normal text-navy-500">
                        {search.originAirport.city} → {search.destinationAirport.city}
                      </span>
                    </p>
                    <p className="text-[11px] text-navy-500">
                      {formatDate(search.departureDate, intl)}
                      {search.returnDate ? ` · ${formatDate(search.returnDate, intl)}` : ""} ·{" "}
                      {search.resultCount} {tSearch("submit").toLowerCase()}
                    </p>
                  </div>
                  <Link
                    href={buildSearchHref({
                      origin: search.originAirport.iataCode,
                      destination: search.destinationAirport.iataCode,
                      departureDate: search.departureDate.toISOString().slice(0, 10),
                      returnDate: search.returnDate?.toISOString().slice(0, 10) ?? null,
                      tripType: search.tripType,
                      adults: search.adults,
                      children: search.children,
                      infants: search.infants,
                      cabinClass: search.cabinClass,
                    })}
                    className="text-xs font-semibold text-sky-700 hover:underline"
                  >
                    {t("repeatSearch")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-navy-900">
              {t("activeAlerts")}
            </h2>
            <Link
              href="/dashboard/alerts"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
            >
              {t("myAlerts")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="mt-4">
              <p className="text-sm text-navy-500">{t("noAlerts")}</p>
              <LinkButton href="/dashboard/alerts" variant="outline" size="sm" className="mt-3">
                {t("newAlert")}
              </LinkButton>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-navy-100">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {alert.originAirport.iataCode} → {alert.destinationAirport.iataCode}
                    </p>
                    <p className="text-[11px] text-navy-500">
                      {formatDate(alert.departureDate, intl)} ·{" "}
                      {formatMoney(Number(alert.targetPrice), alert.currency, intl)}
                    </p>
                  </div>
                  <Badge variant={alert.enabled ? "success" : "outline"}>
                    {alert.enabled ? t("alertActive") : t("alertInactive")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-navy-900">{t("notifications")}</h2>
          {unreadCount > 0 ? <MarkAllRead /> : null}
        </div>

        {notifications.length === 0 ? (
          <p className="mt-4 text-sm text-navy-500">{t("noNotifications")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-100">
            {notifications.map((notification) => (
              <li key={notification.id} className="flex items-start gap-3 py-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    notification.read ? "bg-navy-200" : "bg-sky-500"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy-900">{notification.title}</p>
                  <p className="text-xs text-navy-500">{notification.message}</p>
                  <p className="mt-0.5 text-[11px] text-navy-400">
                    {formatDateTime(notification.createdAt, intl)}
                  </p>
                </div>
                {!notification.read ? <Badge variant="sky">{t("unread")}</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
