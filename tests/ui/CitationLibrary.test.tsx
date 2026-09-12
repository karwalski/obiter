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

jest.mock("../../src/word/footnoteManager", () => ({
  insertCitationFootnote: jest.fn(),
  getAllCitationFootnotes: jest.fn(async () => []),
  deleteAllOccurrences: jest.fn(),
  buildOccurrenceTitle: jest.fn(() => ""),
}));
jest.mock("../../src/word/sourceImporter", () => ({
  getWordSourcesXml: jest.fn(async () => null),
}));
jest.mock("../../src/actions/citationService", () => ({
  mergeDuplicateCitation: jest.fn(),
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
