/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * VALID-011 / VALID-012 / VALID-013 Tests
 *
 * Validates heading format (Rule 1.12.2), citation capitalisation (Rule 1.7),
 * and title presence (Rule 1.8.2) checks.
 */

import {
  checkHeadingFormat,
  checkCitationCapitalisation,
  checkCitationCompleteness,
  checkTitlePresence,
  getCitationLabel,
  validateDocument,
} from "../../src/engine/validator";
import type { HeadingEntry } from "../../src/engine/validator";
import type { Citation } from "../../src/types/citation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCitation(
  overrides: Partial<Citation> & Pick<Citation, "sourceType" | "data">
): Citation {
  return {
    id: "test-001",
    aglcVersion: "4",
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── VALID-011: Heading format validation (Rule 1.12.2) ──────────────────────

describe("VALID-011: checkHeadingFormat (Rule 1.12.2)", () => {
  it("passes correct headings with no issues", () => {
    const headings: HeadingEntry[] = [
      { level: 1, text: "I INTRODUCTION" },
      { level: 1, text: "II BACKGROUND" },
      { level: 2, text: "A The First Issue" },
      { level: 2, text: "B The Second Issue" },
    ];

    const issues = checkHeadingFormat(headings);
    // All-caps Level I passes, capitalised Level II passes, correct numbering
    const caseIssues = issues.filter(
      (i) => i.message.includes("uppercase") || i.message.includes("capitalised")
    );
    expect(caseIssues).toHaveLength(0);
  });

  it("flags Level I heading that is not uppercase", () => {
    const headings: HeadingEntry[] = [{ level: 1, text: "I Introduction" }];

    const issues = checkHeadingFormat(headings);
    expect(issues.some((i) => i.message.includes("uppercase or small caps"))).toBe(true);
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
    expect(issues.every((i) => i.ruleNumber === "1.12.2")).toBe(true);
  });

  it("passes Level I heading that is all uppercase", () => {
    const headings: HeadingEntry[] = [{ level: 1, text: "III ANALYSIS AND DISCUSSION" }];

    const issues = checkHeadingFormat(headings);
    const caseIssues = issues.filter((i) => i.message.includes("uppercase"));
    expect(caseIssues).toHaveLength(0);
  });

  it("flags wrong numbering prefix for Level II (Arabic instead of letter)", () => {
    const headings: HeadingEntry[] = [{ level: 2, text: "1 The First Issue" }];

    const issues = checkHeadingFormat(headings);
    expect(issues.some((i) => i.message.includes("Uppercase letters"))).toBe(true);
  });

  it("flags wrong numbering prefix for Level I (Arabic instead of Roman)", () => {
    const headings: HeadingEntry[] = [{ level: 1, text: "1 INTRODUCTION" }];

    const issues = checkHeadingFormat(headings);
    expect(issues.some((i) => i.message.includes("Roman numerals"))).toBe(true);
  });

  it("accepts correct Roman numeral prefix for Level I", () => {
    const headings: HeadingEntry[] = [{ level: 1, text: "IV CONCLUSION" }];

    const issues = checkHeadingFormat(headings);
    const prefixIssues = issues.filter((i) => i.message.includes("numbering"));
    expect(prefixIssues).toHaveLength(0);
  });

  it("flags Level II heading that is not capitalised", () => {
    const headings: HeadingEntry[] = [{ level: 2, text: "A the first issue" }];

    const issues = checkHeadingFormat(headings);
    expect(issues.some((i) => i.message.includes("capitalised"))).toBe(true);
  });

  it("skips empty heading text", () => {
    const headings: HeadingEntry[] = [
      { level: 1, text: "" },
      { level: 1, text: "   " },
    ];

    const issues = checkHeadingFormat(headings);
    expect(issues).toHaveLength(0);
  });
});

// ─── VALID-012: Citation capitalisation check (Rule 1.7) ─────────────────────

describe("VALID-012: checkCitationCapitalisation (Rule 1.7)", () => {
  it("flags all-lowercase party name", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party1: "smith", party2: "Jones", year: 2020 },
      shortTitle: "Smith",
    });

    const issues = checkCitationCapitalisation(citation);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes("all-lowercase"))).toBe(true);
    expect(issues[0].ruleNumber).toBe("1.7");
    expect(issues[0].severity).toBe("warning");
  });

  it("flags ALL-CAPS party name", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party1: "SMITH", party2: "JONES", year: 2020 },
      shortTitle: "Smith",
    });

    const issues = checkCitationCapitalisation(citation);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.message.includes("ALL-CAPS"))).toBe(true);
  });

  it("passes correctly capitalised party names", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party1: "Smith", party2: "Jones", year: 2020 },
      shortTitle: "Smith",
    });

    const issues = checkCitationCapitalisation(citation);
    expect(issues).toHaveLength(0);
  });

  it("does not flag lowercase 'v' in case names", () => {
    // "v" would only be flagged if it were party1 or party2
    // The check skips the value "v" explicitly
    const citationWithV = makeCitation({
      sourceType: "case.reported",
      data: { party1: "v", party2: "Jones", year: 2020 },
    });

    const issues = checkCitationCapitalisation(citationWithV);
    // "v" should not be flagged
    expect(issues.filter((i) => i.message.includes("'v'"))).toHaveLength(0);
  });

  it("flags all-lowercase legislation title", () => {
    const citation = makeCitation({
      sourceType: "legislation.statute",
      data: { title: "crimes act", year: 1958, jurisdiction: "Vic" },
      shortTitle: "Crimes Act",
    });

    const issues = checkCitationCapitalisation(citation);
    expect(issues.some((i) => i.message.includes("all-lowercase"))).toBe(true);
  });

  it("flags ALL-CAPS legislation title", () => {
    const citation = makeCitation({
      sourceType: "legislation.statute",
      data: { title: "CRIMES ACT", year: 1958, jurisdiction: "Vic" },
      shortTitle: "Crimes Act",
    });

    const issues = checkCitationCapitalisation(citation);
    expect(issues.some((i) => i.message.includes("ALL-CAPS"))).toBe(true);
  });

  it("passes correctly capitalised legislation title", () => {
    const citation = makeCitation({
      sourceType: "legislation.statute",
      data: { title: "Crimes Act", year: 1958, jurisdiction: "Vic" },
      shortTitle: "Crimes Act",
    });

    const issues = checkCitationCapitalisation(citation);
    expect(issues).toHaveLength(0);
  });

  it("ignores non-case and non-legislation source types", () => {
    const citation = makeCitation({
      sourceType: "journal.article",
      data: { title: "some article title", author: "Smith", year: 2020, journal: "MULR" },
    });

    const issues = checkCitationCapitalisation(citation);
    expect(issues).toHaveLength(0);
  });
});

