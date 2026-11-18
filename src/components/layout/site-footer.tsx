import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mail, MapPin } from "lucide-react";
import { Logo } from "./logo";
import { NewsletterForm } from "./newsletter-form";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tHome = await getTranslations("home");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-navy-800 bg-navy-950 text-navy-200">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo inverted />
          <p className="text-sm leading-relaxed text-navy-300">{t("aboutText")}</p>
          <div className="space-y-2 text-sm text-navy-300">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-turquoise-400" aria-hidden />
              {t("address")}
            </p>
            <a
              href={`mailto:${t("support")}`}
              className="flex items-center gap-2 hover:text-white"
            >
              <Mail className="h-4 w-4 text-turquoise-400" aria-hidden />
              {t("support")}
            </a>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">
            {t("product")}
          </h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/search" className="hover:text-white">
                {tHome("how1Title")}
              </Link>
            </li>
            <li>
              <Link href="/alerts" className="hover:text-white">
                {tHome("benefit3Title")}
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-white">
                {tHome("howTitle")}
              </Link>
            </li>
            <li>
              <Link href="/compare" className="hover:text-white">
                {tHome("benefit2Title")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">
            {t("legal")}
          </h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/legal/terms" className="hover:text-white">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="hover:text-white">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="hover:text-white">
                {t("cookies")}
              </Link>
            </li>
            <li>
              <Link href="/legal/about" className="hover:text-white">
                {t("about")}
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold tracking-wider text-white uppercase">
            {tHome("newsletterTitle")}
          </h2>
          <p className="text-sm text-navy-300">{tHome("newsletterText")}</p>
          <NewsletterForm inverted />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-navy-400 md:flex-row md:items-center md:justify-between">
          <p>{t("copyright", { year })}</p>
          <p className="max-w-2xl md:text-end">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
