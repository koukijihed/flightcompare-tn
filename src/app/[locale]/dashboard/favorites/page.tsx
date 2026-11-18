import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Heart } from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { getRateSnapshot } from "@/modules/currency/service";
import { getDisplayCurrency } from "@/modules/currency/cookies";
import { offerInclude, toOfferDTO } from "@/modules/flights/mapper";
import { OfferCard } from "@/components/flights/offer-card";
import { RemoveFavoriteButton } from "@/components/dashboard/remove-favorite-button";
import { LinkButton } from "@/components/ui/link-button";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function MyFavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login?next=/dashboard/favorites", locale: locale as Locale });
    return null;
  }

  const [t, tc, rates, currency, favorites] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getRateSnapshot(),
    getDisplayCurrency(),
    prisma.favorite.findMany({
      where: { userId: user.id },
      include: { flightOffer: { include: offerInclude } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h1 className="font-display text-xl font-extrabold text-navy-900">{t("myFavorites")}</h1>
        <p className="mt-1 text-sm text-navy-500">{t("savedFlights")}</p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-10 text-center shadow-card">
          <Heart className="mx-auto h-8 w-8 text-navy-300" aria-hidden />
          <p className="mt-3 text-sm text-navy-500">{t("noFavorites")}</p>
          <LinkButton href="/search" variant="accent" size="sm" className="mt-4">
            {tc("search")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          </LinkButton>
        </div>
      ) : (
        <ul className="space-y-3">
          {favorites.map((favorite) => (
            <li key={favorite.id}>
              <OfferCard offer={toOfferDTO(favorite.flightOffer, rates.rates, currency)} />
              <div className="mt-1.5 flex justify-end">
                <RemoveFavoriteButton offerId={favorite.flightOfferId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
