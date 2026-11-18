"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SUPPORTED_CURRENCIES } from "@/modules/currency/constants";

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    preferredCurrency: "TND",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    if (form.password.length < 8) {
      setFieldErrors({ password: t("errors.password") });
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          preferredLanguage: locale,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        details?: Record<string, string>;
      };
      if (!response.ok) {
        setError(payload.error ?? tc("error"));
        setFieldErrors(payload.details ?? {});
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">{t("errors.firstName").replace(" est requis.", "")}</Label>
          <Input
            id="firstName"
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => update("firstName", event.target.value)}
          />
          {fieldErrors.firstName ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="lastName">{t("errors.lastName").replace(" est requis.", "")}</Label>
          <Input
            id="lastName"
            required
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => update("lastName", event.target.value)}
          />
          {fieldErrors.lastName ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="email">{tc("email")}</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />
        {fieldErrors.email ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password">{tc("password")}</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
        />
        <p className="mt-1 text-[11px] text-navy-400">{t("passwordHint")}</p>
        {fieldErrors.password ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="currency">{tc("currency")}</Label>
        <Select
          id="currency"
          value={form.preferredCurrency}
          onChange={(event) => update("preferredCurrency", event.target.value)}
        >
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" variant="accent" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {t("registerCta")}
      </Button>

      <p className="text-center text-xs text-navy-500">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-sky-700 hover:underline">
          {t("loginCta")}
        </Link>
      </p>
    </form>
  );
}
