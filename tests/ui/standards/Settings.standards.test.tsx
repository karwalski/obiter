/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * STD-011 — Settings: switching between standards, the court-mode reset, the
 * standard notice, court presets and toggle overrides, and the two controls
 * STD-022 adds (court `parallelOrder`, NZLSG citation style).
 *
 * Convention (STD epic): every test asserts the CORRECT behaviour. Where the
 * current code falls short the assertion stays and the test is marked
 * `test.failing` with the story that removes the mark. Rule questions that
 * the sources do not settle are `test.todo("DECISION-040: …")`.
 *
 * Mocks mirror tests/ui/Settings.test.tsx (store, Word, device prefs) plus a
 * signed-out auth client so `pushSyncedSettings` is a no-op here; the synced
 * PUT bodies are covered by SettingsSync.standards.test.tsx.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import Settings from "../../../src/ui/views/Settings";
import { COURT_PRESETS } from "../../../src/engine/court/presets";

// ─── Store mock ─────────────────────────────────────────────────────────────

const mockStore = {
  getAglcVersion: jest.fn(),
  getStandardId: jest.fn(),
  getWritingMode: jest.fn(),
  getCourtJurisdiction: jest.fn(),
  getCourtToggles: jest.fn(),
  getAll: jest.fn(),
  setStandardId: jest.fn(),
  setAglcVersion: jest.fn(),
  setWritingMode: jest.fn(),
  setCourtJurisdiction: jest.fn(),
  setCourtToggles: jest.fn(),
  // STD-022 defines the NZLSG citation-style accessors on the document store
  // (general / commercial, stored in document metadata and mapped into the
  // config). Present on the mock so the control tests exercise the setter.
  getNzlsgStyle: jest.fn(),
  setNzlsgStyle: jest.fn(),
};
jest.mock("../../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

// ─── Account mocks: signed out, so no sync traffic ──────────────────────────

jest.mock("../../../src/api/authClient", () => ({
  isSignedIn: jest.fn(() => false),
  getEmail: jest.fn(() => null),
  signOut: jest.fn(async () => undefined),
  deleteAccount: jest.fn(async () => undefined),
  exportData: jest.fn(async () => ({})),
  fetchMe: jest.fn(async () => ({ email: "", mfaEnabled: false, keyProviders: [], syncedSettings: false })),
  clearSession: jest.fn(),
  authFetch: jest.fn(),
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
const mockTriggerRefresh = jest.fn();
jest.mock("../../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    autoRefreshEnabled: true,
    setAutoRefreshEnabled: jest.fn(),
    triggerRefresh: mockTriggerRefresh,
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

// Word.run is invoked during load (document properties / migration check).
(globalThis as Record<string, unknown>).Word = {
  run: async <T,>(callback: (ctx: unknown) => Promise<T>): Promise<T> => callback({}),
};

// ─── Fixtures ───────────────────────────────────────────────────────────────

const A_CITATION = { id: "cit-1" };

/** Every selectable standard, in the order the switching test walks them. */
const SELECTABLE_STANDARDS = ["aglc4", "oscola5", "oscola4", "nzlsg3"] as const;

const STANDARD_NOTICE =
  "Standard updated. Run Refresh All to reformat existing citations to the new standard.";

/** The toggle record Settings writes for a preset (handleJurisdictionChange). */
function presetToggles(id: keyof typeof COURT_PRESETS): Record<string, string> {
  const p = COURT_PRESETS[id];
  return {
    parallelCitations: p.parallelCitations,
    pinpointStyle: p.pinpointStyle,
    unreportedGate: p.unreportedGate,
    ibidSuppression: p.ibidSuppression,
    loaType: p.loaType,
    ...(p.parallelOrder ? { parallelOrder: p.parallelOrder } : {}),
  };
}

const HCA_TOGGLES = {
  parallelCitations: "mandatory",
  pinpointStyle: "para-and-page",
  unreportedGate: "off",
  ibidSuppression: "on",
  loaType: "part-ab",
};
const NSWCA_TOGGLES = {
  parallelCitations: "preferred",
  pinpointStyle: "para-only",
  unreportedGate: "warn",
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
const STATE_TRIBUNAL_TOGGLES = {
  parallelCitations: "off",
  pinpointStyle: "para-only",
  unreportedGate: "off",
  ibidSuppression: "on",
  loaType: "off",
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockStore.getAglcVersion.mockReturnValue("4");
  mockStore.getStandardId.mockReturnValue("aglc4");
  mockStore.getWritingMode.mockReturnValue("academic");
  mockStore.getCourtJurisdiction.mockReturnValue(undefined);
  mockStore.getCourtToggles.mockReturnValue(undefined);
  mockStore.getNzlsgStyle.mockReturnValue(undefined);
  mockStore.getAll.mockReturnValue([A_CITATION]);
  mockStore.setStandardId.mockResolvedValue(undefined);
  mockStore.setAglcVersion.mockResolvedValue(undefined);
  mockStore.setWritingMode.mockResolvedValue(undefined);
  mockStore.setCourtJurisdiction.mockResolvedValue(undefined);
  mockStore.setCourtToggles.mockResolvedValue(undefined);
  mockStore.setNzlsgStyle.mockResolvedValue(undefined);
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Render and wait for the Citation Standard section (present under every standard). */
async function renderSettings(): Promise<HTMLElement> {
  const { container } = render(<Settings />);
  await screen.findByLabelText("Standard");
  return container;
}

function familySelect(): HTMLSelectElement {
  return screen.getByLabelText("Standard") as HTMLSelectElement;
}

function editionRadio(id: string): HTMLInputElement {
  const radio = document.querySelector<HTMLInputElement>(
    `input[name="standardEdition"][value="${id}"]`
  );
  if (!radio) throw new Error(`No edition radio for ${id}`);
  return radio;
}

function jurisdictionSelect(): HTMLSelectElement {
  return screen.getByLabelText("Jurisdiction") as HTMLSelectElement;
}

/** The persisted device default (INFRA-009), JSON-decoded. */
function deviceDefaultStandard(): unknown {
  const raw = localStorage.getItem("obiter-device.defaultStandard");
  return raw === null ? undefined : JSON.parse(raw);
}

async function selectFamily(family: "AGLC" | "OSCOLA" | "NZLSG", expectedId: string): Promise<void> {
  fireEvent.change(familySelect(), { target: { value: family } });
  await waitFor(() => expect(mockStore.setStandardId).toHaveBeenLastCalledWith(expectedId));
  await waitFor(() => expect(familySelect()).toHaveValue(family));
}

// ─── 1. Switching between standards ─────────────────────────────────────────

describe("STD-011 — switching AGLC4 → OSCOLA 5 → OSCOLA 4 → NZLSG 3 → AGLC4", () => {
  test("each switch writes the store, persists the device default and moves the pickers", async () => {
    await renderSettings();
    expect(familySelect()).toHaveValue("AGLC");
    expect(editionRadio("aglc4").checked).toBe(true);
    expect(deviceDefaultStandard()).toBeUndefined();

    // AGLC4 → OSCOLA 5 (the family picker selects the first available edition).
    await selectFamily("OSCOLA", "oscola5");
    expect(deviceDefaultStandard()).toBe("oscola5");
    expect(editionRadio("oscola5").checked).toBe(true);
    // Under OSCOLA the AGLC version is left alone.
    expect(mockStore.setAglcVersion).not.toHaveBeenCalled();

    // OSCOLA 5 → OSCOLA 4 via the edition radio.
    fireEvent.click(editionRadio("oscola4"));
    await waitFor(() => expect(mockStore.setStandardId).toHaveBeenLastCalledWith("oscola4"));
    await waitFor(() => expect(editionRadio("oscola4").checked).toBe(true));
    expect(familySelect()).toHaveValue("OSCOLA");
    expect(deviceDefaultStandard()).toBe("oscola4");

    // OSCOLA 4 → NZLSG 3.
    await selectFamily("NZLSG", "nzlsg3");
    expect(deviceDefaultStandard()).toBe("nzlsg3");
    expect(editionRadio("nzlsg3").checked).toBe(true);
    // The coming-soon edition is offered but disabled.
    expect(editionRadio("nzlsg4").disabled).toBe(true);

    // NZLSG 3 → AGLC4: the AGLC version is re-synced for backward compatibility.
    await selectFamily("AGLC", "aglc4");
    expect(deviceDefaultStandard()).toBe("aglc4");
    expect(editionRadio("aglc4").checked).toBe(true);
    expect(mockStore.setAglcVersion).toHaveBeenCalledWith("4");

    expect(mockStore.setStandardId.mock.calls.map(([id]) => id)).toEqual([
      "oscola5",
      "oscola4",
      "nzlsg3",
      "aglc4",
    ]);
    // Every switch schedules a refresh (the notice tells the user to run it).
    expect(mockTriggerRefresh).toHaveBeenCalledTimes(4);
  });

  test("re-selecting the current family is a no-op", async () => {
    await renderSettings();
    fireEvent.change(familySelect(), { target: { value: "AGLC" } });
    await waitFor(() => expect(mockTriggerRefresh).not.toHaveBeenCalled());
    expect(mockStore.setStandardId).not.toHaveBeenCalled();
  });

  test("the standard notice appears when the library has citations and stays hidden when it is empty", async () => {
    await renderSettings();
    expect(screen.queryByText(STANDARD_NOTICE)).toBeNull();

    await selectFamily("OSCOLA", "oscola5");
    expect(screen.getByText(STANDARD_NOTICE)).toBeInTheDocument();

    // Same notice text for every standard (it is about reflowing, not the standard).
    await selectFamily("NZLSG", "nzlsg3");
    expect(screen.getByText(STANDARD_NOTICE)).toBeInTheDocument();
    await selectFamily("AGLC", "aglc4");
    expect(screen.getByText(STANDARD_NOTICE)).toBeInTheDocument();
  });

  test("no standard notice when there is nothing to reformat", async () => {
    mockStore.getAll.mockReturnValue([]);
    await renderSettings();
    await selectFamily("OSCOLA", "oscola5");
    expect(screen.queryByText(STANDARD_NOTICE)).toBeNull();
  });

  test("the Writing Mode (court) fieldset is shown under AGLC only", async () => {
    await renderSettings();
    expect(screen.getByLabelText("Writing mode")).toBeInTheDocument();

    await selectFamily("OSCOLA", "oscola5");
    expect(screen.queryByLabelText("Writing mode")).toBeNull();
    expect(screen.queryByText("Writing Mode")).toBeNull();

    fireEvent.click(editionRadio("oscola4"));
    await waitFor(() => expect(editionRadio("oscola4").checked).toBe(true));
    expect(screen.queryByLabelText("Writing mode")).toBeNull();

    await selectFamily("NZLSG", "nzlsg3");
    expect(screen.queryByLabelText("Writing mode")).toBeNull();

    await selectFamily("AGLC", "aglc4");
    expect(screen.getByLabelText("Writing mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Writing mode")).toHaveValue("academic");
  });

  test.each(["oscola5", "oscola4", "nzlsg3"] as const)(
    "a document already on %s renders without the court fieldset and with its family selected",
    async (id) => {
      mockStore.getStandardId.mockReturnValue(id);
      await renderSettings();
      expect(familySelect()).toHaveValue(id.startsWith("oscola") ? "OSCOLA" : "NZLSG");
      expect(editionRadio(id).checked).toBe(true);
      expect(screen.queryByLabelText("Writing mode")).toBeNull();
      expect(screen.queryByLabelText("Jurisdiction")).toBeNull();
    }
  );
});

describe("STD-011 — leaving AGLC court mode resets the document to academic", () => {
  test.each([
    ["OSCOLA", "oscola5"],
    ["NZLSG", "nzlsg3"],
  ] as const)("AGLC court/HCA → %s clears writing mode, jurisdiction and toggles", async (family, id) => {
    mockStore.getWritingMode.mockReturnValue("court");
    mockStore.getCourtJurisdiction.mockReturnValue("HCA");
    mockStore.getCourtToggles.mockReturnValue(HCA_TOGGLES);
    localStorage.setItem("obiter-device.courtToggles", JSON.stringify({ ibidSuppression: "on" }));
    await renderSettings();
    expect(screen.getByLabelText("Writing mode")).toHaveValue("court");
    expect(jurisdictionSelect()).toHaveValue("HCA");

    await selectFamily(family, id);

    await waitFor(() => {
      expect(mockStore.setWritingMode).toHaveBeenCalledWith("academic");
      expect(mockStore.setCourtJurisdiction).toHaveBeenCalledWith(undefined);
      expect(mockStore.setCourtToggles).toHaveBeenCalledWith(undefined);
    });
    expect(mockStore.setWritingMode).toHaveBeenCalledTimes(1);
    expect(mockStore.setCourtJurisdiction).toHaveBeenCalledTimes(1);
    expect(mockStore.setCourtToggles).toHaveBeenCalledTimes(1);
    expect(mockStore.setAglcVersion).not.toHaveBeenCalled();
    // The legacy device-level toggle key is deleted; the device default moves.
    expect(localStorage.getItem("obiter-device.courtToggles")).toBeNull();
    expect(deviceDefaultStandard()).toBe(id);
    // The court UI is gone and the reset survives a return to AGLC.
    expect(screen.queryByLabelText("Jurisdiction")).toBeNull();
    await selectFamily("AGLC", "aglc4");
    expect(screen.getByLabelText("Writing mode")).toHaveValue("academic");
    expect(screen.queryByLabelText("Jurisdiction")).toBeNull();
  });

  test("AGLC academic → OSCOLA touches nothing court-related", async () => {
    await renderSettings();
    await selectFamily("OSCOLA", "oscola5");
    expect(mockStore.setWritingMode).not.toHaveBeenCalled();
    expect(mockStore.setCourtJurisdiction).not.toHaveBeenCalled();
    expect(mockStore.setCourtToggles).not.toHaveBeenCalled();
  });
});

// ─── 2. Court presets and toggle overrides ──────────────────────────────────

describe("STD-011 — court presets write the toggle record the preset defines", () => {
  beforeEach(() => {
    mockStore.getWritingMode.mockReturnValue("court");
  });

  test.each([
    ["HCA", HCA_TOGGLES, "CLR"],
    ["NSWCA", NSWCA_TOGGLES, "NSWLR → CLR → ALR"],
    ["WASC", WASC_TOGGLES, "WAR → CLR → ALR"],
  ] as const)("selecting %s persists the preset toggles and shows its report hierarchy", async (id, expected, hierarchy) => {
    await renderSettings();
    expect(screen.queryByText("Court toggles (override preset defaults)")).toBeNull();

    fireEvent.change(jurisdictionSelect(), { target: { value: id } });

    await waitFor(() => expect(mockStore.setCourtJurisdiction).toHaveBeenCalledWith(id));
    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalledWith(expected));
    // The record is exactly the preset (a fixture-independent check of the same thing).
    expect(mockStore.setCourtToggles).toHaveBeenLastCalledWith(presetToggles(id));
    // The legacy device-level copy is deleted, never written.
    expect(localStorage.getItem("obiter-device.courtToggles")).toBeNull();

    // The toggle controls reflect the preset.
    expect(screen.getByLabelText("Parallel citations")).toHaveValue(expected.parallelCitations);
    expect(screen.getByLabelText("Pinpoint style")).toHaveValue(expected.pinpointStyle);
    expect(screen.getByLabelText("Unreported-judgment gate")).toHaveValue(expected.unreportedGate);
    expect(screen.getByLabelText("Ibid / (n X) suppression")).toHaveValue(expected.ibidSuppression);
    expect(screen.getByLabelText("List of Authorities")).toHaveValue(expected.loaType);

    // The authorised-report hierarchy is read-only and shows the preset's series.
    const hierarchyField = screen.getByLabelText("Authorised-report hierarchy") as HTMLInputElement;
    expect(hierarchyField.disabled).toBe(true);
    expect(hierarchyField).toHaveValue(hierarchy);

    expect(screen.getByText(/Jurisdiction updated\./)).toBeInTheDocument();
    expect(mockTriggerRefresh).toHaveBeenCalled();
  });

  test("WASC is the only preset that carries parallelOrder, and it is mnc-first", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "WASC" } });
    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalled());
    expect(mockStore.setCourtToggles.mock.calls[0][0]).toHaveProperty("parallelOrder", "mnc-first");

    for (const other of ["HCA", "NSWCA", "STATE_TRIBUNAL"] as const) {
      expect(presetToggles(other)).not.toHaveProperty("parallelOrder");
    }
  });

  test("STATE_TRIBUNAL writes an MNC-only record (no parallel citations, no LOA)", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "STATE_TRIBUNAL" } });

    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalledWith(STATE_TRIBUNAL_TOGGLES));
    expect(mockStore.setCourtJurisdiction).toHaveBeenCalledWith("STATE_TRIBUNAL");
    expect(screen.getByLabelText("Parallel citations")).toHaveValue("off");
    expect(screen.getByLabelText("List of Authorities")).toHaveValue("off");
    expect((screen.getByLabelText("Authorised-report hierarchy") as HTMLInputElement).disabled).toBe(true);
  });

  test.todo(
    "DECISION-040: what should the read-only hierarchy field show for a tribunal with no authorised series — blank (current) or the 'MNC only' fallback the field already defines?"
  );

  test("clearing the jurisdiction clears the toggles and hides the toggle group", async () => {
    mockStore.getCourtJurisdiction.mockReturnValue("HCA");
    mockStore.getCourtToggles.mockReturnValue(HCA_TOGGLES);
    await renderSettings();
    expect(screen.getByText("Court toggles (override preset defaults)")).toBeInTheDocument();

    fireEvent.change(jurisdictionSelect(), { target: { value: "" } });

    await waitFor(() => expect(mockStore.setCourtJurisdiction).toHaveBeenCalledWith(undefined));
    expect(mockStore.setCourtToggles).toHaveBeenCalledWith(undefined);
    expect(screen.queryByText("Court toggles (override preset defaults)")).toBeNull();
    expect(screen.getByText(/Jurisdiction cleared\./)).toBeInTheDocument();
  });
});

