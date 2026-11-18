import "server-only";
import { config } from "./config";

/**
 * Transactional e-mail through Resend (https://resend.com/docs/api-reference).
 * The adapter is intentionally dependency-free: a single HTTPS call.
 */

export type EmailLocale = "fr" | "en" | "ar";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type EmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; skipped?: boolean };

export function isEmailConfigured(): boolean {
  return config.resend.configured;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!config.resend.configured) {
    return { ok: false, error: "EMAIL_NOT_CONFIGURED", skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.resend.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.resend.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        ...(payload.replyTo ?? config.resend.replyTo
          ? { reply_to: payload.replyTo ?? config.resend.replyTo }
          : {}),
        ...(payload.tags ? { tags: payload.tags } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string; error?: string };
        detail = body.message ?? body.error ?? detail;
      } catch {
        /* keep the status */
      }
      console.error("[email] Resend rejected the message", detail);
      return { ok: false, error: detail };
    }

    const body = (await response.json()) as { id?: string };
    return { ok: true, id: body.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    console.error("[email] Resend request failed", message);
    return { ok: false, error: message };
  }
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

type LayoutInput = {
  locale: EmailLocale;
  title: string;
  intro: string;
  body: string;
  cta?: { label: string; url: string };
  footnote: string;
};

function layout({ locale, title, intro, body, cta, footnote }: LayoutInput): string {
  const rtl = locale === "ar";
  return `<!doctype html>
<html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
          <tr><td style="background:#0f172a;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:bold">FlightCompare TN</td></tr>
          <tr><td style="padding:28px 24px 8px">
            <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#334155">${escapeHtml(intro)}</p>
            <div style="font-size:14px;line-height:1.7;color:#334155">${body}</div>
            ${
              cta
                ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold;font-size:14px">${escapeHtml(cta.label)}</a></p>
                   <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;word-break:break-all">${escapeHtml(cta.url)}</p>`
                : ""
            }
          </td></tr>
          <tr><td style="padding:16px 24px 24px;border-top:1px solid #e2e8f0;font-size:11px;line-height:1.6;color:#94a3b8">${escapeHtml(footnote)}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const FOOTER: Record<EmailLocale, string> = {
  fr: "Vous recevez cet e-mail car une action a été effectuée sur votre compte FlightCompare TN. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  en: "You received this e-mail because an action was taken on your FlightCompare TN account. If this wasn't you, ignore this message.",
  ar: "تلقيت هذا البريد لأن إجراءً تم على حسابك في FlightCompare TN. إذا لم تكن أنت المصدر، تجاهل هذه الرسالة.",
};

