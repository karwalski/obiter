/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * STD-011 — Settings sync per standard (BUG-007 synced settings client).
 *
 * With sync on and signed in, a Settings change pushes the changed
 * namespaces to PUT /api/user/settings. This suite asserts on the fetch
 * mock's PUT bodies:
 *   - the court toggles namespace (`courtToggles`, exists today);
 *   - the standard id and the court jurisdiction (STD-022 adds them to
 *     `SyncedSettings` in src/api/settingsSync.ts — namespace names decided
 *     here as `standardId` and `courtJurisdiction`, flat like the others);
 *   - the NZLSG citation style (`nzlsgStyle`, STD-022).
 * and on what a pull on sign-in does to the document store.
 *
 * Convention (STD epic): every test asserts the CORRECT behaviour; where the
 * current code falls short the test is marked `test.failing` with the story
 * that removes the mark. Open questions are `test.todo("DECISION-040: …")`.
 *
 * Mocks mirror tests/ui/SettingsAccount.test.tsx (auth client, auth dialog,
 * vault keys, vault mode) and tests/ui/Settings.test.tsx (store, Word).
 */
import * as React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Settings from "../../../src/ui/views/Settings";
import { openAuthDialog } from "../../../src/api/authDialog";
import { setDevicePref } from "../../../src/store/devicePreferences";
import { __resetForTests as resetSettingsSync } from "../../../src/api/settingsSync";

// ─── Account mocks ──────────────────────────────────────────────────────────

let mockSignedIn = false;
const mockFetchMe = jest.fn(async () => ({
  email: "lawyer@example.com",
  mfaEnabled: false,
  keyProviders: [],
  syncedSettings: true,
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async (): Promise<unknown> => body,
  } as unknown as Response;
}

/** What GET /api/user/settings answers; tests shape it per case. */
let mockServerSettings: Record<string, unknown> = {};
let mockServerVersion = 0;
const mockAuthFetch = jest.fn(async (_input: string, init?: RequestInit): Promise<Response> => {
  if (init?.method === "PUT") {
    mockServerVersion += 1;
    return jsonResponse(200, { settingsVersion: mockServerVersion, settings: {} });
  }
  return jsonResponse(200, { settingsVersion: mockServerVersion, settings: mockServerSettings });
});

interface PutBody {
  settingsVersion: number;
  settings: Record<string, unknown>;
}
/** The PUT calls made so far, with their parsed JSON bodies. */
function putCalls(): PutBody[] {
  return mockAuthFetch.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(String(init?.body)) as PutBody);
}
function getCalls(): number {
  return mockAuthFetch.mock.calls.filter(([, init]) => init?.method === "GET").length;
}
/** The first PUT whose settings carry `namespace`. */
function putWith(namespace: string): PutBody | undefined {
  return putCalls().find((p) => Object.prototype.hasOwnProperty.call(p.settings, namespace));
}

jest.mock("../../../src/api/authClient", () => ({
  isSignedIn: jest.fn(() => mockSignedIn),
  getEmail: jest.fn(() => (mockSignedIn ? "lawyer@example.com" : null)),
  signOut: jest.fn(async () => undefined),
  deleteAccount: jest.fn(async () => undefined),
  exportData: jest.fn(async () => ({})),
  fetchMe: (): Promise<unknown> => mockFetchMe(),
  clearSession: jest.fn(),
  authFetch: (input: string, init?: RequestInit): Promise<Response> => mockAuthFetch(input, init),
}));
jest.mock("../../../src/api/authDialog", () => ({
  openAuthDialog: jest.fn(async () => ({ status: "cancelled" })),
  isDialogAuthSupported: jest.fn(() => true),
}));
jest.mock("../../../src/api/vaultKeys", () => ({
  listVaultKeys: jest.fn(async () => []),
  deleteVaultKey: jest.fn(async () => true),
}));
jest.mock("../../../src/llm/vaultMode", () => ({
  setVaultKeyProviders: jest.fn(),
  hasLocalKeyOverride: jest.fn(() => false),
  setLocalKeyOverride: jest.fn(),
  clearVaultMode: jest.fn(),
}));

// ─── Store mock ─────────────────────────────────────────────────────────────

