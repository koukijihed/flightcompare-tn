"use client";

import { useTranslations } from "next-intl";
import type { FlightOfferDTO } from "@/types/flight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export type FlightFilters = {
  airlines: string[];
  maxPrice: number | null;
  maxStops: number | null;
  departureWindow: "any" | "morning" | "afternoon" | "evening" | "night";
  maxDuration: number | null;
  baggageOnly: boolean;
};

export function defaultFilters(offers: FlightOfferDTO[]): FlightFilters {
  const prices = offers.map((offer) => offer.convertedPrice ?? offer.originalPrice);
  return {
    airlines: [],
    maxPrice: prices.length > 0 ? Math.ceil(Math.max(...prices)) : null,
    maxStops: null,
    departureWindow: "any",
    maxDuration: null,
    baggageOnly: false,
  };
}

const WINDOWS: Array<{
  value: FlightFilters["departureWindow"];
  labelKey: "anyStops" | "departureWindow";
  range?: [number, number];
  label?: string;
}> = [
  { value: "any", labelKey: "anyStops", label: "00:00 – 23:59" },
  { value: "morning", labelKey: "departureWindow", range: [5, 12], label: "05:00 – 12:00" },
  { value: "afternoon", labelKey: "departureWindow", range: [12, 17], label: "12:00 – 17:00" },
  { value: "evening", labelKey: "departureWindow", range: [17, 22], label: "17:00 – 22:00" },
  { value: "night", labelKey: "departureWindow", range: [22, 29], label: "22:00 – 05:00" },
];

export function matchesFilters(
  offer: FlightOfferDTO,
  filters: FlightFilters,
  currency: string,
): boolean {
  const price = offer.convertedPrice ?? offer.originalPrice;
  if (filters.maxPrice !== null && price > filters.maxPrice) return false;
  if (filters.maxStops !== null && offer.stops > filters.maxStops) return false;
  if (filters.maxDuration !== null && offer.durationMinutes > filters.maxDuration) return false;
  if (filters.baggageOnly && !(offer.baggage?.checkedBags && offer.baggage.checkedBags > 0)) {
    return false;
  }
  if (filters.airlines.length > 0) {
    const code = offer.airline?.iataCode ?? "";
    if (!filters.airlines.includes(code)) return false;
  }
  if (filters.departureWindow !== "any") {
    const window = WINDOWS.find((entry) => entry.value === filters.departureWindow);
    if (window?.range) {
      const hour = new Date(offer.departureTime).getUTCHours();
      const normalizedHour = hour < 5 ? hour + 24 : hour;
      const [start, end] = window.range;
      if (normalizedHour < start || normalizedHour >= end) return false;
    }
  }
  void currency;
  return true;
}

export function FiltersPanel({
  offers,
  filters,
  onChange,
  currency,
}: {
  offers: FlightOfferDTO[];
  filters: FlightFilters;
  onChange: (next: FlightFilters) => void;
  currency: string;
}) {
  const t = useTranslations("results");
  const tc = useTranslations("common");

  const prices = offers.map((offer) => offer.convertedPrice ?? offer.originalPrice);
  const minPrice = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
  const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 1000;

  const airlineCodes = [
    ...new Map(
      offers
        .filter((offer) => offer.airline)
        .map((offer) => [
          offer.airline!.iataCode,
          { code: offer.airline!.iataCode, name: offer.airline!.name },
        ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const maxDurationValue =
    filters.maxDuration ?? Math.max(...offers.map((offer) => offer.durationMinutes), 600);

  return (
    <div className="space-y-6 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-navy-900">{t("filtersTitle")}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(defaultFilters(offers))}
          className="h-7 px-2 text-[11px]"
        >
          {tc("reset")}
        </Button>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-navy-600">{t("maxPrice")}</legend>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={10}
          value={filters.maxPrice ?? maxPrice}
          onChange={(event) =>
            onChange({ ...filters, maxPrice: Number(event.target.value) })
          }
          className="w-full accent-sky-600"
          aria-label={t("maxPrice")}
        />
        <div className="mt-1 flex justify-between text-[11px] text-navy-500">
          <span>{formatMoney(minPrice, currency)}</span>
          <span className="font-semibold text-navy-800">
            {formatMoney(filters.maxPrice ?? maxPrice, currency)}
          </span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-navy-600">{t("stops")}</legend>
        <div className="space-y-1.5">
          {[
            { value: null, label: t("anyStops") },
            { value: 0, label: t("directOnly") },
            { value: 1, label: t("oneStop") },
          ].map((option) => (
            <label key={String(option.value)} className="flex items-center gap-2 text-sm text-navy-700">
              <input
                type="radio"
                name="stops"
                checked={filters.maxStops === option.value}
                onChange={() => onChange({ ...filters, maxStops: option.value })}
                className="accent-sky-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-navy-600">
          {t("departureWindow")}
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {WINDOWS.map((window) => (
            <button
              key={window.value}
              type="button"
              onClick={() => onChange({ ...filters, departureWindow: window.value })}
              className={
                filters.departureWindow === window.value
                  ? "rounded-lg border border-sky-400 bg-sky-50 px-2 py-1.5 text-[11px] font-semibold text-sky-700"
                  : "rounded-lg border border-navy-200 px-2 py-1.5 text-[11px] font-medium text-navy-600 hover:border-navy-300"
              }
            >
              {window.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-navy-600">{t("maxDuration")}</legend>
        <input
          type="range"
          min={60}
          max={Math.max(...offers.map((offer) => offer.durationMinutes), 600)}
          step={30}
          value={maxDurationValue}
          onChange={(event) =>
            onChange({ ...filters, maxDuration: Number(event.target.value) })
          }
          className="w-full accent-sky-600"
          aria-label={t("maxDuration")}
        />
        <p className="mt-1 text-[11px] text-navy-500">
          {Math.floor(maxDurationValue / 60)}h{String(maxDurationValue % 60).padStart(2, "0")}
        </p>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-navy-700">
        <input
          type="checkbox"
          checked={filters.baggageOnly}
          onChange={(event) => onChange({ ...filters, baggageOnly: event.target.checked })}
          className="accent-sky-600"
        />
        {t("baggageOnly")}
      </label>

      {airlineCodes.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-navy-600">{t("airlines")}</legend>
          <div className="max-h-44 space-y-1.5 overflow-auto pe-1">
            {airlineCodes.map((airline) => {
              const checked = filters.airlines.includes(airline.code);
              return (
                <label
                  key={airline.code}
                  className="flex items-center gap-2 text-sm text-navy-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...filters,
                        airlines: checked
                          ? filters.airlines.filter((code) => code !== airline.code)
                          : [...filters.airlines, airline.code],
                      })
                    }
                    className="accent-sky-600"
                  />
                  <span className="flex-1 truncate">{airline.name}</span>
                  <Badge variant="outline">{airline.code}</Badge>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
