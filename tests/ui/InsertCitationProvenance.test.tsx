/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-006: selecting a source-lookup hit on the Insert Citation form records
 * where it came from. The provenance rides in the interchange bag under
 * `data.interchange` (adapter id, record id, source URL, fetch time) in the
 * same batched update as the parsed fields, the attribution the adapter
 * attached shows under the typeahead, and the engine renders the citation
 * exactly as it would without the bag.
 *
 * The adapter search, the headless citation service and the Word/store
 * layers are mocked so no network or Office APIs are touched.
 */
import * as React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import InsertCitation from "../../src/ui/views/InsertCitation";
import { InsertCitationProvider } from "../../src/ui/context/InsertCitationContext";
import { formatCitation } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";
import type { CitationInterchangeBag } from "../../src/api/interchange/model";

// ─── Subject mocks ───────────────────────────────────────────────────────────

const mockHit = {
  title: "Mabo v Queensland (No 2)",
  snippet: "[1992] HCA 23; (1992) 175 CLR 1",
  sourceId: "corpus:mabo-1992",
  confidence: 0.9,
  sourceUrl: "https://example.test/corpus/mabo",
  attribution: "CC BY 4.0 (Isaacus)",
  adapterId: "corpus",
};
const mockSearchViaAdapters = jest.fn(async () => [mockHit]);
jest.mock("../../src/api/adapterSearch", () => ({
  searchViaAdapters: (...args: unknown[]): Promise<unknown> =>
    mockSearchViaAdapters(...(args as [])),
  getAdapterInstance: (id: string): unknown =>
    id === "corpus"
      ? { descriptor: { id: "corpus", displayName: "Open Australian Legal Corpus" } }
      : undefined,
}));

interface InsertRequest {
  sourceType: string;
  data: Record<string, unknown>;
  shortTitle?: string;
}
const mockInsertCitation = jest.fn(async (_request: InsertRequest) => ({
  status: "inserted",
  citationId: "c1",
  mode: "new",
}));
jest.mock("../../src/actions/citationService", () => ({
  insertCitation: (...args: unknown[]): Promise<unknown> =>
    mockInsertCitation(...(args as [InsertRequest])),
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
  loadLlmConfig: jest.fn(() => null),
  saveLlmConfig: jest.fn(),
}));
jest.mock("../../src/llm/classifySource", () => ({
  classifySourceType: jest.fn(),
}));
jest.mock("../../src/llm/parseCitation", () => ({
  parseCitationText: jest.fn(),
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
// Source lookup on: the master toggle enables the typeahead.
jest.mock("../../src/api/sourceRegistry", () => ({
  isMasterEnabled: jest.fn(() => true),
}));
jest.mock("../../src/api/corpus/corpusDownload", () => ({
  checkCorpusAvailable: jest.fn(() => false),
}));

// ─── Harness ─────────────────────────────────────────────────────────────────

function Harness(): JSX.Element {
  return (
    <MemoryRouter>
      <InsertCitationProvider>
        <InsertCitation />
      </InsertCitationProvider>
    </MemoryRouter>
  );
}

function categorySelect(): HTMLSelectElement {
  return screen.getByLabelText(/Part$/) as HTMLSelectElement;
}

/** Choose Domestic > Reported case so the Party 1 typeahead renders. */
async function chooseReportedCase(): Promise<void> {
  await screen.findByLabelText(/Part$/);
  fireEvent.change(categorySelect(), { target: { value: "Domestic" } });
  const sourceType = (await screen.findByLabelText("Source Type")) as HTMLSelectElement;
  fireEvent.change(sourceType, { target: { value: "case.reported" } });
  await waitFor(() => expect(document.getElementById("ic-party1")).not.toBeNull());
}

/** The Party 1 typeahead input (the selects are comboboxes too, so go by id). */
function party1(): HTMLInputElement {
  return document.getElementById("ic-party1") as HTMLInputElement;
}

/** Type into the Party 1 typeahead and pick the first hit. */
async function searchAndSelect(): Promise<void> {
  const input = party1();
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "mabo" } });
  const listbox = await screen.findByRole("listbox", {}, { timeout: 2000 });
  const option = await within(listbox).findByRole("option", {}, { timeout: 2000 });
  fireEvent.mouseDown(option);
}

