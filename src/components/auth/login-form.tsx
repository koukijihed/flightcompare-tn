"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function safeNext(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? t("invalidCredentials"));
        return;
      }
      router.push(safeNext(next));
      router.refresh();
    } catch {
      setError(tc("error", { defaultValue: "Erreur" }));
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

      <div>
        <Label htmlFor="email">{tc("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="vous@exemple.tn"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{tc("password")}</Label>
          <Link href="/forgot-password" className="mb-1.5 text-[11px] font-semibold text-sky-700 hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pe-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-navy-400 hover:text-navy-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" variant="accent" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {t("loginCta")}
      </Button>

      <p className="text-center text-xs text-navy-500">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-sky-700 hover:underline">
          {t("registerCta")}
        </Link>
      </p>
    </form>
  );
}
