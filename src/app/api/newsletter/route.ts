import prisma from "@/lib/prisma";
import { jsonOk, readJson } from "@/lib/api";
import { newsletterSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "newsletter"), 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return jsonOk({ error: "Trop de demandes." }, { status: 429 });
  }

  const parsed = await readJson(request, newsletterSchema);
  if (!parsed.ok) return parsed.response;

  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email, locale: parsed.data.locale },
    update: { locale: parsed.data.locale },
  });

  return jsonOk({ ok: true }, { status: 201 });
}
