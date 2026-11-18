import prisma from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { config } from "@/lib/config";
import { amadeusSearchLocations } from "@/modules/providers/amadeus";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import type { AirportSuggestion } from "@/types/flight";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  const limit = checkRateLimit(rateLimitKey(request, "airports"), 120, 60 * 1000);
  if (!limit.allowed) {
    return jsonOk({ airports: [] }, { status: 429 });
  }

  if (query.length < 2) return jsonOk({ airports: [] });

  const like = query;
  const rows = await prisma.airport.findMany({
    where: {
      OR: [
        { iataCode: { startsWith: like.toUpperCase() } },
        { city: { contains: like, mode: "insensitive" } },
        { name: { contains: like, mode: "insensitive" } },
        { country: { contains: like, mode: "insensitive" } },
      ],
    },
    orderBy: [{ city: "asc" }],
    take: 10,
  });

  const suggestions: AirportSuggestion[] = rows.map((airport) => ({
    id: airport.id,
    iataCode: airport.iataCode,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    countryCode: airport.countryCode,
    timezone: airport.timezone,
    label: `${airport.city} (${airport.iataCode})`,
  }));

  // Fallback to Amadeus reference data when the local catalogue has few matches.
  if (suggestions.length < 3 && config.amadeus.configured) {
    try {
      const remote = await amadeusSearchLocations(query, AbortSignal.timeout(5000));
      for (const location of remote) {
        if (suggestions.some((item) => item.iataCode === location.iataCode)) continue;
        suggestions.push({
          iataCode: location.iataCode,
          name: location.name,
          city: location.city || location.name,
          country: location.country,
          label: `${location.city || location.name} (${location.iataCode})`,
        });
      }
    } catch {
      // Remote autocomplete is optional; local results remain usable.
    }
  }

  return jsonOk({ airports: suggestions.slice(0, 10) });
}
