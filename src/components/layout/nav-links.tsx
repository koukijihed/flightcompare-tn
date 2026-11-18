"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";

export function NavLinks({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/search", label: t("search") },
    { href: "/alerts", label: t("alerts") },
    { href: "/#how-it-works", label: t("howItWorks") },
    ...(loggedIn ? [{ href: "/dashboard", label: t("dashboard") }] : []),
  ];

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-navy-600 transition hover:bg-navy-50 hover:text-navy-900",
              pathname === item.href && "bg-navy-50 text-navy-900",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-navy-200 text-navy-700 lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? t("home") : t("search")}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full border-b border-navy-100 bg-white p-4 shadow-card lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-navy-100 pt-3">
            <LocaleSwitcher />
          </div>
        </div>
      ) : null}
    </>
  );
}
