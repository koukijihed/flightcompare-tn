import { z } from "zod";
import prisma from "@/lib/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/api-auth";
import { getRateSnapshot } from "@/modules/currency/service";
import { getDisplayCurrency } from "@/modules/currency/cookies";
import { offerInclude, toOfferDTO } from "@/modules/flights/mapper";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

const createSchema = z.object({ offerId: z.string().min(5).max(60) });

export async function GET() {
  const { user, response } = await requireUserApi();
  if (!user) return response;

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { flightOffer: { include: offerInclude } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const rates = (await getRateSnapshot()).rates;
  const currency = await getDisplayCurrency();

  return jsonOk({
    favorites: favorites.map((favorite) => ({
      id: favorite.id,
      createdAt: favorite.createdAt.toISOString(),
      offer: toOfferDTO(favorite.flightOffer, rates, currency),
    })),
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const { user, response } = await requireUserApi();
  if (!user) return response;

  const parsed = await readJson(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const offer = await prisma.flightOffer.findUnique({
    where: { id: parsed.data.offerId },
    select: { id: true },
  });
  if (!offer) return jsonError("Offre introuvable.", 404, "NOT_FOUND");

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_flightOfferId: { userId: user.id, flightOfferId: offer.id },
    },
    create: { userId: user.id, flightOfferId: offer.id },
    update: {},
  });

  return jsonOk({ favorite: { id: favorite.id } }, { status: 201 });
}
