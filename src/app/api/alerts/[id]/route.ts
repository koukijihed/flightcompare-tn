import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { alertUpdateSchema } from "@/lib/validation/schemas";
import { requireUserApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const parsed = await readJson(request, alertUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const existing = await prisma.priceAlert.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== user.id) {
    return jsonError("Alerte introuvable.", 404, "NOT_FOUND");
  }

  const updated = await prisma.priceAlert.update({
    where: { id },
    data: {
      ...(parsed.data.enabled === undefined ? {} : { enabled: parsed.data.enabled }),
      ...(parsed.data.targetPrice === undefined
        ? {}
        : { targetPrice: parsed.data.targetPrice }),
      ...(parsed.data.currency === undefined ? {} : { currency: parsed.data.currency }),
      ...(parsed.data.departureDate === undefined
        ? {}
        : { departureDate: new Date(`${parsed.data.departureDate}T00:00:00.000Z`) }),
      ...(parsed.data.returnDate === undefined
        ? {}
        : {
            returnDate: parsed.data.returnDate
              ? new Date(`${parsed.data.returnDate}T00:00:00.000Z`)
              : null,
          }),
      // A new target re-arms notifications for the next observation.
      ...(parsed.data.targetPrice === undefined ? {} : { lastNotifiedPrice: null }),
    },
  });

  return jsonOk({ alert: { id: updated.id, enabled: updated.enabled } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const { id } = await params;
  const deleted = await prisma.priceAlert.deleteMany({
    where: { id, userId: user.id },
  });

  if (deleted.count === 0) return jsonError("Alerte introuvable.", 404, "NOT_FOUND");
  return jsonOk({ ok: true });
}
