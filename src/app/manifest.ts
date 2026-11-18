import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlightCompare TN",
    short_name: "FlightCompare",
    description:
      "Comparez les prix des vols au départ de Tunisie et vers le monde entier.",
    start_url: "/fr",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#0f172a",
    lang: "fr",
    dir: "ltr",
    categories: ["travel", "shopping"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
