import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { adminUserUpdateSchema } from "@/lib/validation/schemas";
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

  const parsed = await readJson(request, adminUserUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;

  if (id === user.id && parsed.data.isActive === false) {
    return jsonError("Vous ne pouvez pas désactiver votre propre compte.", 400, "SELF_DISABLE");
  }
  if (id === user.id && parsed.data.role === "USER") {
    return jsonError("Vous ne pouvez pas retirer votre propre rôle admin.", 400, "SELF_DEMOTE");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return jsonError("Utilisateur introuvable.", 404, "NOT_FOUND");

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.data.role ? { role: parsed.data.role } : {}),
      ...(parsed.data.isActive === undefined ? {} : { isActive: parsed.data.isActive }),
    },
    select: { id: true, role: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "USER_UPDATED",
      entity: "User",
      entityId: id,
      metadata: parsed.data,
      ip: clientIp(request),
    },
  });

  return jsonOk({ user: updated });
}
