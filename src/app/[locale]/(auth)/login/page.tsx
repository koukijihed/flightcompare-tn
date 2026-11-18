import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/auth/login-form";
import type { Locale } from "@/i18n/messages";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { next } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-lifted md:p-8">
      <Logo className="mb-6" />
      <h1 className="font-display text-xl font-extrabold text-navy-900">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-navy-500">{t("loginSubtitle")}</p>
      <div className="mt-5">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