const mockStore = {
  getAglcVersion: jest.fn(() => "4"),
  getStandardId: jest.fn(() => "aglc4"),
  getWritingMode: jest.fn(() => "academic"),
  getCourtJurisdiction: jest.fn((): string | undefined => undefined),
  getCourtToggles: jest.fn((): Record<string, string> | undefined => undefined),
  getAll: jest.fn(() => [{ id: "cit-1" }]),
  setStandardId: jest.fn(async () => undefined),
  setAglcVersion: jest.fn(async () => undefined),
  setWritingMode: jest.fn(async () => undefined),
  setCourtJurisdiction: jest.fn(async () => undefined),
  setCourtToggles: jest.fn(async () => undefined),
  // STD-022 defines the NZLSG citation-style accessors on the document store.
  getNzlsgStyle: jest.fn((): string | undefined => undefined),
  setNzlsgStyle: jest.fn(async () => undefined),
};
jest.mock("../../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

// ─── Shared Settings mocks (mirror tests/ui/Settings.test.tsx) ──────────────

jest.mock("../../../src/word/footnoteManager", () => ({ lockAllObiterFootnotes: jest.fn() }));
jest.mock("../../../src/word/branding", () => ({
  hasAttribution: jest.fn(async () => false),
  insertAcknowledgment: jest.fn(),
  getAcknowledgmentText: jest.fn(() => ""),
}));
jest.mock("../../../src/word/documentProperties", () => ({
  writeObiterProperties: jest.fn(async () => undefined),
}));
jest.mock("../../../src/word/styles", () => ({ applyAglc4Styles: jest.fn() }));
jest.mock("../../../src/word/template", () => ({ applyAglc4Template: jest.fn() }));
jest.mock("../../../src/word/documentMeta", () => ({
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
jest.mock("../../../src/llm/config", () => ({
  loadLlmConfig: jest.fn(() => null),
  saveLlmConfig: jest.fn(),
  testConnection: jest.fn(async () => ({ ok: true })),
  clearStoredKeys: jest.fn(() => ({ llmKeyCleared: false, vaultKeysRemoved: 0 })),
}));
jest.mock("../../../src/api/sourceRegistry", () => ({
  getAllAdapters: jest.fn(() => []),
  getAdaptersByTier: jest.fn(() => ({ open: [], live: [], "link-only": [] })),
  isAdapterEnabled: jest.fn(() => false),
  setAdapterEnabled: jest.fn(),
  isMasterEnabled: jest.fn(() => false),
  setMasterEnabled: jest.fn(),
  TIER_LABELS: { open: "Open access", live: "Live services", "link-only": "Link only" },
}));
jest.mock("../../../src/api/adapterSearch", () => ({
  getAdapterInstance: jest.fn(() => undefined),
  initialiseAdapters: jest.fn(),
}));
jest.mock("../../../src/api/keyVault", () => ({
  saveKey: jest.fn(),
  getKey: jest.fn(() => null),
  removeKey: jest.fn(),
  hasKey: jest.fn(() => false),
}));
jest.mock("../../../src/api/corpus/corpusDownload", () => ({
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
jest.mock("../../../src/api/initializeAdapters", () => ({
  registerCorpusAfterDownload: jest.fn(),
}));
jest.mock("../../../src/ui/hooks/useVersionCheck", () => ({
  useVersionCheck: (): unknown => ({
    currentVersion: "9.9.9",
    latestVersion: null,
    updateAvailable: false,
    updateUrl: null,
    loading: false,
  }),
  clearVersionCache: jest.fn(),
}));
jest.mock("../../../src/ui/hooks/useComfortMode", () => ({
  useComfortMode: (): unknown => [false, jest.fn()],
}));
jest.mock("../../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    autoRefreshEnabled: true,
    setAutoRefreshEnabled: jest.fn(),
    triggerRefresh: jest.fn(),
  }),
}));
jest.mock("../../../src/debug", () => ({
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

// ─── Fixtures and helpers ───────────────────────────────────────────────────

const HCA_TOGGLES = {
  parallelCitations: "mandatory",
  pinpointStyle: "para-and-page",
  unreportedGate: "off",
  ibidSuppression: "on",
  loaType: "part-ab",
};
const WASC_TOGGLES = {
  parallelCitations: "mandatory",
  pinpointStyle: "para-and-page",
  unreportedGate: "off",
  ibidSuppression: "on",
  loaType: "simple",
  parallelOrder: "mnc-first",
};

const mockOpenAuthDialog = openAuthDialog as unknown as jest.Mock;

function signInSucceeds(): void {
  mockOpenAuthDialog.mockImplementationOnce(async () => {
    mockSignedIn = true;
    return { status: "success", email: "lawyer@example.com" };
  });
}

function familySelect(): HTMLSelectElement {
  return screen.getByLabelText("Standard") as HTMLSelectElement;
}
function jurisdictionSelect(): HTMLSelectElement {
  return screen.getByLabelText("Jurisdiction") as HTMLSelectElement;
}

/** Render, wait for load and (when signed in with sync on) for the initial GET. */
async function renderSettings(): Promise<void> {
  render(<Settings />);
  await screen.findByLabelText("Standard");
  if (mockSignedIn && localStorage.getItem("obiter-device.syncedSettings") === "true") {
    await waitFor(() => expect(getCalls()).toBeGreaterThanOrEqual(1));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockSignedIn = false;
  mockServerSettings = {};
  mockServerVersion = 3;
  mockStore.getStandardId.mockReturnValue("aglc4");
  mockStore.getWritingMode.mockReturnValue("academic");
  mockStore.getCourtJurisdiction.mockReturnValue(undefined);
  mockStore.getCourtToggles.mockReturnValue(undefined);
  mockStore.getNzlsgStyle.mockReturnValue(undefined);
  resetSettingsSync();
});

// ─── Guards: no traffic when sync is off or signed out ──────────────────────

describe("STD-011 sync — nothing is pushed unless signed in with sync on", () => {
  test("signed in, sync off: standard and jurisdiction changes make no request", async () => {
    mockSignedIn = true;
    mockStore.getWritingMode.mockReturnValue("court");
    await renderSettings();

    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });
    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalledWith(HCA_TOGGLES));
    fireEvent.change(familySelect(), { target: { value: "OSCOLA" } });
    await waitFor(() => expect(mockStore.setStandardId).toHaveBeenCalledWith("oscola5"));

    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  test("signed out, sync on: a jurisdiction change makes no request", async () => {
    setDevicePref("syncedSettings", true);
    mockStore.getWritingMode.mockReturnValue("court");
    await renderSettings();

    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });
    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalledWith(HCA_TOGGLES));

    expect(mockAuthFetch).not.toHaveBeenCalled();
  });
});

// ─── Push: court toggles and jurisdiction ───────────────────────────────────

describe("STD-011 sync — court mode pushes the toggles and jurisdiction", () => {
  beforeEach(() => {
    mockSignedIn = true;
    setDevicePref("syncedSettings", true);
    mockStore.getWritingMode.mockReturnValue("court");
  });

  test("selecting a preset PUTs the preset's toggle record at the version last seen", async () => {
    await renderSettings();
    expect(putCalls()).toHaveLength(0);

    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });

    await waitFor(() => expect(putCalls()).toHaveLength(1));
    const [put] = putCalls();
    expect(put.settingsVersion).toBe(3);
    expect(put.settings.courtToggles).toEqual(HCA_TOGGLES);
    // The push carries only the namespaces that changed.
    expect(put.settings).not.toHaveProperty("llmConfig");
    expect(JSON.stringify(put)).not.toContain("apiKey");
  });

  test("the WASC record synced includes parallelOrder: mnc-first", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "WASC" } });
    await waitFor(() => expect(putCalls()).toHaveLength(1));
    expect(putCalls()[0].settings.courtToggles).toEqual(WASC_TOGGLES);
  });

  test("a toggle override PUTs the merged record and advances the version", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });
    await waitFor(() => expect(putCalls()).toHaveLength(1));

    fireEvent.change(screen.getByLabelText("Ibid / (n X) suppression"), { target: { value: "off" } });

    await waitFor(() => expect(putCalls()).toHaveLength(2));
    const [, override] = putCalls();
    expect(override.settingsVersion).toBe(4);
    expect(override.settings.courtToggles).toEqual({ ...HCA_TOGGLES, ibidSuppression: "off" });
  });

  // STD-022 landed: the jurisdiction is a synced namespace
  // (`courtJurisdiction`) pushed with the toggles on a preset change.
  test("selecting a preset also PUTs the jurisdiction id", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });
    await waitFor(() => expect(putWith("courtJurisdiction")).toBeDefined());
    expect(putWith("courtJurisdiction")?.settings.courtJurisdiction).toBe("HCA");
    expect(putWith("courtJurisdiction")?.settings.courtToggles).toEqual(HCA_TOGGLES);
  });

  test("a failed push reports on the Account line and the document save still happens", async () => {
    await renderSettings();
    mockAuthFetch.mockImplementationOnce(async () => {
      throw new Error("Network down.");
    });

    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });

    await waitFor(() =>
      expect(
        screen.getByText("Settings saved on this device. Syncing to your account failed: Network down.")
      ).toBeInTheDocument()
    );
    expect(mockStore.setCourtToggles).toHaveBeenCalledWith(HCA_TOGGLES);
  });
});

