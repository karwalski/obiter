/**
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * BUG-007: resolveLlmConfigOnSignIn — which LLM config to apply after a
 * sign-in. Synced settings win, then a vaulted key turns AI features on when
 * nothing local is in use, otherwise the local config is left alone. The
 * local apiKey is always kept; the synced copy never carries one.
 */
import { resolveLlmConfigOnSignIn } from "../../src/llm/applyAccountLlmConfig";
import type { LLMConfig } from "../../src/llm/config";

const localDisabled: LLMConfig = {
  provider: "openai",
  apiKey: "sk-local-9999",
  model: "gpt-4o",
  maxTokens: 512,
  enabled: false,
};

describe("resolveLlmConfigOnSignIn", () => {
  test("synced llmConfig wins over the vault and keeps the local key", () => {
    const result = resolveLlmConfigOnSignIn({
      synced: { provider: "gemini", model: "gemini-2.5-pro", maxTokens: 2048, enabled: true },
      vaultProviders: ["anthropic"],
      local: localDisabled,
    });
    expect(result.reason).toBe("synced");
    expect(result.config).toEqual({
      provider: "gemini",
      apiKey: "sk-local-9999",
      model: "gemini-2.5-pro",
      endpoint: undefined,
      maxTokens: 2048,
      enabled: true,
    });
    expect(result.message).toContain("AI features are on");
  });

  test("synced config without a model falls back to the provider default", () => {
    const result = resolveLlmConfigOnSignIn({
      synced: { provider: "anthropic", enabled: false },
      vaultProviders: [],
      local: null,
    });
    expect(result.reason).toBe("synced");
    expect(result.config.provider).toBe("anthropic");
    expect(result.config.model).toBe("claude-opus-4-8");
    expect(result.config.enabled).toBe(false);
    expect(result.config.apiKey).toBe("");
    expect(result.message).toBe("Settings synced from your account.");
  });

  test("a synced apiKey is never taken, even if the server sent one", () => {
    const synced = { provider: "openai", enabled: true, apiKey: "sk-leaked" } as unknown as {
      provider: "openai";
      enabled: boolean;
    };
    const result = resolveLlmConfigOnSignIn({ synced, vaultProviders: [], local: localDisabled });
    expect(result.config.apiKey).toBe("sk-local-9999");
  });

  test("an empty synced namespace (server default) falls through to the vault", () => {
    const result = resolveLlmConfigOnSignIn({
      synced: {},
      vaultProviders: ["anthropic"],
      local: null,
    });
    expect(result.reason).toBe("vault");
    expect(result.config).toEqual({
      provider: "anthropic",
      apiKey: "",
      model: "claude-opus-4-8",
      endpoint: undefined,
      maxTokens: 1024,
      enabled: true,
    });
    expect(result.message).toBe("Using your stored Anthropic key. AI features are on.");
  });

  test("vault: no local config picks the first vaulted provider and enables AI", () => {
    const result = resolveLlmConfigOnSignIn({
      vaultProviders: ["gemini", "anthropic"],
      local: null,
    });
    expect(result.reason).toBe("vault");
    expect(result.config.provider).toBe("gemini");
    expect(result.config.model).toBe("gemini-2.5-pro");
    expect(result.config.enabled).toBe(true);
    expect(result.message).toBe("Using your stored Google Gemini key. AI features are on.");
  });

  test("vault: a disabled local config keeps its provider when that provider is vaulted", () => {
    const result = resolveLlmConfigOnSignIn({
      vaultProviders: ["anthropic", "openai"],
      local: localDisabled,
    });
    expect(result.reason).toBe("vault");
    expect(result.config).toEqual({
      provider: "openai",
      apiKey: "sk-local-9999",
      model: "gpt-4o",
      endpoint: undefined,
      maxTokens: 512,
      enabled: true,
    });
    expect(result.message).toBe("Using your stored OpenAI key. AI features are on.");
  });

  test("vault: a disabled local config on a non-vaulted provider switches to the vault provider", () => {
    const result = resolveLlmConfigOnSignIn({
      vaultProviders: ["anthropic"],
      local: localDisabled,
    });
    expect(result.reason).toBe("vault");
    expect(result.config.provider).toBe("anthropic");
    expect(result.config.model).toBe("claude-opus-4-8");
    expect(result.config.apiKey).toBe("sk-local-9999");
    expect(result.config.maxTokens).toBe(512);
    expect(result.config.enabled).toBe(true);
  });

  test("vault: an enabled local config is left unchanged", () => {
    const local: LLMConfig = { ...localDisabled, enabled: true };
    const result = resolveLlmConfigOnSignIn({ vaultProviders: ["anthropic"], local });
    expect(result.reason).toBe("unchanged");
    expect(result.config).toBe(local);
    expect(result.message).toBeUndefined();
  });

  test("unknown vault providers are ignored", () => {
    const result = resolveLlmConfigOnSignIn({ vaultProviders: ["someday-llm"], local: null });
    expect(result.reason).toBe("unchanged");
    expect(result.config.provider).toBe("openai");
    expect(result.config.enabled).toBe(false);
  });

  test("no synced config and no vault key leaves the local config unchanged", () => {
    const result = resolveLlmConfigOnSignIn({
      synced: null,
      vaultProviders: [],
      local: localDisabled,
    });
    expect(result.reason).toBe("unchanged");
    expect(result.config).toBe(localDisabled);
  });
});
