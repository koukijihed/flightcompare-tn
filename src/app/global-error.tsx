"use client";

/**
 * Last-resort error boundary: it replaces the root layout, so it must render
 * its own <html>/<body> and cannot rely on next-intl providers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f9fc",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 460, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>
            Une erreur est survenue / Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#475569", margin: "0 0 20px" }}>
            Réessayez dans un instant. / Please try again in a moment.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 20px" }}>{error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 12,
              background: "#0ea5e9",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              padding: "12px 20px",
              cursor: "pointer",
            }}
          >
            Réessayer / Retry
          </button>
        </main>
      </body>
    </html>
  );
}
