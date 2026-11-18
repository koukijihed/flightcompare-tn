import { jsonError, jsonOk, readJson, safeErrorMessage } from "@/lib/api";
import { searchSchema } from "@/lib/validation/schemas";
import { performFlightSearch } from "@/modules/flights/search-service";
import { getCurrentUser } from "@/modules/auth/session";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "flight-search"), 20, 60 * 1000);
  if (!limit.allowed) {
    return jsonError(
      `Trop de recherches. Réessayez dans ${limit.retryAfterSeconds} secondes.`,
      429,
      "RATE_LIMITED",
    );
  }

  const parsed = await readJson(request, searchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await getCurrentUser();
    const result = await performFlightSearch(parsed.data, {
      userId: user?.id ?? null,
      displayCurrency: parsed.data.currency,
      userIp: clientIp(request),
    });
    return jsonOk(result, { status: 201 });
  } catch (error) {
    console.error("[flight-search] failed", error);
    return jsonError(
      safeErrorMessage(error, "La recherche a échoué. Veuillez réessayer."),
      502,
      "SEARCH_FAILED",
    );
  }
}
