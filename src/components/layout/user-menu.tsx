"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function UserMenu({
  firstName,
  lastName,
  role,
}: {
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN";
}) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-navy-200 bg-white py-1 ps-1 pe-2.5 transition hover:border-navy-300"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-24 truncate text-xs font-semibold text-navy-800 sm:inline">
          {firstName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-navy-400" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-navy-100 bg-white p-1.5 shadow-lifted"
        >
          <Link
            href="/dashboard"
            role="menuitem"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            {t("dashboard")}
          </Link>
          <Link
            href="/dashboard/profile"
            role="menuitem"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" aria-hidden />
            {t("account")}
          </Link>
          {role === "ADMIN" ? (
            <Link
              href="/admin"
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
              onClick={() => setOpen(false)}
            >
              <Shield className="h-4 w-4" aria-hidden />
              {t("admin")}
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => void logout()}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50",
              busy && "opacity-60",
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {busy ? tCommon("loading") : t("logout")}
          </button>
          <p className="sr-only">{locale}</p>
        </div>
      ) : null}
    </div>
  );
}
