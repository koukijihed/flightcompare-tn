import { jsonError, jsonOk, safeErrorMessage } from "@/lib/api";
import { requireAdminApi } from "@/lib/api-auth";
import { runPriceMonitoring } from "@/services/price-monitoring/monitor";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireAdminApi();
  if (!user) return response;

  const limit = checkRateLimit(`monitor:${clientIp(request)}`, 3, 10 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError(
      "Une vérification a déjà été lancée récemment. Réessayez plus tard.",
      429,
      "RATE_LIMITED",
    );
  }

  try {
    const result = await runPriceMonitoring();
    return jsonOk(result);
  } catch (error) {
    return jsonError(
      safeErrorMessage(error, "La vérification des alertes a échoué."),
      500,
      "MONITOR_FAILED",
    );
  }
}
