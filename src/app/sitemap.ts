import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
import { routing } from "@/i18n/routing";

const LEGAL_DOCS = ["terms", "privacy", "cookies", "about"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    entries.push({
      url: `${config.appUrl}/${locale}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    });
    entries.push({
      url: `${config.appUrl}/${locale}/alerts`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
    for (const doc of LEGAL_DOCS) {
      entries.push({
        url: `${config.appUrl}/${locale}/legal/${doc}`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.3,
      });
    }
  }

  return entries;
}
