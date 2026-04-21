/**
 * LLM-001: LLM Configuration Management
 *
 * Provides configuration persistence for the optional LLM integration layer.
 * INFRA-009: LLM config is a device-level preference stored in localStorage
 * so it carries across all documents on this device.
 */

import { getDevicePref, setDevicePref } from "../store/devicePreferences";

export interface LLMConfig {
  provider: "openai" | "anthropic" | "gemini" | "grok" | "deepseek" | "custom";
  apiKey: string;
  model: string;
  endpoint?: string;
  maxTokens: number;
  enabled: boolean;
}

const SETTINGS_KEY = "llmConfig";

/**
 * Persist the LLM configuration to device-level localStorage.
 */
export function saveLlmConfig(config: LLMConfig): void {
  setDevicePref(SETTINGS_KEY, config);
}

/**
 * Load the persisted LLM configuration from device-level localStorage.
 * Falls back to legacy keys for one-time migration.
 */
export function loadLlmConfig(): LLMConfig | null {
  // Try new device-pref key first
  const saved = getDevicePref(SETTINGS_KEY);
  if (saved && typeof saved === "object") {
    return saved as LLMConfig;
  }

  // One-time migration: read from legacy localStorage key
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("obiter.llmConfig");
  } catch { /* ignore */ }
  if (!raw) return null;
  try {
    const config = JSON.parse(raw) as LLMConfig;
    // Migrate to new key
    setDevicePref(SETTINGS_KEY, config);
    return config;
  } catch {
    return null;
  }
}

/**
 * Smoke-test the LLM connection by sending a trivial prompt.
 * Returns { ok: true } on success, or { ok: false, error: string } with
 * the actual error message on failure.
 */
export async function testConnection(config: LLMConfig): Promise<{ ok: boolean; error?: string }> {
  const { callLlm } = await import("./client");
  try {
    const response = await callLlm(
      config,
      "You are a connection test.",
      "Respond with the single word OK.",
    );
    return response.length > 0 ? { ok: true } : { ok: false, error: "Empty response from API" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
