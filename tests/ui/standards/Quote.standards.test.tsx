/**
 * @jest-environment jsdom
 *
 * STD-006: the Quote panel under each standard and under court mode.
 *
 * The panel lists the library rendered as a preview, decides block versus
 * inline for the pasted passage, wraps it in the standard's quotation
 * marks, and inserts the footnote with the quotation's pinpoint rendered in
 * the active standard. This suite parameterises the existing Quote suite's
 * mocks over aglc4, oscola5, nzlsg3 and aglc4 in court mode (HCA), with the
 * STD-002 fixtures (Mabo by report, Corr v IBC Vehicles, Brooker v Police).
 *
 * Tests assert the correct behaviour. Where the current code fails, the
 * assertion is kept and the test is `test.failing` with the fix story named,
 * so the suite is green now and flips red when the story lands:
 * - STD-022 (landed 23 September 2026): the source picker's `safePreview`
 *   renders with the document config, so the list matches the footnote
 *   under OSCOLA, NZLSG and court mode.
 * - STD-013 (landed 23 September 2026): `buildFootnoteRuns` now takes the
 *   document config from `resolveDocumentConfig`, so the court footnote
 *   tests pass.
 * - STD-014: OSCOLA pinpoints — no comma before a paragraph pinpoint.
 * - STD-016: quotation marks and the block threshold from the config.
 *
 * Rule authority: AGLC4 r 1.5.1 (three lines or less short, single marks);
 * OSCOLA 5 §1.5 (up to three lines short, single marks; `[2008] UKHL 48,
 * [2009] 1 AC 61 [12]` pinpoint form); NZLSG 3 §1.2.2 (fewer than 30 words
 * short, double marks; 30 or more indented) and §2.2 (`at [42]`);
 * docs/standards-rule-notes.md.
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import Quote from "../../../src/ui/views/Quote";
import type { Citation, Pinpoint } from "../../../src/types/citation";
import type { LLMConfig } from "../../../src/llm/config";
import { quotationLineCount } from "../../../src/engine/quotations/pinpoint";
import { maboReported, nzBrooker, ukCorr } from "../../../tests/fixtures/standards/citations";
import { renderFirst } from "../../standards/runner";
import type { CourtOptions, StandardKey } from "../../standards/runner";
import { courtHca, mockStoreFor, runsText } from "./storeMock";
import type { MockStore, MockStoreOptions } from "./storeMock";

// ─── Mocks (the Quote suite's set, with the store parameterised) ────────────

const mockTriggerRefresh = jest.fn();
jest.mock("../../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    setSelectedCitationId: jest.fn(),
    triggerRefresh: mockTriggerRefresh,
    refreshCounter: 0,
  }),
}));

const mockInsertQuotation = jest.fn(async () => undefined);
const mockInsertPlainParagraph = jest.fn(async (_text: string) => undefined);
jest.mock("../../../src/word/quotationInserter", () => ({
  insertQuotation: (...args: unknown[]): Promise<void> => mockInsertQuotation(...(args as [])),
  insertPlainParagraph: (text: string): Promise<void> => mockInsertPlainParagraph(text),
}));

// No LLM provider: the AI section stays a single muted line.
jest.mock("../../../src/llm/config", () => ({
  loadLlmConfig: (): LLMConfig | null => null,
}));

const mockInsertCitationFootnote = jest.fn(async () => undefined);
const mockPinpointToTitleString = (
  jest.requireActual("../../../src/engine/rules/v4/general/pinpoints") as {
    pinpointToTitleString: (pinpoint: Pinpoint) => string;
  }
).pinpointToTitleString;
const mockBuildOccurrenceTitle = jest.fn((pref: string, pinpoint?: Pinpoint) =>
  pinpoint ? `Citation:${pref}:${mockPinpointToTitleString(pinpoint)}` : `Citation:${pref}`
);
jest.mock("../../../src/word/footnoteManager", () => ({
  insertCitationFootnote: (...args: unknown[]): Promise<void> =>
    mockInsertCitationFootnote(...(args as [])),
  getAllCitationFootnotes: jest.fn(async () => []),
  buildOccurrenceTitle: (pref: string, pinpoint?: Pinpoint): string =>
    mockBuildOccurrenceTitle(pref, pinpoint),
}));

jest.mock("../../../src/ui/pdfText", () => ({
  ...jest.requireActual("../../../src/ui/pdfText"),
  extractPdfPages: jest.fn(async () => ({ pages: [], pageCount: 0 })),
}));

let mockStore: MockStore;
jest.mock("../../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
  getSharedStoreIfReady: (): unknown => mockStore,
}));
jest.mock("../../../src/store/devicePreferences", () => ({
  getDevicePref: (): unknown => undefined,
  setDevicePref: (): void => undefined,
}));

// ─── Passages ───────────────────────────────────────────────────────────────

/** Forty words over four estimated lines, opening with a paragraph marker. */
const LONG_PASSAGE =
  "[42] The common law of Australia recognises a form of native title which, wherever it has not been extinguished, reflects the entitlement of the indigenous inhabitants, in accordance with their traditional laws and customs, to their traditional lands throughout the territory.";
