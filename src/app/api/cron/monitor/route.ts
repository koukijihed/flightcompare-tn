import { timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { jsonError, jsonOk } from "@/lib/api";
import { runPriceMonitoring } from "@/services/price-monitoring/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function authorized(request: Request): boolean {
  if (!config.cronSecret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const explicit = request.headers.get("x-cron-secret") ?? "";
  return (
    (bearer.length > 0 && safeEqual(bearer, config.cronSecret)) ||
    (explicit.length > 0 && safeEqual(explicit, config.cronSecret))
  );
}

async function run(request: Request) {
  if (!config.cronSecret) {
    return jsonError(
      "CRON_SECRET n'est pas configuré : le monitoring planifié est désactivé.",
      503,
      "CRON_NOT_CONFIGURED",
    );
  }
  if (!authorized(request)) {
    return jsonError("Non autorisé.", 401, "UNAUTHORIZED");
  }

  try {
    const result = await runPriceMonitoring();
    return jsonOk(result);
  } catch (error) {
    console.error("[cron/monitor] failed", error);
    return jsonError(
      "Le monitoring des alertes a échoué.",
      500,
      "MONITOR_FAILED",
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
