import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Canonical + hreflang links for one page. `path` is the locale-less pathname
 * (e.g. `/legal/terms`); every supported locale points at its own copy.
 */
export function localeAlternates(
  locale: string,
  path = "",
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: Object.fromEntries(
      routing.locales.map((code) => [code, `/${code}${path}`]),
    ),
  };
}
