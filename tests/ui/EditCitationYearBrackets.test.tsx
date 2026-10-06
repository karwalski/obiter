/**
 * @jest-environment jsdom
 *
 * B5 / BUG-005: the Edit form's "Year Brackets" for a reported case is a
 * select with Round (year) / Square [year], matching the Insert form, and
 * keeps the stored value (AGLC4 r 2.2.1).
 *
 * Mocks mirror tests/ui/EditCitationRoundTrip.test.tsx.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EditCitation from "../../src/ui/views/EditCitation";
import type { Citation } from "../../src/types/citation";

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

// Saving re-renders the whole document (short-title/ibid chains are
// document-wide), so the Edit view calls refreshAllCitations inside Word.run
// rather than rewriting a single citation.
jest.mock("../../src/word/citationRefresher", () => ({
  refreshAllCitations: jest.fn(async () => undefined),
}));

(globalThis as unknown as { Word: { run: (cb: (ctx: unknown) => unknown) => unknown } }).Word = {
  run: async (cb: (ctx: unknown) => unknown) => cb({}),
};

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



import {
  getFieldsForSourceType,
  selectFieldOptions,
  selectFieldValue,
} from "../../src/ui/views/editCitationFields";

function reportedCase(yearType: unknown): Citation {
  return {
    id: "case-1",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: {
      party1: "Mabo",
      party2: "Queensland [No 2]",
      year: 1992,
      ...(yearType === undefined ? {} : { yearType }),
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
    },
    tags: [],
    createdAt: "2026-10-07T00:00:00Z",
    modifiedAt: "2026-10-07T00:00:00Z",
  } as Citation;
}

async function openEdit(): Promise<HTMLSelectElement> {
  render(
    <MemoryRouter>
      <EditCitation />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.getByDisplayValue("Mabo")).toBeTruthy());
  return screen.getByLabelText("Year Brackets") as HTMLSelectElement;
}

async function saved(): Promise<Citation> {
  fireEvent.click(screen.getByRole("button", { name: "Update Citation" }));
  await waitFor(() => expect(mockStore.update).toHaveBeenCalledTimes(1));
  return mockStore.update.mock.calls[0][0] as unknown as Citation;
}

describe("B5: Edit form year brackets are a select", () => {
  beforeEach(() => jest.clearAllMocks());

  test("the field is a select with the Insert form's two options", async () => {
    mockCitation = reportedCase("square");
    const select = await openEdit();
    expect(select.tagName).toBe("SELECT");
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      "Round (year)",
      "Square [year]",
    ]);
    expect(select.value).toBe("square");
  });

  test("choosing Round saves 'round'", async () => {
    mockCitation = reportedCase("square");
    const select = await openEdit();
    fireEvent.change(select, { target: { value: "round" } });
    expect((await saved()).data.yearType).toBe("round");
  });

  test("nothing stored shows Round (the engine default) and an untouched save adds nothing", async () => {
    mockCitation = reportedCase(undefined);
    const select = await openEdit();
    expect(select.value).toBe("round");
    const data = (await saved()).data;
    expect(data.yearType === undefined || data.yearType === "").toBe(true);
  });

  test("an unexpected stored value is shown and kept on an untouched save", async () => {
    mockCitation = reportedCase("Square");
    const select = await openEdit();
    expect(select.value).toBe("Square");
    expect((await saved()).data.yearType).toBe("Square");
  });
});

describe("B5: select helpers read stored values with toText", () => {
  const field = getFieldsForSourceType("case.reported").find((f) => f.key === "yearType")!;

  test("the reported-case field is a select defaulting to round", () => {
    expect(field.type).toBe("select");
    expect(field.defaultValue).toBe("round");
  });

  test("values", () => {
    expect(selectFieldValue(field, "square")).toBe("square");
    expect(selectFieldValue(field, " round ")).toBe("round");
    expect(selectFieldValue(field, undefined)).toBe("round");
    expect(selectFieldValue(field, "")).toBe("round");
    // A non-string value from the XML store does not throw.
    expect(selectFieldValue(field, 0)).toBe("0");
  });

  test("an unmatched value gets its own option; a field with no default offers Not set", () => {
    expect(selectFieldOptions(field, "Square").map((o) => o.value)).toEqual([
      "Square",
      "round",
      "square",
    ]);
    const noDefault = { ...field, defaultValue: undefined };
    expect(selectFieldOptions(noDefault, "").map((o) => o.label)).toEqual([
      "Not set",
      "Round (year)",
      "Square [year]",
    ]);
  });
});
