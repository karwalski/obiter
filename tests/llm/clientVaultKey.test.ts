/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACCT-005 — LLM client vault-key omission.
 *
 * Contract under test:
 *  - Signed OUT: callLlm sends the inline apiKey exactly as today (BYOK).
 *  - Signed IN with a vaulted key for the active provider: callLlm routes
 *    through the Obiter proxy WITHOUT the inline apiKey and WITH an
 *    Authorization: Bearer access token, so the server injects the stored key.
 *  - The "use my own key on this device instead" override forces local BYOK
 *    even when signed in with a vaulted key.
 */

import { callLlm } from "../../src/llm/client";
import type { LLMConfig } from "../../src/llm/config";
import { setSession } from "../../src/api/authClient";
import { setVaultKeyProviders, setLocalKeyOverride, clearVaultMode } from "../../src/llm/vaultMode";

const mockFetch = jest.fn() as jest.Mock;
(globalThis as Record<string, unknown>).fetch = mockFetch;

function proxyOk(text = "ok"): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ text }),
    text: async () => JSON.stringify({ text }),
  } as unknown as Response;
}

function directOpenAiOk(text = "ok"): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: text } }] }),
    text: async () => "",
  } as unknown as Response;
}

const BASE: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-local-1234",
  model: "claude-sonnet-4-5",
  maxTokens: 512,
  enabled: true,
};

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  clearVaultMode();
});

describe("signed out (BYOK unchanged)", () => {
  it("sends the inline apiKey and no Authorization header (direct anthropic)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "hi" }] }),
      text: async () => "",
    } as unknown as Response);

    await callLlm(BASE, "system", "user");

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("api.anthropic.com");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-local-1234");
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("signed in with a vaulted key", () => {
  beforeEach(() => {
    setSession(
      { accessToken: "access-abc", refreshToken: "r-abc", expiresIn: 900 },
      "user@example.com"
    );
    setVaultKeyProviders(["anthropic"]);
  });

  it("routes through the proxy, omits the inline key, and sends a Bearer token", async () => {
    mockFetch.mockResolvedValueOnce(proxyOk("hi"));

    await callLlm(BASE, "system", "user");

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/proxy/llm");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-abc");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.apiKey).toBe("");
    expect(body.provider).toBe("anthropic");
  });

  it("relays OpenAI via the proxy provider map — no endpoint override sent (ACCT-REL-005)", async () => {
    setVaultKeyProviders(["openai"]);
    mockFetch.mockResolvedValueOnce(proxyOk("hi"));

    await callLlm({ ...BASE, provider: "openai", model: "gpt-5.5" }, "system", "user");

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/proxy/llm");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.apiKey).toBe("");
    expect(body.provider).toBe("openai");
    expect(body.endpoint).toBeUndefined();
  });

  it("honours the local-key override — reverts to direct BYOK", async () => {
    setLocalKeyOverride("anthropic", true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "hi" }] }),
      text: async () => "",
    } as unknown as Response);

    await callLlm(BASE, "system", "user");

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("api.anthropic.com");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-local-1234");
    expect(headers.Authorization).toBeUndefined();
  });

  it("uses direct BYOK for a provider WITHOUT a vaulted key", async () => {
    // Only anthropic is vaulted; a deepseek request must stay BYOK-direct.
    mockFetch.mockResolvedValueOnce(directOpenAiOk("hi"));

    await callLlm({ ...BASE, provider: "deepseek", apiKey: "ds-local" }, "system", "user");

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("api.deepseek.com");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ds-local");
  });
});
