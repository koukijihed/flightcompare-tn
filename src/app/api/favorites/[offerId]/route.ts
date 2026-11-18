import prisma from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> },
) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const { offerId } = await params;

  const deleted = await prisma.favorite.deleteMany({
    where: { userId: user.id, flightOfferId: offerId },
  });

  if (deleted.count === 0) {
    return jsonError("Favori introuvable.", 404, "NOT_FOUND");
  }

  return jsonOk({ ok: true });
}
