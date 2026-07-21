/**
 * @jest-environment jsdom
 *
 * SAFE-005 / SAFE-007 — Recovery view.
 *
 * The contract under test: the view lists library snapshots (with delta vs
 * the current library), footnote history, the user-edit review queue and
 * quarantined parts; every destructive action goes through an in-pane
 * confirmation (window.confirm is blocked on Word for the web); the
 * empty-snapshot restore requires the explicit second confirmation before
 * retrying with allowEmpty; and salvage merges only citations whose id is
 * not already in the library.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import Recovery from "../../src/ui/views/Recovery";
import { StoreDataLossError } from "../../src/store/citationStore";
import { serializeStore } from "../../src/store/xmlSerializer";
import {
  clearRefreshIssues,
  recordRefreshIssues,
} from "../../src/ui/recoveryQueue";
import { makeCitation, storeXmlWith } from "../store/fakeWordHarness";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockListSnapshots = jest.fn();
const mockGetSnapshot = jest.fn();
const mockListFootnoteGenerations = jest.fn();
jest.mock("../../src/store/backupStore", () => ({
  listSnapshots: (): unknown => mockListSnapshots(),
  getSnapshot: (...args: unknown[]): unknown => mockGetSnapshot(...args),
  listFootnoteGenerations: (): unknown => mockListFootnoteGenerations(),
}));

const mockRestoreFootnoteText = jest.fn();
const mockAcceptObiterVersion = jest.fn();
jest.mock("../../src/word/footnoteBackup", () => ({
  restoreFootnoteText: (...args: unknown[]): unknown => mockRestoreFootnoteText(...args),
  acceptObiterVersion: (...args: unknown[]): unknown => mockAcceptObiterVersion(...args),
}));

const mockSetFootnoteLock = jest.fn();
jest.mock("../../src/word/footnoteManager", () => ({
  setFootnoteLock: (...args: unknown[]): unknown => mockSetFootnoteLock(...args),
}));

const mockTriggerRefresh = jest.fn();
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    triggerRefresh: mockTriggerRefresh,
    refreshCounter: 0,
  }),
}));

const mockAnnounce = jest.fn();
jest.mock("../../src/ui/context/StatusContext", () => ({
  useStatus: (): unknown => ({ entries: [], announce: mockAnnounce, clear: jest.fn() }),
}));

const mockStore = {
  getAll: jest.fn(),
  getDiagnostics: jest.fn(),
  restoreFromSnapshot: jest.fn(),
  addMany: jest.fn(),
  getQuarantinedPartXml: jest.fn(),
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const OK_DIAGNOSTICS = { status: "ok", parts: [] };

const QUARANTINED_DIAGNOSTICS = {
  status: "recovered",
  parts: [
    { partId: "part-1", xmlLength: 500, citationCount: 2, selected: true },
    {
      partId: "part-9",
      xmlLength: 321,
      citationCount: null,
      error: "Store schema version 3 was created by a newer version of Obiter",
      errorReason: "newer-schema",
      selected: false,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  clearRefreshIssues();
  mockStore.getAll.mockReturnValue([makeCitation("a"), makeCitation("b")]);
  mockStore.getDiagnostics.mockReturnValue(OK_DIAGNOSTICS);
  mockStore.restoreFromSnapshot.mockResolvedValue(undefined);
  mockStore.addMany.mockImplementation(async (citations: unknown[]) => citations.length);
  mockStore.getQuarantinedPartXml.mockResolvedValue(null);
  mockListSnapshots.mockResolvedValue([]);
  mockGetSnapshot.mockResolvedValue(null);
  mockListFootnoteGenerations.mockResolvedValue([]);
  mockRestoreFootnoteText.mockResolvedValue(undefined);
  mockAcceptObiterVersion.mockResolvedValue({
    updated: 1,
    unchanged: 0,
    lockedSkipped: 0,
    userEdits: [],
    failures: [],
  });
  mockSetFootnoteLock.mockResolvedValue(undefined);
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Recovery view (SAFE-005)", () => {
  test("renders every section with a sensible empty state", async () => {
    render(<Recovery />);

    await screen.findByText(/Library snapshots \(0\)/);
    expect(screen.getByText(/No library snapshots yet/)).toBeTruthy();
    expect(screen.getByText(/Footnote history \(0\)/)).toBeTruthy();
    expect(screen.getByText(/No footnote history yet/)).toBeTruthy();
    expect(screen.getByText(/Manually edited footnotes \(0\)/)).toBeTruthy();
    expect(screen.getByText(/No edited footnotes are waiting for review/)).toBeTruthy();
    expect(screen.getByText(/Quarantined data \(0\)/)).toBeTruthy();
    expect(screen.getByText(/No quarantined data was found in this document/)).toBeTruthy();
    // Nothing was modified by rendering.
    expect(mockStore.restoreFromSnapshot).not.toHaveBeenCalled();
    expect(mockStore.addMany).not.toHaveBeenCalled();
  });

  test("lists snapshots with reason label, count and delta vs the current library", async () => {
    mockListSnapshots.mockResolvedValue([
      { timestamp: "2026-07-20T10:00:00.000Z", reason: "persist", citationCount: 3 },
      { timestamp: "2026-07-19T10:00:00.000Z", reason: "pre-restore", citationCount: 2 },
    ]);

    render(<Recovery />);

    await screen.findByText(/Library snapshots \(2\)/);
    expect(screen.getByText(/Automatic backup/)).toBeTruthy();
    expect(screen.getByText(/Saved before a restore/)).toBeTruthy();
    expect(screen.getByText(/1 more than the current library/)).toBeTruthy();
    expect(screen.getByText(/same count as the current library/)).toBeTruthy();
  });

  test("restore goes through the in-pane confirmation, then restores and reloads", async () => {
    const ts = "2026-07-20T10:00:00.000Z";
    mockListSnapshots.mockResolvedValue([{ timestamp: ts, reason: "persist", citationCount: 3 }]);
    mockGetSnapshot.mockResolvedValue({
      timestamp: ts,
      reason: "persist",
      citationCount: 3,
      storeXml: storeXmlWith("s1", "s2", "s3"),
    });

    render(<Recovery />);
    fireEvent.click(await screen.findByRole("button", { name: /Restore the library snapshot/ }));

    // Nothing happens until the modal is confirmed.
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/The library will be replaced with the snapshot of/)).toBeTruthy();
    expect(mockStore.restoreFromSnapshot).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Restore snapshot" }));

    await waitFor(() => expect(mockStore.restoreFromSnapshot).toHaveBeenCalledTimes(1));
    expect(mockGetSnapshot).toHaveBeenCalledWith(ts);
    const [data, opts] = mockStore.restoreFromSnapshot.mock.calls[0] as [
      { citations: unknown[] },
      { allowEmpty?: boolean },
    ];
    expect(data.citations).toHaveLength(3);
    expect(opts).toEqual({});
    expect(mockTriggerRefresh).toHaveBeenCalled();
    // Snapshot list is reloaded after the restore (restore snapshots first).
    expect(mockListSnapshots).toHaveBeenCalledTimes(2);
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining("Library restored"), "success");
  });

  test("an empty snapshot over a populated library requires the explicit second confirmation", async () => {
    const ts = "2026-07-20T11:00:00.000Z";
    mockListSnapshots.mockResolvedValue([{ timestamp: ts, reason: "persist", citationCount: 0 }]);
    mockGetSnapshot.mockResolvedValue({
      timestamp: ts,
      reason: "persist",
      citationCount: 0,
      storeXml: serializeStore([]),
    });
    mockStore.restoreFromSnapshot.mockImplementation(
      async (_data: unknown, opts?: { allowEmpty?: boolean }) => {
        if (!opts?.allowEmpty) {
          throw new StoreDataLossError("Refused to restore an empty snapshot");
        }
      }
    );

    render(<Recovery />);
    fireEvent.click(await screen.findByRole("button", { name: /Restore the library snapshot/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restore snapshot" }));

    // The refusal surfaces the explicit second confirmation, with counts.
    await screen.findByText("The snapshot is empty");
    expect(screen.getByText(/the library has 2 citations/)).toBeTruthy();
    expect(mockStore.restoreFromSnapshot).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Restore the empty snapshot" }));

    await waitFor(() => expect(mockStore.restoreFromSnapshot).toHaveBeenCalledTimes(2));
    expect(mockStore.restoreFromSnapshot.mock.calls[1][1]).toEqual({ allowEmpty: true });
  });

  test("cancelling the confirmation restores nothing", async () => {
    mockListSnapshots.mockResolvedValue([
      { timestamp: "2026-07-20T10:00:00.000Z", reason: "manual", citationCount: 1 },
    ]);

    render(<Recovery />);
    fireEvent.click(await screen.findByRole("button", { name: /Restore the library snapshot/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockGetSnapshot).not.toHaveBeenCalled();
    expect(mockStore.restoreFromSnapshot).not.toHaveBeenCalled();
  });

  test("footnote history restores the previous text and says the footnote will be locked", async () => {
    mockListFootnoteGenerations.mockResolvedValue([
      {
        timestamp: "2026-07-20T09:00:00.000Z",
        footnotes: [{ n: 4, hash: "aabbccdd", text: "Old footnote text." }],
      },
    ]);

    render(<Recovery />);

    await screen.findByText(/Footnote history \(1\)/);
    expect(screen.getByText(/Old footnote text\./)).toBeTruthy();
    // The lock consequence is stated in the UI copy.
    expect(screen.getByText(/Restoring locks the footnote/)).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: /Restore the previous text of footnote 4/ })
    );

    await waitFor(() =>
      expect(mockRestoreFootnoteText).toHaveBeenCalledWith(4, "Old footnote text.")
    );
    expect(mockAnnounce).toHaveBeenCalledWith(
      expect.stringContaining("Footnote 4 restored"),
      "success"
    );
  });

  test("a missing footnote fails gracefully with the error announced", async () => {
    mockListFootnoteGenerations.mockResolvedValue([
      {
        timestamp: "2026-07-20T09:00:00.000Z",
        footnotes: [{ n: 9, hash: "aabbccdd", text: "Gone." }],
      },
    ]);
    mockRestoreFootnoteText.mockRejectedValue(
      new Error("Cannot restore footnote 9: the document no longer has a footnote at that position.")
    );

    render(<Recovery />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Restore the previous text of footnote 9/ })
    );

    await waitFor(() =>
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining("no longer has a footnote at that position"),
        "error"
      )
    );
    // The view is still usable.
    expect(screen.getByText(/Footnote history \(1\)/)).toBeTruthy();
  });

  test("user-edit review: keep my edit locks the footnote and clears the entry", async () => {
    recordRefreshIssues({
      failures: [],
      userEdits: [
        { footnoteNumber: 7, currentText: "My edited text.", expectedText: "Obiter render." },
      ],
    });

    render(<Recovery />);

    await screen.findByText(/Manually edited footnotes \(1\)/);
    expect(screen.getByText(/My edited text\./)).toBeTruthy();
    expect(screen.getByText(/Obiter render\./)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Keep my edit in footnote 7/ }));

    await waitFor(() => expect(mockSetFootnoteLock).toHaveBeenCalledWith(7, true));
    await screen.findByText(/Manually edited footnotes \(0\)/);
    expect(mockAcceptObiterVersion).not.toHaveBeenCalled();
  });

  test("user-edit review: use Obiter's version rebuilds via acceptObiterVersion", async () => {
    recordRefreshIssues({
      failures: [],
      userEdits: [
        { footnoteNumber: 7, currentText: "My edited text.", expectedText: "Obiter render." },
      ],
    });

    render(<Recovery />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Replace footnote 7 with Obiter's version/ })
    );

    await waitFor(() => expect(mockAcceptObiterVersion).toHaveBeenCalledWith(7, mockStore));
    await screen.findByText(/Manually edited footnotes \(0\)/);
    expect(mockSetFootnoteLock).not.toHaveBeenCalled();
    expect(mockTriggerRefresh).toHaveBeenCalled();
  });

  test("refresh failures are listed with their footnote numbers", async () => {
    recordRefreshIssues({
      failures: [{ footnoteNumbers: [2, 3], error: "insertHtml failed" }],
      userEdits: [],
    });

    render(<Recovery />);

    await screen.findByText(/Refresh failures \(1\)/);
    expect(screen.getByText(/Footnotes 2, 3: insertHtml failed/)).toBeTruthy();
  });
});

describe("Recovery view — quarantined parts (SAFE-007)", () => {
  beforeEach(() => {
    mockStore.getDiagnostics.mockReturnValue(QUARANTINED_DIAGNOSTICS);
  });

  test("shows the newer-schema copy for parts written by a newer Obiter", async () => {
    render(<Recovery />);

    await screen.findByText(/Quarantined data \(1\)/);
    expect(
      screen.getByText(/This data was created by a newer version of Obiter/)
    ).toBeTruthy();
  });

  test("the raw XML preview is lazy-loaded via getQuarantinedPartXml", async () => {
    mockStore.getQuarantinedPartXml.mockResolvedValue("<broken>xml</broken");

    render(<Recovery />);
    await screen.findByText(/Quarantined data \(1\)/);
    expect(mockStore.getQuarantinedPartXml).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Show the raw XML/ }));

    await waitFor(() => expect(mockStore.getQuarantinedPartXml).toHaveBeenCalledWith("part-9"));
    await screen.findByText("<broken>xml</broken");
  });

  test("salvage merges only citations whose id is not already in the library", async () => {
    // The quarantined payload holds "a" (already in the library) and
    // "new-1"; a dangling tail keeps it unreadable as a whole.
    mockStore.getQuarantinedPartXml.mockResolvedValue(
      storeXmlWith("a", "new-1") + '\n<obiter:citation id="dangling'
    );

    render(<Recovery />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Attempt to salvage citations/ })
    );

    await waitFor(() => expect(mockStore.addMany).toHaveBeenCalledTimes(1));
    const merged = mockStore.addMany.mock.calls[0][0] as { id: string }[];
    expect(merged.map((c) => c.id)).toEqual(["new-1"]);
    await screen.findByText(
      /Salvage found 2 citations, 1 added to the library, 1 already in the library/
    );
    expect(screen.getByText(/The quarantined data was left unchanged/)).toBeTruthy();
    expect(mockTriggerRefresh).toHaveBeenCalled();
  });

  test("salvage of an unrecoverable part reports zero without merging", async () => {
    mockStore.getQuarantinedPartXml.mockResolvedValue("<<<< nothing recoverable >>>>");

    render(<Recovery />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Attempt to salvage citations/ })
    );

    await screen.findByText(/Salvage found 0 citations, 0 added to the library/);
    expect(mockStore.addMany).toHaveBeenCalledWith([]);
    expect(mockTriggerRefresh).not.toHaveBeenCalled();
  });
});
