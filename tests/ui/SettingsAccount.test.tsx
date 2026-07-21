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
import Settings from "../../src/ui/views/Settings";

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
jest.mock("../../src/api/authClient", () => ({
  isSignedIn: jest.fn(() => mockSignedIn),
  getEmail: jest.fn(() => (mockSignedIn ? "lawyer@example.com" : null)),
  signOut: jest.fn(async () => undefined),
  deleteAccount: (...args: unknown[]): Promise<void> => mockDeleteAccount(...(args as [])),
  exportData: (): Promise<unknown> => mockExportData(),
  fetchMe: (): Promise<unknown> => mockFetchMe(),
  clearSession: (): void => mockClearSession(),
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
jest.mock("../../src/llm/config", () => ({
  loadLlmConfig: jest.fn(() => null),
  saveLlmConfig: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockSignedIn = false;
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
