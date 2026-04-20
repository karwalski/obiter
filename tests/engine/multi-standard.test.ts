/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Multi-Standard Engine Wiring Tests (MULTI-003 through MULTI-008)
 *
 * Validates that CitationConfig toggles correctly parameterise the
 * formatting engine across AGLC4, OSCOLA 5, and NZLSG 3 profiles.
 */

import { formatParallelCitations } from "../../src/engine/rules/v4/domestic/cases";
import {
  formatShortReference,
  resolveIbid,
  resolveSubsequentReference,
} from "../../src/engine/resolver";
import {
  shouldItaliciseTitle,
  wrapTitle,
} from "../../src/engine/rules/v4/general/italicisation";
import { formatPinpoint } from "../../src/engine/rules/v4/general/pinpoints";
import type { CitationConfig } from "../../src/engine/standards/types";
import type { Citation, ParallelCitation, Pinpoint } from "../../src/types/citation";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";

// ─── Test Fixtures ─────────────��─────────────────────────────────────────────

const AGLC4_CONFIG = STANDARD_PROFILES.aglc4.config;
const OSCOLA5_CONFIG = STANDARD_PROFILES.oscola5.config;
const NZLSG3_CONFIG = STANDARD_PROFILES.nzlsg3.config;

const mockBookCitation: Citation = {
  id: "test-book-1",
  aglcVersion: "4",
  sourceType: "book",
  data: {
    authors: [{ givenNames: "John", surname: "Smith" }],
    title: "Contract Law",
  },
  shortTitle: "Contract Law",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const mockCaseCitation: Citation = {
  id: "test-case-1",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: { name: "Smith v Jones" },
  shortTitle: "Smith v Jones",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const mockLegislationCitation: Citation = {
  id: "test-leg-1",
  aglcVersion: "4",
  sourceType: "legislation.statute",
  data: { title: "Competition and Consumer Act 2010" },
  shortTitle: "CCA",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const pagePinpoint: Pinpoint = { type: "page", value: "42" };

// ─── MULTI-003: Parallel Citation Composition ────────────────────────────────

describe("MULTI-003: Parallel citation composition", () => {
  const parallels: ParallelCitation[] = [
    { yearType: "square", year: 1974, reportSeries: "VR", startingPage: 1 },
    { yearType: "round", year: 1974, volume: 4, reportSeries: "ALR", startingPage: 57 },
  ];

  it("AGLC4: uses semicolon separator by default", () => {
    const result = formatParallelCitations(parallels);
    expect(result).toEqual([{ text: "[1974] VR 1; (1974) 4 ALR 57" }]);
  });

  it("AGLC4: explicit semicolon separator matches default", () => {
    const result = formatParallelCitations(parallels, "; ");
    expect(result).toEqual([{ text: "[1974] VR 1; (1974) 4 ALR 57" }]);
  });

  it("OSCOLA/NZLSG: uses comma separator", () => {
    const result = formatParallelCitations(parallels, ", ");
    expect(result).toEqual([{ text: "[1974] VR 1, (1974) 4 ALR 57" }]);
  });

  it("returns empty array for no parallels", () => {
    const result = formatParallelCitations([], ", ");
    expect(result).toEqual([]);
  });
});

// ─── MULTI-004: Subsequent Reference Format ──────────────────────────────────

describe("MULTI-004: Subsequent reference format parameterisation", () => {
  describe("AGLC4 format (n X)", () => {
    it("secondary source: Author (n X)", () => {
      const result = formatShortReference(mockBookCitation, 3, undefined, false, AGLC4_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith (n 3)");
    });

    it("secondary source with pinpoint: Author (n X) pinpoint", () => {
      const result = formatShortReference(mockBookCitation, 3, pagePinpoint, false, AGLC4_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith (n 3) 42");
    });

    it("case: Short Title (n X)", () => {
      const result = formatShortReference(mockCaseCitation, 5, undefined, false, AGLC4_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith v Jones (n 5)");
    });
  });

  describe("NZLSG format (above n X)", () => {
    it("secondary source: Author, above n X", () => {
      const result = formatShortReference(mockBookCitation, 3, undefined, false, NZLSG3_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith, above n 3");
    });

    it("secondary source with pinpoint: Author, above n X, at pinpoint", () => {
      const result = formatShortReference(mockBookCitation, 3, pagePinpoint, false, NZLSG3_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith, above n 3, at 42");
    });

    it("case: Short Title, above n X", () => {
      const result = formatShortReference(mockCaseCitation, 5, undefined, false, NZLSG3_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith v Jones, above n 5");
    });

    it("case with pinpoint: Short Title, above n X, at pinpoint", () => {
      const result = formatShortReference(mockCaseCitation, 5, pagePinpoint, false, NZLSG3_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith v Jones, above n 5, at 42");
    });

    it("disambiguation includes title", () => {
      const result = formatShortReference(mockBookCitation, 3, undefined, true, NZLSG3_CONFIG);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith, 'Contract Law', above n 3");
    });
  });

  describe("no config (backward compatibility)", () => {
    it("defaults to AGLC4 (n X) format", () => {
      const result = formatShortReference(mockBookCitation, 3, undefined, false);
      const text = result.map((r) => r.text).join("");
      expect(text).toBe("Smith (n 3)");
    });
  });
});

// ─── MULTI-005: Ibid Mode Configuration ──────────────────────────────────────

describe("MULTI-005: Ibid mode configuration", () => {
  it("AGLC4: ibid resolves normally when enabled", () => {
    const result = resolveSubsequentReference(mockBookCitation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      currentPinpoint: pagePinpoint,
      precedingPinpoint: undefined,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
      config: AGLC4_CONFIG,
    });
    const text = result!.map((r) => r.text).join("");
    expect(text).toBe("Ibid 42");
  });

  it("OSCOLA5: ibid disabled, uses short reference instead", () => {
    const result = resolveSubsequentReference(mockBookCitation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      currentPinpoint: pagePinpoint,
      precedingPinpoint: undefined,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
      config: OSCOLA5_CONFIG,
    });
    const text = result!.map((r) => r.text).join("");
    expect(text).toBe("Smith (n 1) 42");
  });

  it("NZLSG3: ibid disabled, uses above n format", () => {
    const result = resolveSubsequentReference(mockBookCitation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      currentPinpoint: pagePinpoint,
      precedingPinpoint: undefined,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
      config: NZLSG3_CONFIG,
    });
    const text = result!.map((r) => r.text).join("");
    expect(text).toBe("Smith, above n 1, at 42");
  });

  it("OSCOLA5: explicit ibid preference falls back to short reference", () => {
    const result = resolveSubsequentReference(mockBookCitation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 2,
      isWithinSameFootnote: false,
      formatPreference: "ibid",
      config: OSCOLA5_CONFIG,
    });
    const text = result!.map((r) => r.text).join("");
    expect(text).toBe("Smith (n 2)");
  });

  it("no config (backward compatibility): ibid works normally", () => {
    const result = resolveSubsequentReference(mockBookCitation, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    });
    const text = result!.map((r) => r.text).join("");
    expect(text).toBe("Ibid");
  });
});

// ─── MULTI-006: Legislation Italicisation Toggle ─────────────────────────────

describe("MULTI-006: Legislation italicisation toggle", () => {
  it("AGLC4: legislation titles are italicised", () => {
    expect(shouldItaliciseTitle("legislation.statute", AGLC4_CONFIG)).toBe(true);
    expect(shouldItaliciseTitle("legislation.bill", AGLC4_CONFIG)).toBe(true);
    expect(shouldItaliciseTitle("legislation.delegated", AGLC4_CONFIG)).toBe(true);
  });

  it("OSCOLA5: legislation titles are NOT italicised", () => {
    expect(shouldItaliciseTitle("legislation.statute", OSCOLA5_CONFIG)).toBe(false);
    expect(shouldItaliciseTitle("legislation.bill", OSCOLA5_CONFIG)).toBe(false);
    expect(shouldItaliciseTitle("legislation.delegated", OSCOLA5_CONFIG)).toBe(false);
  });

  it("NZLSG3: legislation titles are NOT italicised", () => {
    expect(shouldItaliciseTitle("legislation.statute", NZLSG3_CONFIG)).toBe(false);
  });

  it("OSCOLA5/NZLSG3: case titles still italicised", () => {
    expect(shouldItaliciseTitle("case.reported", OSCOLA5_CONFIG)).toBe(true);
    expect(shouldItaliciseTitle("case.reported", NZLSG3_CONFIG)).toBe(true);
  });

  it("OSCOLA5/NZLSG3: book titles still italicised", () => {
    expect(shouldItaliciseTitle("book", OSCOLA5_CONFIG)).toBe(true);
    expect(shouldItaliciseTitle("book", NZLSG3_CONFIG)).toBe(true);
  });

  it("no config (backward compatibility): legislation titles italicised", () => {
    expect(shouldItaliciseTitle("legislation.statute")).toBe(true);
  });
});

// ─── MULTI-007: Quotation Mark Style ─────────────────────────────────────────

describe("MULTI-007: Quotation mark style", () => {
  it("AGLC4/OSCOLA: single curly quotes for article titles", () => {
    const result = wrapTitle("Test Article", "journal.article", "single");
    expect(result).toEqual([
      { text: "\u2018" },
      { text: "Test Article" },
      { text: "\u2019" },
    ]);
  });

  it("NZLSG: double curly quotes for article titles", () => {
    const result = wrapTitle("Test Article", "journal.article", "double");
    expect(result).toEqual([
      { text: "\u201C" },
      { text: "Test Article" },
      { text: "\u201D" },
    ]);
  });

  it("default (no style param): uses single quotes", () => {
    const result = wrapTitle("Test Article", "journal.article");
    expect(result).toEqual([
      { text: "\u2018" },
      { text: "Test Article" },
      { text: "\u2019" },
    ]);
  });

  it("book chapter titles also use configured quotes", () => {
    const result = wrapTitle("Chapter One", "book.chapter", "double");
    expect(result).toEqual([
      { text: "\u201C" },
      { text: "Chapter One" },
      { text: "\u201D" },
    ]);
  });

  it("italic types are unaffected by quotation mark style", () => {
    const result = wrapTitle("Book Title", "book", "double");
    expect(result).toEqual([{ text: "Book Title", italic: true }]);
  });
});

// ─── MULTI-008: Pinpoint Prefix ──────────────────────────────────────────────

describe("MULTI-008: Pinpoint prefix parameterisation", () => {
  it("AGLC4: no prefix for page pinpoints", () => {
    const result = formatPinpoint({ type: "page", value: "42" });
    expect(result).toEqual([{ text: "42" }]);
  });

  it("AGLC4: no prefix for paragraph pinpoints", () => {
    const result = formatPinpoint({ type: "paragraph", value: "[23]" });
    expect(result).toEqual([{ text: "[23]" }]);
  });

  it("NZLSG: 'at ' prefix for page pinpoints", () => {
    const result = formatPinpoint({ type: "page", value: "42" }, "at ");
    expect(result).toEqual([{ text: "at 42" }]);
  });

  it("NZLSG: 'at ' prefix for paragraph pinpoints", () => {
    const result = formatPinpoint({ type: "paragraph", value: "[23]" }, "at ");
    expect(result).toEqual([{ text: "at [23]" }]);
  });

  it("NZLSG: 'at ' prefix with typed pinpoints (section)", () => {
    const result = formatPinpoint({ type: "section", value: "5" }, "at ");
    expect(result).toEqual([{ text: "at s 5" }]);
  });

  it("sub-pinpoints do not repeat the prefix", () => {
    const pinpoint: Pinpoint = {
      type: "page",
      value: "42",
      subPinpoint: { type: "paragraph", value: "[5]" },
    };
    const result = formatPinpoint(pinpoint, "at ");
    expect(result).toEqual([
      { text: "at 42" },
      { text: " " },
      { text: "[5]" },
    ]);
  });

  it("default (no prefix param): backward compatible", () => {
    const result = formatPinpoint({ type: "section", value: "5" });
    expect(result).toEqual([{ text: "s 5" }]);
  });
});
