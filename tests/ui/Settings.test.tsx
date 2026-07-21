/**
 * @jest-environment jsdom
 *
 * Settings — academic ↔ court mode switching (hardening review).
 *
 * The contract under test:
 * - Switching the citation standard away from AGLC resets writingMode to
 *   academic and clears the jurisdiction AND the document-store courtToggles
 *   (court mode is AGLC-only).
 * - A writing-mode change surfaces the non-blocking reformat notice
 *   (standardNotice pattern, WEB-013 — never window.confirm): the
 *   locked-footnote line always, the Manual Citations Mode line only when
 *   that device preference is on.
 * - Court toggle overrides are written to the DOCUMENT store; the legacy
 *   device preference is adopted into the store on the next court-mode save
 *   and the legacy key deleted.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import Settings from "../../src/ui/views/Settings";

// ─── Mocks ──────────────────────────────────────────────────────────────────

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
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

jest.mock("../../src/word/footnoteManager", () => ({
  lockAllObiterFootnotes: jest.fn(),
}));

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

const mockTriggerRefresh = jest.fn();
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    autoRefreshEnabled: true,
    setAutoRefreshEnabled: jest.fn(),
    triggerRefresh: mockTriggerRefresh,
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

// Word.run is invoked during load (document properties / migration check).
(globalThis as Record<string, unknown>).Word = {
  run: async <T,>(callback: (ctx: unknown) => Promise<T>): Promise<T> => callback({}),
};

// ─── Fixtures ───────────────────────────────────────────────────────────────

const A_CITATION = { id: "cit-1" };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockStore.getAglcVersion.mockReturnValue("4");
  mockStore.getStandardId.mockReturnValue("aglc4");
  mockStore.getWritingMode.mockReturnValue("academic");
  mockStore.getCourtJurisdiction.mockReturnValue(undefined);
  mockStore.getCourtToggles.mockReturnValue(undefined);
  mockStore.getAll.mockReturnValue([A_CITATION]);
  mockStore.setStandardId.mockResolvedValue(undefined);
  mockStore.setAglcVersion.mockResolvedValue(undefined);
  mockStore.setWritingMode.mockResolvedValue(undefined);
  mockStore.setCourtJurisdiction.mockResolvedValue(undefined);
  mockStore.setCourtToggles.mockResolvedValue(undefined);
});

async function renderSettings(): Promise<void> {
  render(<Settings />);
  // The Writing Mode select renders once loading completes (AGLC family).
  await screen.findByLabelText("Writing mode");
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Settings — standard switch resets court mode", () => {
  test("AGLC → OSCOLA resets writingMode to academic and clears jurisdiction and store toggles", async () => {
    mockStore.getWritingMode.mockReturnValue("court");
    mockStore.getCourtJurisdiction.mockReturnValue("HCA");
    mockStore.getCourtToggles.mockReturnValue({ ibidSuppression: "on" });
    localStorage.setItem("obiter-device.courtToggles", JSON.stringify({ ibidSuppression: "on" }));

    await renderSettings();

    fireEvent.change(screen.getByDisplayValue("AGLC"), { target: { value: "OSCOLA" } });

    await waitFor(() => {
      expect(mockStore.setStandardId).toHaveBeenCalledWith("oscola5");
      expect(mockStore.setWritingMode).toHaveBeenCalledWith("academic");
      expect(mockStore.setCourtJurisdiction).toHaveBeenCalledWith(undefined);
      expect(mockStore.setCourtToggles).toHaveBeenCalledWith(undefined);
    });
    // The legacy device-level key is deleted too.
    expect(localStorage.getItem("obiter-device.courtToggles")).toBeNull();
  });
});

describe("Settings — mode-switch notice (WEB-013 non-blocking pattern)", () => {
  test("switching writing mode shows the locked-footnote warning; no manual-mode line when the pref is off", async () => {
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Writing mode"), { target: { value: "court" } });

    await screen.findByText(
      /Locked footnotes keep their current formatting\. Unlock a footnote and run Refresh All to update it\./
    );
    expect(screen.queryByText(/citations will not update until it is turned off/)).toBeNull();
    expect(mockStore.setWritingMode).toHaveBeenCalledWith("court");
    expect(mockTriggerRefresh).toHaveBeenCalled();
  });

  test("the manual-mode line is added when Manual Citations Mode is on", async () => {
    localStorage.setItem("obiter-device.manualCitationMode", "true");
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Writing mode"), { target: { value: "court" } });

    const notice = await screen.findByText(/Locked footnotes keep their current formatting/);
    expect(notice.textContent).toContain(
      "Manual Citations Mode is on, so citations will not update until it is turned off."
    );
  });

  test("no notice when the library is empty (nothing to reformat)", async () => {
    mockStore.getAll.mockReturnValue([]);
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Writing mode"), { target: { value: "court" } });

    await waitFor(() => expect(mockStore.setWritingMode).toHaveBeenCalledWith("court"));
    expect(screen.queryByText(/Locked footnotes keep their current formatting/)).toBeNull();
  });

  test("switching back to academic clears jurisdiction and store toggles and still warns", async () => {
    mockStore.getWritingMode.mockReturnValue("court");
    mockStore.getCourtJurisdiction.mockReturnValue("HCA");
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Writing mode"), { target: { value: "academic" } });

    await waitFor(() => {
      expect(mockStore.setWritingMode).toHaveBeenCalledWith("academic");
      expect(mockStore.setCourtJurisdiction).toHaveBeenCalledWith(undefined);
      expect(mockStore.setCourtToggles).toHaveBeenCalledWith(undefined);
    });
    await screen.findByText(/Locked footnotes keep their current formatting/);
  });
});

describe("Settings — legacy device toggles adopted into the document store", () => {
  test("switching to court mode adopts the device-pref toggles and deletes the legacy key", async () => {
    localStorage.setItem(
      "obiter-device.courtToggles",
      JSON.stringify({ ibidSuppression: "on", pinpointStyle: "para-only" })
    );
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Writing mode"), { target: { value: "court" } });

    await waitFor(() => {
      expect(mockStore.setCourtToggles).toHaveBeenCalledWith({
        ibidSuppression: "on",
        pinpointStyle: "para-only",
      });
    });
    expect(localStorage.getItem("obiter-device.courtToggles")).toBeNull();
  });

  test("no adoption when the store already has toggles", async () => {
    mockStore.getCourtToggles.mockReturnValue({ ibidSuppression: "off" });
    localStorage.setItem("obiter-device.courtToggles", JSON.stringify({ ibidSuppression: "on" }));
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Writing mode"), { target: { value: "court" } });

    await waitFor(() => expect(mockStore.setWritingMode).toHaveBeenCalledWith("court"));
    expect(mockStore.setCourtToggles).not.toHaveBeenCalled();
  });
});
