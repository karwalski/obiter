/**
 * LLM-001: LLM Configuration Management
 *
 * Provides configuration persistence for the optional LLM integration layer.
 * INFRA-009: LLM config is a device-level preference stored in localStorage
 * so it carries across all documents on this device.
 */

import { getDevicePref, setDevicePref } from "../store/devicePreferences";
import { removeAllKeys } from "../api/keyVault";

export interface LLMConfig {
  provider: "openai" | "anthropic" | "gemini" | "grok" | "deepseek" | "custom";
  apiKey: string;
  model: string;
  endpoint?: string;
  maxTokens: number;
  enabled: boolean;
}

const SETTINGS_KEY = "llmConfig";

/** Pre-INFRA-009 localStorage key that stored the whole config (key included). */
const LEGACY_STORAGE_KEY = "obiter.llmConfig";

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
    raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
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

/** Outcome of clearStoredKeys, used by the Settings announcement. */
export interface ClearStoredKeysResult {
  /** True when the saved LLM config held key material that was blanked. */
  llmKeyCleared: boolean;
  /** Number of source-adapter key-vault entries removed. */
  vaultKeysRemoved: number;
  /** True when the legacy `obiter.llmConfig` localStorage entry was removed. */
  legacyRemoved: boolean;
}

/**
 * TRUST-006: Remove every API key Obiter has persisted on this device.
 *
 * Clears the key material from the saved LLM config (all other LLM settings
 * are kept), deletes every source-adapter entry in the key vault
 * (`obiter-device.sourceKey.*`), and deletes the legacy `obiter.llmConfig`
 * localStorage entry, which embedded the key in the whole-config JSON.
 */
export function clearStoredKeys(): ClearStoredKeysResult {
  // Blank the key inside the saved LLM config, preserving other settings.
  let llmKeyCleared = false;
  const saved = getDevicePref(SETTINGS_KEY);
  if (saved && typeof saved === "object") {
    const config = saved as LLMConfig;
    llmKeyCleared = typeof config.apiKey === "string" && config.apiKey.length > 0;
    setDevicePref(SETTINGS_KEY, { ...config, apiKey: "" });
  }

  // Remove the legacy whole-config entry (contained the key verbatim).
  let legacyRemoved = false;
  try {
    if (localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      legacyRemoved = true;
    }
  } catch {
    /* ignore */
  }

  // Remove every source-adapter key in the vault.
  const vaultKeysRemoved = removeAllKeys();

  return { llmKeyCleared, vaultKeysRemoved, legacyRemoved };
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
      "Respond with the single word OK."
    );
    return response.length > 0 ? { ok: true } : { ok: false, error: "Empty response from API" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