describe("STD-011 — toggle overrides persist to the document store", () => {
  beforeEach(() => {
    mockStore.getWritingMode.mockReturnValue("court");
  });

  test("an override merges into the preset record and is written to the store", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });
    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalledWith(HCA_TOGGLES));

    fireEvent.change(screen.getByLabelText("Ibid / (n X) suppression"), { target: { value: "off" } });
    await waitFor(() =>
      expect(mockStore.setCourtToggles).toHaveBeenLastCalledWith({ ...HCA_TOGGLES, ibidSuppression: "off" })
    );

    fireEvent.change(screen.getByLabelText("Pinpoint style"), { target: { value: "para-only" } });
    await waitFor(() =>
      expect(mockStore.setCourtToggles).toHaveBeenLastCalledWith({
        ...HCA_TOGGLES,
        ibidSuppression: "off",
        pinpointStyle: "para-only",
      })
    );
    expect(screen.getByLabelText("Ibid / (n X) suppression")).toHaveValue("off");
    expect(screen.getByLabelText("Pinpoint style")).toHaveValue("para-only");
    expect(localStorage.getItem("obiter-device.courtToggles")).toBeNull();
  });

  test("a stored partial override is layered over the preset on load", async () => {
    mockStore.getCourtJurisdiction.mockReturnValue("NSWCA");
    mockStore.getCourtToggles.mockReturnValue({ loaType: "simple" });
    await renderSettings();

    expect(jurisdictionSelect()).toHaveValue("NSWCA");
    expect(screen.getByLabelText("List of Authorities")).toHaveValue("simple");
    expect(screen.getByLabelText("Parallel citations")).toHaveValue("preferred");
    expect(screen.getByLabelText("Pinpoint style")).toHaveValue("para-only");
    expect(screen.getByLabelText("Unreported-judgment gate")).toHaveValue("warn");
    expect(screen.getByLabelText("Ibid / (n X) suppression")).toHaveValue("on");
    expect(screen.getByLabelText("Authorised-report hierarchy")).toHaveValue("NSWLR → CLR → ALR");
    // Loading never writes.
    expect(mockStore.setCourtToggles).not.toHaveBeenCalled();
  });

  test("a stored override for the WASC parallelOrder survives a load and a later override", async () => {
    mockStore.getCourtJurisdiction.mockReturnValue("WASC");
    mockStore.getCourtToggles.mockReturnValue({ ...WASC_TOGGLES, parallelOrder: "report-first" });
    await renderSettings();

    fireEvent.change(screen.getByLabelText("List of Authorities"), { target: { value: "part-ab" } });
    await waitFor(() =>
      expect(mockStore.setCourtToggles).toHaveBeenLastCalledWith({
        ...WASC_TOGGLES,
        parallelOrder: "report-first",
        loaType: "part-ab",
      })
    );
  });
});

