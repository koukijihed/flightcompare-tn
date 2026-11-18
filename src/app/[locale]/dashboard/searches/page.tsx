import { Link, redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Search } from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { DeleteSearchButton } from "@/components/dashboard/delete-search-button";
import { LinkButton } from "@/components/ui/link-button";
import { buildSearchHref, formatDate, intlLocale } from "@/lib/utils";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function MySearchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login?next=/dashboard/searches", locale: locale as Locale });
    return null;
  }

  const [t, tCommon, tSearch, tu, searches] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getTranslations("search"),
    getTranslations("units"),
    prisma.flightSearch.findMany({
      where: { userId: user.id },
      include: { originAirport: true, destinationAirport: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const cabinLabels: Record<string, string> = {
    ECONOMY: tSearch("economy"),
    PREMIUM_ECONOMY: tSearch("premium"),
    BUSINESS: tSearch("business"),
    FIRST: tSearch("first"),
  };

  const intl = intlLocale(locale);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h1 className="font-display text-xl font-extrabold text-navy-900">{t("mySearches")}</h1>
        <p className="mt-1 text-sm text-navy-500">{t("title")}</p>
      </div>

      {searches.length === 0 ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-10 text-center shadow-card">
          <Search className="mx-auto h-8 w-8 text-navy-300" aria-hidden />
          <p className="mt-3 text-sm text-navy-500">{t("noSearches")}</p>
          <LinkButton href="/search" variant="accent" size="sm" className="mt-4">
            {tSearch("submit")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          </LinkButton>
        </div>
      ) : (
        <ul className="space-y-3">
          {searches.map((search) => {
            const departureDate = search.departureDate.toISOString().slice(0, 10);
            const passengerCount = search.adults + search.children + search.infants;
            return (
              <li
                key={search.id}
                className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy-900">
                      <span className="rounded-md bg-navy-900 px-1.5 py-0.5 text-[11px] text-white">
                        {search.originAirport.iataCode}
                      </span>
                      <span className="text-navy-300">→</span>
                      <span className="rounded-md bg-sky-600 px-1.5 py-0.5 text-[11px] text-white">
                        {search.destinationAirport.iataCode}
                      </span>
                      <span className="text-xs font-medium text-navy-500">
                        {search.originAirport.city} → {search.destinationAirport.city}
                      </span>
                    </p>
                    <p className="mt-1.5 text-[11px] text-navy-500">
                      {formatDate(search.departureDate, intl)}
                      {search.returnDate ? ` → ${formatDate(search.returnDate, intl)}` : ""} ·{" "}
                      {passengerCount}{" "}
                      {(passengerCount === 1 ? tu("passenger") : tCommon("passengers")).toLowerCase()} ·{" "}
                      {cabinLabels[search.cabinClass] ?? search.cabinClass}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <LinkButton
                      href={buildSearchHref({
                        origin: search.originAirport.iataCode,
                        destination: search.destinationAirport.iataCode,
                        departureDate,
                        returnDate: search.returnDate?.toISOString().slice(0, 10) ?? null,
                        tripType: search.tripType,
                        adults: search.adults,
                        children: search.children,
                        infants: search.infants,
                        cabinClass: search.cabinClass,
                      })}
                      variant="accent"
                      size="sm"
                    >
                      {t("repeatSearch")}
                    </LinkButton>
                    <DeleteSearchButton searchId={search.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-[11px] text-navy-400">
        <Link href="/dashboard" className="font-semibold text-sky-700 hover:underline">
          {t("overview")}
        </Link>
      </p>
    </div>
  );
}
