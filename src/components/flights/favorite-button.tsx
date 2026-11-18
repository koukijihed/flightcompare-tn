"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  offerId,
  initialSaved,
  canSave,
  redirectTo,
}: {
  offerId: string;
  initialSaved: boolean;
  canSave: boolean;
  redirectTo: string;
}) {
  const t = useTranslations("flight");
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (!canSave) {
      router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = saved
        ? await fetch(`/api/favorites/${offerId}`, { method: "DELETE" })
        : await fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ offerId }),
          });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? t("notFound"));
        return;
      }
      setSaved(!saved);
      router.refresh();
    } catch {
      setError(t("notFound"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button
        variant="outline"
        onClick={() => void toggle()}
        disabled={busy}
        className={cn("w-full", saved && "border-red-200 bg-red-50 text-red-700")}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Heart className={cn("h-4 w-4", saved && "fill-current")} aria-hidden />
        )}
        {saved ? t("savedFavorite") : t("saveFavorite")}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
      {!canSave ? (
        <p className="mt-1 text-[11px] text-navy-400">{t("loginToSave")}</p>
      ) : null}
    </div>
  );
}
