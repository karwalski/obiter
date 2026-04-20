/**
 * Shared LLM HTTP client.
 *
 * Abstracts over the OpenAI and Anthropic chat-completion APIs so
 * that every feature module can call a single function.
 */

import { LLMConfig } from "./config";

// ─── Provider-specific request / response shapes ────────────────────────────

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequestBody {
  model: string;
  messages: OpenAIMessage[];
  max_tokens: number;
}

interface OpenAIChoice {
  message: { content: string };
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
}

interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user"; content: string }>;
}

interface AnthropicContentBlock {
  type: string;
  text: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

// ─── Endpoint resolution ────────────────────────────────────────────────────

/** Provider endpoint map. Gemini, Grok, and DeepSeek all use OpenAI-compatible APIs. */
const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  grok: "https://api.x.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
};

function resolveEndpoint(config: LLMConfig): string {
  if (config.endpoint) {
    return config.endpoint;
  }
  const endpoint = PROVIDER_ENDPOINTS[config.provider];
  if (!endpoint) {
    throw new Error(
      `Provider "${config.provider}" requires an explicit endpoint in LLMConfig.`,
    );
  }
  return endpoint;
}

// ─── Build request ──────────────────────────────────────────────────────────

function buildOpenAIRequest(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string,
): { url: string; init: RequestInit } {
  const body: OpenAIRequestBody = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: config.maxTokens,
  };
  return {
    url: resolveEndpoint(config),
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  };
}

function buildAnthropicRequest(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string,
): { url: string; init: RequestInit } {
  const body: AnthropicRequestBody = {
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };
  return {
    url: resolveEndpoint(config),
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2024-10-22",
      },
      body: JSON.stringify(body),
    },
  };
}

// ─── Response extraction ────────────────────────────────────────────────────

function extractOpenAIText(json: OpenAIResponse): string {
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Empty response from OpenAI-compatible API.");
  }
  return text.trim();
}

function extractAnthropicText(json: AnthropicResponse): string {
  const block = json.content?.find(
    (b: AnthropicContentBlock) => b.type === "text",
  );
  if (!block) {
    throw new Error("Empty response from Anthropic API.");
  }
  return block.text.trim();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Send a system + user prompt to the configured LLM provider and return the
 * assistant's text response.
 */
export async function callLlm(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const isAnthropic = config.provider === "anthropic";

  const { url, init } = isAnthropic
    ? buildAnthropicRequest(config, systemPrompt, userPrompt)
    : buildOpenAIRequest(config, systemPrompt, userPrompt);

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (fetchErr: unknown) {
    // Network error — likely CORS block or no connectivity
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(
      `Cannot reach ${config.provider} API. This may be a CORS restriction — ` +
      `browser-based add-ins cannot always connect directly to LLM APIs. ` +
      `Error: ${msg}`,
    );
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `${config.provider} API error (${response.status}): ${errorBody.slice(0, 200)}`,
    );
  }

  const json: unknown = await response.json();

  return isAnthropic
    ? extractAnthropicText(json as AnthropicResponse)
    : extractOpenAIText(json as OpenAIResponse);
}
