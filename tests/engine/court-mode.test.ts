/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * MULTI-014: Court Submission Mode Tests
 *
 * Validates court-mode behaviour for the resolver, bibliography/LoA
 * generation, and validator.
 */

import {
  formatShortReference,
  resolveSubsequentReference,
} from "../../src/engine/resolver";
import {
  generateBibliographyForStandard,
  generateListOfAuthorities,
} from "../../src/engine/rules/v4/general/bibliography";
import {
  validateDocument,
} from "../../src/engine/validator";
import type { CitationConfig, PinpointStyle } from "../../src/engine/standards/types";
import type { Citation, Pinpoint } from "../../src/types/citation";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const AGLC4_ACADEMIC: CitationConfig = {
  ...STANDARD_PROFILES.aglc4.config,
  writingMode: "academic",
};

const AGLC4_COURT: CitationConfig = {
  ...STANDARD_PROFILES.aglc4.config,
  writingMode: "court",
};

const mockCase: Citation = {
  id: "court-case-1",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Pape",
    party2: "Commissioner of Taxation",
    yearType: "round",
    year: 2009,
    volume: 238,
    reportSeries: "CLR",
    startingPage: 1,
    mnc: "[2009] HCA 23",
  },
  shortTitle: "Pape",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const mockBook: Citation = {
  id: "court-book-1",
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

const mockLegislation: Citation = {
  id: "court-leg-1",
  aglcVersion: "4",
  sourceType: "legislation.statute",
  data: {
    title: "Competition and Consumer Act",
    year: 2010,
    jurisdiction: "Cth",
  },
  shortTitle: "CCA",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const pagePinpoint: Pinpoint = { type: "page", value: "42" };

// ─── Resolver Tests ──────────────────────────────────────────────────────────

describe("MULTI-014: Court Mode — Resolver", () => {
  test("court mode: subsequent case reference uses short name without (n X)", () => {
    const runs = formatShortReference(mockCase, 1, undefined, false, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toBe("Pape");
    expect(text).not.toContain("(n ");
  });

  test("court mode: subsequent case reference with pinpoint", () => {
    const runs = formatShortReference(mockCase, 1, pagePinpoint, false, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toBe("Pape 42");
    expect(text).not.toContain("(n ");
  });

  test("court mode: case short reference is italic", () => {
    const runs = formatShortReference(mockCase, 1, undefined, false, AGLC4_COURT);
    expect(runs[0].italic).toBe(true);
  });

  test("court mode: secondary source uses author surname without (n X)", () => {
    const runs = formatShortReference(mockBook, 1, undefined, false, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toBe("Smith");
    expect(text).not.toContain("(n ");
  });

  test("court mode: legislation uses short title without (n X)", () => {
    const runs = formatShortReference(mockLegislation, 1, undefined, false, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toBe("CCA");
    expect(text).not.toContain("(n ");
  });

  test("academic mode: subsequent reference includes (n X)", () => {
    const runs = formatShortReference(mockCase, 3, undefined, false, AGLC4_ACADEMIC);
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("(n 3)");
  });

  test("court mode: ibid is never generated", () => {
    const result = resolveSubsequentReference(mockCase, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
      config: AGLC4_COURT,
    });
    // Should NOT be ibid even though conditions are met
    const text = result?.map((r) => r.text).join("") ?? "";
    expect(text).not.toContain("Ibid");
    // Should be short name reference
    expect(text).toContain("Pape");
  });

  test("academic mode: ibid is generated when eligible", () => {
    const result = resolveSubsequentReference(mockCase, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
      config: AGLC4_ACADEMIC,
    });
    const text = result?.map((r) => r.text).join("") ?? "";
    expect(text).toBe("Ibid");
  });

  test("court mode: explicit ibid preference falls back to short reference", () => {
    const result = resolveSubsequentReference(mockCase, {
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "ibid",
      config: AGLC4_COURT,
    });
    const text = result?.map((r) => r.text).join("") ?? "";
    expect(text).not.toContain("Ibid");
    expect(text).toContain("Pape");
  });
});

// ─── List of Authorities Tests ───────────────────────────────────────────────

describe("MULTI-014: Court Mode — List of Authorities", () => {
  const citations = [mockCase, mockBook, mockLegislation];

  test("court mode generates List of Authorities instead of bibliography", () => {
    const sections = generateBibliographyForStandard(citations, "aglc", "court");
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain("Cases");
    expect(headings).toContain("Legislation");
    // No secondary sources section
    expect(headings).not.toContain("A Articles/Books/Reports");
    expect(headings).not.toContain("E Other");
  });

  test("academic mode generates standard AGLC bibliography", () => {
    const sections = generateBibliographyForStandard(citations, "aglc", "academic");
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain("A Articles/Books/Reports");
    expect(headings).toContain("B Cases");
    expect(headings).toContain("C Legislation");
  });

  test("List of Authorities excludes secondary sources", () => {
    const sections = generateListOfAuthorities(citations);
    expect(sections).toHaveLength(2); // Cases + Legislation only
    expect(sections[0].heading).toBe("Cases");
    expect(sections[1].heading).toBe("Legislation");
  });

  test("List of Authorities cases are sorted alphabetically by first party", () => {
    const case2: Citation = {
      ...mockCase,
      id: "court-case-2",
      data: { ...mockCase.data, party1: "ASIC", title: "ASIC v Hellicar" },
      shortTitle: "ASIC",
    };
    const sections = generateListOfAuthorities([mockCase, case2]);
    // ASIC should come before Pape
    expect(sections[0].entries).toHaveLength(2);
    const firstEntryText = sections[0].entries[0].map((r) => r.text).join("");
    expect(firstEntryText).toContain("ASIC");
  });

  test("List of Authorities with no cases omits cases section", () => {
    const sections = generateListOfAuthorities([mockLegislation]);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Legislation");
  });

  test("List of Authorities with no legislation omits legislation section", () => {
    const sections = generateListOfAuthorities([mockCase]);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Cases");
  });
});

// ─── Validator Tests ─────────────────────────────────────────────────────────

describe("MULTI-014: Court Mode — Validator", () => {
  test("court mode: no ibid correctness warnings", () => {
    const footnotes = [
      "Pape v Commissioner of Taxation (2009) 238 CLR 1.",
      "Ibid 42.", // Would normally be flagged if preceding had multiple sources
    ];
    // In court mode, ibid check is skipped entirely
    const result = validateDocument(footnotes, [], undefined, "court");
    const ibidIssues = result.errors.filter((e) => e.ruleNumber === "1.4.3");
    expect(ibidIssues).toHaveLength(0);
  });

  test("court mode: no parallel citation warnings", () => {
    const result = validateDocument([], [mockCase], undefined, "court");
    const parallelIssues = [
      ...result.warnings.filter((w) => w.ruleNumber === "2.2.7"),
      ...result.info.filter((i) => i.ruleNumber === "2.2.7"),
    ];
    expect(parallelIssues).toHaveLength(0);
  });

  test("academic mode: parallel citation warnings still emitted", () => {
    const result = validateDocument([], [mockCase], undefined, "academic");
    const parallelIssues = [
      ...result.warnings.filter((w) => w.ruleNumber === "2.2.7"),
      ...result.info.filter((i) => i.ruleNumber === "2.2.7"),
    ];
    expect(parallelIssues.length).toBeGreaterThan(0);
  });

  test("court mode: footnote format checks still run", () => {
    const footnotes = ["Missing closing punctuation"];
    const result = validateDocument(footnotes, [], undefined, "court");
    const formatIssues = result.errors.filter((e) => e.ruleNumber === "1.1.4");
    expect(formatIssues).toHaveLength(1);
  });
});

// ─── Config Tests ────────────────────────────────────────────────────────────

describe("MULTI-014: Court Mode — Config", () => {
  test("all standard profiles default to academic writing mode", () => {
    for (const [id, profile] of Object.entries(STANDARD_PROFILES)) {
      expect(profile.config.writingMode).toBe("academic");
    }
  });

  test("court config overrides ibid even when standard enables it", () => {
    // AGLC4 has ibidEnabled: true, but court mode should override
    expect(AGLC4_COURT.ibidEnabled).toBe(true); // profile still says true
    // The resolver reads writingMode to override — tested above
  });

  test("all standard profiles default to page-only pinpoint style", () => {
    for (const [id, profile] of Object.entries(STANDARD_PROFILES)) {
      expect(profile.config.pinpointStyle).toBe("page-only");
    }
  });
});

// ─── COURT-005: Pinpoint Style Parameterisation Tests ─────────────────────────

describe("COURT-005: Pinpoint Style — formatStartingPageAndPinpoint", () => {
  // Import the function under test directly
  const { formatStartingPageAndPinpoint } = require("../../src/engine/rules/v4/domestic/cases");

  const paraPinpoint: Pinpoint = { type: "paragraph", value: "[45]" };
  const paraRangePinpoint: Pinpoint = { type: "paragraph", value: "[45]–[46]" };
  const pagePinpointVal: Pinpoint = { type: "page", value: "425" };

  // ── page-only (academic default) ──────────────────────────────────────────

  test("page-only: starting page with no pinpoint", () => {
    const runs = formatStartingPageAndPinpoint(420);
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420");
  });

  test("page-only: starting page with page pinpoint renders '420, 425'", () => {
    const runs = formatStartingPageAndPinpoint(420, pagePinpointVal, "page-only");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420, 425");
  });

  test("page-only: starting page with paragraph pinpoint renders '420 [45]'", () => {
    const runs = formatStartingPageAndPinpoint(420, paraPinpoint, "page-only");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420 [45]");
  });

  // ── para-only (NSW, Qld court mode) ──────────────────────────────────────

  test("para-only: paragraph pinpoint renders '[45]' without starting page", () => {
    const runs = formatStartingPageAndPinpoint(420, paraPinpoint, "para-only");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("[45]");
  });

  test("para-only: paragraph range pinpoint renders '[45]–[46]' without starting page", () => {
    const runs = formatStartingPageAndPinpoint(420, paraRangePinpoint, "para-only");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("[45]–[46]");
  });

  test("para-only: no pinpoint falls back to starting page", () => {
    const runs = formatStartingPageAndPinpoint(420, undefined, "para-only");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420");
  });

  test("para-only: page pinpoint (edge case) renders page value without starting page", () => {
    const runs = formatStartingPageAndPinpoint(420, pagePinpointVal, "para-only");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("425");
  });

  // ── para-and-page (Vic, FCA, HCA, WA, SA, Tas, ACT, NT) ─────────────────

  test("para-and-page: paragraph pinpoint renders '420, [45]'", () => {
    const runs = formatStartingPageAndPinpoint(420, paraPinpoint, "para-and-page");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420, [45]");
  });

  test("para-and-page: paragraph range renders '420, [45]–[46]'", () => {
    const runs = formatStartingPageAndPinpoint(420, paraRangePinpoint, "para-and-page");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420, [45]–[46]");
  });

  test("para-and-page: no pinpoint renders starting page only", () => {
    const runs = formatStartingPageAndPinpoint(420, undefined, "para-and-page");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420");
  });

  test("para-and-page: page pinpoint renders normally '420, 425'", () => {
    const runs = formatStartingPageAndPinpoint(420, pagePinpointVal, "para-and-page");
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toBe("420, 425");
  });
});

describe("COURT-005: Pinpoint Style — formatReportedCase integration", () => {
  const { formatReportedCase } = require("../../src/engine/rules/v4/domestic/cases");
  const { formatCaseName } = require("../../src/engine/rules/v4/domestic/case-names");

  const baseCaseData = {
    caseName: formatCaseName("Pape", "Commissioner of Taxation", "v"),
    yearType: "round" as const,
    year: 2009,
    volume: 238,
    reportSeries: "CLR",
    startingPage: 1,
  };

  const paraPinpoint: Pinpoint = { type: "paragraph", value: "[45]" };

  test("page-only: full citation with paragraph pinpoint includes starting page", () => {
    const runs = formatReportedCase({
      ...baseCaseData,
      pinpoint: paraPinpoint,
      pinpointStyle: "page-only",
    });
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toContain("1 [45]");
  });

  test("para-only: full citation emits paragraph only, no starting page before pinpoint", () => {
    const runs = formatReportedCase({
      ...baseCaseData,
      pinpoint: paraPinpoint,
      pinpointStyle: "para-only",
    });
    const text = runs.map((r: { text: string }) => r.text).join("");
    // Should contain "[45]" but not "1 [45]" or "1, [45]"
    expect(text).toContain("CLR [45]");
  });

  test("para-and-page: full citation emits starting page then paragraph", () => {
    const runs = formatReportedCase({
      ...baseCaseData,
      pinpoint: paraPinpoint,
      pinpointStyle: "para-and-page",
    });
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toContain("CLR 1, [45]");
  });
});

describe("COURT-005: Pinpoint Style — engine dispatch integration", () => {
  const { formatCitation } = require("../../src/engine/engine");

  const paraPinpoint: Pinpoint = { type: "paragraph", value: "[45]" };

  const makeCourtConfig = (pinpointStyle: PinpointStyle): CitationConfig => ({
    ...STANDARD_PROFILES.aglc4.config,
    writingMode: "court",
    pinpointStyle,
  });

  const reportedCase: Citation = {
    id: "court-005-case",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: {
      party1: "Pape",
      party2: "Commissioner of Taxation",
      yearType: "round",
      year: 2009,
      volume: 238,
      reportSeries: "CLR",
      startingPage: 1,
      pinpoint: paraPinpoint,
    },
    shortTitle: "Pape",
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
  };

  test("engine dispatches para-only correctly", () => {
    const runs = formatCitation(reportedCase, undefined, makeCourtConfig("para-only"));
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toContain("CLR [45]");
    expect(text).not.toContain("CLR 1 [45]");
    expect(text).not.toContain("CLR 1, [45]");
  });

  test("engine dispatches para-and-page correctly", () => {
    const runs = formatCitation(reportedCase, undefined, makeCourtConfig("para-and-page"));
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toContain("CLR 1, [45]");
  });

  test("engine dispatches page-only correctly (academic default)", () => {
    const runs = formatCitation(reportedCase, undefined, makeCourtConfig("page-only"));
    const text = runs.map((r: { text: string }) => r.text).join("");
    expect(text).toContain("CLR 1 [45]");
  });
});
