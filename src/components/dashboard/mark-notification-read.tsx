"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarkNotificationRead({ id }: { id: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function markRead() {
    setBusy(true);
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (response.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void markRead()}
      disabled={busy}
      className="shrink-0 text-[11px]"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Check className="h-3 w-3" aria-hidden />
      )}
      {t("markRead")}
    </Button>
  );
}
