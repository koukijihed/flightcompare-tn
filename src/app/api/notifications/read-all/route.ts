import prisma from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const updated = await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return jsonOk({ updated: updated.count });
}
