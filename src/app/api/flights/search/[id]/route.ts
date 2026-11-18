import { jsonError, jsonOk } from "@/lib/api";
import { loadSearchForDisplay } from "@/modules/flights/search-service";
import { getCurrentUser } from "@/modules/auth/session";
import { getDisplayCurrency } from "@/modules/currency/cookies";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const search = await prisma.flightSearch.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!search) return jsonError("Recherche introuvable.", 404, "NOT_FOUND");

  if (search.userId) {
    const user = await getCurrentUser();
    if (!user || (user.id !== search.userId && user.role !== "ADMIN")) {
      return jsonError("Accès refusé à cette recherche.", 403, "FORBIDDEN");
    }
  }

  const result = await loadSearchForDisplay(id, await getDisplayCurrency());
  if (!result) return jsonError("Recherche introuvable.", 404, "NOT_FOUND");

  return jsonOk(result);
}
