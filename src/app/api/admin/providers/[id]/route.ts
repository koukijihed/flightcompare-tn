import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { providerUpdateSchema } from "@/lib/validation/schemas";
import { requireAdminApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";
import { clientIp } from "@/lib/security/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireAdminApi();
  if (!user) return response;

  const parsed = await readJson(request, providerUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const provider = await prisma.flightProvider.findUnique({ where: { id } });
  if (!provider) return jsonError("Fournisseur introuvable.", 404, "NOT_FOUND");

  const updated = await prisma.flightProvider.update({
    where: { id },
    data: { enabled: parsed.data.enabled },
    select: { id: true, name: true, enabled: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PROVIDER_UPDATED",
      entity: "FlightProvider",
      entityId: id,
      metadata: { enabled: parsed.data.enabled },
      ip: clientIp(request),
    },
  });

  return jsonOk({ provider: updated });
}
