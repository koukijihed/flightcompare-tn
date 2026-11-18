"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  BellRing,
  CalendarRange,
  Check,
  Loader2,
  RefreshCw,
  Target,
  Trash2,
} from "lucide-react";
import { AirportInput } from "@/components/search/airport-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SUPPORTED_CURRENCIES } from "@/modules/currency/constants";
import {
  addDays,
  cn,
  formatDate,
  formatDateInput,
  formatMoney,
  intlLocale,
} from "@/lib/utils";

export type AlertView = {
  id: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureDate: string;
  returnDate: string | null;
  targetPrice: number;
  currency: string;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastObservedPrice: number | null;
  createdAt: string;
};

type Feedback = { kind: "success" | "error"; message: string } | null;

export function AlertsManager({
  initialAlerts,
  defaultCurrency,
}: {
  initialAlerts: AlertView[];
  defaultCurrency: string;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tSearch = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState(
    formatDateInput(addDays(new Date(), 21)),
  );
  const [returnDate, setReturnDate] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function resetForm() {
    setOrigin("");
    setDestination("");
    setTargetPrice("");
  }

  async function createAlert(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!origin || !destination) {
      setFeedback({ kind: "error", message: tSearch("errorSameAirport") });
      return;
    }
    const price = Number(targetPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setFeedback({ kind: "error", message: t("alertTarget") });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          departureDate,
          returnDate: returnDate || null,
          targetPrice: price,
          currency,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setFeedback({ kind: "error", message: payload.error ?? tc("error") });
        return;
      }
      setFeedback({ kind: "success", message: t("alertCreated") });
      resetForm();
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: tc("error") });
    } finally {
      setCreating(false);
    }
  }

  async function toggleAlert(alert: AlertView) {
    setBusyId(alert.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !alert.enabled }),
      });
      if (response.ok) {
        setFeedback({ kind: "success", message: t("alertUpdated") });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function checkAlert(alert: AlertView) {
    setBusyId(alert.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/alerts/${alert.id}/check`, { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        observedPrice?: number | null;
        currency?: string;
      };
      if (!response.ok) {
        setFeedback({ kind: "error", message: payload.error ?? tc("error") });
        return;
      }
      setFeedback({
        kind: "success",
        message:
          payload.observedPrice === null || payload.observedPrice === undefined
            ? t("noObservedPrice")
            : `${t("lastObserved")} : ${formatMoney(
                payload.observedPrice,
                payload.currency ?? alert.currency,
                intlLocale(locale),
              )}`,
      });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: tc("error") });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAlert(alert: AlertView) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusyId(alert.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/alerts/${alert.id}`, { method: "DELETE" });
      if (response.ok) {
        setFeedback({ kind: "success", message: t("alertDeleted") });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  const intl = intlLocale(locale);

  return (
    <div className="space-y-6">
      {feedback ? (
        <p
          role="status"
          className={cn(
            "rounded-xl border px-3 py-2 text-xs font-medium",
            feedback.kind === "success"
              ? "border-turquoise-200 bg-turquoise-50 text-turquoise-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {feedback.message}
        </p>
      ) : null}

      <form
        onSubmit={createAlert}
        className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card"
      >
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-900">
          <BellRing className="h-4 w-4 text-sky-600" aria-hidden />
          {t("newAlert")}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AirportInput
            label={tSearch("origin")}
            placeholder={tSearch("originPlaceholder")}
            value={origin}
            onChange={(code) => setOrigin(code)}
          />
          <AirportInput
            label={tSearch("destination")}
            placeholder={tSearch("destinationPlaceholder")}
            value={destination}
            onChange={(code) => setDestination(code)}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="alert-departure">{tSearch("departure")}</Label>
            <Input
              id="alert-departure"
              type="date"
              required
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="alert-return">
              {tSearch("return")} <span className="normal-case">({tc("optional")})</span>
            </Label>
            <Input
              id="alert-return"
              type="date"
              min={departureDate}
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="alert-price">{t("alertTarget")}</Label>
            <Input
              id="alert-price"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.001"
              required
              value={targetPrice}
              onChange={(event) => setTargetPrice(event.target.value)}
              placeholder="450"
            />
          </div>
          <div>
            <Label htmlFor="alert-currency">{t("alertCurrency")}</Label>
            <Select
              id="alert-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Button type="submit" variant="accent" disabled={creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Target className="h-4 w-4" aria-hidden />
            )}
            {t("newAlert")}
          </Button>
        </div>
      </form>

      {initialAlerts.length === 0 ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
          <BellRing className="mx-auto h-7 w-7 text-navy-300" aria-hidden />
          <p className="mt-3 text-sm text-navy-500">{t("noAlerts")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {initialAlerts.map((alert) => {
            const reached =
              alert.lastObservedPrice !== null && alert.lastObservedPrice <= alert.targetPrice;
            const busy = busyId === alert.id;
            return (
              <li
                key={alert.id}
                className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                      <span className="rounded-md bg-navy-900 px-1.5 py-0.5 text-[11px] text-white">
                        {alert.origin}
                      </span>
                      <span className="text-navy-300">→</span>
                      <span className="rounded-md bg-sky-600 px-1.5 py-0.5 text-[11px] text-white">
                        {alert.destination}
                      </span>
                      <span className="truncate text-xs font-medium text-navy-500">
                        {alert.originCity} → {alert.destinationCity}
                      </span>
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-navy-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(alert.departureDate, intl)}
                        {alert.returnDate ? ` → ${formatDate(alert.returnDate, intl)}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" aria-hidden />
                        {t("alertTarget")} :{" "}
                        <strong className="text-navy-800">
                          {formatMoney(alert.targetPrice, alert.currency, intl)}
                        </strong>
                      </span>
                      <span>
                        {t("lastObserved")} :{" "}
                        {alert.lastObservedPrice === null
                          ? t("noObservedPrice")
                          : formatMoney(alert.lastObservedPrice, alert.currency, intl)}
                      </span>
                      {alert.lastCheckedAt ? (
                        <span>
                          {t("lastChecked")} : {formatDate(alert.lastCheckedAt, intl)}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {reached ? <Badge variant="success">{t("targetReached")}</Badge> : null}
                    <Badge variant={alert.enabled ? "sky" : "outline"}>
                      {alert.enabled ? t("alertActive") : t("alertInactive")}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void toggleAlert(alert)}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {t("toggle")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || !alert.enabled}
                    onClick={() => void checkAlert(alert)}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {busy ? t("checking") : t("checkNow")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void deleteAlert(alert)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {tc("delete")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
