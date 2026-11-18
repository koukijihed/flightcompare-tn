import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AIRPORTS, AIRLINES } from "../src/data/airports";
import { FALLBACK_RATES, SUPPORTED_CURRENCIES } from "../src/modules/currency/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding FlightCompare TN…");

  for (const airport of AIRPORTS) {
    await prisma.airport.upsert({
      where: { iataCode: airport.iataCode },
      create: airport,
      update: {
        name: airport.name,
        city: airport.city,
        country: airport.country,
        countryCode: airport.countryCode,
        latitude: airport.latitude,
        longitude: airport.longitude,
        timezone: airport.timezone,
      },
    });
  }
  console.log(`  airports: ${AIRPORTS.length}`);

  for (const airline of AIRLINES) {
    await prisma.airline.upsert({
      where: { iataCode: airline.iataCode },
      create: { iataCode: airline.iataCode, name: airline.name, logoUrl: null },
      update: { name: airline.name },
    });
  }
  console.log(`  airlines: ${AIRLINES.length}`);

  const providers = [
    {
      name: "Travelpayouts (Aviasales)",
      providerType: "travelpayouts",
      enabled: Boolean(process.env.TRAVELPAYOUTS_TOKEN && process.env.TRAVELPAYOUTS_MARKER),
      configuration: {
        note: "Real-time Flights Search API + affiliate Buy links. Requires Travelpayouts affiliate approval.",
        supportsBookingDeepLink: true,
        supportsAutomatedQueries: false,
      },
    },
    {
      name: "Amadeus",
      providerType: "amadeus",
      enabled: Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET),
      configuration: {
        environment: (process.env.AMADEUS_BASE_URL ?? "").includes("test.api")
          ? "sandbox"
          : "production",
        note: "Credentials are read from server environment variables only.",
        supportsBookingDeepLink: false,
      },
    },
    {
      name: "Skyscanner",
      providerType: "skyscanner",
      enabled: false,
      configuration: {
        note: "Requires an approved Skyscanner partner agreement.",
        partnerApproved: false,
      },
    },
    {
      name: "Demo Provider",
      providerType: "demo",
      enabled: process.env.DEMO_MODE?.toLowerCase() === "true",
      configuration: {
        note: "Locally generated sample offers, only enabled with DEMO_MODE=true.",
        synthetic: true,
      },
    },
  ];

  for (const provider of providers) {
    await prisma.flightProvider.upsert({
      where: { name: provider.name },
      create: provider,
      update: {
        providerType: provider.providerType,
        enabled: provider.enabled,
        configuration: provider.configuration,
      },
    });
  }
  console.log(`  providers: ${providers.length}`);

  for (const currency of SUPPORTED_CURRENCIES) {
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_quoteCurrency: { baseCurrency: currency, quoteCurrency: "TND" },
      },
      create: {
        baseCurrency: currency,
        quoteCurrency: "TND",
        rate: FALLBACK_RATES[currency],
        source: "static",
      },
      update: { rate: FALLBACK_RATES[currency], source: "static", fetchedAt: new Date() },
    });
  }
  console.log(`  exchange rates: ${SUPPORTED_CURRENCIES.length}`);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const userPassword = process.env.SEED_USER_PASSWORD ?? "User@12345";

  await prisma.user.upsert({
    where: { email: "admin@flightcompare.tn" },
    create: {
      firstName: "Admin",
      lastName: "FlightCompare",
      email: "admin@flightcompare.tn",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
      preferredLanguage: "fr",
      preferredCurrency: "TND",
    },
    update: { role: "ADMIN", isActive: true },
  });

  await prisma.user.upsert({
    where: { email: "user@flightcompare.tn" },
    create: {
      firstName: "Sami",
      lastName: "Voyageur",
      email: "user@flightcompare.tn",
      passwordHash: await bcrypt.hash(userPassword, 12),
      role: "USER",
      preferredLanguage: "fr",
      preferredCurrency: "TND",
      preferences: {
        create: {
          preferredAirlines: ["TU", "AF"],
          maxStops: 1,
          preferredCabin: "ECONOMY",
          emailNotifications: true,
        },
      },
    },
    update: { isActive: true },
  });
  console.log("  users: admin@flightcompare.tn, user@flightcompare.tn");

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