// ─── Push: the standard ─────────────────────────────────────────────────────

describe("STD-011 sync — changing the standard pushes its id", () => {
  beforeEach(() => {
    mockSignedIn = true;
    setDevicePref("syncedSettings", true);
  });

  // STD-022 landed: handleStandardChange pushes the `standardId` namespace.
  test("AGLC4 → OSCOLA 5 PUTs standardId: oscola5", async () => {
    await renderSettings();
    fireEvent.change(familySelect(), { target: { value: "OSCOLA" } });
    await waitFor(() => expect(mockStore.setStandardId).toHaveBeenCalledWith("oscola5"));

    await waitFor(() => expect(putWith("standardId")).toBeDefined());
    expect(putWith("standardId")?.settings.standardId).toBe("oscola5");
    expect(putWith("standardId")?.settingsVersion).toBe(3);
  });

  // STD-022 landed. Leaving AGLC court mode syncs the reset too: the id,
  // the cleared toggles and an empty jurisdiction.
  test("AGLC court/HCA → NZLSG 3 PUTs the new id and clears the synced court namespaces", async () => {
    mockStore.getWritingMode.mockReturnValue("court");
    mockStore.getCourtJurisdiction.mockReturnValue("HCA");
    mockStore.getCourtToggles.mockReturnValue(HCA_TOGGLES);
    await renderSettings();

    fireEvent.change(familySelect(), { target: { value: "NZLSG" } });
    await waitFor(() => expect(mockStore.setWritingMode).toHaveBeenCalledWith("academic"));

    await waitFor(() => expect(putWith("standardId")).toBeDefined());
    expect(putWith("standardId")?.settings.standardId).toBe("nzlsg3");
    const lastToggles = [...putCalls()].reverse().find((p) => "courtToggles" in p.settings);
    expect(lastToggles?.settings.courtToggles).toEqual({});
  });

  // STD-022 landed: the NZLSG style control's value is pushed as the
  // `nzlsgStyle` namespace.
  test("under NZLSG choosing commercial style PUTs nzlsgStyle: commercial", async () => {
    mockStore.getStandardId.mockReturnValue("nzlsg3");
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Citation style"), { target: { value: "commercial" } });

    await waitFor(() => expect(mockStore.setNzlsgStyle).toHaveBeenCalledWith("commercial"));
    await waitFor(() => expect(putWith("nzlsgStyle")).toBeDefined());
    expect(putWith("nzlsgStyle")?.settings.nzlsgStyle).toBe("commercial");
  });
});

