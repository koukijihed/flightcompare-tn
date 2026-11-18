import { cn } from "@/lib/utils";

export function Logo({
  className,
  inverted = false,
  compact = false,
}: {
  className?: string;
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-[13px] bg-gradient-to-br from-sky-500 via-sky-600 to-turquoise-600 shadow-sm">
        <svg
          viewBox="0 0 32 32"
          aria-hidden
          className="h-5 w-5 text-white"
          fill="none"
        >
          {/* stylised wing + flight path */}
          <path
            d="M4 20.5l7.2 2.1 10.4-9.6c1.2-1.1 2.8-1.5 4.3-1.1l-1.3 1.6-11.6 12.6-3.9-1.1-2.1 3.1-1.9-.6 1.3-3.2-2.4-.7 1-3.1z"
            fill="currentColor"
          />
          <circle cx="24" cy="8" r="2.4" fill="currentColor" opacity="0.55" />
          <path
            d="M20.4 10.6C16 12.2 12 15.4 9.2 19.4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.6"
            strokeDasharray="2 3"
          />
        </svg>
      </span>
      {!compact ? (
        <span
          className={cn(
            "font-display text-[17px] leading-none font-extrabold tracking-tight",
            inverted ? "text-white" : "text-navy-900",
          )}
        >
          FlightCompare
          <span
            className={cn(
              "ms-1 inline-flex items-center rounded-md px-1.5 py-0.5 align-middle text-[10px] font-bold",
              inverted
                ? "bg-white/15 text-white"
                : "bg-turquoise-100 text-turquoise-700",
            )}
          >
            TN
          </span>
        </span>
      ) : null}
    </span>
  );
}