// ─── 3. New controls (STD-022) ──────────────────────────────────────────────

describe("STD-022 — Parallel citation order control", () => {
  beforeEach(() => {
    mockStore.getWritingMode.mockReturnValue("court");
  });

  // STD-022 landed: the court fieldset's "Parallel citation order" select
  // (report-first / mnc-first) writes `parallelOrder` into the toggles.
  test("the control shows the preset's order and an override writes parallelOrder", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "WASC" } });
    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalledWith(WASC_TOGGLES));

    const order = screen.getByLabelText("Parallel citation order") as HTMLSelectElement;
    expect(order).toHaveValue("mnc-first");
    expect(Array.from(order.options).map((o) => o.value)).toEqual(["report-first", "mnc-first"]);

    fireEvent.change(order, { target: { value: "report-first" } });
    await waitFor(() =>
      expect(mockStore.setCourtToggles).toHaveBeenLastCalledWith({ ...WASC_TOGGLES, parallelOrder: "report-first" })
    );
    expect(localStorage.getItem("obiter-device.courtToggles")).toBeNull();
  });

  // STD-022 landed. A preset without parallelOrder (HCA) shows the engine
  // default, report-first, and choosing mnc-first adds the key to the record.
  test("a preset without parallelOrder shows report-first and can be switched to mnc-first", async () => {
    await renderSettings();
    fireEvent.change(jurisdictionSelect(), { target: { value: "HCA" } });
    await waitFor(() => expect(mockStore.setCourtToggles).toHaveBeenCalledWith(HCA_TOGGLES));

    const order = screen.getByLabelText("Parallel citation order");
    expect(order).toHaveValue("report-first");

    fireEvent.change(order, { target: { value: "mnc-first" } });
    await waitFor(() =>
      expect(mockStore.setCourtToggles).toHaveBeenLastCalledWith({ ...HCA_TOGGLES, parallelOrder: "mnc-first" })
    );
  });
});

