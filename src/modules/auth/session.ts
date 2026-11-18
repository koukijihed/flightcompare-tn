import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import prisma from "@/lib/prisma";
import { config } from "@/lib/config";

const COOKIE_NAME = "fc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const AUDIENCE = "flightcompare-tn";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN";
  preferredLanguage: string;
  preferredCurrency: string;
};

function secret(): Uint8Array {
  return new TextEncoder().encode(config.authSecret);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("flightcompare-tn")
    .setAudience(AUDIENCE)
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: "flightcompare-tn",
      audience: AUDIENCE,
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Current authenticated user, deduplicated per request.
 * Returns null for anonymous visitors, invalid sessions and deactivated users.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await readUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      preferredLanguage: true,
      preferredCurrency: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    preferredCurrency: user.preferredCurrency,
  };
});

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
}

/** Explicit cache invalidation helper for route handlers after profile changes. */
export function sessionCookieName() {
  return COOKIE_NAME;
}
