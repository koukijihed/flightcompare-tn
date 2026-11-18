import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

/**
 * Flight result pages must stay out of search engines (Travelpayouts
 * requirement, and stale prices should never be indexed). Locale prefixes are
 * explicit because `Disallow: /search` would not match `/fr/search`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/fr/search",
          "/en/search",
          "/ar/search",
          "/fr/compare",
          "/en/compare",
          "/ar/compare",
          "/fr/flights/",
          "/en/flights/",
          "/ar/flights/",
          "/fr/dashboard",
          "/en/dashboard",
          "/ar/dashboard",
          "/fr/admin",
          "/en/admin",
          "/ar/admin",
        ],
      },
    ],
    sitemap: `${config.appUrl}/sitemap.xml`,
    host: config.appUrl,
  };
}