// ─── Seed on turning sync on ────────────────────────────────────────────────

describe("STD-011 sync — turning sync on seeds the account from this document", () => {
  beforeEach(() => {
    mockSignedIn = true;
  });

  test("with a jurisdiction set, the seed carries the document's court toggles", async () => {
    mockStore.getWritingMode.mockReturnValue("court");
    mockStore.getCourtJurisdiction.mockReturnValue("HCA");
    mockStore.getCourtToggles.mockReturnValue({ ...HCA_TOGGLES, ibidSuppression: "off" });
    await renderSettings();
    await waitFor(() => expect(screen.getByText(/Signed in as/i)).toBeInTheDocument());
    expect(mockAuthFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Sync settings to my account"));

    await waitFor(() => expect(putCalls()).toHaveLength(1));
    const [seed] = putCalls();
    expect(seed.settings.courtToggles).toEqual({ ...HCA_TOGGLES, ibidSuppression: "off" });
    expect(seed.settings.autoRefresh).toBe(true);
    expect(seed.settings.templatePrefs).toMatchObject({ fontName: "Times New Roman" });
  });

  test("without a jurisdiction, the seed carries empty court toggles", async () => {
    await renderSettings();
    await waitFor(() => expect(screen.getByText(/Signed in as/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Sync settings to my account"));

    await waitFor(() => expect(putCalls()).toHaveLength(1));
    expect(putCalls()[0].settings.courtToggles).toEqual({});
  });

  // STD-022 landed: the seed includes the standard (and, under NZLSG, the
  // style) alongside the existing namespaces.
  test("the seed carries the document's standard id", async () => {
    mockStore.getStandardId.mockReturnValue("oscola4");
    await renderSettings();
    await waitFor(() => expect(screen.getByText(/Signed in as/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Sync settings to my account"));

    await waitFor(() => expect(putCalls()).toHaveLength(1));
    expect(putCalls()[0].settings.standardId).toBe("oscola4");
  });
});

// ─── Pull on sign-in ────────────────────────────────────────────────────────

describe("STD-011 sync — pulling on sign-in and the document's standard", () => {
  test("a synced standard and court toggles are pulled but never written into the open document's store", async () => {
    // Current behaviour, asserted as such: the pull applies llmConfig only.
    // A synced standard silently reformatting an already-open document
    // would be destructive; whether it should seed a document with no
    // explicit standard is the DECISION-040 question below.
    setDevicePref("syncedSettings", true);
    mockServerSettings = {
      llmConfig: {},
      templatePrefs: {},
      autoRefresh: true,
      courtToggles: { ...HCA_TOGGLES, ibidSuppression: "off" },
      standardId: "oscola5",
      courtJurisdiction: "HCA",
    };
    await renderSettings();
    expect(familySelect()).toHaveValue("AGLC");

    signInSucceeds();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(getCalls()).toBe(1));
    await waitFor(() => expect(screen.getByText(/Signed in as/i)).toBeInTheDocument());
    expect(mockStore.setStandardId).not.toHaveBeenCalled();
    expect(mockStore.setAglcVersion).not.toHaveBeenCalled();
    expect(mockStore.setWritingMode).not.toHaveBeenCalled();
    expect(mockStore.setCourtJurisdiction).not.toHaveBeenCalled();
    expect(mockStore.setCourtToggles).not.toHaveBeenCalled();
    expect(familySelect()).toHaveValue("AGLC");
    expect(screen.getByLabelText("Writing mode")).toHaveValue("academic");
    // Nothing was pushed back either.
    expect(putCalls()).toHaveLength(0);
  });

  test("already signed in on load with sync on: one GET, and the document's standard is untouched", async () => {
    mockSignedIn = true;
    setDevicePref("syncedSettings", true);
    mockServerSettings = { standardId: "nzlsg3", courtToggles: {} };
    mockStore.getStandardId.mockReturnValue("oscola4");
    await renderSettings();

    expect(getCalls()).toBe(1);
    expect(mockStore.setStandardId).not.toHaveBeenCalled();
    expect(familySelect()).toHaveValue("OSCOLA");
    expect(localStorage.getItem("obiter-device.defaultStandard")).toBeNull();
  });

  test("a device default standard is applied to a document with no explicit standard on load (INFRA-009, independent of sync)", async () => {
    setDevicePref("defaultStandard", "oscola5");
    mockStore.getStandardId.mockReturnValue("oscola5");
    await renderSettings();
    expect(mockStore.setStandardId).toHaveBeenCalledWith("oscola5");
    expect(mockStore.setAglcVersion).not.toHaveBeenCalled();
    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  test.todo(
    "DECISION-040: on sign-in with sync on, should a synced standardId seed the device default (and so a document with no explicit standard yet), or stay a per-device choice? The plan (STD-011/022) specifies the push only."
  );
  test.todo(
    "DECISION-040: on sign-in, should synced courtToggles / courtJurisdiction ever apply to the open document, or only to the next document that enters court mode?"
  );
});
