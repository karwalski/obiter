/**
 * @jest-environment jsdom
 *
 * Edit round-trip regression tests (BUG-005 (d)).
 *
 * The contract under test: inserting a citation through the insert-path
 * builder, opening it in the Edit view, and saving without changes must be
 * lossless — every engine-read field is displayed (a reported case shows BOTH
 * parties; pre-fix the view read a `caseName` key the engine never writes, so
 * the parties loaded blank) and the saved citation formats to exactly the
 * same output as the inserted one.
 *
 * Store, Word layer and preview parser are mocked; the engine runs for real.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import EditCitation from "../../src/ui/views/EditCitation";
import { buildCitationFromRequest } from "../../src/actions/citationRequest";
import { getFormattedPreview } from "../../src/engine/engine";
import { getStandardConfig } from "../../src/engine/standards";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

// ─── Mocks ──────────────────────────────────────────────────────────────────

let mockCitation: Citation;

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

// The live preview's paste-to-parse path pulls in the LLM/corpus stack —
// stub the component; the round trip asserts on the engine output directly.
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
  }),
}));

import { updateCitationContent } from "../../src/word/footnoteManager";

const toPlainText = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

const CONFIG = getStandardConfig("aglc4");

describe("BUG-005 (d): edit round trip is lossless", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reported case: insert -> edit shows both parties -> save -> output unchanged (Rule 2.2)", async () => {
    mockCitation = buildCitationFromRequest(
      {
        sourceType: "case.reported",
        data: {
          party1: "Smith",
          party2: "Land & House Property Corporation",
          yearType: "round",
          year: "1887",
          volume: "28",
          reportSeries: "Ch D",
          startingPage: "7",
        },
      },
      "4"
    );
    const insertedText = toPlainText(getFormattedPreview(mockCitation, CONFIG));
    expect(insertedText).toContain("Smith v Land & House Property Corporation");
    expect(insertedText).toContain("(1887) 28 Ch D 7");

    render(<EditCitation />);

    // Both parties must populate the edit form (the original BUG-005 repro
    // showed an empty Case Name field instead).
    await waitFor(() => {
      expect(screen.getByDisplayValue("Smith")).toBeTruthy();
    });
    expect(screen.getByDisplayValue("Land & House Property Corporation")).toBeTruthy();
    expect(screen.getByDisplayValue("Ch D")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Update Citation" }));

    await waitFor(() => {
      expect(mockStore.update).toHaveBeenCalledTimes(1);
    });
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    expect(saved.data.party1).toBe("Smith");
    expect(saved.data.party2).toBe("Land & House Property Corporation");

    // The saved citation formats identically to the inserted one.
    expect(toPlainText(getFormattedPreview(saved, CONFIG))).toBe(insertedText);

    // And the document content control received the same runs.
    const updateMock = updateCitationContent as jest.Mock;
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0]).toBe(mockCitation.id);
    expect(toPlainText(updateMock.mock.calls[0][1] as FormattedRun[])).toBe(insertedText);
  });

  it("unreported case (no MNC): the (d) known mismatch — parties, judges and date survive the round trip (Rule 2.3.2)", async () => {
    mockCitation = buildCitationFromRequest(
      {
        sourceType: "case.unreported.no_mnc",
        data: {
          party1: "Barton",
          party2: "Chibber",
          court: "Supreme Court of Victoria",
          judges: "Hampel J",
          date: "29 June 1988",
        },
      },
      "4"
    );
    const insertedText = toPlainText(getFormattedPreview(mockCitation, CONFIG));
    expect(insertedText).toContain("Barton v Chibber");
    expect(insertedText).toContain("Hampel J");

    render(<EditCitation />);

    // Pre-fix the edit view used caseName/judgeName/date keys, so the party
    // and judge fields loaded blank and edits to them were dropped.
    await waitFor(() => {
      expect(screen.getByDisplayValue("Barton")).toBeTruthy();
    });
    expect(screen.getByDisplayValue("Chibber")).toBeTruthy();
    expect(screen.getByDisplayValue("Hampel J")).toBeTruthy();
    expect(screen.getByDisplayValue("29 June 1988")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Update Citation" }));

    await waitFor(() => {
      expect(mockStore.update).toHaveBeenCalledTimes(1);
    });
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    expect(toPlainText(getFormattedPreview(saved, CONFIG))).toBe(insertedText);
  });

  it("journal article: the structured authors array renders as a name list and survives an untouched save (Rule 5)", async () => {
    mockCitation = buildCitationFromRequest(
      {
        sourceType: "journal.article",
        data: {
          authors: [{ givenNames: "Justine", surname: "Bell" }],
          title: "Climate Change Adaptation and Coastal Property",
          year: "2014",
          volume: "31",
          journal: "Environmental and Planning Law Journal",
          startingPage: "152",
        },
      },
      "4"
    );
    const insertedText = toPlainText(getFormattedPreview(mockCitation, CONFIG));
    expect(insertedText).toContain("Justine Bell");

    render(<EditCitation />);

    // The namelist field renders the Author[] shape as display text.
    await waitFor(() => {
      expect(screen.getByDisplayValue("Justine Bell")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Update Citation" }));

    await waitFor(() => {
      expect(mockStore.update).toHaveBeenCalledTimes(1);
    });
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    // Untouched, the structured array is preserved as-is.
    expect(saved.data.authors).toEqual([{ givenNames: "Justine", surname: "Bell" }]);
    expect(toPlainText(getFormattedPreview(saved, CONFIG))).toBe(insertedText);
  });
});
