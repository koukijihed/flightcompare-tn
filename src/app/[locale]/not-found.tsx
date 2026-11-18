import { getTranslations } from "next-intl/server";
import { Compass, MoveLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LinkButton } from "@/components/ui/link-button";

export default async function LocaleNotFound() {
  const t = await getTranslations("common");

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <Compass className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 font-display text-4xl font-extrabold tracking-tight text-navy-900">404</p>
        <h1 className="mt-1 font-display text-lg font-bold text-navy-900">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">{t("notFoundText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <LinkButton href="/" variant="accent">
            <MoveLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("backHome")}
          </LinkButton>
          <Link href="/search" className="text-xs font-semibold text-sky-700 hover:underline">
            {t("search")}
          </Link>
        </div>
      </div>
    </div>
  );
}
