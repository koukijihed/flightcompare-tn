/**
 * Parses ISO-8601 durations as returned by providers ("PT12H35M", "P1DT2H").
 * Returns total minutes, or 0 for invalid input.
 */
export function parseIsoDurationMinutes(duration: string | null | undefined): number {
  if (!duration) return 0;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    duration.trim(),
  );
  if (!match) return 0;
  const [, days, hours, minutes] = match;
  return (
    Number(days ?? 0) * 24 * 60 +
    Number(hours ?? 0) * 60 +
    Number(minutes ?? 0)
  );
}

/** Difference between two timestamps in minutes (never negative). */
export function minutesBetween(
  departure: string | Date,
  arrival: string | Date,
): number {
  const start = new Date(departure).getTime();
  const end = new Date(arrival).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

export type ItineraryLike = {
  durationMinutes: number;
  departureTime: string;
  arrivalTime: string;
  stops: number;
  segments: Array<{ durationMinutes: number }>;
};

/**
 * Total journey duration of an offer across all itineraries (outbound + inbound).
 * Used for sorting and for the "fastest flight" badge.
 */
export function totalItineraryMinutes(itineraries: ItineraryLike[]): number {
  if (itineraries.length === 0) return 0;
  return itineraries.reduce((sum, itinerary) => {
    if (itinerary.durationMinutes > 0) return sum + itinerary.durationMinutes;
    const computed = minutesBetween(itinerary.departureTime, itinerary.arrivalTime);
    if (computed > 0) return sum + computed;
    return sum + itinerary.segments.reduce((s, seg) => s + seg.durationMinutes, 0);
  }, 0);
}

export function formatDurationLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}min`;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

/** Adds minutes to an ISO timestamp, returning a new ISO string. */
export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}
