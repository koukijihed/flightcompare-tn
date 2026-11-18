import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/modules/auth/password";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "reset"), 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError("Trop de tentatives. Réessayez plus tard.", 429, "RATE_LIMITED");
  }

  const parsed = await readJson(request, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    include: { user: { select: { id: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return jsonError(
      "Ce lien de réinitialisation est invalide ou expiré.",
      400,
      "INVALID_TOKEN",
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: record.userId,
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: record.userId,
      },
    }),
  ]);

  return jsonOk({ ok: true });
}
