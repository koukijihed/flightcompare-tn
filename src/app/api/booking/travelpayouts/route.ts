import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { decodeTravelpayoutsBookingCode } from "@/modules/providers/travelpayouts";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGITS = /^\d{1,20}$/;
const IATA = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fallbackResponse(
  code: ReturnType<typeof decodeTravelpayoutsBookingCode>,
  message: string,
): NextResponse {
  const search = code
    ? `/fr/search?origin=${code.o}&destination=${code.d}&departureDate=${code.dd}${
        code.rd ? `&returnDate=${code.rd}` : ""
      }&tripType=${code.rd ? "ROUND_TRIP" : "ONE_WAY"}&adults=${code.a}&children=0&infants=0&cabinClass=ECONOMY`
    : "/fr/search";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lien de réservation expiré</title></head><body style="font-family:system-ui,sans-serif;max-width:560px;margin:64px auto;padding:0 20px;color:#0f172a"><h1 style="font-size:20px">Lien de réservation expiré</h1><p style="line-height:1.6;color:#475569">${message}</p><p><a href="${search}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Relancer la recherche</a></p></body></html>`;
  return new NextResponse(html, {
    status: 502,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Resolves a Travelpayouts affiliate "Buy" link at click time.
 *
 * Travelpayouts forbids collecting booking links automatically: the agency URL
 * must only be requested when the visitor actually clicks "Buy". This endpoint
 * therefore performs the click request on demand and redirects immediately.
 */
export async function GET(request: Request) {
  const limit = checkRateLimit(`booking-click:${clientIp(request)}`, 40, 60 * 1000);
  if (!limit.allowed) {
    return new NextResponse("Trop de demandes. Réessayez dans une minute.", {
      status: 429,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(request.url);
  const code = decodeTravelpayoutsBookingCode(url.searchParams.get("code") ?? "");
  if (
    !code ||
    !UUID.test(code.s) ||
    !DIGITS.test(code.u) ||
    !IATA.test(code.o) ||
    !IATA.test(code.d) ||
    !DATE.test(code.dd) ||
    (code.rd !== null && !DATE.test(code.rd)) ||
    !Number.isInteger(code.a) ||
    code.a < 1 ||
    code.a > 9
  ) {
    return fallbackResponse(code, "Le lien de réservation est invalide.");
  }

  if (!config.travelpayouts.configured) {
    return fallbackResponse(
      code,
      "Le fournisseur de vols n'est pas configuré sur ce serveur. Ajoutez vos identifiants Travelpayouts.",
    );
  }

  try {
    const response = await fetch(
      `${config.travelpayouts.baseUrl}/v1/flight_searches/${encodeURIComponent(code.s)}/clicks/${encodeURIComponent(code.u)}.json`,
      {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) {
      return fallbackResponse(
        code,
        "Ce tarif n'est plus disponible (le lien de réservation expire après 15 minutes).",
      );
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url) {
      return fallbackResponse(code, "L'agence n'a pas retourné de lien de réservation.");
    }

    const target = new URL(payload.url);
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return fallbackResponse(code, "L'agence a retourné un lien non sécurisé.");
    }

    const redirect = NextResponse.redirect(target.toString(), 302);
    redirect.headers.set("cache-control", "no-store");
    redirect.headers.set("referrer-policy", "no-referrer");
    return redirect;
  } catch {
    return fallbackResponse(
      code,
      "Impossible de joindre l'agence pour le moment. Relancez la recherche pour obtenir un tarif à jour.",
    );
  }
}
