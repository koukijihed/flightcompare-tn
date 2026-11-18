"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Filter,
  RefreshCw,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import type { SearchResponseDTO, FlightOfferDTO } from "@/types/flight";
import { Alert, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OfferSkeleton, Skeleton } from "@/components/ui/skeleton";
import { OfferCard } from "@/components/flights/offer-card";
import { SearchForm } from "@/components/search/search-form";
import {
  FiltersPanel,
  defaultFilters,
  matchesFilters,
  type FlightFilters,
} from "@/components/search/filters-panel";
import { addDays, formatDateInput, formatMoney } from "@/lib/utils";

type SortKey = "cheapest" | "fastest" | "earliest" | "latest";

export function SearchResultsClient() {
  const t = useTranslations("results");
  const tc = useTranslations("common");
  const tu = useTranslations("units");
  const locale = useLocale();
  const params = useSearchParams();
  const key = params.toString();

  const [data, setData] = useState<SearchResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FlightFilters | null>(null);
  const [sort, setSort] = useState<SortKey>("cheapest");
  const [selected, setSelected] = useState<string[]>([]);
  const [compareMessage, setCompareMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showModify, setShowModify] = useState(false);
  const lastKey = useRef<string | null>(null);

  const runSearch = useCallback(async () => {
    const origin = params.get("origin")?.toUpperCase() ?? "";
    const destination = params.get("destination")?.toUpperCase() ?? "";

    if (!origin || !destination) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setCompareMessage(null);

    const cookieCurrency = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("fc_currency="))
      ?.split("=")[1];

    const body: Record<string, unknown> = {
      origin,
      destination,
      departureDate: params.get("departureDate") ?? formatDateInput(addDays(new Date(), 21)),
      returnDate: params.get("returnDate") || null,
      tripType: params.get("tripType") ?? "ONE_WAY",
      adults: Number(params.get("adults") ?? 1),
      children: Number(params.get("children") ?? 0),
      infants: Number(params.get("infants") ?? 0),
      cabinClass: params.get("cabinClass") ?? "ECONOMY",
      currency: cookieCurrency ?? "TND",
    };

    const legs = params.get("legs");
    if (legs) {
      try {
        body.legs = JSON.parse(legs);
      } catch {
        body.legs = undefined;
      }
    }

    try {
      const response = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as SearchResponseDTO & { error?: string };

      if (!response.ok) {
        setError(payload.error ?? t("errorText"));
        setData(null);
        return;
      }

      setData(payload);
      setFilters(defaultFilters(payload.offers));
      setSelected([]);
    } catch {
      setError(t("errorText"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    void runSearch();
  }, [key, runSearch]);

  const offers = useMemo(() => data?.offers ?? [], [data]);
  const currency = data?.search.displayCurrency ?? "TND";
  const passengerCount = data
    ? data.search.adults + data.search.children + data.search.infants
    : 0;

  const highlighted = useMemo(() => {
    if (offers.length === 0) return { cheapest: null, fastest: null };
    const cheapest = offers.reduce((best, offer) =>
      (offer.convertedPrice ?? offer.originalPrice) < (best.convertedPrice ?? best.originalPrice)
        ? offer
        : best,
    );
    const fastest = offers.reduce((best, offer) =>
      offer.durationMinutes < best.durationMinutes ? offer : best,
    );
    return { cheapest: cheapest.id, fastest: fastest.id };
  }, [offers]);

  const visible = useMemo(() => {
    const activeFilters = filters ?? defaultFilters(offers);
    const filtered = offers.filter((offer) => matchesFilters(offer, activeFilters, currency));

    const price = (offer: FlightOfferDTO) => offer.convertedPrice ?? offer.originalPrice;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "fastest":
          return a.durationMinutes - b.durationMinutes;
        case "earliest":
          return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        case "latest":
          return new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime();
        default:
          return price(a) - price(b);
      }
    });
  }, [offers, filters, sort, currency]);

  function toggleCompare(offer: FlightOfferDTO) {
    setSelected((current) => {
      if (current.includes(offer.id)) {
        return current.filter((id) => id !== offer.id);
      }
      if (current.length >= 3) {
        setCompareMessage(t("maxThree"));
        return current;
      }
      setCompareMessage(null);
      return [...current, offer.id];
    });
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-96" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <OfferSkeleton />
          <OfferSkeleton />
          <OfferSkeleton />
        </div>
      </div>
    );
  }

  if (!data && !error) {
    return (
      <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-bold text-navy-900">{t("modifySearch")}</h2>
        <p className="mt-1 mb-4 text-sm text-navy-500">{t("subtitle")}</p>
        <SearchForm />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="danger" title={t("errorTitle")}>
          <p>{error}</p>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void runSearch()} variant="accent">
            <RefreshCw className="h-4 w-4" aria-hidden />
            {tc("retry")}
          </Button>
          <Button variant="outline" onClick={() => setShowModify((value) => !value)}>
            {t("modifySearch")}
          </Button>
        </div>
        {showModify ? <SearchForm /> : null}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3 shadow-card">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-[11px] font-bold text-white">
            {data.search.origin.iataCode}
          </span>
          <span className="text-navy-300">→</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-[11px] font-bold text-white">
            {data.search.destination.iataCode}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-navy-900">
              {data.search.origin.city} → {data.search.destination.city}
            </p>
            <p className="text-[11px] text-navy-500">
              {data.search.departureDate}
              {data.search.returnDate ? ` · ${data.search.returnDate}` : ""} ·{" "}
              {passengerCount}{" "}
              {(passengerCount === 1 ? tu("passenger") : tc("passengers")).toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-500">
            {t("sortBy")}
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="h-8 appearance-none rounded-lg border border-navy-200 bg-white ps-2 pe-7 text-[11px] font-semibold text-navy-800 focus:outline-none"
              >
                <option value="cheapest">{t("cheapest")}</option>
                <option value="fastest">{t("fastest")}</option>
                <option value="earliest">{t("earliest")}</option>
                <option value="latest">{t("latest")}</option>
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute end-2 top-1/2 h-3 w-3 -translate-y-1/2 text-navy-400"
              />
            </div>
          </label>

          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters((value) => !value)}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            {t("filters")}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModify((value) => !value)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {t("modifySearch")}
          </Button>
        </div>
      </div>

      {showModify ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
          <SearchForm
            initial={{
              origin: data.search.origin.iataCode,
              destination: data.search.destination.iataCode,
              originLabel: `${data.search.origin.city} (${data.search.origin.iataCode})`,
              destinationLabel: `${data.search.destination.city} (${data.search.destination.iataCode})`,
              departureDate: data.search.departureDate,
              returnDate: data.search.returnDate ?? undefined,
              tripType: data.search.tripType as "ONE_WAY" | "ROUND_TRIP" | "MULTI_CITY",
              adults: data.search.adults,
              children: data.search.children,
              infants: data.search.infants,
              cabinClass: data.search.cabinClass as
                | "ECONOMY"
                | "PREMIUM_ECONOMY"
                | "BUSINESS"
                | "FIRST",
            }}
          />
        </div>
      ) : null}

      {data.demoMode ? (
        <Alert variant="warning" title={tc("demo")}>
          {t("demoNotice")}
        </Alert>
      ) : null}

      {data.warnings.length > 0 ? (
        <Alert variant="info" title={t("providerStatus")}>
          <ul className="list-inside list-disc space-y-0.5 text-xs">
            {data.warnings.slice(0, 4).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className={showFilters ? "block" : "hidden lg:block"}>
          <div className="lg:sticky lg:top-20">
            <FiltersPanel
              offers={offers}
              filters={filters ?? defaultFilters(offers)}
              onChange={setFilters}
              currency={currency}
            />
            {data.providers.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
                <p className="mb-2 text-xs font-bold tracking-wide text-navy-500 uppercase">
                  {t("providerStatus")}
                </p>
                <ul className="space-y-1.5">
                  {data.providers.map((provider) => (
                    <li
                      key={`${provider.name}-${provider.type}`}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="truncate font-medium text-navy-700">{provider.name}</span>
                      <Badge
                        variant={
                          provider.state === "OK"
                            ? "success"
                            : provider.state === "ERROR"
                              ? "danger"
                              : "outline"
                        }
                      >
                        {provider.state === "OK"
                          ? `${provider.count}`
                          : provider.state === "EMPTY"
                            ? "0"
                            : provider.state}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy-700">
              {t("resultsCount", { count: visible.length })}
            </p>
            {selected.length > 0 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected([])}
                  className="text-[11px]"
                >
                  {t("clearSelection")}
                </Button>
                <Link href={`/compare?ids=${selected.join(",")}`}>
                  <Button size="sm" variant="default">
                    {t("compareSelected", { count: selected.length })}
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>

          {compareMessage ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {compareMessage}
            </p>
          ) : null}

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-navy-100 bg-white p-10 text-center shadow-card">
              <SearchX className="mx-auto h-8 w-8 text-navy-300" aria-hidden />
              <h2 className="mt-3 font-display text-base font-bold text-navy-900">
                {t("emptyTitle")}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-navy-500">{t("emptyText")}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilters(defaultFilters(offers))}
                >
                  {tc("reset")}
                </Button>
                <Button variant="accent" onClick={() => setShowModify(true)}>
                  {t("modifySearch")}
                </Button>
              </div>
            </div>
          ) : (
            visible.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                compareSelected={selected.includes(offer.id)}
                onToggleCompare={toggleCompare}
                highlight={
                  offer.id === highlighted.cheapest
                    ? "cheapest"
                    : offer.id === highlighted.fastest
                      ? "fastest"
                      : null
                }
              />
            ))
          )}

          <p className="pt-2 text-center text-[11px] text-navy-400">
            {t("indicativeNotice")} ·{" "}
            {formatMoney(0, currency, locale === "ar" ? "ar-TN" : undefined).replace(/[\d.,\s]/g, "")}
          </p>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="sticky bottom-4 z-30 lg:hidden">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-navy-900 p-3 text-white shadow-lifted">
            <span className="text-xs font-semibold">
              {t("compareSelected", { count: selected.length })}
            </span>
            <Link href={`/compare?ids=${selected.join(",")}`}>
              <Button size="sm" variant="accent">
                {t("compareSelected", { count: selected.length })}
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
