import prisma from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const { id } = await params;
  const updated = await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });

  if (updated.count === 0) {
    return jsonError("Notification introuvable.", 404, "NOT_FOUND");
  }
  return jsonOk({ ok: true });
}
