import prisma from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { requireAdminApi } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { user, response } = await requireAdminApi();
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { searches: true, priceAlerts: true, favorites: true } },
    },
  });

  return jsonOk({
    users: users.map((entry) => ({
      id: entry.id,
      firstName: entry.firstName,
      lastName: entry.lastName,
      email: entry.email,
      role: entry.role,
      isActive: entry.isActive,
      createdAt: entry.createdAt.toISOString(),
      lastLoginAt: entry.lastLoginAt?.toISOString() ?? null,
      counts: {
        searches: entry._count.searches,
        alerts: entry._count.priceAlerts,
        favorites: entry._count.favorites,
      },
    })),
  });
}
