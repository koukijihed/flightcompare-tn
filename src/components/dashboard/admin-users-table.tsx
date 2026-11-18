"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn, formatDate, intlLocale } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  counts: { searches: number; alerts: number; favorites: number };
};

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intl = intlLocale(locale);

  async function patch(user: AdminUserRow, body: { role?: string; isActive?: boolean }) {
    setBusyId(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? tc("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(tc("error"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white shadow-card">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-start text-[11px] tracking-wide text-navy-500 uppercase">
              <th className="p-3 text-start font-semibold">{t("name")}</th>
              <th className="p-3 text-start font-semibold">{tc("email")}</th>
              <th className="p-3 text-start font-semibold">{t("role")}</th>
              <th className="p-3 text-start font-semibold">{t("status")}</th>
              <th className="p-3 text-start font-semibold">{t("created")}</th>
              <th className="p-3 text-start font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const busy = busyId === user.id;
              return (
                <tr key={user.id} className="border-t border-navy-100 align-top">
                  <td className="p-3">
                    <p className="font-semibold text-navy-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-navy-400">
                      {user.counts.searches} · {user.counts.favorites} · {user.counts.alerts}
                    </p>
                  </td>
                  <td className="p-3 text-xs text-navy-600">{user.email}</td>
                  <td className="p-3">
                    <Select
                      aria-label={t("role")}
                      value={user.role}
                      disabled={busy}
                      onChange={(event) =>
                        void patch(user, {
                          role: event.target.value as AdminUserRow["role"],
                        })
                      }
                      className="h-9 min-w-28 text-xs"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Badge variant={user.isActive ? "success" : "danger"}>
                      {user.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-navy-500">
                    {formatDate(user.createdAt, intl)}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void patch(user, { isActive: !user.isActive })}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : null}
                      {user.isActive ? t("deactivate") : t("activate")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={cn("text-[11px] text-navy-400", users.length === 0 && "text-center")}>
        {users.length === 0 ? t("noData") : t("configNotice")}
      </p>
    </div>
  );
}
