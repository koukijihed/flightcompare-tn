"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { KeyRound, Loader2, Save } from "lucide-react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SUPPORTED_CURRENCIES } from "@/modules/currency/constants";
import { cn } from "@/lib/utils";

export type ProfileInitial = {
  firstName: string;
  lastName: string;
  email: string;
  preferredLanguage: "fr" | "en" | "ar";
  preferredCurrency: string;
  preferredAirlines: string[];
  maxStops: number | null;
  preferredCabin: string | null;
  emailNotifications: boolean;
};

type Feedback = { kind: "success" | "error"; message: string } | null;

function errorMessage(payload: { error?: string; details?: Record<string, string> }) {
  if (payload.details) {
    const first = Object.values(payload.details)[0];
    if (first) return first;
  }
  return payload.error;
}

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tSearch = useTranslations("search");
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: initial.firstName,
    lastName: initial.lastName,
    preferredLanguage: initial.preferredLanguage,
    preferredCurrency: initial.preferredCurrency,
    preferredAirlines: initial.preferredAirlines.join(", "),
    maxStops: initial.maxStops === null ? "" : String(initial.maxStops),
    preferredCabin: initial.preferredCabin ?? "",
    emailNotifications: initial.emailNotifications,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          preferredLanguage: form.preferredLanguage,
          preferredCurrency: form.preferredCurrency,
          preferredAirlines: form.preferredAirlines
            .split(",")
            .map((code) => code.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, 10),
          maxStops: form.maxStops === "" ? null : Number(form.maxStops),
          preferredCabin: form.preferredCabin || null,
          emailNotifications: form.emailNotifications,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        details?: Record<string, string>;
      };
      if (!response.ok) {
        setFeedback({
          kind: "error",
          message: errorMessage(payload) ?? tc("error"),
        });
        return;
      }
      setFeedback({ kind: "success", message: t("saved") });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: tc("error") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <Alert variant={feedback.kind === "success" ? "info" : "danger"}>
          {feedback.message}
        </Alert>
      ) : null}

      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card"
      >
        <h2 className="font-display text-base font-bold text-navy-900">{t("personalInfo")}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-first-name">{tc("firstName")}</Label>
            <Input
              id="profile-first-name"
              required
              minLength={2}
              maxLength={60}
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="profile-last-name">{tc("lastName")}</Label>
            <Input
              id="profile-last-name"
              required
              minLength={2}
              maxLength={60}
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="profile-email">{tc("email")}</Label>
            <Input id="profile-email" value={initial.email} disabled />
          </div>
          <div>
            <Label htmlFor="profile-language">{tc("language")}</Label>
            <Select
              id="profile-language"
              value={form.preferredLanguage}
              onChange={(event) =>
                setForm({
                  ...form,
                  preferredLanguage: event.target.value as ProfileInitial["preferredLanguage"],
                })
              }
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="profile-currency">{t("alertCurrency")}</Label>
            <Select
              id="profile-currency"
              value={form.preferredCurrency}
              onChange={(event) => setForm({ ...form, preferredCurrency: event.target.value })}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <h3 className="mt-6 font-display text-sm font-bold text-navy-900">{t("preferences")}</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="profile-airlines">{t("preferredAirlines")}</Label>
            <Input
              id="profile-airlines"
              value={form.preferredAirlines}
              onChange={(event) => setForm({ ...form, preferredAirlines: event.target.value })}
              placeholder="TU, AF"
            />
          </div>
          <div>
            <Label htmlFor="profile-stops">{t("maxStops")}</Label>
            <Input
              id="profile-stops"
              type="number"
              min="0"
              max="3"
              value={form.maxStops}
              onChange={(event) => setForm({ ...form, maxStops: event.target.value })}
              placeholder="1"
            />
          </div>
          <div>
            <Label htmlFor="profile-cabin">{t("preferredCabin")}</Label>
            <Select
              id="profile-cabin"
              value={form.preferredCabin}
              onChange={(event) => setForm({ ...form, preferredCabin: event.target.value })}
            >
              <option value="">{tc("none")}</option>
              <option value="ECONOMY">{tSearch("economy")}</option>
              <option value="PREMIUM_ECONOMY">{tSearch("premium")}</option>
              <option value="BUSINESS">{tSearch("business")}</option>
              <option value="FIRST">{tSearch("first")}</option>
            </Select>
          </div>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/40 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-sky-600"
            checked={form.emailNotifications}
            onChange={(event) =>
              setForm({ ...form, emailNotifications: event.target.checked })
            }
          />
          <span>
            <span className="block text-xs font-bold text-navy-800">
              {t("emailNotifications")}
            </span>
            <span className="mt-0.5 block text-[11px] text-navy-500">
              {t("emailNotificationsHint")}
            </span>
          </span>
        </label>

        <div className="mt-5">
          <Button type="submit" variant="accent" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {saving ? tc("saving") : t("saveChanges")}
          </Button>
        </div>
      </form>

      <PasswordForm />
    </div>
  );
}

function PasswordForm() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Feedback>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json()) as {
        error?: string;
        details?: Record<string, string>;
      };
      if (!response.ok) {
        setMessage({
          kind: "error",
          message: errorMessage(payload) ?? tc("error"),
        });
        return;
      }
      setMessage({ kind: "success", message: t("passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setMessage({ kind: "error", message: tc("error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card"
    >
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-900">
        <KeyRound className="h-4 w-4 text-sky-600" aria-hidden />
        {t("changePassword")}
      </h2>

      {message ? (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-xl border px-3 py-2 text-xs font-medium",
            message.kind === "success"
              ? "border-turquoise-200 bg-turquoise-50 text-turquoise-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message.message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="current-password">{t("currentPassword")}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="new-password">{t("newPassword")}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden />
          )}
          {t("changePassword")}
        </Button>
      </div>
    </form>
  );
}
