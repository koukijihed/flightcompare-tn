import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { ProfileForm, type ProfileInitial } from "@/components/dashboard/profile-form";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const session = await getCurrentUser();
  if (!session) {
    redirect({ href: "/login?next=/dashboard/profile", locale: locale as Locale });
    return null;
  }

  const [t, user] = await Promise.all([
    getTranslations("dashboard"),
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        preferredLanguage: true,
        preferredCurrency: true,
        preferences: {
          select: {
            preferredAirlines: true,
            maxStops: true,
            preferredCabin: true,
            emailNotifications: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    redirect({ href: "/login?next=/dashboard/profile", locale: locale as Locale });
    return null;
  }

  const initial: ProfileInitial = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    preferredLanguage: (["fr", "en", "ar"] as const).includes(
      user.preferredLanguage as "fr" | "en" | "ar",
    )
      ? (user.preferredLanguage as "fr" | "en" | "ar")
      : "fr",
    preferredCurrency: user.preferredCurrency,
    preferredAirlines: user.preferences?.preferredAirlines ?? [],
    maxStops: user.preferences?.maxStops ?? null,
    preferredCabin: user.preferences?.preferredCabin ?? null,
    emailNotifications: user.preferences?.emailNotifications ?? true,
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h1 className="font-display text-xl font-extrabold text-navy-900">{t("profile")}</h1>
        <p className="mt-1 text-sm text-navy-500">{t("personalInfo")}</p>
      </div>

      <ProfileForm initial={initial} />
    </div>
  );
}
