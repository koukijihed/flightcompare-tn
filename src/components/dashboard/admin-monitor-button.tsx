"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Feedback = { kind: "success" | "error"; message: string } | null;

export function AdminMonitorButton() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function run() {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/monitor", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        checked?: number;
        notified?: number;
      };
      if (!response.ok) {
        setFeedback({ kind: "error", message: payload.error ?? tc("error") });
        return;
      }
      setFeedback({
        kind: "success",
        message: t("monitorDone", {
          checked: payload.checked ?? 0,
          notified: payload.notified ?? 0,
        }),
      });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: tc("error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="accent" size="sm" onClick={() => void run()} disabled={busy}>
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        )}
        {busy ? t("monitorRunning") : t("monitorRun")}
      </Button>
      {feedback ? (
        <p
          role="status"
          className={cn(
            "text-[11px] font-medium",
            feedback.kind === "success" ? "text-turquoise-700" : "text-red-700",
          )}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
