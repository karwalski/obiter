/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for VALID-008 (ellipsis format), VALID-009 (long quotation),
 * and VALID-010 (Latin terms italicised).
 */

import {
  checkEllipsisFormat,
  checkLongQuotation,
  checkLatinTermsItalicised,
} from "../../src/engine/validator";

// ─────────────────────────────────────────────────────────────────────────────
// VALID-008 — Ellipsis Format Check (Rule 1.5.3)
// ─────────────────────────────────────────────────────────────────────────────

describe("VALID-008 — Ellipsis format (Rule 1.5.3)", () => {
  test("flags three consecutive dots '...'", () => {
    const issues = checkEllipsisFormat("The court held... that liability existed.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.3");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].suggestion).toBe(". . .");
  });

  test("flags four consecutive dots '....'", () => {
    const issues = checkEllipsisFormat("The court held.... that liability existed.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.3");
    expect(issues[0].severity).toBe("warning");
  });

  test("flags Unicode ellipsis character U+2026", () => {
    const issues = checkEllipsisFormat("The court held\u2026 that liability existed.", 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.3");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].suggestion).toBe(". . .");
  });

  test("does not flag correctly formatted '. . .'", () => {
    const issues = checkEllipsisFormat("The court held . . . that liability existed.", 0);
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
    const issues = checkLongQuotation("\u2018This is a short quote.\u2019", 0);
    expect(issues).toHaveLength(0);
  });

  test("flags quotation >250 characters (curly quotes)", () => {
    const longContent = "A".repeat(300);
    const text = `See \u2018${longContent}\u2019.`;
    const issues = checkLongQuotation(text, 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.1");
    expect(issues[0].severity).toBe("info");
    expect(issues[0].message).toContain("block quote formatting");
  });

  test("flags quotation >250 characters (straight quotes)", () => {
    const longContent = "B".repeat(300);
    const text = `See '${longContent}'.`;
    const issues = checkLongQuotation(text, 0);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.5.1");
    expect(issues[0].severity).toBe("info");
  });

  test("does not flag quotation exactly 250 characters", () => {
    const content = "C".repeat(250);
    const text = `See \u2018${content}\u2019.`;
    const issues = checkLongQuotation(text, 0);
    expect(issues).toHaveLength(0);
  });

  test("returns empty for empty text", () => {
    const issues = checkLongQuotation("", 0);
    expect(issues).toHaveLength(0);
  });

  test("footnote index appears in message", () => {
    const longContent = "D".repeat(300);
    const text = `\u2018${longContent}\u2019`;
    const issues = checkLongQuotation(text, 2);
    expect(issues[0].message).toContain("Footnote 3");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALID-010 — Latin Terms Not Italicised (Rule 1.8.3)
// ─────────────────────────────────────────────────────────────────────────────

describe("VALID-010 — Latin terms italicised (Rule 1.8.3)", () => {
  test("flags 'ratio decidendi'", () => {
    const issues = checkLatinTermsItalicised(
      "The ratio decidendi of the case was clear.",
      0,
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].ruleNumber).toBe("1.8.3");
    expect(issues[0].severity).toBe("info");
    expect(issues[0].message).toContain("ratio decidendi");
    expect(issues[0].message).toContain("italicised");
  });

  test("does not flag common English exception 'etc'", () => {
    const issues = checkLatinTermsItalicised(
      "There are many sources etc.",
      0,
    );
    // "etc" is in LATIN_TERMS_EXCEPTIONS, not LATIN_TERMS_ITALICISED
    const etcIssues = issues.filter((i) => i.message.includes("'etc'"));
    expect(etcIssues).toHaveLength(0);
  });

  test("matches case-insensitively", () => {
    const issues = checkLatinTermsItalicised(
      "The court applied PRIMA FACIE reasoning.",
      0,
    );
    const pfIssues = issues.filter((i) =>
      i.message.toLowerCase().includes("prima facie"),
    );
    expect(pfIssues.length).toBeGreaterThanOrEqual(1);
  });

  test("limits to 5 matches per footnote", () => {
    // Construct text with many different Latin terms
    const terms = [
      "ratio decidendi", "obiter dictum", "prima facie", "stare decisis",
      "habeas corpus", "mens rea", "actus reus", "ultra vires",
    ];
    const text = terms.join(", ") + ".";
    const issues = checkLatinTermsItalicised(text, 0);
    expect(issues.length).toBeLessThanOrEqual(5);
  });

  test("skips terms inside square brackets", () => {
    const issues = checkLatinTermsItalicised(
      "The judgment [ratio decidendi unclear] was handed down.",
      0,
    );
    const ratioIssues = issues.filter((i) =>
      i.message.includes("ratio decidendi"),
    );
    expect(ratioIssues).toHaveLength(0);
  });

  test("returns empty for empty text", () => {
    const issues = checkLatinTermsItalicised("", 0);
    expect(issues).toHaveLength(0);
  });

  test("flags multiple distinct terms in same footnote", () => {
    const issues = checkLatinTermsItalicised(
      "The ratio decidendi and obiter dictum were both relevant.",
      0,
    );
    expect(issues.length).toBeGreaterThanOrEqual(2);
    const messages = issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("ratio decidendi"))).toBe(true);
    expect(messages.some((m) => m.includes("obiter dictum"))).toBe(true);
  });

  test("performs whole-word matching only", () => {
    // "qua" is a Latin term but should not match inside "qualification"
    const issues = checkLatinTermsItalicised(
      "The qualification requirements were strict.",
      0,
    );
    const quaIssues = issues.filter((i) => i.message.includes("'qua'"));
    expect(quaIssues).toHaveLength(0);
  });
});
