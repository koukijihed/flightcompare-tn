import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { messages, type Locale } from "@/i18n/messages";
import { config } from "@/lib/config";
import { SiteHeader } from "@/components/layout/site-header";
import "@/app/globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(config.appUrl),
    title: { default: t("title"), template: "%s · FlightCompare TN" },
    description: t("description"),
    applicationName: "FlightCompare TN",
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
      ],
      apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
    openGraph: {
      type: "website",
      siteName: "FlightCompare TN",
      title: t("title"),
      description: t("description"),
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale as Locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-[#f7f9fc]">
        <NextIntlClientProvider
          locale={locale}
          messages={messages[locale as Locale]}
          timeZone="Africa/Tunis"
        >
          <SiteHeader />
          <main className="flex-1">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export const dynamic = "force-dynamic";
