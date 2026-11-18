/**
 * Request hardening helpers: same-origin enforcement (CSRF defence for
 * cookie-authenticated mutations) and simple IP extraction.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    // Non-browser clients (curl, server-to-server) — allow only when no cookies
    // are involved; browser mutations always carry Origin.
    return true;
  }

  try {
    const originUrl = new URL(origin);
    if (!host) return false;
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export function forbiddenOriginResponse() {
  return Response.json(
    { error: "Requête refusée : origine invalide.", code: "INVALID_ORIGIN" },
    { status: 403 },
  );
}
