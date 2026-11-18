import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfferSkeleton } from "@/components/ui/skeleton";
import { SearchResultsClient } from "@/components/search/search-results-client";
import type { Locale } from "@/i18n/messages";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("results");

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-2xl font-extrabold text-navy-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-navy-500">{t("subtitle")}</p>

      <div className="mt-6">
        <Suspense
          fallback={
            <div className="space-y-3">
              <OfferSkeleton />
              <OfferSkeleton />
              <OfferSkeleton />
            </div>
          }
        >
          <SearchResultsClient />
        </Suspense>
      </div>
    </div>
  );
}
