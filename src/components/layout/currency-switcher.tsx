"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES } from "@/modules/currency/constants";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({
  value,
  inverted = false,
  className,
}: {
  value: string;
  inverted?: boolean;
  className?: string;
}) {
  const [currency, setCurrency] = useState(value);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function change(next: string) {
    setCurrency(next);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currency: next }),
      });
    } finally {
      startTransition(() => router.refresh());
    }
  }

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        disabled={isPending}
        onChange={(event) => void change(event.target.value)}
        className={cn(
          "h-8 cursor-pointer appearance-none rounded-full border px-3 pe-7 text-[11px] font-bold tracking-wide transition",
          inverted
            ? "border-white/20 bg-white/10 text-white"
            : "border-navy-200 bg-white text-navy-700 hover:border-navy-300",
        )}
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code} className="text-navy-900">
            {code}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute end-2 h-3 w-3 opacity-70"
        fill="currentColor"
      >
        <path d="M8 11L3 5h10z" />
      </svg>
    </label>
  );
}
