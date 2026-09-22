/**
 * @jest-environment jsdom
 *
 * INTEROP-015: the Citation Library's interchange surface — Import and
 * Export toolbar buttons, dialog open, close and focus return, multi-select,
 * the Needs details filter and the import toast's Review button.
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import CitationLibrary from "../../src/ui/views/CitationLibrary";
import type { Citation } from "../../src/types/citation";

const mockTriggerRefresh = jest.fn();
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    setSelectedCitationId: jest.fn(),
    triggerRefresh: mockTriggerRefresh,
    refreshCounter: 0,
  }),
}));

const mockAnnounce = jest.fn();
jest.mock("../../src/ui/context/StatusContext", () => ({
  useStatus: (): unknown => ({ announce: mockAnnounce, entries: [], clear: jest.fn() }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: (): unknown => mockNavigate,
}));

// ENP-007: the source-lookup gate and fetch are stubbed per test.
let mockGate: { ok: boolean; reason?: string } = { ok: true };
const mockFetchSourceUpdate = jest.fn();
jest.mock("../../src/api/updateFromSource", () => ({
  canUpdateFromSource: (): unknown => mockGate,
  fetchSourceUpdate: (...args: unknown[]): unknown => mockFetchSourceUpdate(...args),
}));

jest.mock("../../src/word/footnoteManager", () => {
  // The real title codec, so an inserted occurrence's pinpoint can be asserted.
  const { pinpointToTitleString } = jest.requireActual(
    "../../src/engine/rules/v4/general/pinpoints"
  ) as { pinpointToTitleString: (p: { type: string; value: string }) => string };
  return {
    insertCitationFootnote: jest.fn(),
    getAllCitationFootnotes: jest.fn(async () => []),
    deleteAllOccurrences: jest.fn(),
    buildOccurrenceTitle: jest.fn(
      (pref: string, pin?: string | { type: string; value: string }): string => {
        const encoded = typeof pin === "string" ? pin : pin ? pinpointToTitleString(pin) : "";
        return encoded ? `Citation:${pref}:${encoded}` : `Citation:${pref}`;
      }
    ),
  };
});
jest.mock("../../src/word/sourceImporter", () => ({
  getWordSourcesXml: jest.fn(async () => null),
}));
const mockMergeDuplicateCitation = jest.fn(async () => 1);
const mockIgnoreDuplicatePair = jest.fn(async () => 2);
jest.mock("../../src/actions/citationService", () => ({
  mergeDuplicateCitation: (...args: unknown[]): unknown => mockMergeDuplicateCitation(...args),
  ignoreDuplicatePair: (...args: unknown[]): unknown => mockIgnoreDuplicatePair(...args),
}));

const complete: Citation = {
  id: "c1",
  aglcVersion: "4",
  sourceType: "book",
  data: {
    authors: [{ givenNames: "James", surname: "Edelman" }],
    title: "Unjust Enrichment",
    publisher: "Hart Publishing",
    year: 2016,
  },
  tags: [],
  createdAt: "",
  modifiedAt: "",
};
const incomplete: Citation = {
  id: "c2",
  aglcVersion: "4",
  sourceType: "journal.article",
  data: { title: "Fragment" },
  tags: ["import", "import:ris", "import:needs-details"],
  createdAt: "",
  modifiedAt: "",
};

let mockLibraryCitations: Citation[] = [];
const mockStore = {
  getAll: (): Citation[] => mockLibraryCitations,
  getStandardId: (): "aglc4" => "aglc4",
  getDiagnostics: (): { status: string } => ({ status: "ok" }),
  getCourtToggles: (): undefined => undefined,
  addMany: jest.fn(async (cs: Citation[]) => {
    mockLibraryCitations = [...mockLibraryCitations, ...cs];
    return cs.length;
  }),
  updateMany: jest.fn(async () => 0),
  update: jest.fn(async () => undefined),
  remove: jest.fn(),
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

async function renderLibrary(citations: Citation[]): Promise<HTMLElement> {
  mockLibraryCitations = citations;
  const { container } = render(
    <MemoryRouter>
      <CitationLibrary />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.queryByText("Loading citations...")).toBeNull());
  return container;
}

describe("CitationLibrary interchange surface", () => {
  beforeEach(() => {
    mockAnnounce.mockClear();
    mockTriggerRefresh.mockClear();
  });

  test("toolbar has Import and Export; Export is disabled on an empty library", async () => {
    await renderLibrary([]);
    expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Import BibTeX" })).toBeNull();
  });

  test("Import opens the dialog, Escape closes it and focus returns to the button", async () => {
    await renderLibrary([complete]);
    const button = screen.getByRole("button", { name: "Import" });
    fireEvent.click(button);
    const dialog = screen.getByRole("dialog", { name: "Import citations" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(button);
  });

  test("Export opens with the library count and closes", async () => {
    await renderLibrary([complete]);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("dialog", { name: "Export citations" })).toBeInTheDocument();
    expect(screen.getByLabelText("All 1 citation in the library")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("selection: cards, select all shown, and clear", async () => {
    await renderLibrary([complete, incomplete]);
    fireEvent.click(screen.getByLabelText(/Select .*Unjust Enrichment/));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Select all shown citations"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText(/selected$/)).toBeNull();
  });

  test("Needs details filter shows only imported citations missing fields, with labels", async () => {
    await renderLibrary([complete, incomplete]);
    const toggle = screen.getByRole("button", { name: "Needs details (1)" });
    expect(screen.getByText(/Needs details: /)).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Unjust Enrichment")).toBeNull();
    expect(screen.getByText("Fragment")).toBeInTheDocument();
  });

  test("an import announces the result and offers to review incomplete rows", async () => {
    await renderLibrary([complete]);
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    fireEvent.change(screen.getByLabelText("Pasted records"), {
      target: { value: "TY  - JOUR\nTI  - Only a title\nER  -\n" },
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add 1 citation" })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: "Add 1 citation" }));
    await waitFor(() => expect(screen.getByText("Added 1 citation from RIS.")).toBeInTheDocument());
    expect(mockAnnounce).toHaveBeenCalledWith("Added 1 citation from RIS.", "success");
    expect(mockTriggerRefresh).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review 1 needing details" }));
    expect(screen.getByRole("button", { name: /Needs details/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("has no axe violations with and without the dialog", async () => {
    const container = await renderLibrary([complete, incomplete]);
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── ENP-001: tag chips and the tag filter ──────────────────────────────────

const taggedContract: Citation = {
  ...complete,
  id: "t1",
  data: { ...complete.data, title: "Contract Damages" },
  tags: ["import", "contract", "remedies"],
};
const taggedRemedies: Citation = {
  ...complete,
  id: "t2",
  data: { ...complete.data, title: "Equitable Remedies" },
  tags: ["remedies", "dedupe:merged"],
};

describe("CitationLibrary tags (ENP-001)", () => {
  test("user tags render as chips; system tags do not", async () => {
    await renderLibrary([complete, taggedContract, taggedRemedies]);
    const chips = document.querySelectorAll(".library-tag-chip");
    expect(Array.from(chips).map((c) => c.textContent)).toEqual([
      "contract",
      "remedies",
      "remedies",
    ]);
    expect(screen.queryByRole("button", { name: "Filter by tag import" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Filter by tag dedupe:merged" })).toBeNull();
  });

  test("clicking a chip filters to that tag; the Tags popover lists counts, ORs and clears", async () => {
    await renderLibrary([complete, taggedContract, taggedRemedies]);
    fireEvent.click(screen.getByRole("button", { name: "Filter by tag contract" }));
    expect(screen.queryByText("Unjust Enrichment")).toBeNull();
    expect(screen.queryByText("Equitable Remedies")).toBeNull();
    expect(screen.getByText("Contract Damages")).toBeInTheDocument();
    expect(screen.getByText("Tags (1)")).toBeInTheDocument();

    expect(screen.getByLabelText("contract (1)")).toBeChecked();
    fireEvent.click(screen.getByLabelText("remedies (2)"));
    expect(screen.getByText("Contract Damages")).toBeInTheDocument();
    expect(screen.getByText("Equitable Remedies")).toBeInTheDocument();
    expect(screen.queryByText("Unjust Enrichment")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear tags" }));
    expect(screen.getByText("Unjust Enrichment")).toBeInTheDocument();
    expect(screen.queryByText("Tags (1)")).toBeNull();
  });

  test("the tag filter alone makes Export offer the shown-by-filter scope", async () => {
    await renderLibrary([complete, taggedContract, taggedRemedies]);
    fireEvent.click(screen.getByLabelText("contract (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByLabelText("1 shown by the current search and filter")).toBeInTheDocument();
    expect(screen.getByLabelText("All 3 citations in the library")).toBeChecked();
  });

  test("no Tags control when the library has no user tags", async () => {
    await renderLibrary([complete, incomplete]);
    expect(screen.queryByText("Tags")).toBeNull();
  });

  test("has no axe violations with chips and the filter open", async () => {
    const container = await renderLibrary([complete, taggedContract, taggedRemedies]);
    (container.querySelector("details") as HTMLDetailsElement).open = true;
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── ENP-003: Find duplicates ───────────────────────────────────────────────

const maboReported: Citation = {
  id: "rep",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1992",
    volume: "175",
    reportSeries: "CLR",
    startingPage: "1",
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  modifiedAt: "2026-01-01T00:00:00.000Z",
};
const maboMnc: Citation = {
  ...maboReported,
  id: "mnc",
  sourceType: "case.unreported.mnc",
  data: { party1: "Mabo", party2: "Queensland (No 2)", year: "1992", court: "HCA", caseNumber: "23" },
  createdAt: "2026-02-01T00:00:00.000Z",
};

describe("CitationLibrary duplicates (ENP-003)", () => {
  beforeEach(() => {
    mockAnnounce.mockClear();
    mockTriggerRefresh.mockClear();
    mockMergeDuplicateCitation.mockClear();
    mockIgnoreDuplicatePair.mockClear();
  });

  test("Find duplicates is disabled with fewer than two citations", async () => {
    await renderLibrary([complete]);
    expect(screen.getByRole("button", { name: "Find duplicates" })).toBeDisabled();
  });

  test("opens the dialog over the library's clusters and merges through the service", async () => {
    await renderLibrary([maboReported, maboMnc, complete]);
    const button = screen.getByRole("button", { name: "Find duplicates" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    const dialog = await screen.findByRole("dialog", { name: "Find duplicates" });
    expect(dialog).toHaveTextContent("1 of 1");
    expect(dialog).toHaveTextContent("Similar title and year");
    expect(dialog).toHaveTextContent("Mabo v Queensland (No 2) (1992) 175 CLR 1.");

    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(mockMergeDuplicateCitation).toHaveBeenCalledTimes(1), {
      timeout: 10000,
    });
    const [removedIds, survivorId, data, tags] = mockMergeDuplicateCitation.mock.calls[0] as unknown as [
      string[],
      string,
      Record<string, unknown>,
      string[],
    ];
    expect(removedIds).toEqual(["mnc"]);
    expect(survivorId).toBe("rep");
    expect(data).toMatchObject({ reportSeries: "CLR", court: "HCA", caseNumber: "23" });
    expect(tags).toEqual([]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 10000 });
    await waitFor(() => expect(mockTriggerRefresh).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockAnnounce).toHaveBeenCalledWith(
        "Merged 2 citations into one. 1 footnote updated.",
        "success"
      )
    );
    await waitFor(() => expect(document.activeElement).toBe(button));
  }, 20000);

  test("Not a duplicate goes through ignoreDuplicatePair", async () => {
    await renderLibrary([maboReported, maboMnc]);
    fireEvent.click(screen.getByRole("button", { name: "Find duplicates" }));
    await screen.findByRole("dialog", { name: "Find duplicates" });
    fireEvent.click(screen.getByRole("button", { name: "Not a duplicate" }));
    await waitFor(() => expect(mockIgnoreDuplicatePair).toHaveBeenCalledTimes(1));
    expect(mockIgnoreDuplicatePair.mock.calls[0][1]).toEqual(["rep", "mnc"]);
    expect(mockAnnounce).toHaveBeenCalledWith("Marked as not duplicates.", "success");
  });

  test("the empty state shows when nothing matches", async () => {
    await renderLibrary([complete, incomplete]);
    fireEvent.click(screen.getByRole("button", { name: "Find duplicates" }));
    const dialog = await screen.findByRole("dialog", { name: "Find duplicates" });
    expect(dialog).toHaveTextContent("No duplicates found.");
  });

  test("the card-level merge opens the same dialog as a manual cluster", async () => {
    const a: Citation = { ...complete, id: "s1", shortTitle: "Edelman" };
    const b: Citation = {
      ...complete,
      id: "s2",
      shortTitle: "Edelman",
      data: { ...complete.data, title: "Unjust Enrichment in Australia" },
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    await renderLibrary([a, b]);
    fireEvent.click(screen.getAllByRole("button", { name: "Mark as duplicate / merge" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Find duplicates" });
    expect(dialog).toHaveTextContent("Manual merge");
    expect(dialog).toHaveTextContent("1 of 1");
  });

  test("has no axe violations with the duplicates dialog open", async () => {
    const container = await renderLibrary([maboReported, maboMnc]);
    fireEvent.click(screen.getByRole("button", { name: "Find duplicates" }));
    await screen.findByRole("dialog", { name: "Find duplicates" });
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── ENP-007: card actions — Details, Quote, typed pinpoints, Update from source ──

const footnoteManagerMock = jest.requireMock("../../src/word/footnoteManager") as {
  insertCitationFootnote: jest.Mock;
};

describe("CitationLibrary card actions (ENP-007)", () => {
  beforeEach(() => {
    mockAnnounce.mockClear();
    mockTriggerRefresh.mockClear();
    mockNavigate.mockClear();
    mockStore.update.mockClear();
    mockFetchSourceUpdate.mockReset();
    footnoteManagerMock.insertCitationFootnote.mockClear();
    mockGate = { ok: true };
  });

  test("a typed [42] inserts a paragraph pinpoint on the full citation", async () => {
    await renderLibrary([maboReported]);
    fireEvent.click(screen.getByRole("button", { name: "Insert ▾" }));
    fireEvent.change(screen.getByLabelText("Pinpoint reference"), { target: { value: "[42]" } });
    fireEvent.click(screen.getByRole("button", { name: "Full citation" }));
    await waitFor(() => expect(footnoteManagerMock.insertCitationFootnote).toHaveBeenCalledTimes(1));
    const [citationId, title, runs] = footnoteManagerMock.insertCitationFootnote.mock.calls[0] as [
      string,
      string,
      Array<{ text: string }>,
    ];
    expect(citationId).toBe("rep");
    expect(title).toBe("Citation:full:[42]");
    const text = runs.map((r) => r.text).join("");
    expect(text).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1 [42].");
    expect(mockTriggerRefresh).toHaveBeenCalled();
  });

  test("a bare 42 stays a page pinpoint", async () => {
    await renderLibrary([maboReported]);
    fireEvent.click(screen.getByRole("button", { name: "Insert ▾" }));
    fireEvent.change(screen.getByLabelText("Pinpoint reference"), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Full citation" }));
    await waitFor(() => expect(footnoteManagerMock.insertCitationFootnote).toHaveBeenCalledTimes(1));
    const [, title, runs] = footnoteManagerMock.insertCitationFootnote.mock.calls[0] as [
      string,
      string,
      Array<{ text: string }>,
    ];
    expect(title).toBe("Citation:full:42");
    expect(runs.map((r) => r.text).join("")).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1, 42.");
  });

  test("Details opens the Edit view with the record details expanded", async () => {
    await renderLibrary([complete]);
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(mockNavigate).toHaveBeenCalledWith("/edit", {
      state: { citationId: "c1", expandDetails: true },
    });
  });

  test("Quote opens the Quote view with the citation preselected", async () => {
    await renderLibrary([complete]);
    fireEvent.click(screen.getByRole("button", { name: "Quote" }));
    expect(mockNavigate).toHaveBeenCalledWith("/quote", { state: { citationId: "c1" } });
  });

  test("Update from source is disabled with the reason when lookup is off", async () => {
    mockGate = { ok: false, reason: "Source lookup is off. Turn it on in Settings." };
    await renderLibrary([maboReported]);
    const button = screen.getByRole("button", { name: "Update from source" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "Source lookup is off. Turn it on in Settings.");
  });

  test("Update from source opens the dialog; Apply updates the store and announces", async () => {
    mockFetchSourceUpdate.mockResolvedValue({
      status: "updated",
      adapterId: "mock",
      adapterLabel: "Mock Adapter",
      metadata: { court: "HCA" },
      fields: { courtId: "HCA" },
      differences: ["courtId"],
    });
    const container = await renderLibrary([maboReported]);
    const button = screen.getByRole("button", { name: "Update from source" });
    fireEvent.click(button);
    const dialog = await screen.findByRole("dialog", { name: "Update from source" });
    await screen.findByRole("table", { name: "Fields to merge" });
    expect(mockFetchSourceUpdate.mock.calls[0][0]).toBe(maboReported);
    expect(mockFetchSourceUpdate.mock.calls[0][1]).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1");
    expect(dialog).toHaveTextContent("From Mock Adapter");
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
    await waitFor(() => expect(mockStore.update).toHaveBeenCalledTimes(1));
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    expect(saved.id).toBe("rep");
    expect(saved.data).toMatchObject({ party1: "Mabo", courtId: "HCA" });
    expect(saved.data.interchange).toMatchObject({
      provenance: { format: "adapter", adapterId: "mock", sourceLabel: "Mock Adapter" },
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mockTriggerRefresh).toHaveBeenCalled();
    expect(mockAnnounce).toHaveBeenCalledWith("Updated 1 field from Mock Adapter.", "success");
    expect(screen.getByText("Updated 1 field from Mock Adapter.")).toBeInTheDocument();
    expect(document.activeElement).toBe(button);
  });
});
