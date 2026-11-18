"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markAll() {
    setBusy(true);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void markAll()} disabled={busy}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <CheckCheck className="h-3.5 w-3.5" aria-hidden />
      )}
      {t("markAllRead")}
    </Button>
  );
}
