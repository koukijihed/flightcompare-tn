"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check, Clock, Luggage } from "lucide-react";
import type { FlightOfferDTO } from "@/types/flight";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AirlineAvatar } from "./airline-avatar";
import { cn, formatDateTime, formatDuration, formatMoney, formatTime, intlLocale } from "@/lib/utils";

export function OfferCard({
  offer,
  compareSelected,
  onToggleCompare,
  highlight,
}: {
  offer: FlightOfferDTO;
  compareSelected?: boolean;
  onToggleCompare?: (offer: FlightOfferDTO) => void;
  highlight?: "cheapest" | "fastest" | "best" | null;
}) {
  const t = useTranslations("results");
  const tf = useTranslations("flight");
  const tc = useTranslations("common");
  const tu = useTranslations("units");
  const locale = useLocale();
  const intl = intlLocale(locale);

  const legs = new Map<number, FlightOfferDTO["segments"]>();
  for (const segment of offer.segments) {
    const list = legs.get(segment.legIndex) ?? [];
    list.push(segment);
    legs.set(segment.legIndex, list);
  }
  const outbound = legs.get(0) ?? [];

  const price = offer.convertedPrice ?? offer.originalPrice;
  const priceCurrency = offer.convertedCurrency ?? offer.originalCurrency;
  const hasConversion = offer.convertedCurrency && offer.convertedCurrency !== offer.originalCurrency;

  return (
    <article
      className={cn(
        "group relative rounded-2xl border bg-white p-4 shadow-card transition hover:shadow-lifted md:p-5",
        compareSelected ? "border-sky-400 ring-1 ring-sky-200" : "border-navy-100",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AirlineAvatar code={offer.airline?.iataCode} name={offer.airline?.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy-900">
                {offer.airline?.name ?? offer.provider.name}
              </p>
              <p className="text-xs text-navy-500">
                {outbound[0]?.flightNumber ?? "—"} · {offer.provider.name}
              </p>
            </div>
            <div className="ms-auto flex flex-wrap items-center gap-1.5">
              {highlight === "cheapest" ? <Badge variant="success">{t("cheapest")}</Badge> : null}
              {highlight === "fastest" ? <Badge variant="sky">{t("fastest")}</Badge> : null}
              {highlight === "best" ? <Badge variant="warning">{tf("aiAnalysis")}</Badge> : null}
              {offer.isDemo ? <Badge variant="demo">{t("demoNotice").split(":")[0]}</Badge> : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="text-start">
              <p className="text-lg font-extrabold text-navy-900">
                {formatTime(offer.departureTime, intl, outbound[0]?.origin.timezone ?? undefined)}
              </p>
              <p className="text-xs font-medium text-navy-500">
                {outbound[0]?.origin.iataCode}
              </p>
            </div>

            <div className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] font-semibold text-navy-500">
                {formatDuration(offer.durationMinutes)}
              </span>
              <div className="relative h-px w-full bg-navy-200">
                <span className="absolute -top-1 start-0 h-2 w-2 rounded-full bg-navy-300" />
                <span className="absolute -top-1 end-0 h-2 w-2 rounded-full bg-sky-500" />
              </div>
              <span className="text-[11px] font-medium text-navy-400">
                {offer.stops === 0
                  ? tf("direct")
                  : `${offer.stops} ${offer.stops === 1 ? tu("stop") : tu("stops")}`}
              </span>
            </div>

            <div className="text-end">
              <p className="text-lg font-extrabold text-navy-900">
                {formatTime(
                  legArrival(offer),
                  intl,
                  outbound[outbound.length - 1]?.destination.timezone ?? undefined,
                )}
              </p>
              <p className="text-xs font-medium text-navy-500">
                {outbound[outbound.length - 1]?.destination.iataCode}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-navy-500">
            <span className="inline-flex items-center gap-1">
              <Luggage className="h-3.5 w-3.5" aria-hidden />
              {offer.baggage?.checkedBags
                ? `${offer.baggage.checkedBags} ${tf("checkedBag").toLowerCase()}`
                : offer.baggage?.note ?? tf("noBaggageInfo")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {t("retrievedAt")} {formatDateTime(offer.retrievedAt, intl)}
            </span>
            {hasConversion ? (
              <Badge variant="outline">
                {t("indicativeNotice").slice(0, 42)}…
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-navy-100 pt-4 lg:w-56 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
          <div className="text-end">
            <p className="text-2xl font-extrabold tracking-tight text-navy-900">
              {formatMoney(price, priceCurrency)}
            </p>
            {hasConversion ? (
              <p className="text-[11px] text-navy-400">
                {formatMoney(offer.originalPrice, offer.originalCurrency)} ·{" "}
                {t("indicativeNotice").split(".")[0]}
              </p>
            ) : (
              <p className="text-[11px] text-navy-400">{offer.provider.name}</p>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-2">
            <Link
              href={`/flights/${offer.id}`}
              className={cn(buttonVariants({ variant: "accent", size: "sm" }), "gap-1")}
            >
              {tc("viewDetails")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
            </Link>
            {onToggleCompare ? (
              <button
                type="button"
                aria-pressed={compareSelected}
                onClick={() => onToggleCompare(offer)}
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition",
                  compareSelected
                    ? "border-sky-400 bg-sky-50 text-sky-700"
                    : "border-navy-200 text-navy-600 hover:border-navy-300",
                )}
              >
                {compareSelected ? <Check className="h-3.5 w-3.5" /> : null}
                {compareSelected ? t("selected") : t("selectToCompare")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function legArrival(offer: FlightOfferDTO): string {
  const legs = new Map<number, FlightOfferDTO["segments"]>();
  for (const segment of offer.segments) {
    const list = legs.get(segment.legIndex) ?? [];
    list.push(segment);
    legs.set(segment.legIndex, list);
  }
  const outbound = legs.get(0) ?? [];
  return outbound[outbound.length - 1]?.arrivalTime ?? offer.arrivalTime;
}
