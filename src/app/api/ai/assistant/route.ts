import { z } from "zod";
import { jsonOk, readJson, safeErrorMessage } from "@/lib/api";
import { aiAssistantSchema } from "@/lib/validation/schemas";
import { respondToMessage } from "@/modules/ai/assistant";
import { isAiConfigured } from "@/modules/ai/llm";
import { loadSearchForDisplay } from "@/modules/flights/search-service";
import { getDisplayCurrency } from "@/modules/currency/cookies";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOriginRequest, forbiddenOriginResponse } from "@/lib/security/origin";

const schema = aiAssistantSchema.extend({
  searchId: z.string().min(5).max(60).optional(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();

  const limit = checkRateLimit(rateLimitKey(request, "ai-assistant"), 30, 60 * 1000);
  if (!limit.allowed) {
    return jsonOk({ error: "Trop de messages. Patientez un instant." }, { status: 429 });
  }

  const parsed = await readJson(request, schema);
  if (!parsed.ok) return parsed.response;

  try {
    const context = parsed.data.searchId
      ? await loadSearchForDisplay(parsed.data.searchId, await getDisplayCurrency())
      : null;

    const reply = await respondToMessage({
      message: parsed.data.message,
      locale: parsed.data.locale,
      history: parsed.data.history,
      offers: context?.offers,
      searchSummary: context?.search,
    });

    return jsonOk({ ...reply, aiConfigured: isAiConfigured() });
  } catch (error) {
    return jsonOk(
      { error: safeErrorMessage(error, "L'assistant est momentanément indisponible.") },
      { status: 500 },
    );
  }
}
