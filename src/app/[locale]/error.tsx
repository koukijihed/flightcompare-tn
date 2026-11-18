"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("[ui] unhandled error", error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <TriangleAlert className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-lg font-bold text-navy-900">
          {t("unexpectedError")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">{t("unexpectedErrorText")}</p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11px] text-navy-400">{error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="accent" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("retry")}
          </Button>
          <Link href="/" className="text-xs font-semibold text-sky-700 hover:underline">
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