// ─── VALID-013: Title presence check (Rule 1.8.2) ────────────────────────────

describe("VALID-013: checkTitlePresence (Rule 1.8.2)", () => {
  it("flags case with empty party1", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party1: "", party2: "Jones", year: 2020 },
      shortTitle: "Unknown Case",
    });

    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("1.8.2");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toContain("party name (party1) is missing");
  });

  it("flags case with missing party1", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party2: "Jones", year: 2020 },
      shortTitle: "Unknown Case",
    });

    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
  });

  it("passes case with party1 present", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party1: "Smith", party2: "Jones", year: 2020 },
      shortTitle: "Smith",
    });

    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(0);
  });

  it("flags book with empty title (error severity)", () => {
    const citation = makeCitation({
      sourceType: "book",
      data: { title: "", author: "Smith", publisher: "OUP", year: 2020 },
      shortTitle: "Untitled Book",
    });

    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("1.8.2");
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("title is missing");
  });

  it("flags legislation with missing title (error severity)", () => {
    const citation = makeCitation({
      sourceType: "legislation.statute",
      data: { year: 1958, jurisdiction: "Vic" },
      shortTitle: "Unknown Act",
    });

    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("Legislation");
  });

  it("passes journal article with title (not an italicised type)", () => {
    const citation = makeCitation({
      sourceType: "journal.article",
      data: { title: "Some Article", author: "Smith", year: 2020, journal: "MULR" },
    });

    // journal.article is a quoted type, not italicised — shouldItaliciseTitle returns false
    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(0);
  });

  it("passes treaty with title present", () => {
    const citation = makeCitation({
      sourceType: "treaty",
      data: { title: "Vienna Convention on the Law of Treaties", treatySeries: "UNTS" },
    });

    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(0);
  });

  it("flags treaty with missing title (error severity)", () => {
    const citation = makeCitation({
      sourceType: "treaty",
      data: { title: "", treatySeries: "UNTS" },
      shortTitle: "Unknown Treaty",
    });

    const issues = checkTitlePresence(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
  });

  it("passes case whose name is stored as caseName rather than party1 (Rule 2.1.1)", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { caseName: "Mabo v Queensland (No 2)", year: 1992, reportSeries: "CLR" },
    });

    expect(checkTitlePresence(citation)).toHaveLength(0);
  });
});

