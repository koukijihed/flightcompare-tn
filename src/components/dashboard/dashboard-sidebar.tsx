"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  BellRing,
  Heart,
  Inbox,
  LayoutDashboard,
  Search,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardSidebar({
  role,
  firstName,
  lastName,
  unread,
}: {
  role: "USER" | "ADMIN";
  firstName: string;
  lastName: string;
  unread: number;
}) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: t("overview"), icon: LayoutDashboard },
    { href: "/dashboard/searches", label: t("mySearches"), icon: Search },
    { href: "/dashboard/favorites", label: t("myFavorites"), icon: Heart },
    { href: "/dashboard/alerts", label: t("myAlerts"), icon: BellRing },
    { href: "/dashboard/notifications", label: t("notifications"), icon: Inbox, badge: unread },
    { href: "/dashboard/profile", label: t("profile"), icon: UserCog },
  ];

  return (
    <nav aria-label={t("title")} className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3 shadow-card">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
          {firstName.charAt(0)}
          {lastName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy-900">
            {firstName} {lastName}
          </p>
          <p className="text-[11px] text-navy-500">{t("title")}</p>
        </div>
      </div>

      <ul className="space-y-1 rounded-2xl border border-navy-100 bg-white p-2 shadow-card">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-navy-900 text-white"
                    : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                {"badge" in item && item.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      active ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        {role === "ADMIN" ? (
          <li>
            <Link
              href="/admin"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-turquoise-700 transition hover:bg-turquoise-50"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {tNav("admin")}
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
