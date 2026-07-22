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

import { WEBSITE_URL } from "../constants";
import { getAccessToken } from "../api/authClient";
import { hasVaultKey, hasLocalKeyOverride } from "./vaultMode";

/** Direct provider endpoints (used when CORS is supported). */
const DIRECT_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  grok: "https://api.x.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
};

/**
 * Providers known to block browser CORS. These are routed through
 * the Obiter proxy server to avoid cross-origin restrictions.
 *
 * As of April 2026, all supported providers allow direct browser access:
 * - OpenAI: native CORS support
 * - Anthropic: via `anthropic-dangerous-direct-browser-access` header
 * - Gemini, Grok, DeepSeek: native CORS support (Access-Control-Allow-Origin: *)
 */
const CORS_BLOCKED_PROVIDERS = new Set<string>();

interface ResolvedEndpoint {
  url: string;
  useProxy: boolean;
  /**
   * TRUST-001: for custom (user-configured) endpoints, the true target URL.
   * Sent to the proxy as `endpoint` so it can relay the request server-side.
   */
  targetEndpoint?: string;
}

/**
 * ACCT-005 — vault-proxy decision for one request.
 *
 * When the user is signed in AND has a vaulted key for the active provider AND
 * has NOT forced local BYOK, the request routes through the Obiter proxy with a
 * Bearer access token and NO inline apiKey, so the server injects the stored
 * key (ACCT-004). Otherwise (signed out, no vaulted key, or override on) the
 * request behaves exactly as the BYOK paths always have.
 */
interface VaultAuth {
  /** Bearer access token to attach; present only on the vault-proxy path. */
  accessToken: string;
}

/**
 * Resolve whether this request should use the signed-in vault-proxy path, and
 * fetch a fresh access token if so. Returns null for the ordinary BYOK path.
 */
async function resolveVaultAuth(config: LLMConfig): Promise<VaultAuth | null> {
  // Custom endpoints keep their own explicit key + TRUST-001 relay; the vault
  // stores keys only for the fixed providers.
  if (config.endpoint) return null;
  if (!hasVaultKey(config.provider)) return null;
  if (hasLocalKeyOverride(config.provider)) return null;
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return { accessToken };
}

/**
 * Request body for the Obiter LLM proxy (`POST /api/proxy/llm`,
 * website/server/index.js). The proxy relays the request server-side and
 * returns `{ text }` or `{ error }`; nothing is logged or retained.
 */
interface LlmProxyRequestBody {
  provider: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
  /** Custom target endpoint (https, OpenAI-compatible). TRUST-001. */
  endpoint?: string;
}

function resolveEndpoint(config: LLMConfig): ResolvedEndpoint {
  if (config.endpoint) {
    // TRUST-001: custom endpoints are relayed through the Obiter proxy. The
    // add-in pages ship a strict CSP whose connect-src enumerates known hosts
    // (config/csp.js), so the webview cannot fetch arbitrary user-configured
    // origins directly.
    return { url: `${WEBSITE_URL}/api/proxy/llm`, useProxy: true, targetEndpoint: config.endpoint };
  }
  const endpoint = DIRECT_ENDPOINTS[config.provider];
  if (!endpoint) {
    throw new Error(`Provider "${config.provider}" requires an explicit endpoint in LLMConfig.`);
  }
  if (CORS_BLOCKED_PROVIDERS.has(config.provider)) {
    return { url: `${WEBSITE_URL}/api/proxy/llm`, useProxy: true };
  }
  return { url: endpoint, useProxy: false };
}

// ─── Build request ──────────────────────────────────────────────────────────

