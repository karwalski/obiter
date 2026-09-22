/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACCT-005 — Settings Account section.
 *
 * The Account section renders:
 *  - signed OUT: "Sign in" / "Create account" buttons + the "works fully
 *    without an account" copy.
 *  - signed IN: the email, a synced-settings toggle, the stored-key list
 *    (provider + last4 with Remove), Sign out, and Delete account.
 *
 * authClient / authDialog / vaultKeys are mocked so no network or Office APIs
 * are touched.
 */
import * as React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import Settings from "../../src/ui/views/Settings";
import { openAuthDialog } from "../../src/api/authDialog";
import { listVaultKeys } from "../../src/api/vaultKeys";
import { setDevicePref } from "../../src/store/devicePreferences";
import { __resetForTests as resetSettingsSync } from "../../src/api/settingsSync";
import type { LLMConfig } from "../../src/llm/config";

// ─── Account mocks (the subject under test) ─────────────────────────────────

let mockSignedIn = false;
const mockDeleteAccount = jest.fn(async () => undefined);
const mockExportData = jest.fn(async () => ({ account: { email: "lawyer@example.com" } }));
const mockFetchMe = jest.fn(async () => ({
  email: "lawyer@example.com",
  mfaEnabled: false,
  keyProviders: ["anthropic"],
  syncedSettings: false,
}));
const mockClearSession = jest.fn();

// BUG-007: authFetch backs the synced-settings client (GET/PUT
// /api/user/settings). Each test shapes the responses it needs.
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async (): Promise<unknown> => body,
  } as unknown as Response;
}
const mockAuthFetch = jest.fn(async (_input: string, init?: RequestInit): Promise<Response> => {
  if (init?.method === "PUT") return jsonResponse(200, { settingsVersion: 1, settings: {} });
  return jsonResponse(200, { settingsVersion: 0, settings: {} });
});
/** The PUT calls made so far, with their parsed JSON bodies. */
function putCalls(): Array<{ settingsVersion: number; settings: Record<string, unknown> }> {
  return mockAuthFetch.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(String(init?.body)) as {
      settingsVersion: number;
      settings: Record<string, unknown>;
    });
}

jest.mock("../../src/api/authClient", () => ({
  isSignedIn: jest.fn(() => mockSignedIn),
  getEmail: jest.fn(() => (mockSignedIn ? "lawyer@example.com" : null)),
  signOut: jest.fn(async () => undefined),
  deleteAccount: (...args: unknown[]): Promise<void> => mockDeleteAccount(...(args as [])),
  exportData: (): Promise<unknown> => mockExportData(),
  fetchMe: (): Promise<unknown> => mockFetchMe(),
  clearSession: (): void => mockClearSession(),
  authFetch: (input: string, init?: RequestInit): Promise<Response> => mockAuthFetch(input, init),
}));

jest.mock("../../src/api/authDialog", () => ({
  openAuthDialog: jest.fn(async () => ({ status: "cancelled" })),
  isDialogAuthSupported: jest.fn(() => true),
}));

jest.mock("../../src/api/vaultKeys", () => ({
  listVaultKeys: jest.fn(async () => [{ provider: "anthropic", last4: "1234" }]),
  deleteVaultKey: jest.fn(async () => true),
}));

jest.mock("../../src/llm/vaultMode", () => ({
  setVaultKeyProviders: jest.fn(),
  hasLocalKeyOverride: jest.fn(() => false),
  setLocalKeyOverride: jest.fn(),
  clearVaultMode: jest.fn(),
}));

// ─── Shared Settings mocks (mirrors tests/ui/Settings.test.tsx) ─────────────

