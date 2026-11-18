import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BellRing, Info, Target, CalendarRange, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/session";
import { Alert, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { localeAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/messages";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "alerts" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: localeAlternates(locale, "/alerts"),
  };
}

export default async function AlertsMarketingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, user] = await Promise.all([getTranslations("alerts"), getCurrentUser()]);

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <Badge variant="success">
          <BellRing className="h-3 w-3" aria-hidden />
          {t("title")}
        </Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-navy-900">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-600">{t("subtitle")}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarRange, text: t("step1") },
            { icon: Target, text: t("step2") },
            { icon: BellRing, text: t("step3") },
          ].map((step, index) => (
            <div
              key={step.text}
              className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <step.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="font-display text-sm font-bold text-navy-900">
                  {index + 1}
                </span>
              </div>
              <p className="mt-3 text-sm text-navy-600">{step.text}</p>
            </div>
          ))}
        </div>

        <Alert variant="info" title={t("howItWorks")} className="mt-6">
          <p className="flex items-start gap-2 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("limitation")}
          </p>
        </Alert>

        <div className="mt-8 rounded-2xl border border-navy-100 bg-white p-6 shadow-card">
          <p className="text-sm text-navy-600">
            {user ? t("subtitle") : t("loginPrompt")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={user ? "/dashboard/alerts" : "/login?next=/dashboard/alerts"}>
              <Button variant="accent">
                {user ? t("create") : t("loginPrompt")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="outline">{t("step1")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
