"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/messages";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = { fr: "FR", en: "EN", ar: "AR" };

export function LocaleSwitcher({ inverted = false }: { inverted?: boolean }) {
  const active = useLocale() as Locale;
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border p-0.5",
        inverted ? "border-white/20 bg-white/10" : "border-navy-200 bg-white",
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === active ? "true" : undefined}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
            locale === active
              ? inverted
                ? "bg-white text-navy-900"
                : "bg-navy-900 text-white"
              : inverted
                ? "text-white/75 hover:text-white"
                : "text-navy-500 hover:text-navy-900",
          )}
        >
          {LABELS[locale]}
        </Link>
      ))}
    </div>
  );
}
