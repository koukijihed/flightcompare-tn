import { ImageResponse } from "next/og";

export const alt = "FlightCompare TN — Comparez les vols depuis la Tunisie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// The parent layout is `force-dynamic`; pin the social card to a static render.
export const dynamic = "force-static";

/**
 * Branded social card. Generated at build time, no external assets so the
 * image stays available even when the site is deployed behind a strict CSP.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0f172a 0%, #0c4a6e 55%, #0e7490 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#0ea5e9",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            FC
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>
              FlightCompare TN
            </span>
            <span style={{ fontSize: 18, color: "#bae6fd" }}>
              Comparateur de vols · Tunisie
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>
            Comparez les vols.
            <br />
            Voyagez intelligemment.
          </span>
          <span style={{ fontSize: 24, color: "#e0f2fe", maxWidth: 820 }}>
            Prix, durées, escales et bagages réunis en un seul écran, au départ de Tunisie.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["TUN - IST", "TUN - CDG", "TUN - DJE"].map((route) => (
            <div
              key={route}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.10)",
                fontSize: 20,
                fontWeight: 600,
                color: "#f0f9ff",
              }}
            >
              {route}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              padding: "10px 22px",
              borderRadius: 999,
              background: "#f59e0b",
              color: "#0f172a",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            flightcompare.tn
          </div>
        </div>
      </div>
    ),
    size,
  );
}