const mockStore = {
  getAglcVersion: jest.fn(() => "4"),
  getStandardId: jest.fn(() => "aglc4"),
  getWritingMode: jest.fn(() => "academic"),
  getCourtJurisdiction: jest.fn(() => undefined),
  getCourtToggles: jest.fn(() => undefined),
  getAll: jest.fn(() => []),
  setStandardId: jest.fn(async () => undefined),
  setAglcVersion: jest.fn(async () => undefined),
  setWritingMode: jest.fn(async () => undefined),
  setCourtJurisdiction: jest.fn(async () => undefined),
  setCourtToggles: jest.fn(async () => undefined),
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));
jest.mock("../../src/word/footnoteManager", () => ({ lockAllObiterFootnotes: jest.fn() }));
jest.mock("../../src/word/branding", () => ({
  hasAttribution: jest.fn(async () => false),
  insertAcknowledgment: jest.fn(),
  getAcknowledgmentText: jest.fn(() => ""),
}));
jest.mock("../../src/word/documentProperties", () => ({
  writeObiterProperties: jest.fn(async () => undefined),
}));
jest.mock("../../src/word/styles", () => ({ applyAglc4Styles: jest.fn() }));
jest.mock("../../src/word/template", () => ({ applyAglc4Template: jest.fn() }));
jest.mock("../../src/word/documentMeta", () => ({
  loadTemplatePreferences: jest.fn(() => ({
    fontName: "Times New Roman",
    fontSize: 12,
    lineSpacing: 24,
    includeTitle: true,
    includeAuthor: true,
    includeNotice: true,
  })),
  saveTemplatePreferences: jest.fn(),
}));
const mockLoadLlmConfig = jest.fn((): LLMConfig | null => null);
const mockSaveLlmConfig = jest.fn((_config: LLMConfig): void => undefined);
jest.mock("../../src/llm/config", () => ({
  loadLlmConfig: (): LLMConfig | null => mockLoadLlmConfig(),
  saveLlmConfig: (config: LLMConfig): void => mockSaveLlmConfig(config),
  testConnection: jest.fn(async () => ({ ok: true })),
  clearStoredKeys: jest.fn(() => ({ llmKeyCleared: false, vaultKeysRemoved: 0 })),
}));
jest.mock("../../src/api/sourceRegistry", () => ({
  getAllAdapters: jest.fn(() => []),
  getAdaptersByTier: jest.fn(() => ({ open: [], live: [], "link-only": [] })),
  isAdapterEnabled: jest.fn(() => false),
  setAdapterEnabled: jest.fn(),
  isMasterEnabled: jest.fn(() => false),
  setMasterEnabled: jest.fn(),
  TIER_LABELS: { open: "Open access", live: "Live services", "link-only": "Link only" },
}));
jest.mock("../../src/api/adapterSearch", () => ({
  getAdapterInstance: jest.fn(() => undefined),
  initialiseAdapters: jest.fn(),
}));
jest.mock("../../src/api/keyVault", () => ({
  saveKey: jest.fn(),
  getKey: jest.fn(() => null),
  removeKey: jest.fn(),
  hasKey: jest.fn(() => false),
}));
jest.mock("../../src/api/corpus/corpusDownload", () => ({
  checkCorpusAvailable: jest.fn(() => false),
  getCorpusStatus: jest.fn(() => "not-downloaded"),
  getCorpusIndex: jest.fn(() => null),
  getCorpusMeta: jest.fn(async () => ({})),
  downloadCorpusIndex: jest.fn(),
  deleteCorpus: jest.fn(),
  clearCorpusSkip: jest.fn(),
  isCorpusSkipped: jest.fn(() => false),
  skipCorpus: jest.fn(),
}));
jest.mock("../../src/api/initializeAdapters", () => ({
  registerCorpusAfterDownload: jest.fn(),
}));
jest.mock("../../src/ui/hooks/useVersionCheck", () => ({
  useVersionCheck: (): unknown => ({
    currentVersion: "9.9.9",
    latestVersion: null,
    updateAvailable: false,
    updateUrl: null,
    loading: false,
  }),
  clearVersionCache: jest.fn(),
}));
jest.mock("../../src/ui/hooks/useComfortMode", () => ({
  useComfortMode: (): unknown => [false, jest.fn()],
}));
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    autoRefreshEnabled: true,
    setAutoRefreshEnabled: jest.fn(),
    triggerRefresh: jest.fn(),
  }),
}));
jest.mock("../../src/debug", () => ({
  enableDebug: jest.fn(),
  disableDebug: jest.fn(),
  isDebugEnabled: jest.fn(() => false),
  getLogHistory: jest.fn(() => []),
  clearLogHistory: jest.fn(),
  exportLogs: jest.fn(() => ""),
  runAllTests: jest.fn(async () => []),
  setStatusCallback: jest.fn(),
  prepareTestEssay: jest.fn(),
  SCREENSHOT_PREPS: [],
}));

