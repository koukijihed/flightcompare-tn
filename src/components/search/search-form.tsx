"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  Minus,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { AirportInput } from "./airport-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn, addDays, formatDateInput } from "@/lib/utils";

type TripType = "ONE_WAY" | "ROUND_TRIP" | "MULTI_CITY";
type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export type SearchFormInitial = {
  origin?: string;
  destination?: string;
  originLabel?: string;
  destinationLabel?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: TripType;
  adults?: number;
  children?: number;
  infants?: number;
  cabinClass?: CabinClass;
};

const DEFAULT_LABEL: Record<string, string> = {
  TUN: "Tunis (TUN)",
  CDG: "Paris (CDG)",
};

export function SearchForm({
  initial,
  variant = "default",
  autoFocusDestination = false,
}: {
  initial?: SearchFormInitial;
  variant?: "default" | "hero";
  autoFocusDestination?: boolean;
}) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const [tripType, setTripType] = useState<TripType>(initial?.tripType ?? "ROUND_TRIP");
  const [origin, setOrigin] = useState(initial?.origin ?? "TUN");
  const [originLabel, setOriginLabel] = useState(
    initial?.originLabel ?? (initial?.origin ? undefined : DEFAULT_LABEL.TUN),
  );
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [destinationLabel, setDestinationLabel] = useState(initial?.destinationLabel);
  const [departureDate, setDepartureDate] = useState(
    initial?.departureDate ?? formatDateInput(addDays(today, 21)),
  );
  const [returnDate, setReturnDate] = useState(
    initial?.returnDate ?? formatDateInput(addDays(today, 28)),
  );
  const [adults, setAdults] = useState(initial?.adults ?? 1);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [infants, setInfants] = useState(initial?.infants ?? 0);
  const [cabinClass, setCabinClass] = useState<CabinClass>(
    initial?.cabinClass ?? "ECONOMY",
  );
  const [extraLegs, setExtraLegs] = useState<
    Array<{ origin: string; destination: string; departureDate: string }>
  >([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function swap() {
    setOrigin(destination);
    setDestination(origin);
    setOriginLabel(destinationLabel);
    setDestinationLabel(originLabel);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!origin) nextErrors.origin = t("errorSameAirport");
    if (!destination) nextErrors.destination = t("errorSameAirport");
    if (origin && destination && origin === destination) {
      nextErrors.destination = t("errorSameAirport");
    }
    if (!departureDate) nextErrors.departureDate = t("departure");
    if (tripType === "ROUND_TRIP") {
      if (!returnDate) nextErrors.returnDate = t("errorReturn");
      else if (returnDate < departureDate) nextErrors.returnDate = t("errorReturn");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const params = new URLSearchParams({
      origin,
      destination,
      departureDate,
      tripType,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      cabinClass,
      auto: "1",
    });
    if (tripType === "ROUND_TRIP" && returnDate) params.set("returnDate", returnDate);
    if (tripType === "MULTI_CITY" && extraLegs.length > 0) {
      params.set("legs", JSON.stringify(extraLegs));
    }

    router.push(`/search?${params.toString()}`);
  }

  const counter = (value: number, setValue: (next: number) => void, min: number, max: number, label: string) => (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-navy-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`− ${label}`}
          disabled={value <= min}
          onClick={() => setValue(Math.max(min, value - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-navy-200 text-navy-600 transition hover:border-navy-300 disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-semibold text-navy-900">{value}</span>
        <button
          type="button"
          aria-label={`+ ${label}`}
          disabled={value >= max}
          onClick={() => setValue(Math.min(max, value + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-navy-200 text-navy-600 transition hover:border-navy-300 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-2xl bg-white p-4 shadow-lifted md:p-5",
        variant === "hero" ? "ring-1 ring-white/40" : "border border-navy-100",
      )}
      aria-label={t("title")}
    >
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(
          [
            ["ROUND_TRIP", t("roundTrip")],
            ["ONE_WAY", t("oneWay")],
            ["MULTI_CITY", t("multiCity")],
          ] as Array<[TripType, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTripType(value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              tripType === value
                ? "bg-navy-900 text-white"
                : "bg-navy-50 text-navy-600 hover:bg-navy-100",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <div className="relative md:col-span-4">
          <AirportInput
            label={t("origin")}
            placeholder={t("originPlaceholder")}
            value={origin}
            defaultText={originLabel}
            onChange={(iata, label) => {
              setOrigin(iata);
              setOriginLabel(label);
            }}
            error={errors.origin}
          />
        </div>

        <div className="flex items-end justify-center pb-1 md:col-span-1 md:pb-0 md:self-center">
          <button
            type="button"
            onClick={swap}
            aria-label={t("swap")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-600 transition hover:border-sky-400 hover:text-sky-600"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <div className="md:col-span-4">
          <AirportInput
            label={t("destination")}
            placeholder={t("destinationPlaceholder")}
            value={destination}
            defaultText={destinationLabel}
            onChange={(iata, label) => {
              setDestination(iata);
              setDestinationLabel(label);
            }}
            error={errors.destination}
            id={autoFocusDestination ? "destination-input" : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 md:col-span-3">
          <div>
            <label
              htmlFor="departure-date"
              className="mb-1.5 block text-[11px] font-semibold tracking-wide text-navy-500 uppercase"
            >
              {t("departure")}
            </label>
            <div className="relative">
              <CalendarDays
                aria-hidden
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
              />
              <input
                id="departure-date"
                type="date"
                value={departureDate}
                min={formatDateInput(today)}
                onChange={(event) => setDepartureDate(event.target.value)}
                className="h-12 w-full rounded-xl border border-navy-200 bg-white ps-9 pe-2 text-xs font-medium text-navy-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="return-date"
              className="mb-1.5 block text-[11px] font-semibold tracking-wide text-navy-500 uppercase"
            >
              {t("return")}
            </label>
            <div className="relative">
              <CalendarDays
                aria-hidden
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
              />
              <input
                id="return-date"
                type="date"
                value={returnDate}
                min={departureDate}
                disabled={tripType !== "ROUND_TRIP"}
                onChange={(event) => setReturnDate(event.target.value)}
                className="h-12 w-full rounded-xl border border-navy-200 bg-white ps-9 pe-2 text-xs font-medium text-navy-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none disabled:bg-navy-50 disabled:text-navy-400"
              />
            </div>
            {errors.returnDate ? (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.returnDate}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {tripType === "MULTI_CITY" ? (
        <div className="mt-3 space-y-2 rounded-xl bg-navy-50/70 p-3">
          {extraLegs.map((leg, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-12">
              <div className="md:col-span-4">
                <AirportInput
                  label={`${t("origin")} ${index + 2}`}
                  placeholder={t("originPlaceholder")}
                  value={leg.origin}
                  onChange={(iata) =>
                    setExtraLegs((current) =>
                      current.map((entry, position) =>
                        position === index ? { ...entry, origin: iata } : entry,
                      ),
                    )
                  }
                />
              </div>
              <div className="md:col-span-4">
                <AirportInput
                  label={`${t("destination")} ${index + 2}`}
                  placeholder={t("destinationPlaceholder")}
                  value={leg.destination}
                  onChange={(iata) =>
                    setExtraLegs((current) =>
                      current.map((entry, position) =>
                        position === index ? { ...entry, destination: iata } : entry,
                      ),
                    )
                  }
                />
              </div>
              <div className="flex items-end gap-2 md:col-span-4">
                <input
                  type="date"
                  aria-label={`${t("departure")} ${index + 2}`}
                  value={leg.departureDate}
                  min={formatDateInput(today)}
                  onChange={(event) =>
                    setExtraLegs((current) =>
                      current.map((entry, position) =>
                        position === index
                          ? { ...entry, departureDate: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  className="h-12 flex-1 rounded-xl border border-navy-200 px-3 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("removeLeg")}
                  onClick={() =>
                    setExtraLegs((current) => current.filter((_, position) => position !== index))
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {extraLegs.length < 3 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setExtraLegs((current) => [
                  ...current,
                  {
                    origin: current[current.length - 1]?.destination ?? "",
                    destination: "",
                    departureDate: formatDateInput(addDays(today, 35 + current.length * 7)),
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addLeg")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-3 border-t border-navy-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-navy-200 px-3 text-xs font-semibold text-navy-700 transition hover:border-navy-300">
              <Users className="h-4 w-4 text-navy-400" aria-hidden />
              {adults + children + infants} {t("passengersTitle")}
            </summary>
            <div className="absolute z-40 mt-1.5 w-64 rounded-xl border border-navy-100 bg-white p-3 shadow-lifted">
              {counter(adults, setAdults, 1, 9, t("adults"))}
              {counter(children, setChildren, 0, 8, t("children"))}
              {counter(infants, setInfants, 0, Math.min(adults, 4), t("infants"))}
              <p className="mt-2 border-t border-navy-100 pt-2 text-[11px] text-navy-400">
                {t("infants")} ≤ {t("adults")}
              </p>
            </div>
          </details>

          <Select
            value={cabinClass}
            onChange={(event) => setCabinClass(event.target.value as CabinClass)}
            aria-label={t("cabin")}
            className="h-10 w-auto min-w-36 text-xs font-semibold"
          >
            <option value="ECONOMY">{t("economy")}</option>
            <option value="PREMIUM_ECONOMY">{t("premium")}</option>
            <option value="BUSINESS">{t("business")}</option>
            <option value="FIRST">{t("first")}</option>
          </Select>
        </div>

        <Button type="submit" variant="accent" size="lg" className="w-full lg:w-auto">
          <Search className="h-4 w-4" aria-hidden />
          {t("submit")}
        </Button>
      </div>
      <span className="sr-only">{locale}</span>
    </form>
  );
}
