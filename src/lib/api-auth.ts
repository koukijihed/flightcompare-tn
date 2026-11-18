import { jsonError } from "@/lib/api";
import { getCurrentUser, type SessionUser } from "@/modules/auth/session";

type Guard<T> = { user: T; response: null } | { user: null; response: Response };

export async function requireUserApi(): Promise<Guard<SessionUser>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: jsonError("Authentification requise.", 401, "UNAUTHENTICATED"),
    };
  }
  return { user, response: null };
}

export async function requireAdminApi(): Promise<Guard<SessionUser>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: jsonError("Authentification requise.", 401, "UNAUTHENTICATED"),
    };
  }
  if (user.role !== "ADMIN") {
    return {
      user: null,
      response: jsonError("Accès réservé aux administrateurs.", 403, "FORBIDDEN"),
    };
  }
  return { user, response: null };
}