(globalThis as Record<string, unknown>).Word = {
  run: async <T,>(callback: (ctx: unknown) => Promise<T>): Promise<T> => callback({}),
};

async function renderSettings(): Promise<void> {
  render(<Settings />);
  await screen.findByLabelText("Writing mode");
}

const mockOpenAuthDialog = openAuthDialog as unknown as jest.Mock;
const mockListVaultKeys = listVaultKeys as unknown as jest.Mock;

/** Make the next openAuthDialog call succeed and flip the auth client to signed in. */
function signInSucceeds(): void {
  mockOpenAuthDialog.mockImplementationOnce(async () => {
    mockSignedIn = true;
    return { status: "success", email: "lawyer@example.com" };
  });
}

function providerSelect(): HTMLSelectElement {
  return screen.getByLabelText("Provider") as HTMLSelectElement;
}
function enableAiCheckbox(): HTMLInputElement {
  return screen.getByLabelText("Enable AI features") as HTMLInputElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockSignedIn = false;
  mockLoadLlmConfig.mockReturnValue(null);
  mockListVaultKeys.mockResolvedValue([{ provider: "anthropic", last4: "1234" }]);
  resetSettingsSync();
});

describe("Account section — signed out", () => {
  test("shows Sign in / Create account and the works-without-an-account copy", async () => {
    await renderSettings();

    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create account" })).toBeTruthy();
    expect(
      screen.getByText(/works fully without an account/i)
    ).toBeTruthy();
    // No email or Sign-out shown when signed out.
    expect(screen.queryByText(/Signed in as/i)).toBeNull();
  });
});

describe("Account section — signed in", () => {
  beforeEach(() => {
    mockSignedIn = true;
  });

  test("shows the email, synced-settings toggle, stored key, and account actions", async () => {
    await renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/Signed in as/i)).toBeTruthy();
    });
    expect(screen.getByText("lawyer@example.com")).toBeTruthy();
    expect(screen.getByText("Sync settings to my account")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete account" })).toBeTruthy();

    // The vaulted key metadata (provider + last4) appears once loaded.
    await waitFor(() => {
      expect(screen.getByText(/ending 1234/i)).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  test("Export my data downloads a JSON blob via authClient.exportData (ACCT-007)", async () => {
    const createObjectURL = jest.fn(() => "blob:mock");
    const revokeObjectURL = jest.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await renderSettings();
    await waitFor(() => expect(screen.getByText(/Signed in as/i)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Export my data" }));

    await waitFor(() => expect(mockExportData).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/Your data was exported/i)).toBeTruthy());

    clickSpy.mockRestore();
  });

  test("Delete account confirms with step-up, calls deleteAccount, and signs out (ACCT-007)", async () => {
    await renderSettings();
    await waitFor(() => expect(screen.getByText(/Signed in as/i)).toBeTruthy());

    // Open the confirmation modal.
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByText(/Delete your account\?/i)).toBeTruthy();

    // Provide a step-up code and confirm.
    fireEvent.change(screen.getByPlaceholderText("123456"), { target: { value: "654321" } });
    // The modal's primary button is the second "Delete account" button.
    const deleteButtons = screen.getAllByRole("button", { name: "Delete account" });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    expect(mockDeleteAccount).toHaveBeenCalledWith({ code: "654321" });
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByText(/Your account has been deleted/i)).toBeTruthy()
    );
  });

  test("live MFA status from fetchMe replaces the static note (ACCT-007)", async () => {
    mockFetchMe.mockResolvedValueOnce({
      email: "lawyer@example.com",
      mfaEnabled: true,
      keyProviders: [],
      syncedSettings: false,
    });
    await renderSettings();
    await waitFor(() =>
      expect(screen.getByText(/Multi-factor authentication is on/i)).toBeTruthy()
    );
  });
});

