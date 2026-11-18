import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/messages";
import type { Metadata } from "next";

type DocKey = "terms" | "privacy" | "cookies" | "about";

const CONTENT: Record<DocKey, Record<string, { title: string; paragraphs: string[] }>> = {
  terms: {
    fr: {
      title: "Conditions d'utilisation",
      paragraphs: [
        "FlightCompare TN est un service indépendant de comparaison de vols. Nous ne vendons pas de billets d'avion et ne traitons aucun paiement lié à une réservation.",
        "Les prix, disponibilités et conditions affichés proviennent des fournisseurs interrogés au moment indiqué. Ils peuvent évoluer avant la finalisation de votre réservation sur le site du fournisseur.",
        "Toute réservation est conclue directement avec la compagnie aérienne ou l'agence identifiée sur l'offre. Les conditions d'annulation, de bagages et de remboursement sont celles du fournisseur.",
        "Les analyses de prix et recommandations sont fournies à titre informatif et ne constituent pas un conseil d'achat.",
      ],
    },
    en: {
      title: "Terms of use",
      paragraphs: [
        "FlightCompare TN is an independent flight comparison service. We do not sell tickets and never process booking payments.",
        "Prices, availability and conditions come from the providers queried at the indicated time and may change before you complete a booking on the provider's site.",
        "All bookings are made directly with the airline or agency named on the offer. Cancellation, baggage and refund rules are the provider's.",
        "Price analysis and recommendations are informational and are not purchasing advice.",
      ],
    },
    ar: {
      title: "شروط الاستخدام",
      paragraphs: [
        "FlightCompare TN خدمة مستقلة لمقارنة الرحلات. لا نبيع التذاكر ولا نعالج أي دفعة مرتبطة بالحجز.",
        "الأسعار والتوفر والشروط تأتي من المزوّدين في الوقت المحدد وقد تتغير قبل إتمام الحجز على موقع المزوّد.",
        "تُبرم جميع الحجوزات مباشرة مع شركة الطيران أو الوكالة المذكورة في العرض.",
        "تحليلات الأسعار والتوصيات إعلامية وليست نصيحة شراء.",
      ],
    },
  },
  privacy: {
    fr: {
      title: "Politique de confidentialité",
      paragraphs: [
        "Nous collectons uniquement les données nécessaires au fonctionnement du service : compte utilisateur, recherches, favoris, alertes de prix et préférences.",
        "Les mots de passe sont stockés sous forme de hachage bcrypt. Les sessions utilisent un cookie httpOnly signé et ne contiennent aucune donnée sensible.",
        "Vos recherches et alertes sont utilisées pour vous fournir le service et des statistiques agrégées. Vous pouvez supprimer vos recherches et alertes à tout moment depuis votre espace.",
        "Aucune donnée personnelle n'est vendue à des tiers. Les échanges avec les fournisseurs de vols sont effectués côté serveur avec vos paramètres de recherche.",
      ],
    },
    en: {
      title: "Privacy policy",
      paragraphs: [
        "We only collect the data required to operate the service: account details, searches, favourites, price alerts and preferences.",
        "Passwords are stored as bcrypt hashes. Sessions use a signed httpOnly cookie with no sensitive payload.",
        "Your searches and alerts are used to deliver the service and aggregated statistics. You can delete them from your dashboard at any time.",
        "Personal data is never sold. Provider requests run server-side with your search parameters.",
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      paragraphs: [
        "نجمع فقط البيانات اللازمة لتشغيل الخدمة: بيانات الحساب والبحوث والمفضلة وتنبيهات الأسعار والتفضيلات.",
        "تُخزن كلمات المرور بصيغة bcrypt، وتستخدم الجلسات كوكي httpOnly موقّعًا.",
        "تُستخدم بحوثك وتنبيهاتك لتقديم الخدمة وإحصاءات مجمعة، ويمكنك حذفها من مساحتك.",
        "لا تُباع البيانات الشخصية لأي طرف ثالث.",
      ],
    },
  },
  cookies: {
    fr: {
      title: "Cookies",
      paragraphs: [
        "FlightCompare TN utilise un cookie de session strictement nécessaire (fc_session) pour maintenir votre connexion, et un cookie de préférence (fc_currency) pour mémoriser la devise d'affichage.",
        "Aucun cookie publicitaire ou de suivi tiers n'est utilisé. Aucun script d'analyse externe n'est chargé.",
        "Vous pouvez supprimer ces cookies depuis les paramètres de votre navigateur ; la connexion et la devise par défaut seront alors réinitialisées.",
      ],
    },
    en: {
      title: "Cookies",
      paragraphs: [
        "FlightCompare TN uses a strictly necessary session cookie (fc_session) to keep you signed in, and a preference cookie (fc_currency) to remember your display currency.",
        "No advertising or third-party tracking cookies are used, and no external analytics scripts are loaded.",
        "Clearing cookies in your browser will reset your session and currency preference.",
      ],
    },
    ar: {
      title: "الكوكيز",
      paragraphs: [
        "يستخدم الموقع كوكي جلسة ضروريًا (fc_session) للحفاظ على تسجيل الدخول، وكوكي تفضيل (fc_currency) لتذكر عملة العرض.",
        "لا تُستخدم كوكيز إعلانية أو تتبع من أطراف ثالثة.",
        "حذف الكوكيز من المتصفح يعيد تعيين الجلسة والعملة.",
      ],
    },
  },
  about: {
    fr: {
      title: "À propos de FlightCompare TN",
      paragraphs: [
        "FlightCompare TN est un comparateur de vols pensé pour le marché tunisien, avec une couverture internationale. Notre objectif : rendre les prix, les durées et les conditions de bagages lisibles en un seul écran.",
        "Nous agrégeons les offres de fournisseurs via une architecture d'adaptateurs. Chaque offre conserve son fournisseur, sa devise d'origine et l'horodatage de récupération du prix.",
        "Plateforme indépendante, sans vente de billets : la réservation est toujours finalisée chez le fournisseur d'origine.",
      ],
    },
    en: {
      title: "About FlightCompare TN",
      paragraphs: [
        "FlightCompare TN is a flight comparison platform designed for the Tunisian market with international coverage: prices, durations and baggage conditions on a single screen.",
        "Offers are aggregated through a provider adapter architecture. Each offer keeps its provider, original currency and price retrieval timestamp.",
        "An independent platform with no ticket sales: bookings always complete with the original provider.",
      ],
    },
    ar: {
      title: "حول FlightCompare TN",
      paragraphs: [
        "منصة مقارنة رحلات مصممة للسوق التونسي بتغطية دولية: الأسعار والمدة وشروط الأمتعة في شاشة واحدة.",
        "تُجمع العروض عبر بنية محوّلات المزوّدين، ويحتفظ كل عرض بمزوّده وعملته الأصلية ووقت استرجاع السعر.",
        "منصة مستقلة لا تبيع التذاكر: يُكمل الحجز دائمًا لدى المزوّد الأصلي.",
      ],
    },
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!["terms", "privacy", "cookies", "about"].includes(doc)) return {};
  const content = CONTENT[doc as DocKey][locale] ?? CONTENT[doc as DocKey].fr!;
  return {
    title: content.title,
    alternates: localeAlternates(locale, `/legal/${doc}`),
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale, doc } = await params;
  setRequestLocale(locale as Locale);

  if (!["terms", "privacy", "cookies", "about"].includes(doc)) notFound();

  const content = CONTENT[doc as DocKey][locale] ?? CONTENT[doc as DocKey].fr!;
  const tFooter = await getTranslations("footer");

  return (
    <article className="container-page max-w-3xl py-12">
      <p className="text-[11px] font-bold tracking-wide text-sky-700 uppercase">
        {tFooter("legal")}
      </p>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-navy-900 md:text-3xl">
        {content.title}
      </h1>
      <div className="mt-5 space-y-4 rounded-2xl border border-navy-100 bg-white p-6 text-sm leading-relaxed text-navy-600 shadow-card">
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
        <p className="border-t border-navy-100 pt-4 text-xs text-navy-400">
          {tFooter("address")} · {tFooter("support")}
        </p>
      </div>
    </article>
  );
}