// ─── VALID-005 / WEB-006: Citation completeness — structured shapes ──────────

describe("VALID-005 / WEB-006: checkCitationCompleteness understands structured author shapes", () => {
  it("reports NO missing-author finding for a journal article with a structured authors array (Rule 5)", () => {
    // WEB-006 repro: given 'Justine', surname 'Bell' stored in the
    // structured authors array — the footnote renders 'Justine Bell, ...'
    // so the validator must not report a missing author.
    const citation = makeCitation({
      id: "b7122b3b-06b3-457d-a4d0-48bc61e0f2ff",
      sourceType: "journal.article",
      data: {
        authors: [{ givenNames: "Justine", surname: "Bell" }],
        title: "Climate Change Adaptation and Coastal Property",
        year: 2014,
        volume: 31,
        journal: "Environmental and Planning Law Journal",
        startingPage: 152,
      },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("reports NO missing-author finding for a book with a structured authors array (Rule 6.1)", () => {
    const citation = makeCitation({
      sourceType: "book",
      data: {
        authors: [{ givenNames: "Jane", surname: "Doe" }],
        title: "The Mabo Legacy",
        publisher: "Federation Press",
        year: 2020,
      },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("reports NO missing-author finding for a multi-author book (Rule 4.1.2)", () => {
    const citation = makeCitation({
      sourceType: "book",
      data: {
        authors: [
          { givenNames: "James", surname: "Edelman" },
          { givenNames: "Elise", surname: "Bant" },
        ],
        title: "Unjust Enrichment",
        publisher: "Hart Publishing",
        year: 2016,
      },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("accepts an editors-only book — editors replace the author (Rule 6.6.3)", () => {
    const citation = makeCitation({
      sourceType: "book",
      data: {
        editors: [{ givenNames: "Janet", surname: "McLean" }],
        title: "Property and the Constitution",
        publisher: "Hart Publishing",
        year: 1999,
      },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("accepts a book chapter stored with chapterAuthors/chapterTitle (Rule 6.6.1)", () => {
    const citation = makeCitation({
      sourceType: "book.chapter",
      data: {
        chapterAuthors: [{ givenNames: "Jane", surname: "Doe" }],
        chapterTitle: "Native Title after Mabo",
        editors: [{ givenNames: "John", surname: "Smith" }],
        bookTitle: "Australian Property Law",
        publisher: "Federation Press",
        year: 2020,
        startingPage: 101,
      },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("still accepts the legacy flat author string (backward compatibility)", () => {
    const citation = makeCitation({
      sourceType: "journal.article",
      data: { author: "Harold Luntz", title: "Torts", year: 2005, journal: "Sydney Law Review" },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("flags a journal article whose author element is genuinely absent", () => {
    const citation = makeCitation({
      id: "b7122b3b-06b3-457d-a4d0-48bc61e0f2ff",
      sourceType: "journal.article",
      data: {
        title: "Climate Change Adaptation and Coastal Property",
        year: 2014,
        journal: "Environmental and Planning Law Journal",
      },
    });

    const issues = checkCitationCompleteness(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe(
      "Journal article citation 'Climate Change Adaptation and Coastal Property' is missing required field 'author'"
    );
    // Human-readable label in the message; the raw UUID travels in citationId.
    expect(issues[0].message).not.toContain("b7122b3b-06b3-457d-a4d0-48bc61e0f2ff");
    expect(issues[0].citationId).toBe("b7122b3b-06b3-457d-a4d0-48bc61e0f2ff");
    expect(issues[0].severity).toBe("error");
    expect(issues[0].ruleNumber).toBe("5");
  });

  it("treats an empty authors array (or all-blank entries) as missing", () => {
    const emptyArray = makeCitation({
      sourceType: "journal.article",
      data: { authors: [], title: "T", year: 2020, journal: "MULR" },
    });
    const blankEntries = makeCitation({
      sourceType: "journal.article",
      data: { authors: [{ givenNames: "", surname: "" }], title: "T", year: 2020, journal: "MULR" },
    });

    expect(checkCitationCompleteness(emptyArray).some((i) => i.message.includes("'author'"))).toBe(
      true
    );
    expect(
      checkCitationCompleteness(blankEntries).some((i) => i.message.includes("'author'"))
    ).toBe(true);
  });

  it("accepts a case whose name is stored as caseName rather than party1 (Rule 2.1.1)", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { caseName: "Mabo v Queensland (No 2)", year: 1992, reportSeries: "CLR" },
    });

    const issues = checkCitationCompleteness(citation);
    expect(issues.some((i) => i.message.includes("case name"))).toBe(false);
  });

  it("does not require a report series for unreported cases (Rules 2.3.1-2.3.2)", () => {
    const citation = makeCitation({
      sourceType: "case.unreported.mnc",
      data: { party1: "Quarmby", party2: "Keating", year: 2009, court: "TASSC", caseNumber: 80 },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("still flags a reported case with no report series (Rule 2.2)", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party1: "Mabo", party2: "Queensland (No 2)", year: 1992 },
    });

    const issues = checkCitationCompleteness(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe(
      "Case citation 'Mabo v Queensland (No 2)' is missing required field 'reportSeries'"
    );
  });

  it("does not demand year/jurisdiction of the Commonwealth Constitution (Rule 3.6)", () => {
    const citation = makeCitation({
      sourceType: "legislation.constitution",
      data: { title: "Australian Constitution" },
    });

    expect(checkCitationCompleteness(citation)).toEqual([]);
  });

  it("produces no missing-author error through validateDocument for the WEB-006 repro", () => {
    const journal = makeCitation({
      id: "b7122b3b-06b3-457d-a4d0-48bc61e0f2ff",
      sourceType: "journal.article",
      data: {
        authors: [{ givenNames: "Justine", surname: "Bell" }],
        title: "Climate Change Adaptation and Coastal Property",
        year: 2014,
        journal: "Environmental and Planning Law Journal",
      },
    });
    const book = makeCitation({
      id: "book-1",
      sourceType: "book",
      data: {
        authors: [{ givenNames: "Jane", surname: "Doe" }],
        title: "The Mabo Legacy",
        publisher: "Federation Press",
        year: 2020,
      },
    });

    const result = validateDocument([], [journal, book]);
    const all = [...result.errors, ...result.warnings, ...result.info];
    expect(all.filter((i) => i.message.includes("missing required field 'author'"))).toEqual([]);
  });
});

// ─── WEB-006: Human-readable finding labels ───────────────────────────────────

describe("WEB-006: getCitationLabel", () => {
  it("prefers the user's short title", () => {
    const citation = makeCitation({
      sourceType: "book",
      data: { title: "The Mabo Legacy" },
      shortTitle: "Mabo Legacy",
    });
    expect(getCitationLabel(citation)).toBe("Mabo Legacy");
  });

  it("builds 'Party1 v Party2' for cases", () => {
    const citation = makeCitation({
      sourceType: "case.reported",
      data: { party1: "Mabo", party2: "Queensland (No 2)", year: 1992, reportSeries: "CLR" },
    });
    expect(getCitationLabel(citation)).toBe("Mabo v Queensland (No 2)");
  });

  it("falls back to the title and strips rule 4.2 asterisk markers", () => {
    const citation = makeCitation({
      sourceType: "book",
      data: { title: "A *Mabo* Memoir: Islan Kustom to Native Title" },
    });
    expect(getCitationLabel(citation)).toBe("A Mabo Memoir: Islan Kustom to Native Title");
  });

  it("uses chapterTitle for book chapters and the raw id only as a last resort", () => {
    const chapter = makeCitation({
      sourceType: "book.chapter",
      data: { chapterTitle: "Native Title after Mabo" },
    });
    expect(getCitationLabel(chapter)).toBe("Native Title after Mabo");

    const bare = makeCitation({ id: "raw-uuid", sourceType: "book", data: {} });
    expect(getCitationLabel(bare)).toBe("raw-uuid");
  });
});
