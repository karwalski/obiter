/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-010 engine gap: a FIRST (full) reference must honour the per-occurrence
 * pinpoint in `context.currentPinpoint` exactly as subsequent references do.
 *
 * AGLC4 Rule 1.1.6: a pinpoint reference may follow the citation —
 * 'Mabo v Queensland [No 2] (1992) 175 CLR 1, 42' (page) or '… 175 CLR 1 [42]'
 * (paragraph). Rule 2.2.5: pinpoint form for reported cases. Rule 1.7.1: a
 * quotation's footnote carries the pinpoint of the quoted passage. Rule 6.4:
 * a book pinpoint follows the publication details.
 */
import { formatCitation } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import type { Citation, Pinpoint, SourceType } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

const plain = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

function makeCitation(sourceType: SourceType, data: Citation["data"]): Citation {
  return {
    id: `cit-${sourceType}`,
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
  };
}

/** A first-occurrence context (footnote 1) carrying an occurrence pinpoint. */
function firstContext(currentPinpoint?: Pinpoint): CitationContext {
  return {
    footnoteNumber: 1,
    isFirstCitation: true,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 0,
    currentPinpoint,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
}

const PAGE_42: Pinpoint = { type: "page", value: "42" };
const PARA_42: Pinpoint = { type: "paragraph", value: "[42]" };
const SECTION_5: Pinpoint = { type: "section", value: "5" };

const reportedCase = makeCitation("case.reported", {
  party1: "Mabo",
  party2: "Queensland [No 2]",
  yearType: "round",
  year: 1992,
  volume: 175,
  reportSeries: "CLR",
  startingPage: 1,
});

const mncCase = makeCitation("case.unreported.mnc", {
  party1: "R",
  party2: "Al-Harazi",
  year: "2016",
  court: "ACTSC",
  caseNumber: "250",
});

const book = makeCitation("book", {
  authors: [{ givenNames: "John", surname: "Smith" }],
  title: "Contract Law",
  publisher: "Oxford",
  year: 2020,
});

const journalArticle = makeCitation("journal.article", {
  authors: [{ givenNames: "Jane", surname: "Doe" }],
  title: "Tort Reform",
  year: 2021,
  volume: 45,
  journal: "MULR",
  startingPage: 100,
});

describe("Rules 1.1.6 / 2.2.5 — first occurrence honours context.currentPinpoint", () => {
  describe("reported case (Rule 2.2.5)", () => {
    test("page pinpoint: ', 42' after the starting page", () => {
      expect(plain(formatCitation(reportedCase, firstContext(PAGE_42)))).toBe(
        "Mabo v Queensland [No 2] (1992) 175 CLR 1, 42"
      );
    });

    test("paragraph pinpoint: ' [42]' after the starting page", () => {
      expect(plain(formatCitation(reportedCase, firstContext(PARA_42)))).toBe(
        "Mabo v Queensland [No 2] (1992) 175 CLR 1 [42]"
      );
    });

    test("section pinpoint renders exactly as the stored-pinpoint path does", () => {
      // Rule 2.2.5 prescribes page and paragraph pinpoints for cases; the
      // reported-case formatter's existing rendering of other types is kept
      // unchanged here (parity with data.pinpoint), not redefined.
      expect(formatCitation(reportedCase, firstContext(SECTION_5))).toEqual(
        formatCitation({ ...reportedCase, data: { ...reportedCase.data, pinpoint: SECTION_5 } })
      );
    });
  });

  describe("unreported case with MNC (Rule 2.3.1)", () => {
    test("paragraph pinpoint", () => {
      expect(plain(formatCitation(mncCase, firstContext(PARA_42)))).toBe(
        "R v Al-Harazi [2016] ACTSC 250, [42]"
      );
    });

    test("page pinpoint", () => {
      expect(plain(formatCitation(mncCase, firstContext(PAGE_42)))).toBe(
        "R v Al-Harazi [2016] ACTSC 250, 42"
      );
    });
  });

  describe("book (Rule 6.4)", () => {
    test("page pinpoint follows the publication details", () => {
      expect(plain(formatCitation(book, firstContext(PAGE_42)))).toBe(
        "John Smith, Contract Law (Oxford, 2020) 42"
      );
    });

    test("paragraph pinpoint", () => {
      expect(plain(formatCitation(book, firstContext(PARA_42)))).toBe(
        "John Smith, Contract Law (Oxford, 2020) [42]"
      );
    });

    test("section pinpoint", () => {
      expect(plain(formatCitation(book, firstContext(SECTION_5)))).toBe(
        "John Smith, Contract Law (Oxford, 2020) s 5"
      );
    });
  });

  describe("journal article (Rule 5.4)", () => {
    test("page pinpoint follows the starting page after a comma", () => {
      expect(plain(formatCitation(journalArticle, firstContext(PAGE_42)))).toBe(
        "Jane Doe, ‘Tort Reform’ (2021) 45 MULR 100, 42"
      );
    });

    test("paragraph pinpoint", () => {
      expect(plain(formatCitation(journalArticle, firstContext(PARA_42)))).toBe(
        "Jane Doe, ‘Tort Reform’ (2021) 45 MULR 100, [42]"
      );
    });
  });

  describe("parity with the stored-pinpoint path", () => {
    test.each<[string, Citation, Pinpoint]>([
      ["reported case / page", reportedCase, PAGE_42],
      ["reported case / paragraph", reportedCase, PARA_42],
      ["MNC case / paragraph", mncCase, PARA_42],
      ["book / page", book, PAGE_42],
      ["journal article / page", journalArticle, PAGE_42],
    ])("%s: currentPinpoint renders identically to data.pinpoint", (_label, citation, pin) => {
      const viaContext = formatCitation(citation, firstContext(pin));
      const viaData = formatCitation({ ...citation, data: { ...citation.data, pinpoint: pin } });
      expect(viaContext).toEqual(viaData);
    });
  });

  describe("precedence and no-op cases", () => {
    test("currentPinpoint takes precedence over data.pinpoint when both exist", () => {
      const stored = { ...reportedCase, data: { ...reportedCase.data, pinpoint: PAGE_42 } };
      expect(plain(formatCitation(stored, firstContext(PARA_42)))).toBe(
        "Mabo v Queensland [No 2] (1992) 175 CLR 1 [42]"
      );
      expect(plain(formatCitation(stored, firstContext({ type: "page", value: "57" })))).toBe(
        "Mabo v Queensland [No 2] (1992) 175 CLR 1, 57"
      );
    });

    test("no currentPinpoint: data.pinpoint still renders (unchanged behaviour)", () => {
      const stored = { ...reportedCase, data: { ...reportedCase.data, pinpoint: PAGE_42 } };
      expect(plain(formatCitation(stored, firstContext()))).toBe(
        "Mabo v Queensland [No 2] (1992) 175 CLR 1, 42"
      );
      expect(plain(formatCitation(stored))).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1, 42");
    });

    test("no pinpoint anywhere: output is unchanged", () => {
      expect(plain(formatCitation(reportedCase, firstContext()))).toBe(
        "Mabo v Queensland [No 2] (1992) 175 CLR 1"
      );
      expect(plain(formatCitation(reportedCase))).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1");
    });

    test("a blank currentPinpoint value is ignored (never renders 'undefined')", () => {
      const blank = { type: "page", value: "  " } as Pinpoint;
      const text = plain(formatCitation(reportedCase, firstContext(blank)));
      expect(text).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1");
      expect(text).not.toContain("undefined");
    });

    test("the caller's citation object is not mutated", () => {
      const original = JSON.stringify(reportedCase);
      formatCitation(reportedCase, firstContext(PARA_42));
      expect(JSON.stringify(reportedCase)).toBe(original);
    });

    test("explicit 'full' preference on a subsequent occurrence also carries the pinpoint", () => {
      const ctx: CitationContext = {
        ...firstContext(PARA_42),
        footnoteNumber: 7,
        isFirstCitation: false,
        formatPreference: "full",
        firstFootnoteNumber: 1,
      };
      expect(plain(formatCitation(reportedCase, ctx))).toBe(
        "Mabo v Queensland [No 2] (1992) 175 CLR 1 [42]"
      );
    });
  });
});
