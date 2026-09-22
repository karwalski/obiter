/**
 * @jest-environment jsdom
 *
 * ENP-005: the Record details panel inside the Edit view. Route state from
 * the library opens the panel; a restore goes through the store, reloads the
 * form, asks for a document refresh and announces the restored time.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import EditCitation from "../../src/ui/views/EditCitation";
import { buildCitationFromRequest } from "../../src/actions/citationRequest";
import { serializeStore } from "../../src/store/xmlSerializer";
import type { Citation } from "../../src/types/citation";

// ─── Mocks ──────────────────────────────────────────────────────────────────

let mockCitation: Citation;
const mockTriggerRefresh = jest.fn();
const mockListSnapshots = jest.fn(async (): Promise<unknown[]> => []);
const mockGetSnapshot = jest.fn(async (_timestamp: string): Promise<unknown> => null);

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
  listSnapshots: (): Promise<unknown[]> => mockListSnapshots(),
  getSnapshot: (timestamp: string): Promise<unknown> => mockGetSnapshot(timestamp),
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

(globalThis as unknown as { Word: { run: (cb: (ctx: unknown) => unknown) => unknown } }).Word = {
  run: async (cb: (ctx: unknown) => unknown) => cb({}),
};

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

const T1 = "2026-09-01T10:00:00.000Z";

function makeCitation(title: string): Citation {
  const c = buildCitationFromRequest(
    {
      sourceType: "book",
      data: {
        authors: [{ givenNames: "James", surname: "Edelman" }],
        title,
        publisher: "Hart Publishing",
        year: "2016",
      },
    },
    "4"
  );
  return { ...c, id: "c1", createdAt: "2026-01-15T10:30:00.000Z", modifiedAt: "2026-03-20T14:45:00.000Z" };
}

function renderEdit(expandDetails: boolean): HTMLElement {
  const state = expandDetails ? { expandDetails: true } : undefined;
  const { container } = render(
    <MemoryRouter initialEntries={[{ pathname: "/edit", state }]}>
      <EditCitation />
    </MemoryRouter>
  );
  return container;
}

describe("ENP-005: record details in the Edit view", () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCitation = makeCitation("Unjust Enrichment");
    const older = makeCitation("Unjust Enrichmnt");
    mockListSnapshots.mockResolvedValue([{ timestamp: T1, reason: "persist", citationCount: 1 }]);
    mockGetSnapshot.mockResolvedValue({
      timestamp: T1,
      reason: "persist",
      citationCount: 1,
      storeXml: serializeStore([older]),
    });
    confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("renders the panel closed and does not read the backup until it is opened", async () => {
    renderEdit(false);
    await waitFor(() => expect(screen.getByText("Record details")).toBeInTheDocument());
    const details = document.querySelector("details.record-details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(mockListSnapshots).not.toHaveBeenCalled();
  });

  it("opens from route state, lists the version and restores it through the store", async () => {
    const container = renderEdit(true);
    await waitFor(() => expect(screen.getByText("Record details")).toBeInTheDocument());
    const details = document.querySelector("details.record-details") as HTMLDetailsElement;
    expect(details.open).toBe(true);

    const list = await screen.findByRole("list", { name: "Previous versions" });
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("changed: Title");
    expect(mockListSnapshots).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Restore this version" }));
    await waitFor(() => expect(mockStore.update).toHaveBeenCalledTimes(1));
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    expect(saved.id).toBe("c1");
    expect(saved.createdAt).toBe(mockCitation.createdAt);
    expect(saved.modifiedAt).not.toBe(mockCitation.modifiedAt);
    expect(saved.data.title).toBe("Unjust Enrichmnt");

    expect(mockTriggerRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^Title\*?$/) as HTMLInputElement).toHaveValue("Unjust Enrichmnt");
    expect(
      screen.getByText(`Success: Restored the version from ${new Date(T1).toLocaleString()}.`)
    ).toBeInTheDocument();

    // The restored record no longer differs from the snapshot, so the history is re-read and empties.
    await waitFor(() => expect(mockListSnapshots).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No previous versions in this document's backup.")).toBeInTheDocument();
  });

  it("reports a refused write instead of restoring", async () => {
    mockStore.update.mockRejectedValueOnce(new Error("Something went wrong"));
    renderEdit(true);
    fireEvent.click(await screen.findByRole("button", { name: "Restore this version" }));
    expect(await screen.findByText("Error: Something went wrong")).toBeInTheDocument();
    expect(mockTriggerRefresh).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Title\*?$/) as HTMLInputElement).toHaveValue("Unjust Enrichment");
  });
});