export function passwordResetEmail(input: {
  name: string;
  url: string;
  locale: EmailLocale;
}): { subject: string; html: string; text: string } {
  const { name, url, locale } = input;
  // `layout()` escapes the intro it receives, so the name must not be escaped here.
  const displayName =
    name || (locale === "ar" ? "عميلنا" : locale === "en" ? "there" : "bonjour");

  if (locale === "en") {
    return {
      subject: "Reset your FlightCompare TN password",
      html: layout({
        locale,
        title: "Reset your password",
        intro: `Hi ${displayName},`,
        body: `<p style="margin:0 0 12px">Use the button below to choose a new password. The link expires in 60 minutes and can be used only once.</p>`,
        cta: { label: "Choose a new password", url },
        footnote: FOOTER.en,
      }),
      text: `Hi ${name},\n\nReset your FlightCompare TN password (valid 60 minutes, single use):\n${url}\n\nIf you did not request this, ignore this e-mail.`,
    };
  }

  if (locale === "ar") {
    return {
      subject: "إعادة تعيين كلمة المرور — FlightCompare TN",
      html: layout({
        locale,
        title: "إعادة تعيين كلمة المرور",
        intro: `مرحبًا ${displayName}،`,
        body: `<p style="margin:0 0 12px">استخدم الزر أدناه لاختيار كلمة مرور جديدة. الرابط صالح لمدة 60 دقيقة ولمرة واحدة فقط.</p>`,
        cta: { label: "اختيار كلمة مرور جديدة", url },
        footnote: FOOTER.ar,
      }),
      text: `مرحبًا ${name},\n\nأعد تعيين كلمة المرور الخاصة بك (صالح لمدة 60 دقيقة، لمرة واحدة):\n${url}\n\nإذا لم تطلب ذلك، تجاهل هذا البريد.`,
    };
  }

  return {
    subject: "Réinitialisez votre mot de passe FlightCompare TN",
    html: layout({
      locale,
      title: "Réinitialisez votre mot de passe",
      intro: `Bonjour ${displayName},`,
      body: `<p style="margin:0 0 12px">Utilisez le bouton ci-dessous pour choisir un nouveau mot de passe. Le lien expire dans 60 minutes et ne peut être utilisé qu'une seule fois.</p>`,
      cta: { label: "Choisir un nouveau mot de passe", url },
      footnote: FOOTER.fr,
    }),
    text: `Bonjour ${name},\n\nRéinitialisez votre mot de passe FlightCompare TN (valable 60 minutes, usage unique) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
  };
}

export function priceAlertEmail(input: {
  name: string;
  locale: EmailLocale;
  route: string;
  price: string;
  target: string;
  provider: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const { name, locale, route, price, target, provider, url } = input;
  // `layout()` escapes the intro; the body is raw HTML and needs its own escaping.
  const displayName = name || "—";
  const safeRoute = escapeHtml(route);
  const safePrice = escapeHtml(price);
  const safeTarget = escapeHtml(target);
  const safeProvider = escapeHtml(provider);

  if (locale === "en") {
    return {
      subject: `Price alert: ${route} from ${price}`,
      html: layout({
        locale,
        title: "Your price target was reached",
        intro: `Hi ${displayName},`,
        body: `<p style="margin:0 0 10px">A fare <strong>${safeRoute}</strong> was observed at <strong>${safePrice}</strong> (${safeProvider}), below your target of ${safeTarget}.</p><p style="margin:0;color:#64748b;font-size:12px">Cached price observed within the last 48 hours. Check availability before booking.</p>`,
        cta: { label: "See the search", url },
        footnote: FOOTER.en,
      }),
      text: `Hi ${name},\n\nA fare ${route} was observed at ${price} (${provider}), below your target of ${target}.\nCheck availability before booking: ${url}\n\nCached price observed within the last 48 hours.`,
    };
  }

  if (locale === "ar") {
    return {
      subject: `تنبيه سعر: ${route} بسعر ${price}`,
      html: layout({
        locale,
        title: "تم بلوغ هدف السعر",
        intro: `مرحبًا ${displayName}،`,
        body: `<p style="margin:0 0 10px">تم رصد عرض <strong>${safeRoute}</strong> بسعر <strong>${safePrice}</strong> (${safeProvider})، أي أقل من هدفك ${safeTarget}.</p><p style="margin:0;color:#64748b;font-size:12px">سعر مخزّن تم رصده خلال آخر 48 ساعة. تحقق من التوفر قبل الحجز.</p>`,
        cta: { label: "عرض البحث", url },
        footnote: FOOTER.ar,
      }),
      text: `مرحبًا ${name},\n\nتم رصد عرض ${route} بسعر ${price} (${provider})، أقل من هدفك ${target}.\nتحقق من التوفر قبل الحجز: ${url}\n\nسعر مخزّن خلال آخر 48 ساعة.`,
    };
  }

  return {
    subject: `Alerte prix : ${route} à ${price}`,
    html: layout({
      locale,
      title: "Votre objectif de prix est atteint",
      intro: `Bonjour ${displayName},`,
      body: `<p style="margin:0 0 10px">Une offre <strong>${safeRoute}</strong> a été observée à <strong>${safePrice}</strong> (${safeProvider}), sous votre objectif de ${safeTarget}.</p><p style="margin:0;color:#64748b;font-size:12px">Prix en cache observé ces dernières 48 heures. Vérifiez la disponibilité avant de réserver.</p>`,
      cta: { label: "Voir la recherche", url },
      footnote: FOOTER.fr,
    }),
    text: `Bonjour ${name},\n\nUne offre ${route} a été observée à ${price} (${provider}), sous votre objectif de ${target}.\nVérifiez la disponibilité avant de réserver : ${url}\n\nPrix en cache observé ces dernières 48 heures.`,
  };
}
