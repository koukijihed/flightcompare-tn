import { jsonOk, readJson, safeErrorMessage } from "@/lib/api";
import { aiSearchSchema } from "@/lib/validation/schemas";
import { extractSearchIntent, intentToSearchUrl } from "@/modules/ai/service";
import { isAiConfigured } from "@/modules/ai/llm";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "ai-search"), 30, 60 * 1000);
  if (!limit.allowed) {
    return jsonOk({ error: "Trop de requêtes." }, { status: 429 });
  }

  const parsed = await readJson(request, aiSearchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { intent, source } = await extractSearchIntent(parsed.data.text);
    return jsonOk({
      intent,
      source,
      aiConfigured: isAiConfigured(),
      searchUrl: intentToSearchUrl(intent),
    });
  } catch (error) {
    return jsonOk(
      { error: safeErrorMessage(error, "Impossible d'analyser la demande.") },
      { status: 500 },
    );
  }
}
