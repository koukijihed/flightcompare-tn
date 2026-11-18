import "server-only";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";
import { amadeusProvider } from "./amadeus";
import { demoProvider } from "./demo";
import { skyscannerProvider } from "./skyscanner";
import { travelpayoutsProvider } from "./travelpayouts";
import type { FlightProviderAdapter } from "./types";

export const ADAPTERS: Record<string, FlightProviderAdapter> = {
  amadeus: amadeusProvider,
  demo: demoProvider,
  skyscanner: skyscannerProvider,
  travelpayouts: travelpayoutsProvider,
};

export type ResolvedAdapter = {
  providerId: string;
  adapter: FlightProviderAdapter;
};

/**
 * Adapters that may run for a search:
 *  - provider row must be enabled (admin controlled),
 *  - live adapters must be configured via environment variables,
 *  - demo only runs when DEMO_MODE is explicitly enabled.
 *
 * There is deliberately no automatic demo fallback: a production deployment
 * without credentials returns an explicit "no provider configured" warning
 * instead of fabricated offers.
 */
export async function resolveActiveAdapters(): Promise<ResolvedAdapter[]> {
  const rows = await prisma.flightProvider.findMany({ orderBy: { name: "asc" } });
  const resolved: ResolvedAdapter[] = [];

  for (const row of rows) {
    const adapter = ADAPTERS[row.providerType];
    if (!adapter) continue;

    // Demo availability is driven exclusively by the environment switch: it is
    // an opt-in development aid, never a production fallback.
    if (adapter.type === "demo") {
      if (config.demoMode) resolved.push({ providerId: row.id, adapter });
      continue;
    }

    if (!row.enabled) continue;
    if (adapter.isConfigured()) {
      resolved.push({ providerId: row.id, adapter });
    }
  }

  return resolved;
}

export async function providerIdByType(type: string): Promise<string | null> {
  const row = await prisma.flightProvider.findFirst({
    where: { providerType: type },
    select: { id: true },
  });
  return row?.id ?? null;
}

export function configuredProviderStatus() {
  return [
    {
      type: "travelpayouts",
      name: "Travelpayouts (Aviasales)",
      configured: config.travelpayouts.searchConfigured,
      mode: config.travelpayouts.searchConfigured
        ? "affiliate-search"
        : config.travelpayouts.configured
          ? "data-only"
          : "not-configured",
    },
    {
      type: "amadeus",
      name: "Amadeus",
      configured: config.amadeus.configured,
      mode: config.amadeus.baseUrl.includes("test.api.amadeus.com") ? "sandbox" : "production",
    },
    {
      type: "skyscanner",
      name: "Skyscanner",
      configured: config.skyscanner.configured,
      mode: config.skyscanner.configured ? "partner" : "not-configured",
    },
    {
      type: "demo",
      name: "Demo Provider",
      configured: config.demoMode,
      mode: config.demoMode ? "demo" : "disabled",
    },
  ];
}
