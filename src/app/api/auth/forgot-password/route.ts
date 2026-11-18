import { createHash, randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";
import {
  isEmailConfigured,
  passwordResetEmail,
  sendEmail,
  type EmailLocale,
} from "@/lib/email";

const NEUTRAL_MESSAGE =
  "Si un compte existe pour cette adresse, un lien de réinitialisation a été envoyé.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function emailLocale(value: string): EmailLocale {
  return value === "en" || value === "ar" ? value : "fr";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "forgot"), 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return jsonError("Trop de demandes. Réessayez plus tard.", 429, "RATE_LIMITED");
  }

  const parsed = await readJson(request, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      firstName: true,
      isActive: true,
      preferredLanguage: true,
    },
  });

  if (!user || !user.isActive) {
    // Same response for unknown accounts (no enumeration).
    return jsonOk({ message: NEUTRAL_MESSAGE, emailDeliveryConfigured: isEmailConfigured() });
  }

  const token = randomBytes(32).toString("hex");
  // Invalidate previous unused tokens so only the latest e-mail link works.
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const locale = emailLocale(user.preferredLanguage);
  const resetUrl = `${config.appUrl}/${locale}/reset-password?token=${token}`;
  const configured = isEmailConfigured();
  let delivered = false;

  if (configured) {
    const content = passwordResetEmail({
      name: user.firstName,
      url: resetUrl,
      locale,
    });
    const result = await sendEmail({
      to: user.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
      tags: [{ name: "type", value: "password_reset" }],
    });
    delivered = result.ok;
    if (!result.ok) {
      console.error("[forgot-password] e-mail delivery failed", result.error);
    }
  }

  /**
   * Without an e-mail provider the flow would be unusable. The token is
   * exposed ONLY outside production so local development remains testable;
   * production never returns the secret to the client.
   */
  const exposeToken = !configured && process.env.NODE_ENV !== "production";

  return jsonOk({
    message: NEUTRAL_MESSAGE,
    ...(exposeToken ? { resetUrl: `/reset-password?token=${token}` } : {}),
    emailDeliveryConfigured: configured,
    delivered,
  });
}
