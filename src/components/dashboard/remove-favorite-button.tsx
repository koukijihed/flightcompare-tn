"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { HeartOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RemoveFavoriteButton({ offerId }: { offerId: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/favorites/${offerId}`, { method: "DELETE" });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void remove()} disabled={busy}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <HeartOff className="h-3.5 w-3.5" aria-hidden />
      )}
      {t("removeFavorite")}
    </Button>
  );
}
