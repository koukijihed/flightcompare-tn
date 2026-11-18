import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { alertSchema } from "@/lib/validation/schemas";
import { requireUserApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";

export async function GET() {
  const { user, response } = await requireUserApi();
  if (!user) return response;

  const alerts = await prisma.priceAlert.findMany({
    where: { userId: user.id },
    include: { originAirport: true, destinationAirport: true },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    alerts: alerts.map((alert) => ({
      id: alert.id,
      origin: alert.originAirport.iataCode,
      originCity: alert.originAirport.city,
      destination: alert.destinationAirport.iataCode,
      destinationCity: alert.destinationAirport.city,
      departureDate: alert.departureDate.toISOString().slice(0, 10),
      returnDate: alert.returnDate?.toISOString().slice(0, 10) ?? null,
      targetPrice: Number(alert.targetPrice),
      currency: alert.currency,
      enabled: alert.enabled,
      lastCheckedAt: alert.lastCheckedAt?.toISOString() ?? null,
      lastObservedPrice:
        alert.lastObservedPrice === null ? null : Number(alert.lastObservedPrice),
      createdAt: alert.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const limit = checkRateLimit(rateLimitKey(request, "alert-create", user.id), 15, 10 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError("Trop de créations d'alerte. Réessayez plus tard.", 429, "RATE_LIMITED");
  }

  const parsed = await readJson(request, alertSchema);
  if (!parsed.ok) return parsed.response;

  const [origin, destination] = await Promise.all([
    prisma.airport.findUnique({ where: { iataCode: parsed.data.origin } }),
    prisma.airport.findUnique({ where: { iataCode: parsed.data.destination } }),
  ]);

  if (!origin || !destination) {
    return jsonError("Aéroport d'origine ou de destination inconnu.", 422, "UNKNOWN_AIRPORT");
  }
  if (origin.id === destination.id) {
    return jsonError("Les deux aéroports doivent être différents.", 422, "SAME_AIRPORT");
  }

  const alert = await prisma.priceAlert.create({
    data: {
      userId: user.id,
      originAirportId: origin.id,
      destinationAirportId: destination.id,
      departureDate: new Date(`${parsed.data.departureDate}T00:00:00.000Z`),
      returnDate: parsed.data.returnDate
        ? new Date(`${parsed.data.returnDate}T00:00:00.000Z`)
        : null,
      targetPrice: parsed.data.targetPrice,
      currency: parsed.data.currency,
      enabled: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "ALERT_CREATED",
      entity: "PriceAlert",
      entityId: alert.id,
      metadata: {
        route: `${parsed.data.origin}-${parsed.data.destination}`,
        targetPrice: parsed.data.targetPrice,
        currency: parsed.data.currency,
      },
    },
  });

  return jsonOk({ alert: { id: alert.id } }, { status: 201 });
}
