import prisma from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { config } from "@/lib/config";
import { configuredProviderStatus } from "@/modules/providers/registry";

export async function GET() {
  let database = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  return jsonOk({
    status: database === "up" ? "ok" : "degraded",
    database,
    demoMode: config.demoMode,
    aiConfigured: config.ai.configured,
    providers: configuredProviderStatus(),
    timestamp: new Date().toISOString(),
  });
}
