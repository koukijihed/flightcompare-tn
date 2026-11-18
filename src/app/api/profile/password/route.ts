import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation/schemas";
import { requireUserApi } from "@/lib/api-auth";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const limit = checkRateLimit(rateLimitKey(request, "password-change", user.id), 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError("Trop de tentatives. Réessayez plus tard.", 429, "RATE_LIMITED");
  }

  const parsed = await readJson(request, changePasswordSchema);
  if (!parsed.ok) return parsed.response;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record || !(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return jsonError("Mot de passe actuel incorrect.", 401, "INVALID_PASSWORD");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
    },
  });

  return jsonOk({ ok: true });
}
