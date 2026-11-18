import { getTranslations } from "next-intl/server";
import type { FlightOfferDTO } from "@/types/flight";
import { groupSegments } from "@/modules/comparison/compare";
import { formatDuration, formatTime, intlLocale } from "@/lib/utils";
import { Plane } from "lucide-react";
import { AirlineAvatar } from "./airline-avatar";

export async function Itinerary({
  offer,
  locale,
}: {
  offer: FlightOfferDTO;
  locale: string;
}) {
  const t = await getTranslations("flight");
  const intl = intlLocale(locale);
  const legs = groupSegments(offer);

  return (
    <div className="space-y-6">
      {legs.map((leg) => (
        <div key={leg.legIndex}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold tracking-wide text-navy-500 uppercase">
              {leg.direction === "INBOUND" ? t("inbound") : t("outbound")}
            </h3>
            <span className="text-[11px] text-navy-400">
              {leg.departureTime
                ? new Intl.DateTimeFormat(intl, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  }).format(new Date(leg.departureTime))
                : ""}
            </span>
          </div>

          <ol className="relative space-y-4 border-s border-dashed border-navy-200 ps-5">
            {leg.segments.map((segment, index) => (
              <li key={segment.id ?? index} className="relative">
                <span className="absolute -start-[27px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-sky-500 bg-white" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-navy-900">
                      {formatTime(segment.departureTime, intl)} ·{" "}
                      {segment.origin.iataCode}
                      <span className="ms-1.5 text-xs font-normal text-navy-500">
                        {segment.origin.city}
                      </span>
                    </p>
                    <p className="mt-2 text-sm font-bold text-navy-900">
                      {formatTime(segment.arrivalTime, intl)} ·{" "}
                      {segment.destination.iataCode}
                      <span className="ms-1.5 text-xs font-normal text-navy-500">
                        {segment.destination.city}
                      </span>
                    </p>
                  </div>
                  <div className="text-end">
                    <div className="flex items-center justify-end gap-2">
                      <AirlineAvatar
                        code={segment.airline?.iataCode}
                        name={segment.airline?.name}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-navy-800">
                          {segment.airline?.name ?? "—"}
                        </p>
                        <p className="text-[11px] text-navy-500">{segment.flightNumber}</p>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-navy-500">
                      {formatDuration(segment.durationMinutes)}
                    </p>
                  </div>
                </div>

                {index < leg.segments.length - 1 ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                    <Plane className="h-3.5 w-3.5" aria-hidden />
                    {t("layover")} · {segment.destination.iataCode} ·{" "}
                    {formatDuration(
                      Math.max(
                        0,
                        Math.round(
                          (new Date(leg.segments[index + 1]!.departureTime).getTime() -
                            new Date(segment.arrivalTime).getTime()) /
                            60000,
                        ),
                      ),
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