async function clickInsert(): Promise<void> {
  const insertBtn = await screen.findByRole("button", { name: "Insert as Footnote" });
  await waitFor(() => expect((insertBtn as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(insertBtn);
}

function lastInsertRequest(): InsertRequest {
  expect(mockInsertCitation).toHaveBeenCalledTimes(1);
  return mockInsertCitation.mock.calls[0][0];
}

function asCitation(request: InsertRequest, data: Record<string, unknown>): Citation {
  return {
    id: "c1",
    aglcVersion: "4",
    sourceType: request.sourceType as Citation["sourceType"],
    data,
    shortTitle: request.shortTitle,
    tags: [],
    createdAt: "2026-09-14T00:00:00.000Z",
    modifiedAt: "2026-09-14T00:00:00.000Z",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("ENP-006: provenance stamp at the form boundary", () => {
  test("selecting a lookup hit stores adapter provenance in data.interchange", async () => {
    render(<Harness />);
    await chooseReportedCase();
    await searchAndSelect();

    // The parsed fields landed...
    await waitFor(() => expect(party1().value).toBe("Mabo"));
    expect((screen.getByLabelText("Party 2") as HTMLInputElement).value).toBe("Queensland (No 2)");

    // ...and the attribution shows under the typeahead.
    expect(screen.getByTestId("ic-lookup-attribution").textContent).toBe(
      "Source: CC BY 4.0 (Isaacus)"
    );
    // The attribution note sits inside the Party 1 field; check that field
    // (the pre-existing "Check citation" select elsewhere on the form has no
    // accessible name and is outside this story).
    const field = party1().closest(".ic-field") as HTMLElement;
    expect(field.contains(screen.getByTestId("ic-lookup-attribution"))).toBe(true);
    expect(await axe(field)).toHaveNoViolations();

    await clickInsert();
    await screen.findByText(/Success: Citation inserted as footnote\./);

    const request = lastInsertRequest();
    expect(request.sourceType).toBe("case.reported");
    const bag = request.data.interchange as CitationInterchangeBag;
    expect(bag.v).toBe(1);
    expect(bag.provenance.format).toBe("adapter");
    expect(bag.provenance.rawType).toBe("case");
    expect(bag.provenance.adapterId).toBe("corpus");
    expect(bag.provenance.sourceLabel).toBe("Open Australian Legal Corpus");
    expect(bag.provenance.rawId).toBe("corpus:mabo-1992");
    expect(bag.provenance.sourceUrl).toBe("https://example.test/corpus/mabo");
    expect(typeof bag.provenance.retrievedAt).toBe("string");
    expect(Number.isNaN(Date.parse(bag.provenance.retrievedAt ?? ""))).toBe(false);
  });

  test("the engine renders the citation unchanged with or without the bag", async () => {
    render(<Harness />);
    await chooseReportedCase();
    await searchAndSelect();
    await clickInsert();
    await screen.findByText(/Success: Citation inserted as footnote\./);

    const request = lastInsertRequest();
    expect(request.data.interchange).toBeDefined();
    const withBag = formatCitation(asCitation(request, request.data));
    const stripped: Record<string, unknown> = { ...request.data };
    delete stripped.interchange;
    const withoutBag = formatCitation(asCitation(request, stripped));

    expect(withBag).toEqual(withoutBag);
    const text = withBag.map((run) => run.text).join("");
    expect(text).toContain("Mabo v Queensland (No 2)");
    expect(text).toContain("(1992) 175 CLR 1");
  });

  test("the attribution note clears when the form resets after insert", async () => {
    render(<Harness />);
    await chooseReportedCase();
    await searchAndSelect();
    expect(screen.getByTestId("ic-lookup-attribution")).toBeTruthy();

    await clickInsert();
    await screen.findByText(/Success: Citation inserted as footnote\./);
    expect(screen.queryByTestId("ic-lookup-attribution")).toBeNull();
  });

  test("a hit without an adapterId leaves the form data free of a bag", async () => {
    mockSearchViaAdapters.mockResolvedValueOnce([
      { ...mockHit, adapterId: undefined as unknown as string, attribution: undefined as unknown as string },
    ]);
    render(<Harness />);
    await chooseReportedCase();
    await searchAndSelect();
    await waitFor(() => expect(party1().value).toBe("Mabo"));
    expect(screen.queryByTestId("ic-lookup-attribution")).toBeNull();

    await clickInsert();
    await screen.findByText(/Success: Citation inserted as footnote\./);
    expect(lastInsertRequest().data.interchange).toBeUndefined();
  });
});
