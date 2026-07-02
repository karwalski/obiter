/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AGLC4 Rule 1.8.3 — Italicisation of Foreign Words (PDF p 52)
 *
 * Validates the Latin terms data module against the rule's own two lists:
 * the 29 terms generally NOT italicised (Macquarie-listed) and the 7 terms
 * generally italicised.
 */

import {
  LATIN_TERMS_ITALICISED,
  LATIN_TERMS_EXCEPTIONS,
  getLatinTermsSorted,
} from "../../src/engine/data/latin-terms";

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.8.3 — the rule's "generally italicised" list (7 terms)
// ─────────────────────────────────────────────────────────────────────────────

/** The rule's own "generally italicised" list, verbatim (PDF p 52). */
const RULE_ITALICISED = [
  "contra proferentem",
  "ex ante",
  "jus ad bellum",
  "lex fori",
  "ne bis in idem",
  "quantum meruit",
  "stare decisis",
];

/** The rule's own "generally not italicised" list, verbatim (PDF p 52). */
const RULE_NOT_ITALICISED = [
  "ab initio",
  "ad hoc",
  "ad idem",
  "amicus curiae",
  "bona fide",
  "caveat emptor",
  "de facto",
  "de jure",
  "et al",
  "ex gratia",
  "ex parte",
  "ex post facto",
  "habeas corpus",
  "inter alia",
  "laissez-faire",
  "non-refoulement",
  "non est factum",
  "obiter dictum",
  "per se",
  "prima facie",
  "quid pro quo",
  "raison d'être",
  "ratio decidendi",
  "res ipsa loquitur",
  "sui generis",
  "terra nullius",
  "ultra vires",
  "vice versa",
  "vis-a-vis",
];

describe("Rule 1.8.3 — Latin terms data", () => {
  test("italicised set contains all 7 terms of the rule's italicise list", () => {
    for (const term of RULE_ITALICISED) {
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(true);
    }
  });

  test("italicised set contains NONE of the rule's 29 not-italicised terms", () => {
    for (const term of RULE_NOT_ITALICISED) {
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(false);
    }
  });

  test("exceptions set contains all 29 terms of the rule's not-italicised list", () => {
    for (const term of RULE_NOT_ITALICISED) {
      expect(LATIN_TERMS_EXCEPTIONS.has(term)).toBe(true);
    }
  });

  test("exceptions set contains variants sharing a listed term's treatment", () => {
    // Plural/noun forms of listed terms take the listed form's treatment.
    for (const term of ["obiter dicta", "dictum", "dicta", "bona fides"]) {
      expect(LATIN_TERMS_EXCEPTIONS.has(term)).toBe(true);
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(false);
    }
  });

  test("exceptions set contains common English usage terms", () => {
    const expected = [
      "caveat",
      "eg",
      "et al",
      "etc",
      "ibid",
      "ie",
      "per",
      "per annum",
      "re",
      "sic",
      "status quo",
      "versus",
      "vice versa",
      "viz",
    ];

    for (const term of expected) {
      expect(LATIN_TERMS_EXCEPTIONS.has(term)).toBe(true);
    }
  });

  test("exceptions set never appears in the italicised set", () => {
    const notExpected = [...RULE_NOT_ITALICISED, "ad hoc", "etc", "ibid", "status quo"];
    for (const term of notExpected) {
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(false);
    }
  });

  test("no overlap between italicised and exceptions sets", () => {
    for (const term of LATIN_TERMS_ITALICISED) {
      expect(LATIN_TERMS_EXCEPTIONS.has(term)).toBe(false);
    }
    for (const term of LATIN_TERMS_EXCEPTIONS) {
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.8.3 — Sorted Output
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.8.3 — getLatinTermsSorted", () => {
  test("returns terms sorted longest-first", () => {
    const sorted = getLatinTermsSorted();

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].length).toBeGreaterThanOrEqual(sorted[i].length);
    }
  });

  test("returns all italicised terms", () => {
    const sorted = getLatinTermsSorted();
    expect(sorted.length).toBe(LATIN_TERMS_ITALICISED.size);

    for (const term of sorted) {
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(true);
    }
  });

  test("longer compound terms appear before shorter overlapping terms", () => {
    const sorted = getLatinTermsSorted();
    const lexLociDelictiIdx = sorted.indexOf("lex loci delicti");
    const lexLociIdx = sorted.indexOf("lex loci");

    expect(lexLociDelictiIdx).toBeLessThan(lexLociIdx);
  });
});
