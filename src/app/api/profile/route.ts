import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { updateProfileSchema } from "@/lib/validation/schemas";
import { requireUserApi } from "@/lib/api-auth";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";
import { clientIp } from "@/lib/security/rate-limit";

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const parsed = await readJson(request, updateProfileSchema);
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      preferredLanguage: data.preferredLanguage,
      preferredCurrency: data.preferredCurrency,
      preferences: {
        upsert: {
          create: {
            preferredAirlines: data.preferredAirlines ?? [],
            maxStops: data.maxStops ?? null,
            preferredCabin: data.preferredCabin ?? null,
            emailNotifications: data.emailNotifications ?? true,
          },
          update: {
            ...(data.preferredAirlines === undefined
              ? {}
              : { preferredAirlines: data.preferredAirlines }),
            ...(data.maxStops === undefined ? {} : { maxStops: data.maxStops }),
            ...(data.preferredCabin === undefined
              ? {}
              : { preferredCabin: data.preferredCabin }),
            ...(data.emailNotifications === undefined
              ? {}
              : { emailNotifications: data.emailNotifications }),
          },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      preferredLanguage: true,
      preferredCurrency: true,
      preferences: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PROFILE_UPDATED",
      entity: "User",
      entityId: user.id,
      ip: clientIp(request),
    },
  });

  const cookieCurrency = data.preferredCurrency;
  if (!cookieCurrency) {
    return jsonError("Devise invalide.", 422, "INVALID_CURRENCY");
  }

  return jsonOk({ user: updated });
}
