import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { registerSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/modules/auth/password";
import { createSession } from "@/modules/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "register"), 8, 10 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError(
      "Trop de tentatives. Réessayez dans quelques minutes.",
      429,
      "RATE_LIMITED",
    );
  }

  const parsed = await readJson(request, registerSchema);
  if (!parsed.ok) return parsed.response;

  const { firstName, lastName, email, password, preferredLanguage, preferredCurrency } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return jsonError("Un compte existe déjà pour cette adresse e-mail.", 409, "EMAIL_TAKEN");
  }

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash: await hashPassword(password),
      preferredLanguage,
      preferredCurrency,
      preferences: { create: {} },
      notifications: {
        create: {
          title: "Bienvenue sur FlightCompare TN",
          message:
            "Comparez les vols, enregistrez vos favoris et créez des alertes de prix depuis votre espace personnel.",
          type: "SYSTEM",
        },
      },
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  await createSession(user.id);

  return jsonOk({ user }, { status: 201 });
}
