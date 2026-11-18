import { ZodError, type ZodType } from "zod";

export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export function jsonError(
  message: string,
  status = 400,
  code?: string,
  details?: unknown,
) {
  const body: ApiErrorBody = { error: message, code, details };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Validates a JSON body against a Zod schema, returning a typed result. */
export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError("Corps de requête JSON invalide.", 400, "INVALID_JSON"),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(
        firstIssueMessage(parsed.error),
        422,
        "VALIDATION_ERROR",
        fieldErrors(parsed.error),
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Données invalides.";
}

export function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** Maps unknown thrown values to a safe message (never leaks stack traces). */
export function safeErrorMessage(error: unknown, fallback = "Une erreur est survenue.") {
  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return error.message;
  }
  return fallback;
}
