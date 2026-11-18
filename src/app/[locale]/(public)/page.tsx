import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BrainCircuit,
  Compass,
  PlaneTakeoff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { POPULAR_ROUTES } from "@/data/airports";
import { configuredProviderStatus } from "@/modules/providers/registry";
import { SUPPORTED_CURRENCIES } from "@/modules/currency/constants";
import { routing } from "@/i18n/routing";
import { SearchForm } from "@/components/search/search-form";
import { AiSearchBox } from "@/components/search/ai-search-box";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addDays, formatDateInput } from "@/lib/utils";
import { localeAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/messages";
import type { Metadata } from "next";

const DESTINATION_GRADIENTS = [
  "from-sky-600 via-sky-700 to-navy-900",
  "from-turquoise-600 via-turquoise-700 to-navy-900",
  "from-navy-700 via-navy-800 to-navy-950",
  "from-indigo-600 via-navy-800 to-navy-950",
  "from-cyan-600 via-sky-800 to-navy-900",
  "from-emerald-600 via-turquoise-800 to-navy-950",
  "from-amber-600 via-orange-700 to-navy-900",
  "from-rose-600 via-navy-800 to-navy-950",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, tHero, tSearch, intlAirports, airportCount] = await Promise.all([
    getTranslations("home"),
    getTranslations("hero"),
    getTranslations("search"),
    prisma.airport.findMany({
      where: { iataCode: { in: POPULAR_ROUTES.flatMap((route) => [route.origin, route.destination]) } },
      select: { iataCode: true, city: true, country: true },
    }),
    prisma.airport.count(),
  ]);

  // Only providers that are actually usable are advertised (not the demo row,
  // not an unconfigured partner).
  const providerCount = configuredProviderStatus().filter(
    (provider) => provider.configured && provider.type !== "demo",
  ).length;

  const airportMap = new Map(intlAirports.map((airport) => [airport.iataCode, airport]));
  const departureDate = formatDateInput(addDays(new Date(), 21));
  const returnDate = formatDateInput(addDays(new Date(), 28));

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="hero-grid relative overflow-hidden text-white">
        <div className="container-page relative py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="border-white/20 bg-white/10 text-white">
              <Sparkles className="h-3 w-3" aria-hidden />
              {tHero("badge")}
            </Badge>
            <h1 className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-tight md:text-5xl">
              {tHero("title")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
              {tHero("subtitle")}
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl">
            <SearchForm
              variant="hero"
              initial={{ departureDate, returnDate: formatDateInput(addDays(new Date(), 28)) }}
            />
          </div>

          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-4 text-center md:grid-cols-4">
            {[
              { value: providerCount, label: tHero("statProviders") },
              { value: SUPPORTED_CURRENCIES.length, label: tHero("statCurrencies") },
              { value: routing.locales.length, label: tHero("statLanguages") },
              { value: airportCount, label: tHero("statDestinations") },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-[11px] tracking-wide text-white/60 uppercase">{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-7 flex max-w-2xl items-center justify-center gap-2 text-center text-[11px] text-white/60">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {tHero("trust")}
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- destinations */}
      <section className="container-page py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-navy-900 md:text-3xl">
              {t("popularTitle")}
            </h2>
            <p className="mt-1.5 text-sm text-navy-500">{t("popularSubtitle")}</p>
          </div>
          <Link href="/search">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Compass className="h-4 w-4" aria-hidden />
              {t("explore")}
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_ROUTES.map((route, index) => {
            const destination = airportMap.get(route.destination);
            if (!destination) return null;
            return (
              <Link
                key={`${route.origin}-${route.destination}`}
                href={`/search?origin=${route.origin}&destination=${route.destination}&departureDate=${departureDate}&tripType=ONE_WAY&adults=1&children=0&infants=0&cabinClass=ECONOMY&auto=1`}
                className="group relative overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lifted"
              >
                <div
                  className={`relative h-32 bg-gradient-to-br ${DESTINATION_GRADIENTS[index % DESTINATION_GRADIENTS.length]}`}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 200 100"
                    className="absolute inset-0 h-full w-full opacity-25"
                  >
                    <path
                      d="M0 78c28-10 52-4 78-16 26-12 42-34 72-38 20-3 34 4 50 2"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <circle cx="150" cy="26" r="3" fill="white" />
                  </svg>
                  <span className="absolute bottom-3 start-4 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white backdrop-blur">
                    {route.origin} → {route.destination}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-display text-base font-bold text-navy-900">
                    {destination.city}
                  </p>
                  <p className="text-xs text-navy-500">{destination.country}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
                    {t("explore")}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ AI panel */}
      <section className="border-y border-navy-100 bg-white">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="sky">
              <BrainCircuit className="h-3 w-3" aria-hidden />
              {t("aiTitle").split(",")[0]}
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-navy-900 md:text-3xl">
              {t("aiTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-600">{t("aiText")}</p>
            <ul className="mt-4 space-y-2 text-sm text-navy-600">
              {[t("benefit1Text"), t("benefit4Text"), t("benefit3Text")].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-turquoise-600" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <AiSearchBox compact />
        </div>
      </section>

      {/* ------------------------------------------------------- how it works */}
      <section id="how-it-works" className="container-page scroll-mt-20 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-extrabold text-navy-900 md:text-3xl">
            {t("howTitle")}
          </h2>
          <p className="mt-2 text-sm text-navy-500">{t("howSubtitle")}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Compass, title: t("how1Title"), text: t("how1Text") },
            { icon: PlaneTakeoff, title: t("how2Title"), text: t("how2Text") },
            { icon: ShieldCheck, title: t("how3Title"), text: t("how3Text") },
          ].map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-navy-100 bg-white p-5 shadow-card"
            >
              <span className="absolute end-4 top-4 font-display text-3xl font-extrabold text-navy-100">
                {index + 1}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-display text-base font-bold text-navy-900">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- benefits */}
      <section className="bg-navy-950 py-16 text-white">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">
              {t("benefitsTitle")}
            </h2>
            <p className="mt-2 text-sm text-white/60">{t("benefitsSubtitle")}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BadgeCheck, title: t("benefit1Title"), text: t("benefit1Text") },
              { icon: Sparkles, title: t("benefit2Title"), text: t("benefit2Text") },
              { icon: BellRing, title: t("benefit3Title"), text: t("benefit3Text") },
              { icon: BrainCircuit, title: t("benefit4Title"), text: t("benefit4Text") },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-turquoise-500/15 text-turquoise-300">
                  <benefit.icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-3 text-sm font-bold text-white">{benefit.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/60">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- inspiration */}
      <section className="container-page py-16">
        <h2 className="font-display text-2xl font-extrabold text-navy-900 md:text-3xl">
          {t("inspirationTitle")}
        </h2>
        <p className="mt-1.5 text-sm text-navy-500">{t("inspirationSubtitle")}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: t("inspiration1Title"),
              text: t("inspiration1Text"),
              href: `/search?origin=TUN&destination=IST&tripType=ROUND_TRIP&departureDate=${departureDate}&returnDate=${returnDate}&adults=1&children=0&infants=0&cabinClass=ECONOMY&auto=1`,
            },
            {
              title: t("inspiration2Title"),
              text: t("inspiration2Text"),
              href: `/search?origin=TUN&destination=DJE&tripType=ROUND_TRIP&departureDate=${departureDate}&returnDate=${returnDate}&adults=1&children=0&infants=0&cabinClass=ECONOMY&auto=1`,
            },
            {
              title: t("inspiration3Title"),
              text: t("inspiration3Text"),
              href: `/search?origin=TUN&destination=BCN&tripType=ROUND_TRIP&departureDate=${departureDate}&returnDate=${returnDate}&adults=1&children=0&infants=0&cabinClass=ECONOMY&auto=1`,
            },
          ].map((card, index) => (
            <Link
              key={card.title}
              href={card.href}
              className="group overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card transition hover:shadow-lifted"
            >
              <div
                className={`h-28 bg-gradient-to-tr ${DESTINATION_GRADIENTS[(index + 3) % DESTINATION_GRADIENTS.length]}`}
              />
              <div className="p-4">
                <h3 className="font-display text-base font-bold text-navy-900">{card.title}</h3>
                <p className="mt-1 text-sm text-navy-500">{card.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- alerts cta */}
      <section className="container-page pb-16">
        <div className="grid gap-6 rounded-2xl border border-navy-100 bg-white p-6 shadow-card md:grid-cols-2 md:items-center md:p-8">
          <div>
            <Badge variant="success">
              <BellRing className="h-3 w-3" aria-hidden />
              {t("benefit3Title")}
            </Badge>
            <h2 className="mt-3 font-display text-xl font-extrabold text-navy-900 md:text-2xl">
              {t("newsletterTitle")}
            </h2>
            <p className="mt-2 text-sm text-navy-500">{t("newsletterText")}</p>
          </div>
          <div>
            <NewsletterForm />
            <p className="mt-2 text-[11px] text-navy-400">
              {tSearch("submit")} → {t("how3Title")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
