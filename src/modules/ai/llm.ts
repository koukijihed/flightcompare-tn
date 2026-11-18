import "server-only";
import { config } from "@/lib/config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function isAiConfigured(): boolean {
  return config.ai.configured;
}

/**
 * Calls an OpenAI-compatible chat completion endpoint.
 * Returns null on any failure so callers always keep a deterministic fallback.
 */
export async function llmComplete(
  messages: ChatMessage[],
  options: { json?: boolean; timeoutMs?: number; temperature?: number } = {},
): Promise<string | null> {
  if (!config.ai.configured) return null;

  try {
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages,
        temperature: options.temperature ?? 0.2,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
