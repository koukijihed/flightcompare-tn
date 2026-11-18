import { getTranslations, setRequestLocale } from "next-intl/server";
import prisma from "@/lib/prisma";
import { configuredProviderStatus } from "@/modules/providers/registry";
import {
  AdminProvidersTable,
  type AdminProviderRow,
} from "@/components/dashboard/admin-providers-table";
import { AdminMonitorButton } from "@/components/dashboard/admin-monitor-button";
import { daysAgo } from "@/lib/utils";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("admin");
  const since = daysAgo(1);

  const [providers, logs] = await Promise.all([
    prisma.flightProvider.findMany({ orderBy: { name: "asc" } }),
    prisma.apiRequestLog.findMany({
      where: { createdAt: { gte: since } },
      select: { providerId: true, success: true, durationMs: true },
    }),
  ]);

  const configured = configuredProviderStatus();

  const rows: AdminProviderRow[] = providers.map((provider) => {
    const providerLogs = logs.filter((log) => log.providerId === provider.id);
    const failures = providerLogs.filter((log) => !log.success).length;
    const status = configured.find((entry) => entry.type === provider.providerType);
    return {
      id: provider.id,
      name: provider.name,
      type: provider.providerType,
      enabled: provider.enabled,
      credentialsConfigured: status?.configured ?? false,
      mode: status?.mode ?? null,
      requests24h: providerLogs.length,
      errors24h: failures,
      errorRate:
        providerLogs.length === 0
          ? 0
          : Math.round((failures / providerLogs.length) * 1000) / 10,
      avgDurationMs:
        providerLogs.length === 0
          ? 0
          : Math.round(
              providerLogs.reduce((sum, log) => sum + log.durationMs, 0) /
                providerLogs.length,
            ),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">{t("providers")}</h2>
          <p className="text-sm text-navy-500">{t("configNotice")}</p>
        </div>
        <AdminMonitorButton />
      </div>

      <AdminProvidersTable providers={rows} />
    </div>
  );
}