const LONG_CLEANED = LONG_PASSAGE.replace("[42] ", "");

/** Twenty words, two estimated lines: inline under every standard. */
const SHORT_PASSAGE =
  "The common law of Australia recognises a form of native title which reflects the entitlement of the indigenous inhabitants there.";

/** Thirty words, two estimated lines: block under NZLSG alone. */
const WORDS_30 =
  "It is the law that no man may ever be put on trial for a crime he did not do, nor be made to pay for the act of another.";
/** Twenty-nine words: inline under every standard. */
const WORDS_29 =
  "It is the law that no man may ever be put on trial for a crime he did not do, nor made to pay for the act of another.";

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** The block decision each standard's rule gives for a cleaned passage. */
function expectedMode(standard: StandardKey, cleaned: string): "block" | "inline" {
  if (standard === "nzlsg3") return wordCount(cleaned) >= 30 ? "block" : "inline"; // §1.2.2(a)
  return quotationLineCount(cleaned) > 3 ? "block" : "inline"; // AGLC4 r 1.5.1, OSCOLA 5 §1.5
}

/** Case fixtures listed in the picker: one home case per standard plus the others. */
const LIBRARY: Citation[] = [maboReported, ukCorr, nzBrooker];

// ─── Standards under test ───────────────────────────────────────────────────

interface StandardSpec {
  label: string;
  standard: StandardKey;
  court?: CourtOptions;
  storeOpts: (citations: Citation[]) => MockStoreOptions;
  /** The fixture whose rendering the standard is authoritative for. */
  home: Citation;
  /** Its full first citation as the picker must show it (no closing stop). */
  homePreview: string;
  /** Story that must land before the picker preview is right (STD-022 landed: none). */
  previewFailsUntil?: "STD-022";
  /** Inline quotation marks (AGLC4 r 1.5.1, OSCOLA 5 §1.5, NZLSG 3 §1.2.2(a)(i)). */
  marks: [string, string];
  /** Story that must land before the inline marks are right (STD-016 landed: none). */
  marksFailUntil?: "STD-016";
  /** Story that must land before the 30-word passage takes the right form (STD-016 landed: none). */
  thresholdFailsUntil?: "STD-016";
  /** What the footnote for a `[42]` quotation must contain, and the story gating it. */
  paragraphFootnote: { contains: string; excludes?: string; failsUntil?: "STD-014" };
}

const SPECS: StandardSpec[] = [
  {
    label: "aglc4",
    standard: "aglc4",
    storeOpts: (citations) => ({ standardId: "aglc4", citations }),
    home: maboReported,
    homePreview: "Mabo v Queensland (1992) 175 CLR 1",
    marks: ["‘", "’"],
    paragraphFootnote: { contains: "Mabo v Queensland (1992) 175 CLR 1 [42]" },
  },
  {
    label: "oscola5",
    standard: "oscola5",
    storeOpts: (citations) => ({ standardId: "oscola5", citations }),
    home: ukCorr,
    homePreview: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    marks: ["‘", "’"],
    // OSCOLA 5 §1.5 example: "[2008] UKHL 48, [2009] 1 AC 61 [12]" — no comma
    // before a paragraph pinpoint (STD-014).
    paragraphFootnote: {
      contains: "[2008] UKHL 13, [2008] 1 AC 884 [42]",
      excludes: ", [42]",
    },
  },
  {
    label: "nzlsg3",
    standard: "nzlsg3",
    storeOpts: (citations) => ({ standardId: "nzlsg3", citations }),
    home: nzBrooker,
    homePreview: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91",
    marks: ["“", "”"],
    // NZLSG 3 §2.2: "at [42]".
    paragraphFootnote: { contains: "[2007] NZSC 30, [2007] 3 NZLR 91 at [42]" },
  },
  {
    label: "aglc4 court mode (HCA)",
    standard: "aglc4",
    court: { preset: "HCA" },
    storeOpts: (citations) => courtHca(citations),
    home: maboReported,
    homePreview: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23",
    marks: ["‘", "’"],
    // STD-013 landed: the footnote build resolves the court config.
    paragraphFootnote: { contains: "; [1992] HCA 23" },
  },
];

