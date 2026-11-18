import "server-only";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";
import { isEmailConfigured, priceAlertEmail, sendEmail, type EmailLocale } from "@/lib/email";
import { resolveActiveAdapters } from "@/modules/providers/registry";
import { fetchTravelpayoutsPriceSignal } from "@/modules/providers/travelpayouts";
import { convertAmount } from "@/modules/currency/constants";
import { getRateSnapshot } from "@/modules/currency/service";
import { shouldNotifyPrice } from "@/modules/alerts/logic";
import { formatMoney } from "@/lib/utils";

export type MonitorResult = {
  checked: number;
  notified: number;
  emailed: number;
  skipped: number;
  errors: string[];
  ranAt: string;
};

const MESSAGES: Record<
  string,
  { title: string; body: (route: string, price: string, target: string, provider: string) => string }
> = {
  fr: {
    title: "Alerte prix : objectif atteint",
    body: (route, price, target, provider) =>
      `Une offre ${route} à ${price} (${provider}) est sous votre objectif de ${target}. Vérifiez la disponibilité avant de réserver.`,
  },
  en: {
    title: "Price alert: target reached",
    body: (route, price, target, provider) =>
      `An offer ${route} at ${price} (${provider}) is below your ${target} target. Check availability before booking.`,
  },
  ar: {
    title: "تنبيه سعر: تم بلوغ الهدف",
    body: (route, price, target, provider) =>
      `عرض ${route} بسعر ${price} (${provider}) أقل من هدفك ${target}. تحقق من التوفر قبل الحجز.`,
  },
};

const EMAIL_LOCALES: Record<string, { locale: EmailLocale; intl: string }> = {
  fr: { locale: "fr", intl: "fr-TN" },
  en: { locale: "en", intl: "en-GB" },
  ar: { locale: "ar", intl: "ar-TN" },
};

function searchUrl(alert: {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate: Date | null;
}, locale: EmailLocale): string {
  const returnDate = alert.returnDate?.toISOString().slice(0, 10) ?? null;
  const params = new URLSearchParams({
    origin: alert.origin,
    destination: alert.destination,
    departureDate: alert.departureDate.toISOString().slice(0, 10),
    tripType: returnDate ? "ROUND_TRIP" : "ONE_WAY",
    adults: "1",
    children: "0",
    infants: "0",
    cabinClass: "ECONOMY",
    auto: "1",
  });
  if (returnDate) params.set("returnDate", returnDate);
  return `${config.appUrl}/${locale}/search?${params.toString()}`;
}

/**
 * One monitoring pass over enabled price alerts.
 *
 * This is a batch job, not a daemon: run it from the admin area or a protected
 * cron endpoint. Providers whose terms require user-initiated searches
 * (Travelpayouts Search API) are never called here: only the free, cached
 * Data API is used as a price signal for those.
 */
