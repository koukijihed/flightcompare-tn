"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        message?: string;
        resetUrl?: string;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? tc("error"));
        return;
      }
      setMessage(payload.message ?? t("resetSent"));
      setResetUrl(payload.resetUrl ?? null);
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  if (message) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-turquoise-50 p-3 text-xs font-medium text-turquoise-800">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {message}
        </p>
        {resetUrl ? (
          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
            <p className="text-[11px] text-amber-800">{t("resetLinkNotice")}</p>
            <Link
              href={resetUrl}
              className="mt-1 inline-block text-xs font-semibold text-sky-700 underline"
            >
              {t("openResetLink")}
            </Link>
          </div>
        ) : null}
        <Link href="/login" className="block text-center text-xs font-semibold text-sky-700 hover:underline">
          {t("loginCta")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="email">{tc("email")}</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <Button type="submit" variant="accent" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {t("sendReset")}
      </Button>
      <Link href="/login" className="block text-center text-xs font-semibold text-sky-700 hover:underline">
        {t("loginCta")}
      </Link>
    </form>
  );
}
