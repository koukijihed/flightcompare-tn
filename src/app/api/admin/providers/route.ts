import prisma from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { requireAdminApi } from "@/lib/api-auth";
import { configuredProviderStatus } from "@/modules/providers/registry";

export async function GET() {
  const { user, response } = await requireAdminApi();
  if (!user) return response;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [providers, logs] = await Promise.all([
    prisma.flightProvider.findMany({ orderBy: { name: "asc" } }),
    prisma.apiRequestLog.findMany({
      where: { createdAt: { gte: since } },
      select: { providerId: true, success: true, durationMs: true },
    }),
  ]);

  const configured = configuredProviderStatus();

  return jsonOk({
    providers: providers.map((provider) => {
      const providerLogs = logs.filter((log) => log.providerId === provider.id);
      const failures = providerLogs.filter((log) => !log.success).length;
      return {
        id: provider.id,
        name: provider.name,
        type: provider.providerType,
        enabled: provider.enabled,
        configuration: provider.configuration,
        credentialsConfigured:
          configured.find((entry) => entry.type === provider.providerType)?.configured ?? false,
        mode: configured.find((entry) => entry.type === provider.providerType)?.mode ?? null,
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
                providerLogs.reduce((sum, log) => sum + log.durationMs, 0) / providerLogs.length,
              ),
      };
    }),
  });
}
