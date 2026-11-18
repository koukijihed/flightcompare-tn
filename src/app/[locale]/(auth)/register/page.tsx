import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { RegisterForm } from "@/components/auth/register-form";
import type { Locale } from "@/i18n/messages";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("auth");

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-lifted md:p-8">
      <Logo className="mb-6" />
      <h1 className="font-display text-xl font-extrabold text-navy-900">{t("registerTitle")}</h1>
      <p className="mt-1 text-sm text-navy-500">{t("registerSubtitle")}</p>
      <div className="mt-5">
        <RegisterForm locale={locale} />
      </div>
    </div>
  );
}