function buildOpenAIRequest(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
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
    url: resolveEndpoint(config).url,
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
  userPrompt: string
): { url: string; init: RequestInit } {
  const body: AnthropicRequestBody = {
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };
  return {
    url: resolveEndpoint(config).url,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
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
  const block = json.content?.find((b: AnthropicContentBlock) => b.type === "text");
  if (!block) {
    throw new Error("Empty response from Anthropic API.");
  }
  return block.text.trim();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** A single message in a multi-turn conversation. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send a system + user prompt to the configured LLM provider and return the
 * assistant's text response.
 */
export async function callLlm(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const isAnthropic = config.provider === "anthropic";
  // ACCT-005: signed-in + vaulted key -> proxy injects the key, we send none.
  const vaultAuth = await resolveVaultAuth(config);
  const endpoint = vaultAuth
    ? { url: `${WEBSITE_URL}/api/proxy/llm`, useProxy: true as const }
    : resolveEndpoint(config);

  let url: string;
  let init: RequestInit;

  if (endpoint.useProxy) {
    // Route through Obiter proxy (CORS bypass, custom endpoints per TRUST-001,
    // or ACCT-005 vault-key injection when a Bearer token is attached).
    url = endpoint.url;
    const proxyBody: LlmProxyRequestBody = {
      provider: config.provider,
      model: config.model,
      // ACCT-005: omit the inline key on the vault path so the server injects
      // the stored key. On BYOK proxy paths keep sending the local key.
      apiKey: vaultAuth ? "" : config.apiKey,
      maxTokens: config.maxTokens,
      systemPrompt,
      userPrompt,
      ...(endpoint.targetEndpoint ? { endpoint: endpoint.targetEndpoint } : {}),
    };
    init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(vaultAuth ? { Authorization: `Bearer ${vaultAuth.accessToken}` } : {}),
      },
      body: JSON.stringify(proxyBody),
    };
  } else if (isAnthropic) {
    const req = buildAnthropicRequest(config, systemPrompt, userPrompt);
    url = req.url;
    init = req.init;
  } else {
    const req = buildOpenAIRequest(config, systemPrompt, userPrompt);
    url = req.url;
    init = req.init;
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (fetchErr: unknown) {
    // Network error — likely CORS block or no connectivity
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(
      `Cannot reach ${config.provider} API. This may be a CORS restriction — ` +
        `browser-based add-ins cannot always connect directly to LLM APIs. ` +
        `Error: ${msg}`
    );
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `${config.provider} API error (${response.status}): ${errorBody.slice(0, 200)}`
    );
  }

  const json: unknown = await response.json();

  // Proxy returns { text: "..." } directly
  if (endpoint.useProxy) {
    const proxyResult = json as { text?: string; error?: string };
    if (proxyResult.error) throw new Error(proxyResult.error);
    if (!proxyResult.text) throw new Error("Empty response from proxy");
    return proxyResult.text.trim();
  }

  return isAnthropic
    ? extractAnthropicText(json as AnthropicResponse)
    : extractOpenAIText(json as OpenAIResponse);
}

/**
 * AI-009: Multi-turn LLM conversation.
 *
 * Sends a sequence of messages (system + user/assistant turns) and returns
 * the final assistant response. Both OpenAI-compatible and Anthropic APIs
 * are supported. The system message is extracted from the first element if
 * its role is "system".
 */
export async function callLlmMultiTurn(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<string> {
  const isAnthropic = config.provider === "anthropic";
  // ACCT-005: signed-in + vaulted key -> proxy injects the key, we send none.
  const vaultAuth = await resolveVaultAuth(config);
  const endpoint = vaultAuth
    ? { url: `${WEBSITE_URL}/api/proxy/llm`, useProxy: true as const }
    : resolveEndpoint(config);

  // Separate system prompt from conversation messages
  let systemPrompt = "";
  let conversationMessages = messages;
  if (messages.length > 0 && messages[0].role === "system") {
    systemPrompt = messages[0].content;
    conversationMessages = messages.slice(1);
  }

  let url: string;
  let init: RequestInit;

  if (endpoint.useProxy) {
    // Proxy doesn't support multi-turn natively — concatenate into single turn
    const userParts = conversationMessages.map((m) => `[${m.role}]: ${m.content}`);
    url = endpoint.url;
    const proxyBody: LlmProxyRequestBody = {
      provider: config.provider,
      model: config.model,
      apiKey: vaultAuth ? "" : config.apiKey,
      maxTokens: config.maxTokens,
      systemPrompt,
      userPrompt: userParts.join("\n\n"),
      ...(endpoint.targetEndpoint ? { endpoint: endpoint.targetEndpoint } : {}),
    };
    init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(vaultAuth ? { Authorization: `Bearer ${vaultAuth.accessToken}` } : {}),
      },
      body: JSON.stringify(proxyBody),
    };
  } else if (isAnthropic) {
    const body = {
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: conversationMessages.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })),
    };
    url = endpoint.url;
    init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    };
  } else {
    const body: OpenAIRequestBody = {
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...conversationMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_tokens: config.maxTokens,
    };
    url = endpoint.url;
    init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    };
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(`Cannot reach ${config.provider} API. Error: ${msg}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `${config.provider} API error (${response.status}): ${errorBody.slice(0, 200)}`
    );
  }

  const json: unknown = await response.json();

  if (endpoint.useProxy) {
    const proxyResult = json as { text?: string; error?: string };
    if (proxyResult.error) throw new Error(proxyResult.error);
    if (!proxyResult.text) throw new Error("Empty response from proxy");
    return proxyResult.text.trim();
  }

  return isAnthropic
    ? extractAnthropicText(json as AnthropicResponse)
    : extractOpenAIText(json as OpenAIResponse);
}
