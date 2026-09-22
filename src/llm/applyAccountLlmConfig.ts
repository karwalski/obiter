/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * BUG-007 — Decide the LLM configuration to use after sign-in.
 *
 * Signing in used to leave the AI Assistant on its device defaults (OpenAI,
 * disabled) even when the account held a vaulted Anthropic key, so the user
 * had to pick the provider, enable and save by hand. This pure resolver
 * applies, in order of precedence:
 *   1. the account's synced llmConfig (when settings sync is on) — the local
 *      apiKey is always kept, the synced copy never carries one;
 *   2. otherwise, a vaulted key: when the local config is absent or disabled,
 *      switch to the vault provider (preferring the local provider when it is
 *      vaulted) with that provider's default model and enable AI features;
 *   3. otherwise leave the local config alone.
 */

import type { LLMConfig } from "./config";
import type { SyncedLlmConfig } from "../api/settingsSync";
import { LLM_PROVIDER_LABELS, defaultModelFor, isLlmProvider } from "./providers";

export interface ResolveLlmConfigInput {
  /** The account's synced llmConfig namespace, when sync is on and loaded. */
  synced?: SyncedLlmConfig | null;
  /** Providers that have a key in the account vault. */
  vaultProviders: string[];
  /** The configuration stored on this device, if any. */
  local: LLMConfig | null;
}

export interface ResolveLlmConfigResult {
  config: LLMConfig;
  reason: "synced" | "vault" | "unchanged";
  /** Status line for the Account section when something changed. */
  message?: string;
}

const DEFAULT_MAX_TOKENS = 1024;

function baseConfig(local: LLMConfig | null): LLMConfig {
  return (
    local ?? {
      provider: "openai",
      apiKey: "",
      model: defaultModelFor("openai"),
      maxTokens: DEFAULT_MAX_TOKENS,
      enabled: false,
    }
  );
}

/** Choose the LLM config to apply after a sign-in (or on load when signed in). */
export function resolveLlmConfigOnSignIn(input: ResolveLlmConfigInput): ResolveLlmConfigResult {
  const { synced, vaultProviders, local } = input;
  const base = baseConfig(local);

  // 1. Synced settings win. A server default of {} carries no provider and is
  //    treated as absent.
  if (synced && isLlmProvider(synced.provider)) {
    const provider = synced.provider;
    const model =
      typeof synced.model === "string" && synced.model
        ? synced.model
        : local?.provider === provider && local.model
          ? local.model
          : defaultModelFor(provider);
    const config: LLMConfig = {
      provider,
      apiKey: local?.apiKey ?? "",
      model,
      endpoint: provider === "custom" ? (synced.endpoint ?? local?.endpoint) : undefined,
      maxTokens:
        typeof synced.maxTokens === "number" && synced.maxTokens > 0
          ? synced.maxTokens
          : base.maxTokens,
      enabled: typeof synced.enabled === "boolean" ? synced.enabled : base.enabled,
    };
    return {
      config,
      reason: "synced",
      message: config.enabled
        ? "Settings synced from your account. AI features are on."
        : "Settings synced from your account.",
    };
  }

  // 2. A vaulted key turns AI features on when nothing local is in use.
  const vaulted = vaultProviders.filter(isLlmProvider);
  if (vaulted.length > 0 && (!local || !local.enabled)) {
    const provider = local && vaulted.includes(local.provider) ? local.provider : vaulted[0];
    const model =
      local?.provider === provider && local.model ? local.model : defaultModelFor(provider);
    const config: LLMConfig = {
      provider,
      apiKey: local?.apiKey ?? "",
      model,
      endpoint: undefined,
      maxTokens: base.maxTokens,
      enabled: true,
    };
    const label = LLM_PROVIDER_LABELS[provider] ?? provider;
    return {
      config,
      reason: "vault",
      message: `Using your stored ${label} key. AI features are on.`,
    };
  }

  // 3. Nothing to apply.
  return { config: base, reason: "unchanged" };
}
