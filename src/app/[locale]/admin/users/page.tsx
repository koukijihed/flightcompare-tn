import { getTranslations, setRequestLocale } from "next-intl/server";
import prisma from "@/lib/prisma";
import {
  AdminUsersTable,
  type AdminUserRow,
} from "@/components/dashboard/admin-users-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale as Locale);

  const query = (q ?? "").trim();
  const [t, tc, users] = await Promise.all([
    getTranslations("admin"),
    getTranslations("common"),
    prisma.user.findMany({
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
    }),
  ]);

  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    counts: {
      searches: user._count.searches,
      alerts: user._count.priceAlerts,
      favorites: user._count.favorites,
    },
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">{t("users")}</h2>
          <p className="text-sm text-navy-500">{t("searchUsers")}</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <Input
            name="q"
            defaultValue={query}
            placeholder={t("searchUsers")}
            className="h-9 w-56 text-xs"
            aria-label={t("searchUsers")}
          />
          <Button type="submit" variant="outline" size="sm">
            {tc("search")}
          </Button>
        </form>
      </div>

      <AdminUsersTable users={rows} />
    </div>
  );
}
