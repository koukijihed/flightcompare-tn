import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";

export default async function LocaleLoading() {
  const t = await getTranslations("common");

  return (
    <div className="container-page flex min-h-[40vh] items-center justify-center py-16" role="status">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-navy-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("loading")}
      </span>
    </div>
  );
}
