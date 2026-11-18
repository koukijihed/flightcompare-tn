-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY');

-- CreateEnum
CREATE TYPE "CabinClass" AS ENUM ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('AVAILABLE', 'STALE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PRICE_ALERT', 'SYSTEM', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "OfferDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'fr',
    "preferredCurrency" TEXT NOT NULL DEFAULT 'TND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredAirlines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxStops" INTEGER,
    "preferredCabin" "CabinClass",
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "iataCode" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airline" (
    "id" TEXT NOT NULL,
    "iataCode" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "originAirportId" TEXT NOT NULL,
    "destinationAirportId" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "returnDate" DATE,
    "tripType" "TripType" NOT NULL DEFAULT 'ONE_WAY',
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "cabinClass" "CabinClass" NOT NULL DEFAULT 'ECONOMY',
    "legs" JSONB,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TND',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlightSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightOffer" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerOfferId" TEXT NOT NULL,
    "airlineId" TEXT,
    "originalPrice" DECIMAL(12,2) NOT NULL,
    "originalCurrency" VARCHAR(3) NOT NULL,
    "convertedPrice" DECIMAL(12,2),
    "convertedCurrency" VARCHAR(3),
    "exchangeRate" DECIMAL(18,6),
    "exchangeRateAt" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "stops" INTEGER NOT NULL DEFAULT 0,
    "cabinClass" "CabinClass" NOT NULL DEFAULT 'ECONOMY',
    "baggageInformation" JSONB,
    "fareConditions" TEXT,
    "refundable" BOOLEAN,
    "bookingUrl" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "OfferStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlightOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSegment" (
    "id" TEXT NOT NULL,
    "flightOfferId" TEXT NOT NULL,
    "originAirportId" TEXT NOT NULL,
    "destinationAirportId" TEXT NOT NULL,
    "airlineId" TEXT,
    "flightNumber" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "direction" "OfferDirection" NOT NULL DEFAULT 'OUTBOUND',
    "legIndex" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FlightSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "originAirportId" TEXT NOT NULL,
    "destinationAirportId" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "providerId" TEXT NOT NULL,
    "airlineId" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LIVE_PROVIDER',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flightOfferId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originAirportId" TEXT NOT NULL,
    "destinationAirportId" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "returnDate" DATE,
    "targetPrice" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TND',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastObservedPrice" DECIMAL(12,2),
    "lastNotifiedPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" VARCHAR(3) NOT NULL,
    "quoteCurrency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'static',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "flightOfferId" TEXT,
    "searchId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'heuristic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "durationMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_iataCode_key" ON "Airport"("iataCode");

-- CreateIndex
CREATE INDEX "Airport_city_idx" ON "Airport"("city");

-- CreateIndex
CREATE INDEX "Airport_country_idx" ON "Airport"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_iataCode_key" ON "Airline"("iataCode");

-- CreateIndex
CREATE INDEX "Airline_name_idx" ON "Airline"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FlightProvider_name_key" ON "FlightProvider"("name");

-- CreateIndex
CREATE INDEX "FlightSearch_userId_createdAt_idx" ON "FlightSearch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FlightSearch_originAirportId_destinationAirportId_departure_idx" ON "FlightSearch"("originAirportId", "destinationAirportId", "departureDate");

-- CreateIndex
CREATE INDEX "FlightSearch_createdAt_idx" ON "FlightSearch"("createdAt");

-- CreateIndex
CREATE INDEX "FlightOffer_searchId_originalPrice_idx" ON "FlightOffer"("searchId", "originalPrice");

-- CreateIndex
CREATE INDEX "FlightOffer_searchId_durationMinutes_idx" ON "FlightOffer"("searchId", "durationMinutes");

-- CreateIndex
CREATE INDEX "FlightOffer_retrievedAt_idx" ON "FlightOffer"("retrievedAt");

-- CreateIndex
CREATE INDEX "FlightOffer_airlineId_idx" ON "FlightOffer"("airlineId");

-- CreateIndex
CREATE UNIQUE INDEX "FlightOffer_searchId_providerId_providerOfferId_key" ON "FlightOffer"("searchId", "providerId", "providerOfferId");

-- CreateIndex
CREATE INDEX "FlightSegment_flightOfferId_legIndex_position_idx" ON "FlightSegment"("flightOfferId", "legIndex", "position");

-- CreateIndex
CREATE INDEX "PriceHistory_originAirportId_destinationAirportId_departure_idx" ON "PriceHistory"("originAirportId", "destinationAirportId", "departureDate", "recordedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_recordedAt_idx" ON "PriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_flightOfferId_key" ON "Favorite"("userId", "flightOfferId");

-- CreateIndex
CREATE INDEX "PriceAlert_userId_createdAt_idx" ON "PriceAlert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceAlert_enabled_lastCheckedAt_idx" ON "PriceAlert"("enabled", "lastCheckedAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_quoteCurrency_idx" ON "ExchangeRate"("quoteCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrency_quoteCurrency_key" ON "ExchangeRate"("baseCurrency", "quoteCurrency");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "AiRecommendation_userId_createdAt_idx" ON "AiRecommendation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_providerId_createdAt_idx" ON "ApiRequestLog"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_success_createdAt_idx" ON "ApiRequestLog"("success", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSearch" ADD CONSTRAINT "FlightSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSearch" ADD CONSTRAINT "FlightSearch_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSearch" ADD CONSTRAINT "FlightSearch_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightOffer" ADD CONSTRAINT "FlightOffer_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "FlightSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightOffer" ADD CONSTRAINT "FlightOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "FlightProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightOffer" ADD CONSTRAINT "FlightOffer_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSegment" ADD CONSTRAINT "FlightSegment_flightOfferId_fkey" FOREIGN KEY ("flightOfferId") REFERENCES "FlightOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSegment" ADD CONSTRAINT "FlightSegment_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSegment" ADD CONSTRAINT "FlightSegment_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSegment" ADD CONSTRAINT "FlightSegment_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "FlightProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_flightOfferId_fkey" FOREIGN KEY ("flightOfferId") REFERENCES "FlightOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_flightOfferId_fkey" FOREIGN KEY ("flightOfferId") REFERENCES "FlightOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "FlightProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
