import { cn } from "@/lib/utils";

export function AirlineAvatar({
  code,
  name,
  size = "md",
  className,
}: {
  code?: string | null;
  name?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const initials = (code ?? name ?? "??").slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-navy-900 font-bold tracking-wide text-white",
        size === "sm" ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-xs",
        className,
      )}
    >
      {initials}
    </span>
  );
}