/** `test.failing` while `story` is outstanding, plain `test` otherwise. */
const testUntil = (story: string | undefined): jest.It => (story ? test.failing : test);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function renderQuote(
  opts: MockStoreOptions,
  state?: { citationId?: string }
): Promise<HTMLElement> {
  mockStore = mockStoreFor(opts);
  const { container } = render(
    <MemoryRouter initialEntries={[{ pathname: "/quote", state }]}>
      <Quote />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.queryByText("Loading citations...")).toBeNull());
  return container;
}

/** The text of the picker row for a citation id (badge plus preview). */
function pickerRowText(citationId: string): string {
  const radio = screen
    .getAllByRole("radio")
    .find((el) => (el as HTMLInputElement).value === citationId);
  if (!radio) throw new Error(`no picker row for ${citationId}`);
  return radio.closest("label")?.textContent ?? "";
}

interface Inserted {
  quotation: { text: string; mode: "block" | "inline" };
  citationId: string;
  title: string;
  footnoteText: string;
}

/** Pastes `passage`, sets the pinpoint value when given, inserts, and reads what was written. */
async function paste(passage: string, pinpointValue?: string): Promise<void> {
  fireEvent.change(screen.getByLabelText("Quoted text"), { target: { value: passage } });
  if (pinpointValue !== undefined) {
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: pinpointValue } });
  }
}

async function insert(): Promise<Inserted> {
  fireEvent.click(screen.getByRole("button", { name: "Insert quotation and footnote" }));
  await waitFor(() => expect(mockInsertCitationFootnote).toHaveBeenCalledTimes(1));
  expect(mockInsertQuotation).toHaveBeenCalledTimes(1);
  const [quotation] = mockInsertQuotation.mock.calls[0] as unknown as [
    { text: string; mode: "block" | "inline" },
  ];
  const [citationId, title, runs] = mockInsertCitationFootnote.mock.calls[0] as unknown as [
    string,
    string,
    Array<{ text: string }>,
  ];
  return { quotation, citationId, title, footnoteText: runsText(runs) };
}

beforeEach(() => {
  mockTriggerRefresh.mockClear();
  mockInsertQuotation.mockClear();
  mockInsertCitationFootnote.mockClear();
  mockBuildOccurrenceTitle.mockClear();
});

describe("passage sanity", () => {
  test("the passages have the word and line counts the rules turn on", () => {
    expect(wordCount(LONG_CLEANED)).toBe(40);
    expect(quotationLineCount(LONG_CLEANED)).toBe(4);
    expect(wordCount(SHORT_PASSAGE)).toBe(20);
    expect(quotationLineCount(SHORT_PASSAGE)).toBe(2);
    expect(wordCount(WORDS_30)).toBe(30);
    expect(quotationLineCount(WORDS_30)).toBe(2);
    expect(wordCount(WORDS_29)).toBe(29);
    expect(quotationLineCount(WORDS_29)).toBe(2);
  });
});