export async function runPriceMonitoring(options: {
  maxAlerts?: number;
  alertId?: string;
  userId?: string;
} = {}): Promise<MonitorResult> {
  const alerts = await prisma.priceAlert.findMany({
    where: {
      enabled: true,
      ...(options.alertId ? { id: options.alertId } : {}),
      ...(options.userId ? { userId: options.userId } : {}),
    },
    include: {
      originAirport: true,
      destinationAirport: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          preferredLanguage: true,
          preferences: { select: { emailNotifications: true } },
        },
      },
    },
    orderBy: { lastCheckedAt: "asc" },
    take: options.maxAlerts ?? config.monitorMaxAlerts,
  });

  const result: MonitorResult = {
    checked: 0,
    notified: 0,
    emailed: 0,
    skipped: 0,
    errors: [],
    ranAt: new Date().toISOString(),
  };

  if (alerts.length === 0) return result;

  const adapters = (await resolveActiveAdapters()).filter(({ adapter }) => {
    if (adapter.supportsAutomatedQueries === false) return false;
    // Amadeus sandbox prices are synthetic: never alert real users with them.
    if (adapter.type === "amadeus" && config.amadeus.baseUrl.includes("test.api")) {
      return false;
    }
    return true;
  });
  const rates = (await getRateSnapshot()).rates;

  for (const alert of alerts) {
    result.checked += 1;
    const route = `${alert.originAirport.iataCode}-${alert.destinationAirport.iataCode}`;

    let bestPriceInAlertCurrency: number | null = null;
    let bestProviderName = "";
    let bestSource: "ALERT_CHECK" | "DEMO_PROVIDER" = "ALERT_CHECK";

    for (const { adapter } of adapters) {
      try {
        const search = await adapter.search(
          {
            origin: alert.originAirport.iataCode,
            destination: alert.destinationAirport.iataCode,
            departureDate: alert.departureDate.toISOString().slice(0, 10),
            returnDate: alert.returnDate?.toISOString().slice(0, 10) ?? null,
            adults: 1,
            children: 0,
            infants: 0,
            cabinClass: "ECONOMY",
            tripType: alert.returnDate ? "ROUND_TRIP" : "ONE_WAY",
          },
          { max: 10, signal: AbortSignal.timeout(config.providerTimeoutMs) },
        );

        const cheapest = [...search.offers].sort((a, b) => a.totalPrice - b.totalPrice)[0];
        if (!cheapest) continue;

        const converted = convertAmount(
          cheapest.totalPrice,
          cheapest.currency,
          alert.currency,
          rates,
        );
        if (converted === null) continue;

        const source = adapter.type === "demo" ? "DEMO_PROVIDER" : "ALERT_CHECK";

        if (bestPriceInAlertCurrency === null || converted < bestPriceInAlertCurrency) {
          bestPriceInAlertCurrency = converted;
          bestProviderName = adapter.name;
          bestSource = source;
        }

        const providerRow = await prisma.flightProvider.findFirst({
          where: { providerType: adapter.type },
          select: { id: true },
        });

        if (providerRow) {
          await prisma.priceHistory.create({
            data: {
              route,
              originAirportId: alert.originAirportId,
              destinationAirportId: alert.destinationAirportId,
              departureDate: alert.departureDate,
              providerId: providerRow.id,
              airlineId: null,
              price: converted,
              currency: alert.currency,
              source,
            },
          });
        }
      } catch (error) {
        result.errors.push(
          `${adapter.name} (${route}) : ${error instanceof Error ? error.message : "erreur"}`,
        );
      }
    }

    /**
     * No adapter accepts automated queries: fall back to the free cached price
     * signal, which is compliant with Travelpayouts' Search API terms.
     */
    if (adapters.length === 0) {
      try {
        const signal = await fetchTravelpayoutsPriceSignal({
          origin: alert.originAirport.iataCode,
          destination: alert.destinationAirport.iataCode,
          departureDate: alert.departureDate.toISOString().slice(0, 10),
          returnDate: alert.returnDate?.toISOString().slice(0, 10) ?? null,
          currency: alert.currency,
        });
        if (signal) {
          bestPriceInAlertCurrency = signal.price;
          bestProviderName = "Travelpayouts (prix en cache)";
          bestSource = "ALERT_CHECK";

          const providerRow = await prisma.flightProvider.findFirst({
            where: { providerType: "travelpayouts" },
            select: { id: true },
          });
          if (providerRow) {
            await prisma.priceHistory.create({
              data: {
                route,
                originAirportId: alert.originAirportId,
                destinationAirportId: alert.destinationAirportId,
                departureDate: alert.departureDate,
                providerId: providerRow.id,
                airlineId: null,
                price: signal.price,
                currency: signal.currency,
                source: "ALERT_CHECK",
              },
            });
          }
        }
      } catch (error) {
        result.errors.push(
          `Travelpayouts Data API (${route}) : ${
            error instanceof Error ? error.message : "erreur"
          }`,
        );
      }
    }

    if (bestPriceInAlertCurrency === null) {
      result.skipped += 1;
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { lastCheckedAt: new Date() },
      });
      continue;
    }

    const target = Number(alert.targetPrice);
    const notify = shouldNotifyPrice({
      observedPrice: bestPriceInAlertCurrency,
      targetPrice: target,
      lastNotifiedPrice: alert.lastNotifiedPrice ? Number(alert.lastNotifiedPrice) : null,
      enabled: alert.enabled,
    });

    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        lastCheckedAt: new Date(),
        lastObservedPrice: bestPriceInAlertCurrency,
        ...(notify ? { lastNotifiedPrice: bestPriceInAlertCurrency } : {}),
      },
    });

    if (notify) {
      const language = alert.user.preferredLanguage ?? "fr";
      const copy = MESSAGES[language] ?? MESSAGES.fr!;
      const emailCopy = EMAIL_LOCALES[language] ?? EMAIL_LOCALES.fr!;
      const priceLabel = formatMoney(bestPriceInAlertCurrency, alert.currency, emailCopy.intl);
      const targetLabel = formatMoney(target, alert.currency, emailCopy.intl);

      await prisma.notification.create({
        data: {
          userId: alert.userId,
          title: copy.title,
          message: copy.body(route, priceLabel, targetLabel, bestProviderName),
          type: "PRICE_ALERT",
          metadata: {
            alertId: alert.id,
            route,
            observedPrice: bestPriceInAlertCurrency,
            targetPrice: target,
            currency: alert.currency,
            provider: bestProviderName,
            observedAt: new Date().toISOString(),
            demo: bestSource === "DEMO_PROVIDER",
          },
        },
      });
      result.notified += 1;

      // Never e-mail prices generated by the demo provider.
      const emailAllowed =
        bestSource !== "DEMO_PROVIDER" &&
        alert.user.preferences?.emailNotifications !== false;
      if (emailAllowed && alert.user.email) {
        if (!isEmailConfigured()) {
          result.errors.push(
            `E-mail non envoyé pour ${route} : RESEND_API_KEY n'est pas configuré.`,
          );
        } else {
          const content = priceAlertEmail({
            name: alert.user.firstName,
            locale: emailCopy.locale,
            route,
            price: priceLabel,
            target: targetLabel,
            provider: bestProviderName,
            url: searchUrl(
              {
                origin: alert.originAirport.iataCode,
                destination: alert.destinationAirport.iataCode,
                departureDate: alert.departureDate,
                returnDate: alert.returnDate,
              },
              emailCopy.locale,
            ),
          });
          const sent = await sendEmail({
            to: alert.user.email,
            subject: content.subject,
            html: content.html,
            text: content.text,
            tags: [{ name: "type", value: "price_alert" }],
          });
          if (sent.ok) {
            result.emailed += 1;
          } else {
            result.errors.push(`E-mail (${route}) : ${sent.error}`);
          }
        }
      }
    }

    // Respect provider usage limits between route checks.
    await new Promise((resolve) => setTimeout(resolve, config.monitorDelayMs));
  }

  return result;
}
