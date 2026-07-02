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
