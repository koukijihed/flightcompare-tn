"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import type { ParsedSearchIntent } from "@/types/flight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export function AiSearchBox({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    intent: ParsedSearchIntent;
    searchUrl: string | null;
    source: string;
    error?: string;
  } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim().length < 5) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = (await response.json()) as {
        intent?: ParsedSearchIntent;
        searchUrl?: string | null;
        source?: string;
        error?: string;
      };
      if (!payload.intent) {
        setResult({
          intent: { missing: [], rawText: text },
          searchUrl: null,
          source: "rules",
          error: payload.error ?? t("unclear"),
        });
        return;
      }
      setResult({
        intent: payload.intent,
        searchUrl: payload.searchUrl ?? null,
        source: payload.source ?? "rules",
      });
    } catch {
      setResult({
        intent: { missing: [], rawText: text },
        searchUrl: null,
        source: "rules",
        error: t("unclear"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-navy-100 bg-white p-4"
          : "rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur"
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-turquoise-500/20 text-turquoise-200">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className={compact ? "text-sm font-bold text-navy-900" : "text-sm font-bold text-white"}>
            {t("title")}
          </p>
          <p className={compact ? "text-xs text-navy-500" : "text-xs text-white/70"}>
            {t("subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className={
            compact
              ? "h-11 flex-1 rounded-xl border border-navy-200 px-3 text-sm focus:border-sky-500 focus:outline-none"
              : "h-11 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
          }
        />
        <Button type="submit" variant="turquoise" disabled={busy} className="shrink-0">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Wand2 className="h-4 w-4" aria-hidden />
          )}
          {busy ? t("thinking") : t("send")}
        </Button>
      </form>

      {result ? (
        <div className="mt-3 rounded-xl bg-white p-3 text-navy-900 shadow-sm">
          {result.error ? (
            <p className="text-xs font-medium text-red-600">{result.error}</p>
          ) : (
            <>
              <p className="text-[11px] font-bold tracking-wide text-navy-500 uppercase">
                {t("detected")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {result.intent.origin && result.intent.destination ? (
                  <Badge variant="sky">
                    {result.intent.origin} → {result.intent.destination}
                  </Badge>
                ) : null}
                {result.intent.departureDate ? (
                  <Badge>{result.intent.departureDate}</Badge>
                ) : null}
                {result.intent.returnDate ? <Badge>{result.intent.returnDate}</Badge> : null}
                {result.intent.budget ? (
                  <Badge variant="success">
                    {formatMoney(result.intent.budget, result.intent.currency ?? "TND", locale)}
                  </Badge>
                ) : null}
                {result.intent.cabinClass ? (
                  <Badge>{result.intent.cabinClass}</Badge>
                ) : null}
                {result.intent.checkedBaggage ? (
                  <Badge variant="warning">{t("budget")} + bagage</Badge>
                ) : null}
              </div>

              {result.intent.missing.length > 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  {t("missing")} : {result.intent.missing.join(", ")}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] text-navy-400">
                  {result.source === "llm" ? t("llmNotice") : t("fallbackNotice")}
                </span>
                {result.searchUrl ? (
                  <Link href={result.searchUrl.replace(/^\/[a-z]{2}\//, "/")}>
                    <Button size="sm" variant="accent">
                      {t("parseCta")}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
