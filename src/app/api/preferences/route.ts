import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { jsonOk, readJson } from "@/lib/api";
import { CURRENCY_COOKIE, getDisplayCurrency } from "@/modules/currency/cookies";
import { getCurrentUser } from "@/modules/auth/session";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

const schema = z.object({
  currency: z.enum(["TND", "EUR", "USD", "GBP", "AED", "SAR", "CAD", "CHF"]),
});

export async function GET() {
  return jsonOk({ currency: await getDisplayCurrency() });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const parsed = await readJson(request, schema);
  if (!parsed.ok) return parsed.response;

  const store = await cookies();
  store.set(CURRENCY_COOKIE, parsed.data.currency, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  const user = await getCurrentUser();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { preferredCurrency: parsed.data.currency },
    });
  }

  return jsonOk({ currency: parsed.data.currency });
}
