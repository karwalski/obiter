/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AGLC4 Rule 1.8.3 — Latin and Foreign Word Italicisation
 *
 * Validates the Latin terms data module: the dictionary of terms to
 * italicise, the exceptions set, and the sorted output helper.
 */

import {
  LATIN_TERMS_ITALICISED,
  LATIN_TERMS_EXCEPTIONS,
  getLatinTermsSorted,
} from "../../src/engine/data/latin-terms";

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1.8.3 — Latin Terms Dictionary
// ─────────────────────────────────────────────────────────────────────────────

describe("Rule 1.8.3 — Latin terms data", () => {
  test("italicised set contains key Latin legal terms", () => {
    const expected = [
      "ab initio",
      "actus reus",
      "amicus curiae",
      "certiorari",
      "corpus delicti",
      "de facto",
      "de jure",
      "de novo",
      "dictum",
      "dicta",
      "ejusdem generis",
      "ex officio",
      "ex parte",
      "functus officio",
      "habeas corpus",
      "in camera",
      "in personam",
      "in re",
      "in rem",
      "inter alia",
      "intra vires",
      "lex fori",
      "lis pendens",
      "locus standi",
      "mandamus",
      "mens rea",
      "mutatis mutandis",
      "obiter dictum",
      "obiter dicta",
      "per curiam",
      "per incuriam",
      "per se",
      "prima facie",
      "pro bono",
      "qua",
      "quantum meruit",
      "ratio decidendi",
      "res ipsa loquitur",
      "res judicata",
      "stare decisis",
      "sub judice",
      "sui generis",
      "ultra vires",
      "volenti non fit injuria",
    ];

    for (const term of expected) {
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(true);
    }
  });

  test("italicised set does not contain common English terms", () => {
    const notExpected = [
      "ad hoc",
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

    for (const term of notExpected) {
      expect(LATIN_TERMS_ITALICISED.has(term)).toBe(false);
    }
  });

  test("exceptions set contains common English usage terms", () => {
    const expected = [
      "ad hoc",
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

  test("multi-word phrases appear before their single-word components", () => {
    const sorted = getLatinTermsSorted();
    const obiterDictumIdx = sorted.indexOf("obiter dictum");
    const dictumIdx = sorted.indexOf("dictum");

    expect(obiterDictumIdx).toBeLessThan(dictumIdx);
  });

  test("longer compound terms appear before shorter overlapping terms", () => {
    const sorted = getLatinTermsSorted();
    const lexLociDelictiIdx = sorted.indexOf("lex loci delicti");
    const lexLociIdx = sorted.indexOf("lex loci");

    expect(lexLociDelictiIdx).toBeLessThan(lexLociIdx);
  });
});
