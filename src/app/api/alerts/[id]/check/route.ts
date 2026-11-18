import prisma from "@/lib/prisma";
import { jsonError, jsonOk, safeErrorMessage } from "@/lib/api";
import { requireUserApi } from "@/lib/api-auth";
import { runPriceMonitoring } from "@/services/price-monitoring/monitor";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const limit = checkRateLimit(rateLimitKey(request, "alert-check", user.id), 6, 5 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError(
      "Trop de vérifications. Réessayez dans quelques minutes.",
      429,
      "RATE_LIMITED",
    );
  }

  const { id } = await params;
  const alert = await prisma.priceAlert.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!alert || alert.userId !== user.id) {
    return jsonError("Alerte introuvable.", 404, "NOT_FOUND");
  }

  try {
    const result = await runPriceMonitoring({ alertId: id, maxAlerts: 1 });
    const refreshed = await prisma.priceAlert.findUniqueOrThrow({
      where: { id },
      select: { lastObservedPrice: true, lastCheckedAt: true, currency: true },
    });

    return jsonOk({
      observedPrice:
        refreshed.lastObservedPrice === null ? null : Number(refreshed.lastObservedPrice),
      currency: refreshed.currency,
      lastCheckedAt: refreshed.lastCheckedAt?.toISOString() ?? null,
      notified: result.notified,
      errors: result.errors,
    });
  } catch (error) {
    return jsonError(
      safeErrorMessage(error, "La vérification du prix a échoué."),
      502,
      "CHECK_FAILED",
    );
  }
}
