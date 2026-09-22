/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * BUG-008: after a successful insert the Paste Citation panel (whose state
 * lives in InsertCitationContext so it survives navigation, AI-ENH-001) must
 * be cleared along with the rest of the form. A failed insert keeps it, and
 * navigating away and back still keeps it.
 *
 * The LLM parser, the headless citation service and the Word/store layers are
 * mocked so no network or Office APIs are touched.
 */
import * as React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import InsertCitation from "../../src/ui/views/InsertCitation";
import { InsertCitationProvider } from "../../src/ui/context/InsertCitationContext";

// ─── Subject mocks ───────────────────────────────────────────────────────────

const mockParseCitationText = jest.fn(async () => ({
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: 1992,
    volume: 175,
    reportSeries: "CLR",
    startingPage: 1,
  },
  confidence: 0.95,
  standard: "aglc4",
  shortTitle: "Mabo",
}));
jest.mock("../../src/llm/parseCitation", () => ({
  parseCitationText: (...args: unknown[]): Promise<unknown> =>
    mockParseCitationText(...(args as [])),
}));

const mockInsertCitation = jest.fn(async () => ({
  status: "inserted",
  citationId: "c1",
  mode: "new",
}));
jest.mock("../../src/actions/citationService", () => ({
  insertCitation: (...args: unknown[]): Promise<unknown> =>
    mockInsertCitation(...(args as [])),
}));

// ─── Surrounding mocks ───────────────────────────────────────────────────────

const mockTriggerRefresh = jest.fn();
jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    refreshCounter: 0,
    triggerRefresh: mockTriggerRefresh,
  }),
}));

const mockAnnounce = jest.fn();
jest.mock("../../src/ui/context/StatusContext", () => ({
  useStatus: (): unknown => ({ announce: mockAnnounce, entries: [], clear: jest.fn() }),
}));

jest.mock("../../src/llm/config", () => ({
  loadLlmConfig: jest.fn(() => ({
    provider: "anthropic",
    apiKey: "sk-ant-test",
    model: "claude-sonnet-4-6",
    maxTokens: 1024,
    enabled: true,
  })),
  saveLlmConfig: jest.fn(),
}));
jest.mock("../../src/llm/classifySource", () => ({
  classifySourceType: jest.fn(),
}));
jest.mock("../../src/llm/suggestShortTitle", () => ({
  suggestShortTitle: jest.fn(),
}));

const mockStore = {
  getAll: jest.fn(() => []),
  getStandardId: jest.fn(() => "aglc4"),
  getWritingMode: jest.fn(() => "academic"),
  getCourtJurisdiction: jest.fn(() => undefined),
  getCourtToggles: jest.fn(() => undefined),
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
  getSharedStoreIfReady: (): unknown => null,
}));
jest.mock("../../src/word/footnoteManager", () => ({
  insertCitationFootnote: jest.fn(),
  getAllCitationFootnotes: jest.fn(async () => []),
  buildOccurrenceTitle: jest.fn(() => ""),
  deleteAllOccurrences: jest.fn(),
}));
jest.mock("../../src/word/citationRefresher", () => ({
  refreshAllCitationsNow: jest.fn(async () => undefined),
}));
jest.mock("../../src/word/sourceImporter", () => ({
  getWordSourcesXml: jest.fn(async () => null),
}));
jest.mock("../../src/api/adapterSearch", () => ({
  searchViaAdapters: jest.fn(async () => []),
}));
jest.mock("../../src/api/sourceRegistry", () => ({
  isMasterEnabled: jest.fn(() => false),
}));
jest.mock("../../src/api/corpus/corpusDownload", () => ({
  checkCorpusAvailable: jest.fn(() => false),
}));

// ─── Harness ─────────────────────────────────────────────────────────────────

function Harness({ show }: { show: boolean }): JSX.Element {
  return (
    <MemoryRouter>
      <InsertCitationProvider>
        {show && <InsertCitation />}
      </InsertCitationProvider>
    </MemoryRouter>
  );
}

