"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("errors.password"));
      return;
    }
    if (!token) {
      setError(tc("error"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? tc("error"));
        return;
      }
      setDone(true);
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-turquoise-50 p-3 text-xs font-medium text-turquoise-800">
          {t("resetSuccess")}
        </p>
        <Link href="/login" className="block text-center">
          <Button variant="accent" className="w-full">
            {t("loginCta")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!token ? (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          {tc("error")} — {t("forgotPassword")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div>
        <Label htmlFor="new-password">{t("resetTitle")}</Label>
        <Input
          id="new-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="mt-1 text-[11px] text-navy-400">{t("passwordHint")}</p>
      </div>

      <div>
        <Label htmlFor="confirm-password">{tc("confirm")}</Label>
        <Input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>

      <Button type="submit" variant="accent" className="w-full" disabled={busy || !token}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {t("resetCta")}
      </Button>
    </form>
  );
}
