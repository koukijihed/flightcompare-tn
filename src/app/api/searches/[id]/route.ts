import prisma from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const { id } = await params;
  const deleted = await prisma.flightSearch.deleteMany({
    where: { id, userId: user.id },
  });

  if (deleted.count === 0) {
    return jsonError("Recherche introuvable.", 404, "NOT_FOUND");
  }

  return jsonOk({ ok: true });
}
