/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * A11Y-028 — document accessibility check (ATAG Part B.3).
 */

import { checkDocumentAccessibility } from "../../src/engine/documentAccessibility";

describe("checkDocumentAccessibility", () => {
  it("reports nothing for a well-structured, language-tagged document", () => {
    const issues = checkDocumentAccessibility({
      headingLevels: [1, 2, 2, 3, 1],
      documentLanguageSet: true,
      fauxFootnoteCount: 0,
    });
    expect(issues).toHaveLength(0);
  });

  it("flags a missing document language (WCAG 3.1.1)", () => {
    const issues = checkDocumentAccessibility({ headingLevels: [1], documentLanguageSet: false });
    expect(issues.some((i) => i.ruleNumber === "WCAG 3.1.1")).toBe(true);
  });

  it("flags a skipped heading level (WCAG 1.3.1)", () => {
    const issues = checkDocumentAccessibility({
      headingLevels: [1, 3],
      documentLanguageSet: true,
    });
    const skip = issues.find((i) => i.ruleNumber === "WCAG 1.3.1");
    expect(skip).toBeDefined();
    expect(skip?.message).toContain("1 to 3");
  });

  it("flags an outline that does not start at level 1 (WCAG 2.4.10)", () => {
    const issues = checkDocumentAccessibility({
      headingLevels: [2, 3],
      documentLanguageSet: true,
    });
    expect(issues.some((i) => i.ruleNumber === "WCAG 2.4.10")).toBe(true);
  });

  it("flags faux (non-native) footnotes (WCAG 1.3.1)", () => {
    const issues = checkDocumentAccessibility({
      headingLevels: [1],
      documentLanguageSet: true,
      fauxFootnoteCount: 3,
    });
    const faux = issues.find((i) => i.message.includes("superscript"));
    expect(faux).toBeDefined();
    expect(faux?.severity).toBe("warning");
  });
});
