import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  ExternalLink,
  Luggage,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { getDisplayCurrency } from "@/modules/currency/cookies";
import { loadOfferById, loadSearchForDisplay } from "@/modules/flights/search-service";
import { getPricePredictionForRoute } from "@/modules/flights/prediction-service";
import { compareHighlights } from "@/modules/comparison/compare";
import { recommendOffers } from "@/modules/ai/recommend";
import { Itinerary } from "@/components/flights/itinerary";
import { OfferCard } from "@/components/flights/offer-card";
import { FavoriteButton } from "@/components/flights/favorite-button";
import { Alert, Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  cn,
  formatDate,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatTime,
  intlLocale,
} from "@/lib/utils";
import type { Locale } from "@/i18n/messages";

function safeBookingUrl(url: string | null): string | null {
  if (!url) return null;
  // Internal affiliate redirect (`/api/booking/...`). Reject protocol-relative
  // URLs (`//host`) which would point to another origin.
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function FlightDetailPage({
  params,
}: {
  params: Promise<{ locale: string; offerId: string }>;
}) {
  const { locale, offerId } = await params;
  setRequestLocale(locale as Locale);

  const [t, tr, tCommon, tu] = await Promise.all([
    getTranslations("flight"),
    getTranslations("results"),
    getTranslations("common"),
    getTranslations("units"),
  ]);

  const currency = await getDisplayCurrency();
  const loaded = await loadOfferById(offerId, currency);
  if (!loaded) notFound();

  const { offer, search } = loaded;
  const intl = intlLocale(locale);

  const [user, prediction, searchResults] = await Promise.all([
    getCurrentUser(),
    getPricePredictionForRoute({
      originIata: search.origin.iataCode,
      destinationIata: search.destination.iataCode,
      departureDate: search.departureDate,
      currency,
    }),
    loadSearchForDisplay(offer.searchId, currency),
  ]);

  const favorite = user
    ? await prisma.favorite.findUnique({
        where: { userId_flightOfferId: { userId: user.id, flightOfferId: offer.id } },
        select: { id: true },
      })
    : null;

  const siblings = searchResults?.offers ?? [];
  const highlights = compareHighlights(siblings);
  const recommendations = recommendOffers(siblings).filter(
    (recommendation) => recommendation.offer.id !== offer.id,
  );

  const bookingUrl = safeBookingUrl(offer.bookingUrl);
  const price = offer.convertedPrice ?? offer.originalPrice;
  const priceCurrency = offer.convertedCurrency ?? offer.originalCurrency;
  const hasConversion = offer.convertedCurrency !== offer.originalCurrency;
  const passengerCount = search.adults + search.children + search.infants;

  const searchHref = `/search?origin=${search.origin.iataCode}&destination=${search.destination.iataCode}&departureDate=${search.departureDate}${
    search.returnDate ? `&returnDate=${search.returnDate}` : ""
  }&tripType=${search.tripType}&adults=${search.adults}&children=${search.children}&infants=${search.infants}&cabinClass=${search.cabinClass}&auto=1`;

  const TrendIcon =
    prediction.trend === "DOWN"
      ? TrendingDown
      : prediction.trend === "UP"
        ? TrendingUp
        : Minus;

  return (
    <div className="container-page py-8">
      <Link
        href={searchHref}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-500 hover:text-navy-900"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        {tr("title")}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-extrabold text-navy-900">
          {search.origin.city} → {search.destination.city}
        </h1>
        <Badge variant={offer.isDemo ? "demo" : "success"}>
          {offer.isDemo ? tr("demoNotice").split(":")[0] : tr("providerStatus")}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-navy-500">
        {formatDate(`${search.departureDate}T12:00:00Z`, intl)}
        {search.returnDate ? ` · ${formatDate(`${search.returnDate}T12:00:00Z`, intl)}` : ""} ·{" "}
        {offer.airline?.name ?? offer.provider.name} ·{" "}
        {passengerCount}{" "}
        {(passengerCount === 1 ? tu("passenger") : tCommon("passengers")).toLowerCase()}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("itinerary")}</CardTitle>
              <span className="text-xs font-medium text-navy-500">
                {formatDuration(offer.durationMinutes)} ·{" "}
                {offer.stops === 0
                  ? t("direct")
                  : `${offer.stops} ${offer.stops === 1 ? tu("stop") : tu("stops")}`}
              </span>
            </CardHeader>
            <CardContent>
              <Itinerary offer={offer} locale={locale} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Luggage className="h-4 w-4 text-sky-600" aria-hidden />
                  {t("baggage")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-navy-600">
                {offer.baggage ? (
                  <>
                    <p>
                      {t("checkedBag")} :{" "}
                      <strong className="text-navy-900">
                        {offer.baggage.checkedBags ?? 0}
                        {offer.baggage.checkedWeightKg
                          ? ` (${offer.baggage.checkedWeightKg} kg)`
                          : ""}
                      </strong>
                    </p>
                    <p>
                      {t("cabinBag")} :{" "}
                      <strong className="text-navy-900">{offer.baggage.cabinBags ?? 0}</strong>
                    </p>
                    {offer.baggage.note ? (
                      <p className="text-xs text-navy-500">{offer.baggage.note}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-navy-500">{t("noBaggageInfo")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-sky-600" aria-hidden />
                  {t("fareConditions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-navy-600">
                <p>{offer.fareConditions ?? t("noBaggageInfo")}</p>
                <p>
                  {offer.refundable === null
                    ? tCommon("notAvailable")
                    : offer.refundable
                      ? t("refundable")
                      : t("nonRefundable")}
                </p>
                <p className="text-xs text-navy-500">
                  {t("priceVerifiedAt")} {formatDateTime(offer.retrievedAt, intl)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* price prediction */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("pricePrediction")}</CardTitle>
              <Badge
                variant={
                  prediction.trend === "DOWN"
                    ? "success"
                    : prediction.trend === "UP"
                      ? "danger"
                      : "outline"
                }
              >
                <TrendIcon className="h-3 w-3" aria-hidden />
                {prediction.trend === "DOWN"
                  ? t("trendDown")
                  : prediction.trend === "UP"
                    ? t("trendUp")
                    : prediction.trend === "STABLE"
                      ? t("trendStable")
                      : t("trendUnknown")}
              </Badge>
            </CardHeader>
            <CardContent>
              {prediction.currentPrice === null ? (
                <p className="text-sm text-navy-500">{t("trendUnknown")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-navy-500 uppercase">{t("currentPrice")}</p>
                    <p className="text-lg font-extrabold text-navy-900">
                      {formatMoney(prediction.currentPrice, prediction.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-navy-500 uppercase">{t("observedRange")}</p>
                    <p className="text-sm font-semibold text-navy-800">
                      {prediction.observedMin !== null && prediction.observedMax !== null
                        ? `${formatMoney(prediction.observedMin, prediction.currency)} – ${formatMoney(prediction.observedMax, prediction.currency)}`
                        : "—"}
                    </p>
                    <p className="text-[11px] text-navy-400">
                      {t("samples")} : {prediction.sampleCount} · {prediction.coverageDays} j
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-navy-500 uppercase">{t("confidence")}</p>
                    <p className="text-sm font-semibold text-navy-800">
                      {prediction.confidence === "HIGH"
                        ? t("high")
                        : prediction.confidence === "MEDIUM"
                          ? t("medium")
                          : t("low")}
                    </p>
                    <p className="text-[11px] text-navy-400">
                      {t("modelUpdated")} : {formatDateTime(prediction.modelUpdatedAt, intl)}
                    </p>
                  </div>
                </div>
              )}
              <p className="mt-3 rounded-lg bg-navy-50 p-2.5 text-[11px] leading-relaxed text-navy-500">
                {t("predictionDisclaimer")}
              </p>
            </CardContent>
          </Card>

          {recommendations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("aiAnalysis")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.slice(0, 3).map((recommendation) => (
                  <div
                    key={recommendation.offer.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-navy-100 p-3"
                  >
                    <Clock className="h-4 w-4 text-navy-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-900">
                        {recommendation.offer.airline?.name ?? recommendation.offer.provider.name}
                      </p>
                      <p className="text-[11px] text-navy-500">
                        {formatDuration(recommendation.offer.durationMinutes)} ·{" "}
                        {recommendation.offer.stops === 0
                          ? t("direct")
                          : `${recommendation.offer.stops} ${
                              recommendation.offer.stops === 1
                                ? tu("stop")
                                : tu("stops")
                            }`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {recommendation.reasons.includes("CHEAPEST") ? (
                        <Badge variant="success">{tr("cheapest")}</Badge>
                      ) : null}
                      {recommendation.reasons.includes("FASTEST") ? (
                        <Badge variant="sky">{tr("fastest")}</Badge>
                      ) : null}
                      {recommendation.reasons.includes("BAGGAGE_INCLUDED") ? (
                        <Badge variant="outline">{t("checkedBag")}</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm font-bold text-navy-900">
                      {formatMoney(
                        recommendation.offer.convertedPrice ??
                          recommendation.offer.originalPrice,
                        recommendation.offer.convertedCurrency ??
                          recommendation.offer.originalCurrency,
                      )}
                    </p>
                    <Link href={`/flights/${recommendation.offer.id}`}>
                      <span className="text-xs font-semibold text-sky-700 hover:underline">
                        {t("flightDetails")}
                      </span>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {siblings.length > 1 ? (
            <div>
              <h2 className="mb-3 font-display text-base font-bold text-navy-900">
                {tr("allOffers")}
              </h2>
              <div className="space-y-3">
                {siblings
                  .filter((sibling) => sibling.id !== offer.id)
                  .slice(0, 4)
                  .map((sibling) => (
                    <OfferCard
                      key={sibling.id}
                      offer={sibling}
                      highlight={
                        sibling.id === highlights.cheapestId
                          ? "cheapest"
                          : sibling.id === highlights.fastestId
                            ? "fastest"
                            : sibling.id === highlights.bestValueId
                              ? "best"
                              : null
                      }
                    />
                  ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* ---------------------------------------------------- booking panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-navy-950 p-5 text-white">
              <p className="text-[11px] tracking-wide text-white/60 uppercase">
                {t("priceDetails")}
              </p>
              <p className="mt-1 font-display text-3xl font-extrabold">
                {formatMoney(price, priceCurrency)}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                {tCommon("total")} · {passengerCount}{" "}
                {(passengerCount === 1 ? tu("passenger") : tCommon("passengers")).toLowerCase()}
              </p>
              {hasConversion ? (
                <p className="mt-2 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/80">
                  {t("originalPrice")} : {formatMoney(offer.originalPrice, offer.originalCurrency)}
                  {offer.exchangeRate
                    ? ` · 1 ${offer.originalCurrency} = ${offer.exchangeRate.toFixed(3)} ${priceCurrency}`
                    : ""}
                  <br />
                  {tr("indicativeNotice")}
                </p>
              ) : null}
            </div>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{t("provider")}</span>
                <span className="font-semibold text-navy-900">{offer.provider.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{t("airline")}</span>
                <span className="font-semibold text-navy-900">
                  {offer.airline?.name ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{t("duration")}</span>
                <span className="font-semibold text-navy-900">
                  {formatDuration(offer.durationMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{t("priceVerifiedAt")}</span>
                <span className="text-end text-xs font-medium text-navy-700">
                  {formatDateTime(offer.retrievedAt, intl)}
                </span>
              </div>

              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={cn(buttonVariants({ variant: "accent", size: "lg" }), "w-full")}
                >
                  {t("bookingCta")}
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              ) : (
                <div className="space-y-2">
                  <span
                    className={cn(
                      buttonVariants({ variant: "default", size: "lg" }),
                      "pointer-events-none w-full opacity-50",
                    )}
                    aria-disabled="true"
                  >
                    {t("bookingUnavailable")}
                  </span>
                  <p className="text-[11px] leading-relaxed text-navy-500">
                    {t("bookingUnavailableText")}
                  </p>
                </div>
              )}

              <FavoriteButton
                offerId={offer.id}
                initialSaved={Boolean(favorite)}
                canSave={Boolean(user)}
                redirectTo={`/flights/${offer.id}`}
              />

              <Link href={`/compare?ids=${offer.id}`} className="block">
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full",
                  )}
                >
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {tr("selectToCompare")}
                </span>
              </Link>

              <p className="flex items-start gap-1.5 text-[11px] text-navy-400">
                <RefreshCw className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {formatTime(offer.departureTime, intl)} → {formatTime(offer.arrivalTime, intl)}
              </p>
            </CardContent>
          </Card>

          {offer.isDemo ? (
            <Alert variant="warning" className="mt-3">
              {tr("demoNotice")}
            </Alert>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
