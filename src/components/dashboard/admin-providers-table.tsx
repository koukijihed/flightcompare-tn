"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type AdminProviderRow = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  credentialsConfigured: boolean;
  mode: string | null;
  requests24h: number;
  errors24h: number;
  errorRate: number;
  avgDurationMs: number;
};

export function AdminProvidersTable({ providers }: { providers: AdminProviderRow[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(provider: AdminProviderRow) {
    setBusyId(provider.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !provider.enabled }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? tc("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(tc("error"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white shadow-card">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-navy-500 uppercase">
              <th className="p-3 text-start font-semibold">{t("name")}</th>
              <th className="p-3 text-start font-semibold">{t("status")}</th>
              <th className="p-3 text-start font-semibold">{t("requests")}</th>
              <th className="p-3 text-start font-semibold">{t("errorRate")}</th>
              <th className="p-3 text-start font-semibold">{t("avgDuration")}</th>
              <th className="p-3 text-start font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => {
              const busy = busyId === provider.id;
              return (
                <tr key={provider.id} className="border-t border-navy-100 align-middle">
                  <td className="p-3">
                    <p className="font-semibold text-navy-900">{provider.name}</p>
                    <p className="text-[11px] text-navy-400">
                      {provider.type}
                      {provider.mode ? ` · ${provider.mode}` : ""}
                      {provider.credentialsConfigured ? "" : ` · ${t("configNotice")}`}
                    </p>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={provider.enabled ? "success" : "outline"}>
                        {provider.enabled ? t("enabled") : t("disabled")}
                      </Badge>
                      <Badge variant={provider.credentialsConfigured ? "sky" : "warning"}>
                        {provider.credentialsConfigured ? "configured" : "not configured"}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-navy-600">{provider.requests24h}</td>
                  <td className="p-3 text-xs text-navy-600">
                    {provider.errorRate}%{" "}
                    <span className="text-navy-400">({provider.errors24h})</span>
                  </td>
                  <td className="p-3 text-xs text-navy-600">{provider.avgDurationMs} ms</td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void toggle(provider)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Power className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {provider.enabled ? t("deactivate") : t("activate")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-navy-400">{t("configNotice")}</p>
    </div>
  );
}