describe("STD-022 — NZLSG Citation style control (general / commercial)", () => {
  test("the control is absent under AGLC and OSCOLA", async () => {
    await renderSettings();
    expect(screen.queryByLabelText("Citation style")).toBeNull();
    await selectFamily("OSCOLA", "oscola5");
    expect(screen.queryByLabelText("Citation style")).toBeNull();
  });

  // STD-022 landed: Settings renders a "Citation style" select under NZLSG
  // and persists it through the document store's `setNzlsgStyle` (document
  // metadata, mapped into the config by buildDocumentConfig).
  test("under NZLSG the control persists the style to document metadata", async () => {
    mockStore.getStandardId.mockReturnValue("nzlsg3");
    await renderSettings();

    const style = screen.getByLabelText("Citation style") as HTMLSelectElement;
    expect(Array.from(style.options).map((o) => o.value)).toEqual(["general", "commercial"]);
    expect(style).toHaveValue("general");

    fireEvent.change(style, { target: { value: "commercial" } });
    await waitFor(() => expect(mockStore.setNzlsgStyle).toHaveBeenCalledWith("commercial"));
    expect(style).toHaveValue("commercial");
  });

  // STD-022 landed: the control reads `getNzlsgStyle` on load.
  test("a stored commercial style is shown on load", async () => {
    mockStore.getStandardId.mockReturnValue("nzlsg3");
    mockStore.getNzlsgStyle.mockReturnValue("commercial");
    await renderSettings();
    expect(screen.getByLabelText("Citation style")).toHaveValue("commercial");
    expect(mockStore.setNzlsgStyle).not.toHaveBeenCalled();
  });

  // STD-022 landed. Switching to NZLSG reveals the control and switching
  // away hides it, without the court fieldset ever appearing under NZLSG.
  test("the control appears when switching to NZLSG and disappears on leaving", async () => {
    await renderSettings();
    await selectFamily("NZLSG", "nzlsg3");
    expect(screen.getByLabelText("Citation style")).toBeInTheDocument();
    expect(screen.queryByLabelText("Writing mode")).toBeNull();
    await selectFamily("AGLC", "aglc4");
    expect(screen.queryByLabelText("Citation style")).toBeNull();
  });
});

// ─── 5. Accessibility under each standard ───────────────────────────────────

describe("STD-011 — axe on Settings under each standard", () => {
  test.each(SELECTABLE_STANDARDS)("no violations under %s", async (id) => {
    mockStore.getStandardId.mockReturnValue(id);
    const container = await renderSettings();
    expect(editionRadio(id).checked).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
  });

  test("no violations under AGLC court mode with the HCA toggle group open", async () => {
    mockStore.getWritingMode.mockReturnValue("court");
    mockStore.getCourtJurisdiction.mockReturnValue("HCA");
    mockStore.getCourtToggles.mockReturnValue(HCA_TOGGLES);
    const container = await renderSettings();
    const group = screen.getByText("Court toggles (override preset defaults)").parentElement as HTMLElement;
    expect(within(group).getByLabelText("Parallel citations")).toHaveValue("mandatory");
    expect(await axe(container)).toHaveNoViolations();
  });
});
