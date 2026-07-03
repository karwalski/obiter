/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for VALID-008 (ellipsis format), VALID-009 (long quotation),
 * VALID-010 (Latin terms italicised), Rule 1.5.7 (quotation clauses),
 * Rule 1.1.4 (footnote closing punctuation) and Rule 2.2.7 (parallel
 * citations).
 */

import {
  checkEllipsisFormat,
  checkLongQuotation,
  checkLatinTermsItalicised,
  checkQuotationClauses,
  checkFootnoteFormat,
  checkParallelCitations,
  checkMncYearValidity,
  checkCourtOrderOfficers,
  checkIssuingBodyName,
  validateDocument,
} from "../../src/engine/validator";
import type { Citation } from "../../src/types/citation";

// ─────────────────────────────────────────────────────────────────────────────
// VALID-008 — Ellipsis Format Check (Rule 1.5.3)
// ─────────────────────────────────────────────────────────────────────────────

describe("VALID-008 — Ellipsis format (Rule 1.5.3)", () => {
  test("flags three consecutive dots '...' and suggests '…'", () => {
    const issues = checkEllipsisFormat("The court held ... that liability existed.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.3");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].suggestion).toBe("…");
  });

  test("flags four consecutive dots '....'", () => {
    const issues = checkEllipsisFormat("The court held .... that liability existed.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.3");
    expect(issues[0].severity).toBe("warning");
  });

  test("flags Bluebook spaced dots '. . .' and suggests '…'", () => {
    const issues = checkEllipsisFormat("The court held . . . that liability existed.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.3");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].suggestion).toBe("…");
  });

  test("does not flag the correct spaced ellipsis ' … ' (rule 1.5.3)", () => {
    // Guide's own example: 'emphasised … that foreseeability of harm …'
    const issues = checkEllipsisFormat(
      "emphasised … that foreseeability of harm to the fathers was not sufficient.",
      0
    );
    expect(issues).toHaveLength(0);
  });

  test("flags '…' with a letter run directly against it", () => {
    const issues = checkEllipsisFormat("The court held… that liability existed.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.3");
    expect(issues[0].message).toContain("preceded and followed by a space");
  });

  test("does not flag '…' followed directly by a footnote number (rules 1.5.3/1.1.2)", () => {
    // 'gives guidance …112' — no space before a footnote number.
    const issues = checkEllipsisFormat("gives guidance …112", 0);
    expect(issues).toHaveLength(0);
  });

  test("returns empty for empty text", () => {
    const issues = checkEllipsisFormat("", 0);
    expect(issues).toHaveLength(0);
  });

  test("footnote index appears in message", () => {
    const issues = checkEllipsisFormat("Some text... here.", 4);
    expect(issues[0].message).toContain("Footnote 5");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALID-009 — Long Quotation Not Block-Quoted (Rule 1.5.1)
// ─────────────────────────────────────────────────────────────────────────────

describe("VALID-009 — Long quotation (Rule 1.5.1)", () => {
  test("does not flag short quotation", () => {
    const issues = checkLongQuotation("‘This is a short quote.’", 0);
    expect(issues).toHaveLength(0);
  });

  test("flags quotation longer than ~4 lines (curly quotes)", () => {
    const longContent = "A".repeat(400);
    const text = `See ‘${longContent}’.`;
    const issues = checkLongQuotation(text, 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.1");
    expect(issues[0].severity).toBe("info");
    expect(issues[0].message).toContain("block quote formatting");
  });

  test("flags quotation longer than ~4 lines (straight quotes)", () => {
    const longContent = "B".repeat(400);
    const text = `See '${longContent}'.`;
    const issues = checkLongQuotation(text, 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.1");
    expect(issues[0].severity).toBe("info");
  });

  test("does not flag a ~3 line quotation (short = three lines or less, rule 1.5.1)", () => {
    const content = "C".repeat(270);
    const text = `See ‘${content}’.`;
    const issues = checkLongQuotation(text, 0);
    expect(issues).toHaveLength(0);
  });

  test("returns empty for empty text", () => {
    const issues = checkLongQuotation("", 0);
    expect(issues).toHaveLength(0);
  });

  test("footnote index appears in message", () => {
    const longContent = "D".repeat(400);
    const text = `‘${longContent}’`;
    const issues = checkLongQuotation(text, 2);
    expect(issues[0].message).toContain("Footnote 3");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALID-010 — Latin Terms Not Italicised (Rule 1.8.3)
// ─────────────────────────────────────────────────────────────────────────────

describe("VALID-010 — Latin terms italicised (Rule 1.8.3)", () => {
  test("flags 'stare decisis' (rule's italicise list)", () => {
    const issues = checkLatinTermsItalicised("The doctrine of stare decisis was applied.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.8.3");
    expect(issues[0].severity).toBe("info");
    expect(issues[0].message).toContain("stare decisis");
    expect(issues[0].message).toContain("italicised");
  });

  test("does NOT flag 'ratio decidendi' (rule's not-italicised list)", () => {
    const issues = checkLatinTermsItalicised("The ratio decidendi of the case was clear.", 0);
    expect(issues).toHaveLength(0);
  });

  test("does NOT flag 'prima facie' or 'ultra vires' (rule's not-italicised list)", () => {
    const issues = checkLatinTermsItalicised(
      "The prima facie case was that the decision was ultra vires.",
      0
    );
    expect(issues).toHaveLength(0);
  });

  test("does not flag common English exception 'etc'", () => {
    const issues = checkLatinTermsItalicised("There are many sources etc.", 0);
    const etcIssues = issues.filter((i) => i.message.includes("'etc'"));
    expect(etcIssues).toHaveLength(0);
  });

  test("matches case-insensitively", () => {
    const issues = checkLatinTermsItalicised("The court applied QUANTUM MERUIT reasoning.", 0);
    const qmIssues = issues.filter((i) => i.message.toLowerCase().includes("quantum meruit"));
    expect(qmIssues.length).toBeGreaterThanOrEqual(1);
  });

  test("limits to 5 matches per footnote", () => {
    // Construct text with many different terms from the italicise list
    const terms = [
      "stare decisis",
      "quantum meruit",
      "lex fori",
      "ex ante",
      "contra proferentem",
      "ne bis in idem",
      "jus ad bellum",
    ];
    const text = terms.join(", ") + ".";
    const issues = checkLatinTermsItalicised(text, 0);
    expect(issues.length).toBeLessThanOrEqual(5);
  });

  test("skips terms inside square brackets", () => {
    const issues = checkLatinTermsItalicised(
      "The judgment [stare decisis unclear] was handed down.",
      0
    );
    const sdIssues = issues.filter((i) => i.message.includes("stare decisis"));
    expect(sdIssues).toHaveLength(0);
  });

  test("returns empty for empty text", () => {
    const issues = checkLatinTermsItalicised("", 0);
    expect(issues).toHaveLength(0);
  });

  test("flags multiple distinct terms in same footnote", () => {
    const issues = checkLatinTermsItalicised(
      "The claim in quantum meruit turned on stare decisis.",
      0
    );
    expect(issues.length).toBeGreaterThanOrEqual(2);
    const messages = issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("quantum meruit"))).toBe(true);
    expect(messages.some((m) => m.includes("stare decisis"))).toBe(true);
  });

  test("performs whole-word matching only", () => {
    // "qua" is a Latin term but should not match inside "qualification"
    const issues = checkLatinTermsItalicised("The qualification requirements were strict.", 0);
    const quaIssues = issues.filter((i) => i.message.includes("'qua'"));
    expect(quaIssues).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.5.7 — Quotation parenthetical clauses
// ─────────────────────────────────────────────────────────────────────────────

describe("checkQuotationClauses (Rule 1.5.7)", () => {
  test("does not flag clauses from the rule's table per AGLC4 ex 128 (rule 1.5.7)", () => {
    const text =
      "Yanner v Eaton (1999) 201 CLR 351, 372 [37] (Gleeson CJ, Gaudron, Kirby and " +
      "Hayne JJ) (emphasis in original) (citations omitted).";
    expect(checkQuotationClauses(text, 0)).toHaveLength(0);
  });

  test("flags '(citation omitted)' and suggests '(citations omitted)' (rule 1.5.7)", () => {
    const issues = checkQuotationClauses("See Smith (n 3) 14 (citation omitted).", 0);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("1.5.7");
    expect(issues[0].suggestion).toBe("(citations omitted)");
  });

  test("flags '(emphases added)' and suggests '(emphasis added)' (rule 1.5.7)", () => {
    const issues = checkQuotationClauses("Smith (n 3) 14 (emphases added).", 0);
    expect(issues).toHaveLength(1);
    expect(issues[0].suggestion).toBe("(emphasis added)");
  });

  test("flags '(footnotes omitted)' as not an AGLC4 clause (rule 1.5.7)", () => {
    const issues = checkQuotationClauses("Smith (n 3) 14 (footnotes omitted).", 0);
    expect(issues).toHaveLength(1);
    expect(issues[0].suggestion).toBeUndefined();
  });

  test("flags adjacent clauses out of the table's order (rule 1.5.7)", () => {
    const issues = checkQuotationClauses("Smith (n 3) 14 (citations omitted) (emphasis added).", 0);
    expect(issues.some((i) => i.message.includes("order"))).toBe(true);
  });

  test("accepts adjacent clauses in the table's order per AGLC4 ex 130 (rule 1.5.7)", () => {
    const issues = checkQuotationClauses(
      "GE Dal Pont, Lawyers' Professional Responsibility (Lawbook, 6th ed, 2017) " +
        "141 [4.175] (emphasis added) (citations omitted).",
      0
    );
    expect(issues).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.1.4 — Footnote closing punctuation
// ─────────────────────────────────────────────────────────────────────────────

describe("checkFootnoteFormat closing punctuation (Rule 1.1.4)", () => {
  test("flags a footnote with no closing punctuation", () => {
    const issues = checkFootnoteFormat("R v Gomez [1993] AC 442", 0);
    expect(issues.some((i) => i.ruleNumber === "1.1.4")).toBe(true);
  });

  test("accepts a footnote ending with a full stop", () => {
    const issues = checkFootnoteFormat("R v Gomez [1993] AC 442.", 0);
    expect(issues.filter((i) => i.ruleNumber === "1.1.4")).toHaveLength(0);
  });

  test("accepts a discursive footnote ending with a question mark (guide's own example)", () => {
    const issues = checkFootnoteFormat("But what of the second proposition?", 0);
    expect(issues.filter((i) => i.ruleNumber === "1.1.4")).toHaveLength(0);
  });

  test("accepts a footnote ending with an exclamation mark", () => {
    const issues = checkFootnoteFormat("This is remarkable!", 0);
    expect(issues.filter((i) => i.ruleNumber === "1.1.4")).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 2.2.7 — Parallel citations prohibited for Australian cases
// ─────────────────────────────────────────────────────────────────────────────

describe("checkParallelCitations (Rule 2.2.7)", () => {
  const makeReported = (withParallels: boolean): Citation => ({
    id: "case-1",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: {
      party1: "Perre",
      party2: "Apand Pty Ltd",
      yearType: "round",
      year: 1999,
      volume: 198,
      reportSeries: "CLR",
      startingPage: 180,
      ...(withParallels
        ? {
            parallelCitations: [
              {
                yearType: "round",
                year: 1999,
                volume: 164,
                reportSeries: "ALR",
                startingPage: 606,
              },
            ],
          }
        : {}),
    },
    shortTitle: "Perre",
    tags: [],
    createdAt: "",
    modifiedAt: "",
  });

  test("flags a reported case carrying parallel citations per AGLC4 ex 80 (rule 2.2.7)", () => {
    // Not: Perre v Apand Pty Ltd (1999) 198 CLR 180; 164 ALR 606; [1999] HCA 36.
    const issues = checkParallelCitations([makeReported(true)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("2.2.7");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toContain("prohibits parallel citations");
  });

  test("does not flag a single-version citation per AGLC4 ex 80 (rule 2.2.7)", () => {
    // Perre v Apand Pty Ltd (1999) 198 CLR 180.
    const issues = checkParallelCitations([makeReported(false)]);
    expect(issues).toHaveLength(0);
  });

  test("ignores non-reported source types", () => {
    const citation: Citation = {
      id: "b1",
      aglcVersion: "4",
      sourceType: "book",
      data: { title: "Some Book" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    expect(checkParallelCitations([citation])).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 2.3.1 — Medium neutral citation adoption-year check
// ─────────────────────────────────────────────────────────────────────────────

describe("checkMncYearValidity (Rule 2.3.1)", () => {
  const makeMnc = (
    year: number,
    court: string,
    caseNumber: number,
    extra: Record<string, unknown> = {}
  ): Citation => ({
    id: "mnc-1",
    aglcVersion: "4",
    sourceType: "case.unreported.mnc",
    data: { party1: "A", party2: "B", year, court, caseNumber, ...extra },
    shortTitle: "A v B",
    tags: [],
    createdAt: "",
    modifiedAt: "",
  });

  test("flags '[1995] HCA 1' as predating the HCA's 1998 adoption (rule 2.3.1 note)", () => {
    const issues = checkMncYearValidity([makeMnc(1995, "HCA", 1)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("2.3.1");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].citationId).toBe("mnc-1");
    expect(issues[0].message).toBe(
      "Case 'A v B': '[1995] HCA 1' — the High Court of Australia did not " +
        "allocate medium neutral citations before 1998 (rule 2.3.1 table); " +
        "cite the decision as unreported per rule 2.3.2"
    );
  });

  test("accepts [2017] HCA 4 per AGLC4 ex 82 (rule 2.3.1)", () => {
    // Re Culleton [No 2] [2017] HCA 4.
    const issues = checkMncYearValidity([makeMnc(2017, "HCA", 4)]);
    expect(issues).toHaveLength(0);
  });

  test("accepts the adoption year itself ([1998] HCA 1)", () => {
    expect(checkMncYearValidity([makeMnc(1998, "HCA", 1)])).toHaveLength(0);
  });

  test("flags '[2009] SASCFC 1' as predating the Full Court's 2010 identifier", () => {
    const issues = checkMncYearValidity([makeMnc(2009, "SASCFC", 1)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("2.3.1");
    expect(issues[0].message).toBe(
      "Case 'A v B': '[2009] SASCFC 1' — the Supreme Court of South Australia " +
        "(Full Court) did not allocate medium neutral citations before 2010 " +
        "(rule 2.3.1 table); cite the decision as unreported per rule 2.3.2"
    );
  });

  test("accepts the courtIdentifier data alias", () => {
    const citation: Citation = {
      id: "mnc-2",
      aglcVersion: "4",
      sourceType: "case.unreported.mnc",
      data: { party1: "A", party2: "B", year: 1997, courtIdentifier: "TASSC", caseNumber: 5 },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const issues = checkMncYearValidity([citation]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("'[1997] TASSC 5'");
  });

  test("ignores identifiers without a tabled adoption year (Appendix B rows)", () => {
    // NSWDC is not in the rule 2.3.1 in-chapter table (no mncFrom).
    expect(checkMncYearValidity([makeMnc(1990, "NSWDC", 1)])).toHaveLength(0);
  });

  test("ignores unknown court identifiers", () => {
    expect(checkMncYearValidity([makeMnc(1990, "XYZ", 1)])).toHaveLength(0);
  });

  test("ignores non-MNC source types", () => {
    const citation: Citation = {
      id: "b2",
      aglcVersion: "4",
      sourceType: "case.reported",
      data: { party1: "A", party2: "B", year: 1995, reportSeries: "CLR" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    expect(checkMncYearValidity([citation])).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARITY-121 — Rule 2.3.4 court-order judicial officers
// ─────────────────────────────────────────────────────────────────────────────

describe("checkCourtOrderOfficers (Rule 2.3.4)", () => {
  const makeOrder = (data: Record<string, unknown>): Citation => ({
    id: "order-1",
    aglcVersion: "4",
    sourceType: "case.court_order",
    data,
    tags: [],
    createdAt: "",
    modifiedAt: "",
  });

  test("warns when a court order names no judicial officer (rule 2.3.4)", () => {
    const issues = checkCourtOrderOfficers(
      makeOrder({
        party1: "Seiko Epson Corporation",
        party2: "Calidad Pty Ltd",
        court: "Federal Court of Australia",
        proceedingNumber: "NSD1519/2004",
        date: "21 December 2016",
      })
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("2.3.4");
    expect(issues[0].severity).toBe("warning");
  });

  test("accepts officers stored as a string (AGLC4 ex 88: 'Burley J')", () => {
    const issues = checkCourtOrderOfficers(
      makeOrder({
        party1: "Seiko Epson Corporation",
        party2: "Calidad Pty Ltd",
        judicialOfficers: "Burley J",
        court: "Federal Court of Australia",
      })
    );
    expect(issues).toHaveLength(0);
  });

  test("accepts officers stored on the legacy judges key", () => {
    const issues = checkCourtOrderOfficers(makeOrder({ judges: "Murphy J" }));
    expect(issues).toHaveLength(0);
  });

  test("ignores other case source types", () => {
    const citation: Citation = {
      id: "c1",
      aglcVersion: "4",
      sourceType: "case.reported",
      data: { party1: "A", party2: "B" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    expect(checkCourtOrderOfficers(citation)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARITY-121 — Rule 3.9.3 issuing-body name hint
// ─────────────────────────────────────────────────────────────────────────────

describe("checkIssuingBodyName (Rule 3.9.3)", () => {
  const makeQuasi = (data: Record<string, unknown>): Citation => ({
    id: "quasi-1",
    aglcVersion: "4",
    sourceType: "legislation.quasi",
    data,
    tags: [],
    createdAt: "",
    modifiedAt: "",
  });

  test("hints on 'The Victorian Bar Inc' in the numbered form and suggests the trimmed name (ex 77)", () => {
    const issues = checkIssuingBodyName(
      makeQuasi({
        issuingBody: "The Victorian Bar Inc",
        title: "Compulsory Continuing Professional Development Rules",
        number: "R 12",
        date: "1 April 2011",
      })
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleNumber).toBe("3.9.3");
    expect(issues[0].severity).toBe("info");
    expect(issues[0].suggestion).toBe("Victorian Bar");
  });

  test("stays silent on the (at date) form — the formatter trims automatically (rule 3.9.3)", () => {
    const issues = checkIssuingBodyName(
      makeQuasi({
        issuingBody: "The Victorian Bar Inc",
        title: "Compulsory Continuing Professional Development Rules",
        atDate: "1 April 2011",
      })
    );
    expect(issues).toHaveLength(0);
  });

  test("stays silent on a government instrumentality without company designators (rule 3.9.2)", () => {
    const issues = checkIssuingBodyName(
      makeQuasi({
        issuingBody: "Australian Taxation Office",
        title: "Income Tax: Carrying on a Business as a Professional Artist",
        number: "TR 2005/1",
        date: "12 January 2005",
      })
    );
    expect(issues).toHaveLength(0);
  });

  test("ignores other source types", () => {
    const citation: Citation = {
      id: "s1",
      aglcVersion: "4",
      sourceType: "legislation.statute",
      data: { title: "The Something Act", issuingBody: "The Body Inc" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    expect(checkIssuingBodyName(citation)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARITY-121 — dash/date-span dedupe (rules 1.6.3 / 1.11.4)
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDocument dedupes overlapping dash and date-span issues (rules 1.6.3/1.11.4)", () => {
  test("a hyphenated year span raises only the rule 1.11.4 issue", () => {
    const result = validateDocument(["See the 1986-87 financial year."], []);
    const all = [...result.errors, ...result.warnings, ...result.info];
    const spanIssues = all.filter((i) => i.message.includes("1986-87"));
    expect(spanIssues.some((i) => i.ruleNumber === "1.11.4")).toBe(true);
    expect(
      all.some((i) => i.ruleNumber === "1.6.3" && i.message.includes("number or date spans"))
    ).toBe(false);
  });

  test("a plain page span still raises the rule 1.6.3 issue", () => {
    const result = validateDocument(["See pp 102-3."], []);
    const all = [...result.errors, ...result.warnings, ...result.info];
    expect(all.some((i) => i.ruleNumber === "1.6.3")).toBe(true);
    expect(all.some((i) => i.ruleNumber === "1.11.4")).toBe(false);
  });
});
