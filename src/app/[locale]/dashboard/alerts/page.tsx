import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import {
  AlertsManager,
  type AlertView,
} from "@/components/dashboard/alerts-manager";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function MyAlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login?next=/dashboard/alerts", locale: locale as Locale });
    return null;
  }

  const [t, alerts] = await Promise.all([
    getTranslations("dashboard"),
    prisma.priceAlert.findMany({
      where: { userId: user.id },
      include: { originAirport: true, destinationAirport: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const initialAlerts: AlertView[] = alerts.map((alert) => ({
    id: alert.id,
    origin: alert.originAirport.iataCode,
    originCity: alert.originAirport.city,
    destination: alert.destinationAirport.iataCode,
    destinationCity: alert.destinationAirport.city,
    departureDate: alert.departureDate.toISOString().slice(0, 10),
    returnDate: alert.returnDate?.toISOString().slice(0, 10) ?? null,
    targetPrice: Number(alert.targetPrice),
    currency: alert.currency,
    enabled: alert.enabled,
    lastCheckedAt: alert.lastCheckedAt?.toISOString() ?? null,
    lastObservedPrice:
      alert.lastObservedPrice === null ? null : Number(alert.lastObservedPrice),
    createdAt: alert.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h1 className="font-display text-xl font-extrabold text-navy-900">{t("myAlerts")}</h1>
        <p className="mt-1 text-sm text-navy-500">{t("activeAlerts")}</p>
      </div>

      <AlertsManager initialAlerts={initialAlerts} defaultCurrency={user.preferredCurrency} />
    </div>
  );
}
