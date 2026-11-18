"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteSearchButton({ searchId }: { searchId: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/searches/${searchId}`, { method: "DELETE" });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void remove()}
      disabled={busy}
      className="text-red-600 hover:bg-red-50"
      aria-label={t("deleteSearch")}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
      {tc("delete")}
    </Button>
  );
}
