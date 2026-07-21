/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * TRUST-006 — LLM API key storage: disclosure and controls.
 * "Remove stored keys" must clear ALL persisted key material on the device:
 *   1. the apiKey inside the saved LLM config (other settings survive),
 *   2. every key-vault entry under `obiter-device.sourceKey.*`,
 *   3. the legacy whole-config `obiter.llmConfig` localStorage entry,
 * while leaving unrelated device preferences untouched.
 */

import {
  saveLlmConfig,
  loadLlmConfig,
  clearStoredKeys,
  type LLMConfig,
} from "../../src/llm/config";
import { saveKey, getKey, hasKey, removeAllKeys } from "../../src/api/keyVault";
import { getDevicePref, setDevicePref } from "../../src/store/devicePreferences";

const CONFIG: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-secret-1234",
  model: "claude-sonnet-4-5",
  maxTokens: 2048,
  enabled: true,
};

beforeEach(() => {
  localStorage.clear();
});

describe("clearStoredKeys (TRUST-006)", () => {
  it("blanks the apiKey in the saved LLM config but keeps every other setting", () => {
    saveLlmConfig(CONFIG);

    const result = clearStoredKeys();

    expect(result.llmKeyCleared).toBe(true);
    const after = loadLlmConfig();
    expect(after).not.toBeNull();
    expect(after?.apiKey).toBe("");
    expect(after?.provider).toBe("anthropic");
    expect(after?.model).toBe("claude-sonnet-4-5");
    expect(after?.maxTokens).toBe(2048);
    expect(after?.enabled).toBe(true);
  });

  it("removes every key-vault entry under the sourceKey prefix", () => {
    saveKey("austlii", "key-a");
    saveKey("jade", "key-b");
    saveKey("westlaw", "key-c");

    const result = clearStoredKeys();

    expect(result.vaultKeysRemoved).toBe(3);
    expect(hasKey("austlii")).toBe(false);
    expect(hasKey("jade")).toBe(false);
    expect(hasKey("westlaw")).toBe(false);
    expect(localStorage.getItem("obiter-device.sourceKey.austlii")).toBeNull();
  });

  it("removes the legacy obiter.llmConfig localStorage entry", () => {
    localStorage.setItem("obiter.llmConfig", JSON.stringify(CONFIG));

    const result = clearStoredKeys();

    expect(result.legacyRemoved).toBe(true);
    expect(localStorage.getItem("obiter.llmConfig")).toBeNull();
    // The legacy migration path in loadLlmConfig must find nothing afterwards.
    expect(loadLlmConfig()).toBeNull();
  });

  it("clears all three stores in one call and leaves other device prefs alone", () => {
    saveLlmConfig(CONFIG);
    saveKey("austlii", "key-a");
    localStorage.setItem("obiter.llmConfig", JSON.stringify(CONFIG));
    setDevicePref("corpusEnabled", true);
    setDevicePref("manualCitationMode", false);

    const result = clearStoredKeys();

    expect(result).toEqual({
      llmKeyCleared: true,
      vaultKeysRemoved: 1,
      legacyRemoved: true,
    });
    expect(loadLlmConfig()?.apiKey).toBe("");
    expect(hasKey("austlii")).toBe(false);
    expect(localStorage.getItem("obiter.llmConfig")).toBeNull();
    // Non-key device preferences survive.
    expect(getDevicePref("corpusEnabled")).toBe(true);
    expect(getDevicePref("manualCitationMode")).toBe(false);
  });

  it("is a no-op when nothing is stored", () => {
    const result = clearStoredKeys();

    expect(result).toEqual({
      llmKeyCleared: false,
      vaultKeysRemoved: 0,
      legacyRemoved: false,
    });
    expect(loadLlmConfig()).toBeNull();
  });

  it("reports llmKeyCleared false when the saved config had no key material", () => {
    saveLlmConfig({ ...CONFIG, apiKey: "" });

    const result = clearStoredKeys();

    expect(result.llmKeyCleared).toBe(false);
    expect(loadLlmConfig()?.provider).toBe("anthropic");
  });
});

describe("keyVault.removeAllKeys (TRUST-006)", () => {
  it("removes only entries under the sourceKey prefix", () => {
    saveKey("austlii", "key-a");
    saveKey("jade", "key-b");
    localStorage.setItem("obiter-device.corpusEnabled", "true");
    localStorage.setItem("unrelated", "value");

    const removed = removeAllKeys();

    expect(removed).toBe(2);
    expect(getKey("austlii")).toBe("");
    expect(getKey("jade")).toBe("");
    expect(localStorage.getItem("obiter-device.corpusEnabled")).toBe("true");
    expect(localStorage.getItem("unrelated")).toBe("value");
  });

  it("removes orphaned entries for adapters that no longer exist", () => {
    localStorage.setItem("obiter-device.sourceKey.retired-adapter", "old-key");

    expect(removeAllKeys()).toBe(1);
    expect(localStorage.getItem("obiter-device.sourceKey.retired-adapter")).toBeNull();
  });

  it("returns 0 when the vault is empty", () => {
    expect(removeAllKeys()).toBe(0);
  });
});