describe.each(SPECS)("Quote panel under $label", (spec) => {
  const para42: Pinpoint = { type: "paragraph", value: "[42]" };

  // ─── (1) Source picker ────────────────────────────────────────────────────

  test("the source picker lists every case in the library", async () => {
    await renderQuote(spec.storeOpts(LIBRARY));
    const values = screen.getAllByRole("radio").map((el) => (el as HTMLInputElement).value);
    expect(values).toEqual(expect.arrayContaining(LIBRARY.map((c) => c.id)));
    expect(values).toHaveLength(LIBRARY.length);
  });

  // STD-022 landed: the picker's safePreview renders in the active standard
  // (getFormattedPreview takes the document config), so court mode keeps
  // the parallel citation.
  testUntil(spec.previewFailsUntil)(
    `the source picker shows ${spec.home.id} rendered in the active standard`,
    async () => {
      await renderQuote(spec.storeOpts(LIBRARY));
      expect(pickerRowText(spec.home.id)).toContain(spec.homePreview);
    }
  );

  // ─── (2) A forty-word passage with a paragraph marker ─────────────────────

  test("a forty-word passage with [42] takes the form the standard's threshold gives and [42] becomes the pinpoint", async () => {
    await renderQuote(spec.storeOpts(LIBRARY), { citationId: spec.home.id });
    await paste(LONG_PASSAGE);

    expect(screen.getByLabelText("Type")).toHaveValue("paragraph");
    expect(screen.getByLabelText("Value")).toHaveValue("42");
    expect(screen.getByTestId("quote-preview-text")).not.toHaveTextContent("[42]");

    const mode = expectedMode(spec.standard, LONG_CLEANED);
    expect(mode).toBe("block"); // forty words over four lines: long under every standard
    const inserted = await insert();
    expect(inserted.quotation).toEqual({ text: LONG_CLEANED, mode });
    expect(inserted.citationId).toBe(spec.home.id);
    expect(mockBuildOccurrenceTitle).toHaveBeenCalledWith("auto", para42);
    expect(inserted.title).toBe("Citation:auto:[42]");
    expect(mockTriggerRefresh).toHaveBeenCalled();
  });

  // STD-014: the standard-aware pinpoint formatter drops the comma before a
  // paragraph pinpoint under OSCOLA; no spec is gated on it any more.
  testUntil(spec.paragraphFootnote.failsUntil)(
    `the footnote for the [42] quotation carries the pinpoint in the standard's form: "${spec.paragraphFootnote.contains}"`,
    async () => {
      await renderQuote(spec.storeOpts(LIBRARY), { citationId: spec.home.id });
      await paste(LONG_PASSAGE);
      const inserted = await insert();
      expect(inserted.footnoteText).toContain(spec.paragraphFootnote.contains);
      if (spec.paragraphFootnote.excludes) {
        expect(inserted.footnoteText).not.toContain(spec.paragraphFootnote.excludes);
      }
      // The preview shows the same footnote (with the closing stop the refresher adds).
      expect(screen.getByTestId("quote-preview-footnote")).toHaveTextContent(
        spec.paragraphFootnote.contains
      );
    }
  );

  // ─── (3) A twenty-word passage: inline in the standard's marks ────────────

  // STD-016 landed: the marks come from the document config
  // (NZLSG 3 §1.2.2(a)(i) double marks; AGLC4 r 1.5.1 / OSCOLA 5 §1.5 single).
  testUntil(spec.marksFailUntil)(
    `a twenty-word passage inserts inline in ${spec.marks[0]} ${spec.marks[1]}`,
    async () => {
      await renderQuote(spec.storeOpts(LIBRARY), { citationId: spec.home.id });
      await paste(SHORT_PASSAGE, "58");
      expect(expectedMode(spec.standard, SHORT_PASSAGE)).toBe("inline");
      expect(screen.getByText(/^Inline quotation/)).toBeInTheDocument();
      const inserted = await insert();
      expect(inserted.quotation).toEqual({
        text: `${spec.marks[0]}${SHORT_PASSAGE}${spec.marks[1]}`,
        mode: "inline",
      });
      expect(mockBuildOccurrenceTitle).toHaveBeenCalledWith("auto", {
        type: "paragraph",
        value: "[58]",
      });
    }
  );

  test("a twenty-nine word passage over two lines inserts inline under every standard", async () => {
    await renderQuote(spec.storeOpts(LIBRARY), { citationId: spec.home.id });
    await paste(WORDS_29, "58");
    expect(expectedMode(spec.standard, WORDS_29)).toBe("inline");
    const inserted = await insert();
    expect(inserted.quotation.mode).toBe("inline");
  });

  // STD-016 landed: the threshold comes from the document config
  // (NZLSG 3 §1.2.2(a)(ii): 30 words or more is a long quotation; under
  // AGLC4 r 1.5.1 and OSCOLA 5 §1.5 two lines stay inline).
  testUntil(spec.thresholdFailsUntil)(
    `a thirty-word passage over two lines inserts ${expectedMode(spec.standard, WORDS_30)} (the standard's threshold)`,
    async () => {
      await renderQuote(spec.storeOpts(LIBRARY), { citationId: spec.home.id });
      await paste(WORDS_30, "58");
      const mode = expectedMode(spec.standard, WORDS_30);
      const inserted = await insert();
      expect(inserted.quotation.mode).toBe(mode);
      expect(inserted.quotation.text).toBe(
        mode === "block" ? WORDS_30 : `${spec.marks[0]}${WORDS_30}${spec.marks[1]}`
      );
    }
  );

  // ─── (5) Accessibility ────────────────────────────────────────────────────

  test("has no axe violations populated and with a preview", async () => {
    const container = await renderQuote(spec.storeOpts(LIBRARY), { citationId: spec.home.id });
    expect(await axe(container)).toHaveNoViolations();
    await paste(LONG_PASSAGE);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── (4) Court mode: parallel citation and pinpoint style ──────────────────

describe("Quote panel under aglc4 court mode (HCA): parallel citations", () => {
  /** Mabo by report carrying the MNC as a stored parallel citation. */
  const maboWithParallel: Citation = {
    ...maboReported,
    data: {
      ...maboReported.data,
      parallelCitations: [
        { yearType: "square", year: 1992, reportSeries: "HCA", startingPage: 23 },
      ],
    },
  };
  const hca: CourtOptions = { preset: "HCA" };

  // STD-013: buildFootnoteRuns resolves the document config with its writing
  // mode, so the parallel citation and the court pinpoint style reach the
  // footnote exactly as the refresher renders them.
  test("a quotation footnote renders the parallel citation and the HCA pinpoint style exactly as the refresher will", async () => {
    const expected = renderFirst(maboWithParallel, "aglc4", {
      pinpoint: { type: "page", value: "58" },
      court: hca,
    }).text;
    expect(expected).toContain("; [1992] HCA 23");

    await renderQuote(courtHca([maboWithParallel, ukCorr]), { citationId: maboWithParallel.id });
    await paste(SHORT_PASSAGE);
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "page" } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "58" } });
    expect(screen.getByTestId("quote-preview-footnote")).toHaveTextContent(expected);

    const inserted = await insert();
    expect(inserted.footnoteText).toBe(expected);
    expect(inserted.footnoteText).toContain("; [1992] HCA 23");
  });

  // As above, for the paragraph pinpoint the passage supplies.
  test("a [42] quotation footnote matches the refresher's court rendering", async () => {
    const expected = renderFirst(maboWithParallel, "aglc4", {
      pinpoint: { type: "paragraph", value: "[42]" },
      court: hca,
    }).text;
    await renderQuote(courtHca([maboWithParallel]), { citationId: maboWithParallel.id });
    await paste(LONG_PASSAGE);
    const inserted = await insert();
    expect(inserted.footnoteText).toBe(expected);
  });

  test("academic AGLC4 omits the parallel citation (r 2.2.7), matching the refresher", async () => {
    const expected = renderFirst(maboWithParallel, "aglc4", {
      pinpoint: { type: "paragraph", value: "[42]" },
    }).text;
    expect(expected).not.toContain("HCA 23");
    await renderQuote(
      { standardId: "aglc4", citations: [maboWithParallel] },
      {
        citationId: maboWithParallel.id,
      }
    );
    await paste(LONG_PASSAGE);
    const inserted = await insert();
    expect(inserted.footnoteText).toBe(expected);
  });
});

// ─── Unconfirmed points (DECISION-040) ──────────────────────────────────────

test.todo(
  "DECISION-040: NZLSG 3 §1.2.2(a)(ii) — a long quotation that starts at a numbered paragraph keeps its [42] and the footnote omits the pinpoint; the panel strips the marker and pinpoints instead"
);
test.todo(
  "DECISION-040: NZLSG 3 §1.2.2(a)(ii) and §2.2.2 — the footnote marker for a long quotation goes after the introducing colon; the panel places the footnote after the quotation"
);
test.todo(
  "DECISION-040: OSCOLA 5 §1.5 and NZLSG 3 §1.2.2(a)(i) — the footnote marker for a short quotation follows the closing mark and punctuation; whether the inserter's cursor placement satisfies this needs the Word-side check"
);