// ─── BUG-007: account sign-in applies the vaulted / synced LLM config ───────

describe("BUG-007: LLM config after sign-in", () => {
  test("sign in with no local config and a vaulted Anthropic key selects Anthropic and turns AI on", async () => {
    const { container } = render(<Settings />);
    await screen.findByLabelText("Writing mode");
    expect(providerSelect().value).toBe("openai");
    expect(enableAiCheckbox().checked).toBe(false);

    signInSucceeds();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(
        screen.getByText("Signed in. Using your stored Anthropic key. AI features are on.")
      ).toBeTruthy()
    );
    expect(providerSelect().value).toBe("anthropic");
    expect(enableAiCheckbox().checked).toBe(true);
    expect(mockSaveLlmConfig).toHaveBeenCalledTimes(1);
    expect(mockSaveLlmConfig.mock.calls[0][0]).toMatchObject({
      provider: "anthropic",
      model: "claude-opus-4-8",
      enabled: true,
      apiKey: "",
    });
    // Sync is off: nothing was fetched from /api/user/settings.
    expect(mockAuthFetch).not.toHaveBeenCalled();

    expect(await axe(container)).toHaveNoViolations();
  });

  test("sign in with sync on applies the synced llmConfig over the vault and keeps the local key", async () => {
    setDevicePref("syncedSettings", true);
    mockLoadLlmConfig.mockReturnValue({
      provider: "openai",
      apiKey: "sk-local-5678",
      model: "gpt-4o",
      maxTokens: 512,
      enabled: false,
    });
    mockAuthFetch.mockImplementation(async (_input, init) => {
      if (init?.method === "PUT") return jsonResponse(200, { settingsVersion: 3, settings: {} });
      return jsonResponse(200, {
        settingsVersion: 2,
        settings: {
          llmConfig: { provider: "gemini", model: "gemini-2.5-pro", maxTokens: 2048, enabled: true },
          templatePrefs: {},
          autoRefresh: false,
          courtToggles: {},
        },
      });
    });

    render(<Settings />);
    await screen.findByLabelText("Writing mode");
    signInSucceeds();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(providerSelect().value).toBe("gemini"));
    expect(enableAiCheckbox().checked).toBe(true);
    expect(screen.getByText(/Settings synced from your account/)).toBeTruthy();
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/user/settings", expect.objectContaining({ method: "GET" }));
    expect(mockSaveLlmConfig).toHaveBeenCalledTimes(1);
    expect(mockSaveLlmConfig.mock.calls[0][0]).toEqual({
      provider: "gemini",
      apiKey: "sk-local-5678",
      model: "gemini-2.5-pro",
      endpoint: undefined,
      maxTokens: 2048,
      enabled: true,
    });
    // The stored key is only ever surfaced as a last-4 hint (TRUST-006).
    expect(screen.getByText(/A key ending in 5678 is stored on this device/)).toBeTruthy();
  });

  test("Save with sync on pushes without the key, rebases on 409, and reports a failed push", async () => {
    mockSignedIn = true;
    setDevicePref("syncedSettings", true);
    mockListVaultKeys.mockResolvedValue([]);
    mockLoadLlmConfig.mockReturnValue({
      provider: "openai",
      apiKey: "sk-local-5678",
      model: "gpt-4o",
      maxTokens: 512,
      enabled: true,
    });
    mockAuthFetch.mockImplementation(async (_input, init) => {
      if (init?.method === "PUT") return jsonResponse(200, { settingsVersion: 4, settings: {} });
      return jsonResponse(200, {
        settingsVersion: 3,
        settings: { llmConfig: {}, templatePrefs: {}, autoRefresh: false, courtToggles: {} },
      });
    });

    render(<Settings />);
    await screen.findByLabelText("Writing mode");
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/user/settings", expect.objectContaining({ method: "GET" }))
    );

    // (a) One PUT carrying the version last seen and no apiKey.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(putCalls()).toHaveLength(1));
    expect(mockSaveLlmConfig).toHaveBeenCalledTimes(1);
    expect(mockSaveLlmConfig.mock.calls[0][0].apiKey).toBe("sk-local-5678");
    const first = putCalls()[0];
    expect(first.settingsVersion).toBe(3);
    expect(first.settings.llmConfig).toEqual({
      provider: "openai",
      model: "gpt-4o",
      endpoint: undefined,
      maxTokens: 512,
      enabled: true,
    });
    expect(JSON.stringify(first)).not.toContain("apiKey");
    expect(JSON.stringify(first)).not.toContain("sk-local");

    // (b) A stale version: the server answers 409 with its state; the local
    // change is reapplied on top and retried once with the server's version.
    mockAuthFetch.mockImplementationOnce(async () =>
      jsonResponse(409, {
        error: "Settings have changed since you last loaded them.",
        settingsVersion: 7,
        settings: {
          llmConfig: { provider: "anthropic", enabled: false },
          templatePrefs: { fontName: "Arial" },
          autoRefresh: true,
          courtToggles: {},
        },
      })
    );
    mockAuthFetch.mockImplementationOnce(async () =>
      jsonResponse(200, { settingsVersion: 8, settings: {} })
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(putCalls()).toHaveLength(3));
    const [, stale, retried] = putCalls();
    expect(stale.settingsVersion).toBe(4);
    expect(retried.settingsVersion).toBe(7);
    expect(retried.settings.templatePrefs).toEqual({ fontName: "Arial" });
    expect(retried.settings.autoRefresh).toBe(true);
    expect(retried.settings.llmConfig).toMatchObject({ provider: "openai", enabled: true });
    expect(JSON.stringify(retried)).not.toContain("apiKey");
    expect(screen.queryByText(/Syncing to your account failed/)).toBeNull();

    // (c) A network failure: the device save still happens and the user is told.
    mockAuthFetch.mockImplementationOnce(async () => {
      throw new Error("Network down.");
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        screen.getByText("Settings saved on this device. Syncing to your account failed: Network down.")
      ).toBeTruthy()
    );
    expect(mockSaveLlmConfig).toHaveBeenCalledTimes(3);
    expect(putCalls()).toHaveLength(4);
  });

  test("sign in with sync off and no vaulted key changes nothing", async () => {
    mockListVaultKeys.mockResolvedValue([]);
    render(<Settings />);
    await screen.findByLabelText("Writing mode");

    signInSucceeds();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByText("Signed in.")).toBeTruthy());
    expect(mockAuthFetch).not.toHaveBeenCalled();
    expect(mockSaveLlmConfig).not.toHaveBeenCalled();
    expect(providerSelect().value).toBe("openai");
    expect(enableAiCheckbox().checked).toBe(false);
  });

  test("turning sync on while signed in pushes this device's settings once", async () => {
    mockSignedIn = true;
    mockListVaultKeys.mockResolvedValue([]);
    mockLoadLlmConfig.mockReturnValue({
      provider: "anthropic",
      apiKey: "sk-ant-0001",
      model: "claude-sonnet-4-6",
      maxTokens: 1024,
      enabled: true,
    });
    render(<Settings />);
    await screen.findByLabelText("Writing mode");
    await waitFor(() => expect(screen.getByText(/Signed in as/i)).toBeTruthy());
    expect(mockAuthFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Sync settings to my account"));

    await waitFor(() => expect(putCalls()).toHaveLength(1));
    const [pushed] = putCalls();
    expect(pushed.settings.llmConfig).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      endpoint: undefined,
      maxTokens: 1024,
      enabled: true,
    });
    expect(pushed.settings.autoRefresh).toBe(true);
    expect(pushed.settings.templatePrefs).toMatchObject({ fontName: "Times New Roman" });
    expect(JSON.stringify(pushed)).not.toContain("sk-ant");
  });
});
