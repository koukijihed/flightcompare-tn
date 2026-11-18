import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/session";
import { AdminNav } from "@/components/dashboard/admin-nav";
import { Alert } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import type { Locale } from "@/i18n/messages";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login?next=/admin", locale: locale as Locale });
    return null;
  }

  const t = await getTranslations("admin");

  if (user.role !== "ADMIN") {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-lg space-y-4">
          <Alert variant="danger" title={t("accessDenied")}>
            <p className="text-xs">{t("title")}</p>
          </Alert>
          <LinkButton href="/dashboard" variant="outline" size="sm">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            {t("overview")}
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page space-y-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy-900">{t("title")}</h1>
          <p className="text-sm text-navy-500">{t("overview")}</p>
        </div>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
