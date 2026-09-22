/**
 * @jest-environment jsdom
 *
 * ENP-007: the Edit view's Update from source button opens the dialog;
 * Apply writes the merged record through the store, repopulates the form,
 * asks for a document refresh and reports the count.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EditCitation from "../../src/ui/views/EditCitation";
import type { Citation } from "../../src/types/citation";

let mockCitation: Citation;
const mockTriggerRefresh = jest.fn();
const mockAnnounce = jest.fn();
let mockGate: { ok: boolean; reason?: string } = { ok: true };
const mockFetchSourceUpdate = jest.fn();

const mockStore = {
  getById: jest.fn((id: string) => (id === mockCitation.id ? mockCitation : undefined)),
  getAll: jest.fn(() => [mockCitation]),
  getStandardId: jest.fn(() => "aglc4"),
  getCourtToggles: jest.fn(() => undefined),
  update: jest.fn(async () => undefined),
};

jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
  getSharedStoreIfReady: (): unknown => null,
}));
jest.mock("../../src/store/backupStore", () => ({
  listSnapshots: async (): Promise<unknown[]> => [],
  getSnapshot: async (): Promise<unknown> => null,
}));
jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: jest.fn(() => undefined),
}));
jest.mock("../../src/word/footnoteManager", () => ({
  updateCitationContent: jest.fn(async () => undefined),
  deleteCitationFootnote: jest.fn(async () => undefined),
  getAllCitationFootnotes: jest.fn(async () => []),
  appendToFootnoteByIndex: jest.fn(async () => undefined),
  updateOccurrenceMetadata: jest.fn(async () => undefined),
  setFootnoteLock: jest.fn(async () => undefined),
  getFootnoteText: jest.fn(async () => ""),
  setOccurrenceText: jest.fn(async () => undefined),
}));
jest.mock("../../src/ui/views/CitationLibrary", () => ({
  getCitationLabel: (c: { id: string }) => c.id,
}));
jest.mock("../../src/word/citationRefresher", () => ({
  refreshAllCitations: jest.fn(async () => undefined),
}));
jest.mock("../../src/ui/components/CitationPreview", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: () => ({
    selectedCitationId: mockCitation.id,
    setSelectedCitationId: jest.fn(),
    focusField: null,
    setFocusField: jest.fn(),
    refreshCounter: 0,
    triggerRefresh: mockTriggerRefresh,
  }),
}));
jest.mock("../../src/ui/context/StatusContext", () => ({
  useStatus: (): unknown => ({ announce: mockAnnounce, entries: [], clear: jest.fn() }),
}));
jest.mock("../../src/api/updateFromSource", () => ({
  canUpdateFromSource: (): unknown => mockGate,
  fetchSourceUpdate: (...args: unknown[]): unknown => mockFetchSourceUpdate(...args),
}));

(globalThis as unknown as { Word: { run: (cb: (ctx: unknown) => unknown) => unknown } }).Word = {
  run: async (cb: (ctx: unknown) => unknown) => cb({}),
};

function makeCitation(): Citation {
  return {
    id: "c1",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: { party1: "Mabo", party2: "Queensland (No 2)", year: "1992", volume: "175", reportSeries: "CLR" },
    tags: [],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
  };
}

function renderEdit(): void {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/edit" }]}>
      <EditCitation />
    </MemoryRouter>
  );
}

describe("ENP-007: Update from source in the Edit view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCitation = makeCitation();
    mockGate = { ok: true };
  });

  it("is disabled with the reason when lookup is off", async () => {
    mockGate = { ok: false, reason: "Source lookup is off. Turn it on in Settings." };
    renderEdit();
    const button = await screen.findByRole("button", { name: "Update from source" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "Source lookup is off. Turn it on in Settings.");
  });

  it("opens the dialog and Apply updates the store, the form and the document", async () => {
    mockFetchSourceUpdate.mockResolvedValue({
      status: "updated",
      adapterId: "mock",
      adapterLabel: "Mock Adapter",
      metadata: { startingPage: 1 },
      fields: { startingPage: "1" },
      differences: ["startingPage"],
    });
    renderEdit();
    const button = await screen.findByRole("button", { name: "Update from source" });
    expect(screen.getByLabelText(/^Starting Page\*?$/)).toHaveValue("");

    fireEvent.click(button);
    expect(screen.getByRole("dialog", { name: "Update from source" })).toBeInTheDocument();
    await screen.findByRole("table", { name: "Fields to merge" });
    expect(mockFetchSourceUpdate.mock.calls[0][0]).toBe(mockCitation);
    expect(mockFetchSourceUpdate.mock.calls[0][1]).toMatch(/^Mabo v Queensland \(No 2\)/);
    expect(mockFetchSourceUpdate.mock.calls[0][1]).not.toMatch(/\.$/);

    fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
    await waitFor(() => expect(mockStore.update).toHaveBeenCalledTimes(1));
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    expect(saved.id).toBe("c1");
    expect(saved.data).toMatchObject({ party1: "Mabo", startingPage: "1" });
    expect(saved.data.interchange).toMatchObject({
      provenance: { format: "adapter", adapterId: "mock", sourceLabel: "Mock Adapter" },
    });
    expect(saved.modifiedAt).not.toBe("2026-03-20T14:45:00.000Z");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mockTriggerRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^Starting Page\*?$/)).toHaveValue("1");
    expect(screen.getByText("Success: Updated 1 field from Mock Adapter.")).toBeInTheDocument();
    expect(mockAnnounce).toHaveBeenCalledWith("Updated 1 field from Mock Adapter.", "success");
    expect(document.activeElement).toBe(button);
  });
});
