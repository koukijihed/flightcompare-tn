"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { BarChart3, LayoutDashboard, Server, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", labelKey: "overview", icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "users", icon: Users },
  { href: "/admin/providers", labelKey: "providers", icon: Server },
] as const;

export function AdminNav() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("title")}
      className="flex flex-wrap items-center gap-1 rounded-2xl border border-navy-100 bg-white p-1.5 shadow-card"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition",
              active
                ? "bg-navy-900 text-white"
                : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
            )}
          >
            <item.icon className="h-3.5 w-3.5" aria-hidden />
            {t(item.labelKey)}
          </Link>
        );
      })}
      <span className="ms-auto hidden items-center gap-1 pe-2 text-[11px] text-navy-400 sm:inline-flex">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden />
        {t("analyticsNote")}
      </span>
    </nav>
  );
}
