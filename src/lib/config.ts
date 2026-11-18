/**
 * Centralised, validated access to environment configuration.
 * Secrets never reach the browser: this module is server-only.
 */
import "server-only";

function str(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function num(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

export const config = {
  appUrl: str("APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  authSecret: str("AUTH_SECRET", "insecure-development-secret-change-me-please"),
  // Demo offers are opt-in only. Production defaults to real providers.
  demoMode: bool("DEMO_MODE", false),
  providerTimeoutMs: num("PROVIDER_TIMEOUT_MS", 9000),
  providerMaxOffers: num("PROVIDER_MAX_OFFERS", 25),
  monitorMaxAlerts: num("MONITOR_MAX_ALERTS", 25),
  monitorDelayMs: num("MONITOR_DELAY_MS", 1500),
  cronSecret: str("CRON_SECRET"),
  exchangeRateApiUrl: str("EXCHANGE_RATE_API_URL"),
  exchangeRateBase: str("EXCHANGE_RATE_BASE", "EUR"),
  travelpayouts: {
    token: str("TRAVELPAYOUTS_TOKEN"),
    marker: str("TRAVELPAYOUTS_MARKER"),
    baseUrl: str("TRAVELPAYOUTS_BASE_URL", "https://api.travelpayouts.com").replace(/\/$/, ""),
    // Public website host sent to the Search API. Defaults to APP_URL's host.
    host: str("TRAVELPAYOUTS_HOST"),
    locale: str("TRAVELPAYOUTS_LOCALE", "fr"),
    currency: str("TRAVELPAYOUTS_CURRENCY", "EUR"),
    // Optional public IP used when the caller IP is not routable (local dev).
    userIp: str("TRAVELPAYOUTS_USER_IP"),
    pollIntervalMs: num("TRAVELPAYOUTS_POLL_INTERVAL_MS", 700),
    maxPolls: num("TRAVELPAYOUTS_MAX_POLLS", 8),
    get configured() {
      return Boolean(str("TRAVELPAYOUTS_TOKEN") && str("TRAVELPAYOUTS_MARKER"));
    },
    get searchConfigured() {
      const explicitHost = str("TRAVELPAYOUTS_HOST");
      let host = explicitHost;
      if (!host) {
        try {
          host = new URL(str("APP_URL")).host;
        } catch {
          host = "";
        }
      }
      // Travelpayouts refuses localhost: such a host is not a usable config.
      const isLocal = /^(localhost|127\.|\[::1\])/i.test(host);
      return Boolean(str("TRAVELPAYOUTS_TOKEN") && str("TRAVELPAYOUTS_MARKER") && host && !isLocal);
    },
  },
  resend: {
    apiKey: str("RESEND_API_KEY"),
    from: str("EMAIL_FROM", "FlightCompare TN <noreply@flightcompare.tn>"),
    replyTo: str("EMAIL_REPLY_TO"),
    get configured() {
      return Boolean(str("RESEND_API_KEY"));
    },
  },
  amadeus: {
    clientId: str("AMADEUS_CLIENT_ID"),
    clientSecret: str("AMADEUS_CLIENT_SECRET"),
    baseUrl: str("AMADEUS_BASE_URL", "https://test.api.amadeus.com"),
    get configured() {
      return Boolean(str("AMADEUS_CLIENT_ID") && str("AMADEUS_CLIENT_SECRET"));
    },
  },
  skyscanner: {
    apiKey: str("SKYSCANNER_API_KEY"),
    baseUrl: str("SKYSCANNER_BASE_URL"),
    get configured() {
      return Boolean(str("SKYSCANNER_API_KEY") && str("SKYSCANNER_BASE_URL"));
    },
  },
  ai: {
    apiKey: str("AI_API_KEY"),
    baseUrl: str("AI_BASE_URL", "https://api.openai.com/v1").replace(/\/$/, ""),
    model: str("AI_MODEL", "gpt-4o-mini"),
    get configured() {
      return Boolean(str("AI_API_KEY"));
    },
  },
} as const;

export const isProduction = process.env.NODE_ENV === "production";

if (isProduction && config.authSecret === "insecure-development-secret-change-me-please") {
  console.warn(
    "[config] AUTH_SECRET uses the insecure development default. Set a strong random value before deploying.",
  );
}
