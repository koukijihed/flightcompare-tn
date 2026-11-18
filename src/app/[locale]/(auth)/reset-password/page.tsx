import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import type { Locale } from "@/i18n/messages";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { token } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-lifted md:p-8">
      <Logo className="mb-6" />
      <h1 className="font-display text-xl font-extrabold text-navy-900">{t("resetTitle")}</h1>
      <p className="mt-1 text-sm text-navy-500">{t("resetSubtitle")}</p>
      <div className="mt-5">
        <ResetPasswordForm token={token ?? ""} />
      </div>
    </div>
  );
}
