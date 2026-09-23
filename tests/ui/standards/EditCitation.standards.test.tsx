/**
 * @jest-environment jsdom
 *
 * STD-009: the Edit view under each standard — the field list shows the
 * standard-specific fields (OSCOLA neutral citation, NZ Waitangi claim
 * number and Maori Land Court minute book), the preview renders in the
 * active standard, a save keeps the standard-specific data, and axe.
 *
 * Tests assert the correct behaviour; `test.failing` marks the ones the
 * current code fails, with the fix story named.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import EditCitation from "../../../src/ui/views/EditCitation";
import type { Citation } from "../../../src/types/citation";
import {
  CARD_CASE,
  CORR_REPORTED,
  MABO_COURT_HCA_TEXT,
  MABO_REPORTED,
  MLC_DECISION,
  STANDARDS,
  WAITANGI_REPORT,
  courtHca,
  mockStoreFor,
} from "./storeMock";
import type { MockStore, MockStoreOptions } from "./storeMock";

// ─── Mocks (the Edit suite's set, with the store and preview parameterised) ─

let mockStore: MockStore;
let mockSelectedId = "";

jest.mock("../../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
  getSharedStoreIfReady: (): unknown => mockStore,
}));

jest.mock("../../../src/store/devicePreferences", () => ({
  getDevicePref: jest.fn(() => undefined),
  setDevicePref: jest.fn(),
}));

jest.mock("../../../src/word/footnoteManager", () => ({
  updateCitationContent: jest.fn(async () => undefined),
  deleteCitationFootnote: jest.fn(async () => undefined),
  getAllCitationFootnotes: jest.fn(async () => []),
  appendToFootnoteByIndex: jest.fn(async () => undefined),
  updateOccurrenceMetadata: jest.fn(async () => undefined),
  setFootnoteLock: jest.fn(async () => undefined),
  getFootnoteText: jest.fn(async () => ""),
  setOccurrenceText: jest.fn(async () => undefined),
}));

jest.mock("../../../src/ui/views/CitationLibrary", () => ({
  getCitationLabel: (c: { id: string }) => c.id,
}));

jest.mock("../../../src/word/citationRefresher", () => ({
  refreshAllCitations: jest.fn(async () => undefined),
}));

(globalThis as unknown as { Word: { run: (cb: (ctx: unknown) => unknown) => unknown } }).Word = {
  run: async (cb: (ctx: unknown) => unknown) => cb({}),
};

// The preview's text, so the rendering under the standard can be asserted.
jest.mock("../../../src/ui/components/CitationPreview", () => ({
  __esModule: true,
  default: ({ runs }: { runs: Array<{ text: string }> }) => (
    <div data-testid="preview">{runs.map((r) => r.text).join("")}</div>
  ),
}));

jest.mock("../../../src/ui/context/CitationContext", () => ({
  useCitationContext: () => ({
    selectedCitationId: mockSelectedId,
    setSelectedCitationId: jest.fn(),
    focusField: null,
    setFocusField: jest.fn(),
    refreshCounter: 0,
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

async function renderEdit(opts: MockStoreOptions, selected: Citation): Promise<HTMLElement> {
  mockStore = mockStoreFor(opts);
  mockSelectedId = selected.id;
  const { container } = render(
    <MemoryRouter>
      <EditCitation />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.getByLabelText("Tags")).toBeInTheDocument());
  return container;
}

function previewText(): string {
  return screen.getByTestId("preview").textContent ?? "";
}

async function saveAndRead(): Promise<Citation> {
  fireEvent.click(screen.getByRole("button", { name: "Update Citation" }));
  await waitFor(() => expect(mockStore.update).toHaveBeenCalledTimes(1));
  return mockStore.update.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Preview per standard ───────────────────────────────────────────────────

describe.each(STANDARDS)("STD-009 Edit view under %s", (standardId) => {
  const { citation, expected, rule } = CARD_CASE[standardId];

  test(`the preview renders in the active standard (${rule})`, async () => {
    await renderEdit({ standardId, citations: [citation] }, citation);
    expect(previewText()).toBe(`${expected}.`);
  });

  test("the party fields load and a save writes the same data back", async () => {
    await renderEdit({ standardId, citations: [citation] }, citation);
    expect(screen.getByDisplayValue(citation.data.party1 as string)).toBeInTheDocument();
    const saved = await saveAndRead();
    expect(saved.id).toBe(citation.id);
    expect(saved.data).toMatchObject({ party1: citation.data.party1, party2: citation.data.party2 });
  });

  test("has no axe violations", async () => {
    const container = await renderEdit({ standardId, citations: [citation] }, citation);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── OSCOLA: neutral citation fields ────────────────────────────────────────

describe("STD-009 Edit view under oscola5: UK case fields", () => {
  // STD-021: the Edit form lists the OSCOLA neutral citation fields
  // (neutralCitationYear/Court/Number) for a case under OSCOLA.
  test("lists the neutral citation court and number as editable fields (OSCOLA 5 r 2.1.2)", async () => {
    await renderEdit({ standardId: "oscola5", citations: [CORR_REPORTED] }, CORR_REPORTED);
    expect(screen.getByDisplayValue("UKHL")).toBeInTheDocument();
  });

  test("a save keeps the neutral citation fields the form does not list", async () => {
    await renderEdit({ standardId: "oscola5", citations: [CORR_REPORTED] }, CORR_REPORTED);
    const saved = await saveAndRead();
    expect(saved.data).toMatchObject({
      neutralCitationYear: "2008",
      neutralCitationCourt: "UKHL",
      neutralCitationNumber: "15",
      reportSeries: "AC",
    });
  });

  test("editing the report series re-renders the preview in OSCOLA form", async () => {
    await renderEdit({ standardId: "oscola5", citations: [CORR_REPORTED] }, CORR_REPORTED);
    fireEvent.change(screen.getByDisplayValue("AC"), { target: { value: "WLR" } });
    expect(previewText()).toBe("Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 WLR 884.");
  });
});

// ─── NZLSG: Waitangi Tribunal and Maori Land Court fields ───────────────────

describe("STD-009 Edit view under nzlsg3: NZ-specific fields", () => {
  test("a Waitangi Tribunal report previews per NZLSG 3 r 3.6", async () => {
    await renderEdit({ standardId: "nzlsg3", citations: [WAITANGI_REPORT] }, WAITANGI_REPORT);
    expect(previewText()).toBe("Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011).");
  });

  // STD-021: the Edit form lists `waiNumber` for a Waitangi Tribunal report
  // under NZLSG.
  test("lists the Wai claim number as an editable field (NZLSG 3 r 3.6)", async () => {
    await renderEdit({ standardId: "nzlsg3", citations: [WAITANGI_REPORT] }, WAITANGI_REPORT);
    expect(screen.getByDisplayValue("262")).toBeInTheDocument();
  });

  test("a Maori Land Court decision previews per NZLSG 3 r 3.5", async () => {
    await renderEdit({ standardId: "nzlsg3", citations: [MLC_DECISION] }, MLC_DECISION);
    expect(previewText()).toBe("Pomare – Peter Here Pomare (2015) 103 Taitokerau MB 95.");
  });

  // STD-021: the Edit form lists the minute book fields (`minuteBookAbbrev`,
  // `minuteBookDistrict`, `blockNumber`, `page`) for a quasi-judicial
  // decision under NZLSG.
  test("lists the minute book abbreviation as an editable field (NZLSG 3 r 3.5)", async () => {
    await renderEdit({ standardId: "nzlsg3", citations: [MLC_DECISION] }, MLC_DECISION);
    expect(screen.getByDisplayValue("MB")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Taitokerau")).toBeInTheDocument();
  });

  test("a save keeps the NZ fields the form does not list", async () => {
    await renderEdit({ standardId: "nzlsg3", citations: [WAITANGI_REPORT] }, WAITANGI_REPORT);
    const saved = await saveAndRead();
    expect(saved.data).toMatchObject({ waiNumber: "262", title: "Ko Aotearoa Tēnei" });
  });

  test("has no axe violations for the NZ-specific types", async () => {
    const container = await renderEdit(
      { standardId: "nzlsg3", citations: [WAITANGI_REPORT, MLC_DECISION] },
      WAITANGI_REPORT
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── Court mode ─────────────────────────────────────────────────────────────

describe("STD-009 Edit view under court mode (AGLC4, HCA preset)", () => {
  // STD-013: fails until the Edit preview resolves the document config with
  // the store's writing mode; today `buildCourtConfig(standardConfig,
  // toggles)` sees the academic base and drops the parallel MNC.
  test("the preview renders Mabo with its parallel MNC", async () => {
    await renderEdit(courtHca([MABO_REPORTED]), MABO_REPORTED);
    expect(previewText()).toBe(`${MABO_COURT_HCA_TEXT}.`);
  });

  test("the preview renders the report citation", async () => {
    await renderEdit(courtHca([MABO_REPORTED]), MABO_REPORTED);
    expect(previewText()).toContain("Mabo v Queensland (No 2) (1992) 175 CLR 1");
  });

  test("has no axe violations", async () => {
    const container = await renderEdit(courtHca([MABO_REPORTED]), MABO_REPORTED);
    expect(await axe(container)).toHaveNoViolations();
  });
});
