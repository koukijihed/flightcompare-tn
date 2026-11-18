import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { loginSchema } from "@/lib/validation/schemas";
import { verifyPassword } from "@/modules/auth/password";
import { createSession } from "@/modules/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "login"), 10, 5 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError(
      `Trop de tentatives. Réessayez dans ${limit.retryAfterSeconds} secondes.`,
      429,
      "RATE_LIMITED",
    );
  }

  const parsed = await readJson(request, loginSchema);
  if (!parsed.ok) return parsed.response;

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Uniform error message to avoid account enumeration.
  const invalid = jsonError("E-mail ou mot de passe incorrect.", 401, "INVALID_CREDENTIALS");
  if (!user) {
    await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi");
    return invalid;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;
  if (!user.isActive) {
    return jsonError("Ce compte est désactivé.", 403, "ACCOUNT_DISABLED");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(user.id);

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
}