const PASTED = "Mabo v Queensland (No 2) (1992) 175 CLR 1";

function categorySelect(): HTMLSelectElement {
  return screen.getByLabelText(/Part$/) as HTMLSelectElement;
}

function pasteTextarea(): HTMLTextAreaElement {
  return screen.getByPlaceholderText(/Paste a formatted citation/) as HTMLTextAreaElement;
}

/** Open the Paste Citation panel, paste, and parse until the result shows. */
async function pasteAndParse(): Promise<void> {
  const header = await screen.findByRole("button", { name: /Paste Citation/ });
  fireEvent.click(header);
  fireEvent.change(pasteTextarea(), { target: { value: PASTED } });
  fireEvent.click(screen.getByRole("button", { name: "Parse" }));
  await screen.findByText(/Review the populated fields before inserting/);
  await waitFor(() => expect(categorySelect().value).toBe("Domestic"));
}

async function clickInsert(): Promise<void> {
  const insertBtn = await screen.findByRole("button", { name: "Insert as Footnote" });
  await waitFor(() => expect((insertBtn as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(insertBtn);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("BUG-008: Paste Citation state after insert", () => {
  test("a successful insert clears the pasted text, the result and collapses the panel", async () => {
    const { container } = render(<Harness show />);
    await pasteAndParse();

    await clickInsert();
    await screen.findByText(/Success: Citation inserted as footnote\./);

    expect(mockInsertCitation).toHaveBeenCalledTimes(1);
    expect(mockTriggerRefresh).toHaveBeenCalledTimes(1);
    // Back to category selection.
    expect(categorySelect().value).toBe("");
    // The panel collapsed and holds no text or result.
    expect(screen.queryByText(/Review the populated fields/)).toBeNull();
    expect(screen.queryByPlaceholderText(/Paste a formatted citation/)).toBeNull();
    const header = screen.getByRole("button", { name: /Paste Citation/ });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(header);
    expect(pasteTextarea().value).toBe("");

    expect(await axe(container)).toHaveNoViolations();
  });

  test("a manual-override insert clears the paste state and keeps the source type", async () => {
    mockInsertCitation.mockResolvedValueOnce({
      status: "inserted",
      citationId: "c1",
      mode: "override",
    });
    render(<Harness show />);
    await pasteAndParse();

    await clickInsert();
    await screen.findByText(/manual override/);

    // Source type stays selected...
    expect(categorySelect().value).toBe("Domestic");
    expect((screen.getByLabelText("Source Type") as HTMLSelectElement).value).toBe("case.reported");
    // ...but the paste panel is cleared and collapsed.
    expect(screen.queryByText(/Review the populated fields/)).toBeNull();
    const header = screen.getByRole("button", { name: /Paste Citation/ });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(header);
    expect(pasteTextarea().value).toBe("");
  });

  test("a failed insert keeps the pasted text and result and shows the error", async () => {
    mockInsertCitation.mockRejectedValueOnce(new Error("Word refused the footnote."));
    render(<Harness show />);
    await pasteAndParse();

    await clickInsert();
    await screen.findByText(/Error: Word refused the footnote\./);

    expect(pasteTextarea().value).toBe(PASTED);
    expect(screen.getByText(/Review the populated fields/)).toBeTruthy();
    expect(categorySelect().value).toBe("Domestic");
  });

  test("navigating away and back keeps the pasted text (AI-ENH-001)", async () => {
    const { rerender } = render(<Harness show />);
    await pasteAndParse();

    rerender(<Harness show={false} />);
    expect(screen.queryByPlaceholderText(/Paste a formatted citation/)).toBeNull();

    rerender(<Harness show />);
    await screen.findByRole("button", { name: /Paste Citation/ });
    expect(pasteTextarea().value).toBe(PASTED);
    expect(screen.getByText(/Review the populated fields/)).toBeTruthy();
    expect(categorySelect().value).toBe("Domestic");
    expect(mockInsertCitation).not.toHaveBeenCalled();
  });
});
