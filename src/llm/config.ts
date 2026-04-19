/**
 * LLM-001: LLM Configuration Management
 *
 * Provides configuration persistence for the optional LLM integration layer.
 * Settings are stored via Office.context.roamingSettings so they follow the
 * user across machines.
 */

export interface LLMConfig {
  provider: "openai" | "anthropic" | "custom";
  apiKey: string;
  model: string;
  endpoint?: string;
  maxTokens: number;
  enabled: boolean;
}

const SETTINGS_KEY = "obiter.llmConfig";

/**
 * Persist the LLM configuration using Office document settings with
 * localStorage fallback. roamingSettings is Outlook-only and unavailable
 * in Word add-ins.
 */
export function saveLlmConfig(config: LLMConfig): void {
  const serialised = JSON.stringify(config);
  try {
    if (typeof Office !== "undefined" && Office.context?.document?.settings) {
      Office.context.document.settings.set(SETTINGS_KEY, serialised);
      Office.context.document.settings.saveAsync();
    }
  } catch { /* fall through */ }
  try {
    localStorage.setItem(SETTINGS_KEY, serialised);
  } catch { /* ignore */ }
}

/**
 * Load the persisted LLM configuration. Tries Office document settings
 * first, then localStorage. Returns null when nothing is saved.
 */
export function loadLlmConfig(): LLMConfig | null {
  let raw: string | undefined | null;
  try {
    if (typeof Office !== "undefined" && Office.context?.document?.settings) {
      raw = Office.context.document.settings.get(SETTINGS_KEY) as string | undefined;
    }
  } catch { /* fall through */ }
  if (!raw) {
    try {
      raw = localStorage.getItem(SETTINGS_KEY);
    } catch { /* ignore */ }
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LLMConfig;
  } catch {
    return null;
  }
}

/**
 * Smoke-test the LLM connection by sending a trivial prompt and checking
 * for a non-empty response.
 */
export async function testConnection(config: LLMConfig): Promise<boolean> {
  // Inline import to avoid circular dependency at module load time.
  const { callLlm } = await import("./client");
  try {
    const response = await callLlm(
      config,
      "You are a connection test.",
      "Respond with the single word OK.",
    );
    return response.length > 0;
  } catch {
    return false;
  }
}
