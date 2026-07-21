/**
 * @jest-environment jsdom
 *
 * BUG-004 — Scan & Repair preview/confirm flow.
 *
 * The contract under test: the scan itself is read-only, the preview table
 * offers per-item checkboxes, NOTHING is applied until the user confirms,
 * and only the selected items are passed to applyScanPlan. After apply the
 * summary is shown and the subsequent-reference refresh is re-run.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ScanRepair from "../../src/ui/views/ScanRepair";
import type { DocumentScanSnapshot } from "../../src/word/scanRepair";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockScanDocument = jest.fn<Promise<DocumentScanSnapshot>, []>();
const mockApplyScanPlan = jest.fn();
jest.mock("../../src/word/documentScanner", () => ({
  scanDocument: (): unknown => mockScanDocument(),
  applyScanPlan: (...args: unknown[]): unknown => mockApplyScanPlan(...args),
}));

const mockRefreshNow = jest.fn();
jest.mock("../../src/word/citationRefresher", () => ({
  refreshAllCitationsNow: (...args: unknown[]): unknown => mockRefreshNow(...args),
}));

const mockTriggerRefresh = jest.fn();
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    triggerRefresh: mockTriggerRefresh,
    refreshCounter: 0,
  }),
}));

const fakeStore = {
  getAll: (): unknown[] => [],
  getAglcVersion: (): "4" => "4",
  getDiagnostics: (): { status: string } => ({ status: "new" }),
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(fakeStore),
}));

// ─── Fixture snapshot ───────────────────────────────────────────────────────

/** One adoptable footnote, one unparseable footnote, one orphaned control. */
const SNAPSHOT: DocumentScanSnapshot = {
  bodyControls: [],
  notes: [
    {
      noteType: "footnote",
      index: 1,
      text: "Obeid v The Queen [2017] HCA 44.",
      controls: [],
    },
    {
      noteType: "footnote",
      index: 2,
      text: "A prose note that is not a citation.",
      controls: [],
    },
    {
      noteType: "footnote",
      index: 3,
      text: "Native Title Act 1993 (Cth).",
      controls: [
        { tag: "obiter-fn", title: "Obiter Footnote", text: "Native Title Act 1993 (Cth)" },
        { tag: "orphan-uuid", title: "Citation:auto", text: "Native Title Act 1993 (Cth)" },
      ],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockScanDocument.mockResolvedValue(SNAPSHOT);
  mockApplyScanPlan.mockResolvedValue({
    rebuiltFromControls: 1,
    adoptedManaged: 1,
    adoptedVerbatim: 1,
    wrappedNotes: 2,
    failures: [],
  });
  mockRefreshNow.mockResolvedValue({
    updated: 2,
    unchanged: 1,
    lockedSkipped: 0,
    userEdits: [],
    failures: [],
  });
});

/** The view uses useNavigate (SAFE-005 "Open Recovery" link), so it needs a router. */
function renderView(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ScanRepair />
    </MemoryRouter>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ScanRepair view (BUG-004)", () => {
  test("scans on mount and shows the preview counts without modifying anything", async () => {
    renderView();

    await screen.findByText(/Found 3: 0 linked, 1 to rebuild, 1 to adopt, 1 unparseable/);
    expect(mockScanDocument).toHaveBeenCalledTimes(1);
    expect(mockApplyScanPlan).not.toHaveBeenCalled();
    expect(mockRefreshNow).not.toHaveBeenCalled();

    // All four result categories are represented in the table.
    expect(screen.getByText(/Rebuild library entries \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Adopt as managed citations \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Adopt as verbatim manual citations \(1\)/)).toBeTruthy();
  });

  test("rebuild and adopt default selected; unparseable defaults unselected", async () => {
    renderView();
    await screen.findByText(/Found 3/);

    // Default selection: rebuild + adopt = 2.
    expect(screen.getByRole("button", { name: /Repair 2 items/ })).toBeTruthy();

    const verbatimBox = screen.getByRole("checkbox", { name: /Include Footnote 2/ });
    expect((verbatimBox as HTMLInputElement).checked).toBe(false);
  });

  test("confirm applies ONLY the selected items", async () => {
    renderView();
    await screen.findByText(/Found 3/);

    // Deselect the adoption (footnote 1); select the verbatim (footnote 2).
    fireEvent.click(screen.getByRole("checkbox", { name: /Include Footnote 1/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Include Footnote 2/ }));

    fireEvent.click(screen.getByRole("button", { name: /Repair 2 items/ }));

    await waitFor(() => expect(mockApplyScanPlan).toHaveBeenCalledTimes(1));
    const [storeArg, itemsArg] = mockApplyScanPlan.mock.calls[0] as [
      unknown,
      { key: string; kind: string }[],
    ];
    expect(storeArg).toBe(fakeStore);
    expect(itemsArg.map((i) => i.kind).sort()).toEqual(["rebuild", "verbatim"]);
  });

  test("after apply: summary, subsequent-reference refresh and library refresh", async () => {
    renderView();
    await screen.findByText(/Found 3/);

    fireEvent.click(screen.getByRole("button", { name: /Repair 2 items/ }));

    await screen.findByText("Repair complete.");
    expect(mockRefreshNow).toHaveBeenCalledWith(fakeStore);
    expect(mockTriggerRefresh).toHaveBeenCalled();
    expect(
      screen.getByText(/Citation formats re-validated: 2 updated, 1 unchanged/)
    ).toBeTruthy();
    expect(screen.getByText(/1 library entry rebuilt from document markers/)).toBeTruthy();
    expect(screen.getByText(/2 notes linked with citation markers/)).toBeTruthy();
  });

  test("apply failures are reported in the summary", async () => {
    mockApplyScanPlan.mockResolvedValue({
      rebuiltFromControls: 1,
      adoptedManaged: 0,
      adoptedVerbatim: 0,
      wrappedNotes: 0,
      failures: [{ key: "adopt-footnote-1", reason: "Added to the library, but the citation text was not found in the note to link." }],
    });

    renderView();
    await screen.findByText(/Found 3/);
    fireEvent.click(screen.getByRole("button", { name: /Repair 2 items/ }));

    await screen.findByText(/1 item could not be fully applied/);
    expect(screen.getByText(/not found in the note to link/)).toBeTruthy();
  });

  test("a document with nothing to repair shows the empty state", async () => {
    mockScanDocument.mockResolvedValue({ bodyControls: [], notes: [] });
    renderView();

    await screen.findByText(/No citation markers or citation-like text found/);
    expect(screen.getByRole("button", { name: /Repair 0 items/ })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /Repair 0 items/ }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  test("scan failure shows the error state with a retry", async () => {
    mockScanDocument.mockRejectedValue(new Error("Word is not available"));
    renderView();

    await screen.findByText("Word is not available");
    expect(screen.getByRole("button", { name: /Scan again/ })).toBeTruthy();
    expect(mockApplyScanPlan).not.toHaveBeenCalled();
  });
});
