import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Clock, Luggage, Trophy, X } from "lucide-react";
import { getDisplayCurrency } from "@/modules/currency/cookies";
import { loadOffersByIds } from "@/modules/flights/search-service";
import { compareHighlights, groupSegments } from "@/modules/comparison/compare";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate, formatDuration, formatMoney, formatTime, intlLocale } from "@/lib/utils";
import type { Locale } from "@/i18n/messages";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { ids } = await searchParams;

  const [t, tf, tCommon, tu] = await Promise.all([
    getTranslations("compare"),
    getTranslations("flight"),
    getTranslations("common"),
    getTranslations("units"),
  ]);

  const offerIds = (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3);

  const offers = await loadOffersByIds(offerIds, await getDisplayCurrency());
  const highlights = compareHighlights(offers);
  const intl = intlLocale(locale);

  if (offers.length === 0) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
          <Trophy className="mx-auto h-8 w-8 text-navy-300" aria-hidden />
          <h1 className="mt-3 font-display text-xl font-bold text-navy-900">{t("empty")}</h1>
          <p className="mt-2 text-sm text-navy-500">{t("emptyText")}</p>
          <Link href="/search" className={cn(buttonVariants({ variant: "accent" }), "mt-5")}>
            {t("backToResults")}
          </Link>
        </div>
      </div>
    );
  }

  const rows: Array<{
    label: string;
    render: (offer: (typeof offers)[number]) => React.ReactNode;
  }> = [
    {
      label: t("totalPrice"),
      render: (offer) => (
        <div>
          <p className="font-display text-xl font-extrabold text-navy-900">
            {formatMoney(
              offer.convertedPrice ?? offer.originalPrice,
              offer.convertedCurrency ?? offer.originalCurrency,
            )}
          </p>
          {offer.convertedCurrency && offer.convertedCurrency !== offer.originalCurrency ? (
            <p className="text-[11px] text-navy-400">
              {formatMoney(offer.originalPrice, offer.originalCurrency)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      label: t("airline"),
      render: (offer) => offer.airline?.name ?? "—",
    },
    {
      label: t("provider"),
      render: (offer) => (
        <span>
          {offer.provider.name}
          {offer.isDemo ? (
            <Badge variant="demo" className="ms-1.5">
              {tCommon("demo")}
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      label: t("times"),
      render: (offer) => {
        const legs = groupSegments(offer);
        return (
          <div className="space-y-1 text-xs">
            {legs.map((leg) => (
              <p key={leg.legIndex}>
                {leg.departureTime ? formatTime(leg.departureTime, intl) : "—"} →{" "}
                {leg.arrivalTime ? formatTime(leg.arrivalTime, intl) : "—"}
                <span className="ms-1 text-navy-400">
                  ({formatDate(leg.departureTime ?? offer.departureTime, intl)})
                </span>
              </p>
            ))}
          </div>
        );
      },
    },
    {
      label: t("duration"),
      render: (offer) => (
        <span className="inline-flex items-center gap-1 text-sm">
          <Clock className="h-3.5 w-3.5 text-navy-400" aria-hidden />
          {formatDuration(offer.durationMinutes)}
        </span>
      ),
    },
    {
      label: t("stops"),
      render: (offer) =>
        offer.stops === 0
          ? tf("direct")
          : `${offer.stops} ${offer.stops === 1 ? tu("stop") : tu("stops")}`,
    },
    {
      label: t("baggage"),
      render: (offer) => (
        <span className="inline-flex items-center gap-1 text-sm">
          <Luggage className="h-3.5 w-3.5 text-navy-400" aria-hidden />
          {offer.baggage?.checkedBags
            ? offer.baggage.checkedWeightKg
              ? `${offer.baggage.checkedBags} × ${offer.baggage.checkedWeightKg} kg`
              : `${offer.baggage.checkedBags}`
            : tf("noBaggageInfo")}
        </span>
      ),
    },
    {
      label: t("fare"),
      render: (offer) => (
        <span className="text-xs text-navy-600">{offer.fareConditions ?? "—"}</span>
      ),
    },
    {
      label: t("refundable"),
      render: (offer) =>
        offer.refundable === null
          ? tCommon("notAvailable")
          : offer.refundable
            ? tf("refundable")
            : tf("nonRefundable"),
    },
  ];

  return (
    <div className="container-page py-8">
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-500 hover:text-navy-900"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        {t("backToResults")}
      </Link>

      <h1 className="mt-2 font-display text-2xl font-extrabold text-navy-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-navy-500">{t("subtitle")}</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-40" />
              {offers.map((offer) => {
                const remaining = offerIds.filter((id) => id !== offer.id);
                const badges = [
                  offer.id === highlights.cheapestId ? t("cheapest") : null,
                  offer.id === highlights.fastestId ? t("fastest") : null,
                  offer.id === highlights.bestValueId ? t("bestValue") : null,
                ].filter(Boolean) as string[];

                return (
                  <th key={offer.id} className="p-2 align-top">
                    <Card className="p-4 text-start">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-navy-900">
                            {offer.airline?.name ?? offer.provider.name}
                          </p>
                          <p className="text-[11px] text-navy-500">
                            {offer.segments[0]?.origin.iataCode} →{" "}
                            {offer.segments[offer.segments.length - 1]?.destination.iataCode}
                          </p>
                        </div>
                        <Link
                          href={`/compare?ids=${remaining.join(",")}`}
                          aria-label={t("remove")}
                          className="rounded-full p-1 text-navy-300 hover:bg-navy-50 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {badges.map((badge) => (
                          <Badge
                            key={badge}
                            variant={
                              badge === t("cheapest")
                                ? "success"
                                : badge === t("fastest")
                                  ? "sky"
                                  : "warning"
                            }
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                      {highlights.scores[offer.id] !== undefined ? (
                        <p className="mt-2 text-[11px] font-semibold text-navy-500">
                          {t("bestValue")} score : {highlights.scores[offer.id]}/100
                        </p>
                      ) : null}
                    </Card>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-navy-100">
                <th className="p-3 text-start align-top text-xs font-semibold text-navy-500">
                  {row.label}
                </th>
                {offers.map((offer) => (
                  <td
                    key={offer.id}
                    className="border-s border-navy-100 p-3 align-top text-sm text-navy-800"
                  >
                    {row.render(offer)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th />
              {offers.map((offer) => (
                <td key={offer.id} className="border-s border-navy-100 p-3">
                  <Link
                    href={`/flights/${offer.id}`}
                    className={cn(buttonVariants({ variant: "accent", size: "sm" }), "w-full")}
                  >
                    {tf("flightDetails")}
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <Card className="mt-5">
        <CardContent className="text-xs text-navy-500">
          <p className="font-semibold text-navy-700">{t("bestValueExplanation")}</p>
          <p className="mt-1">{t("maxReached")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
