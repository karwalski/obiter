/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Court Mode — Integration and Gap-Filling Tests
 *
 * Comprehensive tests that bridge existing unit test coverage with
 * cross-module integration scenarios. Covers:
 *   1. Engine dispatch integration (formatCitation, getFormattedPreview)
 *   2. Practice Directions data completeness
 *   3. Preset helper sets and constants
 *   4. Validator orchestration (validateDocument court-mode routing)
 *   5. Bibliography/LoA routing
 *   6. Edge cases (case sensitivity, zero business days, config matching)
 */

import { formatCitation, getFormattedPreview } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import {
  generateBibliographyForStandard,
  generateListOfAuthorities,
} from "../../src/engine/rules/v4/general/bibliography";
import {
  validateDocument,
  checkSubsequentTreatment,
} from "../../src/engine/validator";
import {
  PRACTICE_DIRECTION_LINKS,
  getPracticeDirectionsForJurisdiction,
  getAllPracticeDirections,
} from "../../src/engine/court/practiceDirections";
import {
  COURT_PRESETS,
  UNREPORTED_GATE_JURISDICTIONS,
  QLD_JURISDICTIONS,
  NSW_JURISDICTIONS,
  VIC_JURISDICTIONS,
  SUBSEQUENT_TREATMENT_OPTIONS,
  NEGATIVE_TREATMENTS,
  type CourtJurisdiction,
} from "../../src/engine/court/presets";
import {
  subtractBusinessDays,
} from "../../src/engine/court/deadlines";
import {
  getPreferredReportOrder,
} from "../../src/engine/court/reportHierarchy";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";
import type { CitationConfig, PinpointStyle } from "../../src/engine/standards/types";
import type { Citation, Pinpoint } from "../../src/types/citation";

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const AGLC4_COURT: CitationConfig = {
  ...STANDARD_PROFILES.aglc4.config,
  writingMode: "court",
};

const AGLC4_ACADEMIC: CitationConfig = {
  ...STANDARD_PROFILES.aglc4.config,
  writingMode: "academic",
};

const makeCourtConfig = (pinpointStyle: PinpointStyle): CitationConfig => ({
  ...STANDARD_PROFILES.aglc4.config,
  writingMode: "court",
  pinpointStyle,
});

const reportedCase: Citation = {
  id: "int-case-1",
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

const reportedCaseNoMnc: Citation = {
  ...reportedCase,
  id: "int-case-no-mnc",
  data: {
    party1: "Mabo",
    party2: "Queensland",
    yearType: "round",
    year: 1992,
    volume: 175,
    reportSeries: "CLR",
    startingPage: 1,
  },
  shortTitle: "Mabo",
};

const reportedCaseWithParallels: Citation = {
  ...reportedCase,
  id: "int-case-parallels",
  data: {
    ...reportedCase.data,
    parallelCitations: [
      { yearType: "square" as const, year: 2009, reportSeries: "HCA", startingPage: 23 },
    ],
  },
};

const unreportedCase: Citation = {
  id: "int-unrpt-1",
  aglcVersion: "4",
  sourceType: "case.unreported.mnc",
  data: {
    party1: "Smith",
    party2: "Jones",
    mnc: "[2024] NSWSC 100",
  },
  shortTitle: "Smith",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const mockBook: Citation = {
  id: "int-book-1",
  aglcVersion: "4",
  sourceType: "book",
  data: {
    authors: [{ givenNames: "John", surname: "Smith" }],
    title: "Contract Law",
    publisher: "Oxford",
    year: 2020,
  },
  shortTitle: "Contract Law",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const mockJournal: Citation = {
  id: "int-journal-1",
  aglcVersion: "4",
  sourceType: "journal.article",
  data: {
    authors: [{ givenNames: "Jane", surname: "Doe" }],
    title: "Tort Reform",
    year: 2021,
    volume: 45,
    journal: "MULR",
    startingPage: 100,
  },
  shortTitle: "Tort Reform",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const mockLegislation: Citation = {
  id: "int-leg-1",
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

const paraPinpoint: Pinpoint = { type: "paragraph", value: "[45]" };

// ─── 1. Engine Integration ───────────────────────────────────────────────────

describe("Engine Integration — formatCitation with court mode", () => {
  test("formatCitation with writingMode=court produces a full citation", () => {
    const runs = formatCitation(reportedCase, undefined, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("Pape");
    expect(text).toContain("CLR");
    // Closing punctuation now managed by refresher, not formatCitation
  });

  test("formatCitation with writingMode=court resolves subsequent reference without ibid", () => {
    const context: CitationContext = {
      footnoteNumber: 2,
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    };
    const runs = formatCitation(reportedCase, context, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).not.toContain("Ibid");
    expect(text).toContain("Pape");
  });

  test("formatCitation with writingMode=academic allows ibid for same-as-preceding", () => {
    const context: CitationContext = {
      footnoteNumber: 2,
      isFirstCitation: false,
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    };
    const runs = formatCitation(reportedCase, context, AGLC4_ACADEMIC);
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("Ibid");
  });

  test("dispatchReportedCase auto-includes MNC when court mode + no explicit parallels", () => {
    const runs = formatCitation(reportedCase, undefined, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    // Should contain the MNC appended with "; "
    expect(text).toContain("; [2009] HCA 23");
  });

  test("dispatchReportedCase does NOT auto-include MNC in academic mode", () => {
    const runs = formatCitation(reportedCase, undefined, AGLC4_ACADEMIC);
    const text = runs.map((r) => r.text).join("");
    expect(text).not.toContain("; [2009] HCA 23");
  });

  test("dispatchReportedCase uses explicit parallels when present (no duplicate MNC append)", () => {
    const runs = formatCitation(reportedCaseWithParallels, undefined, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    // Parallel citation is rendered via formatParallelCitations, not the MNC auto-append path
    expect(text).toContain("[2009] HCA 23");
    // Should not have double MNC (the MNC auto-append only fires when no parallels)
    const mncCount = (text.match(/\[2009\] HCA 23/g) || []).length;
    expect(mncCount).toBe(1);
  });

  test("dispatchReportedCase does NOT auto-include MNC when case has no MNC", () => {
    const runs = formatCitation(reportedCaseNoMnc, undefined, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).not.toContain(";");
  });

  test("formatCitation respects pinpointStyle=para-only from court config", () => {
    const caseWithPinpoint: Citation = {
      ...reportedCaseNoMnc,
      id: "int-pp-1",
      data: {
        ...reportedCaseNoMnc.data,
        pinpoint: paraPinpoint,
      },
    };
    const runs = formatCitation(caseWithPinpoint, undefined, makeCourtConfig("para-only"));
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("CLR [45]");
    expect(text).not.toContain("CLR 1 [45]");
    expect(text).not.toContain("CLR 1, [45]");
  });

  test("formatCitation respects pinpointStyle=para-and-page from court config", () => {
    const caseWithPinpoint: Citation = {
      ...reportedCaseNoMnc,
      id: "int-pp-2",
      data: {
        ...reportedCaseNoMnc.data,
        pinpoint: paraPinpoint,
      },
    };
    const runs = formatCitation(caseWithPinpoint, undefined, makeCourtConfig("para-and-page"));
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("CLR 1, [45]");
  });
});

describe("Engine Integration — getFormattedPreview with court mode", () => {
  test("getFormattedPreview renders full citation with MNC in court mode", () => {
    const runs = getFormattedPreview(reportedCase, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("Pape");
    expect(text).toContain("CLR");
    expect(text).toContain("; [2009] HCA 23");
  });

  test("getFormattedPreview renders full citation without MNC in academic mode", () => {
    const runs = getFormattedPreview(reportedCase, AGLC4_ACADEMIC);
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("Pape");
    expect(text).not.toContain("; [2009] HCA 23");
  });

  test("getFormattedPreview never applies subsequent reference resolution", () => {
    // Even without context, just verifying it always produces a full citation
    const runs = getFormattedPreview(reportedCase, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("238 CLR");
    expect(text).not.toContain("(n ");
  });
});

// ─── 2. Practice Directions ──────────────────────────────────────────────────

describe("Practice Directions — data completeness", () => {
  const allJurisdictions = Object.keys(COURT_PRESETS) as CourtJurisdiction[];

  // The practice directions module uses jurisdiction keys that may differ
  // slightly from preset IDs (e.g., "QLD_DIST_MAG" vs "QLD_DISTRICT_MAG",
  // "NSW_DISTRICT_LOCAL" has no entry). We check that a reasonable set of
  // jurisdictions have links.

  test("getAllPracticeDirections returns the full PRACTICE_DIRECTION_LINKS array", () => {
    const all = getAllPracticeDirections();
    expect(all).toBe(PRACTICE_DIRECTION_LINKS);
    expect(all.length).toBeGreaterThan(0);
  });

  test("every practice direction link has a non-empty URL", () => {
    for (const pd of PRACTICE_DIRECTION_LINKS) {
      expect(typeof pd.url).toBe("string");
      expect(pd.url.length).toBeGreaterThan(0);
      expect(pd.url).toMatch(/^https?:\/\//);
    }
  });

  test("every practice direction link has a non-empty name", () => {
    for (const pd of PRACTICE_DIRECTION_LINKS) {
      expect(typeof pd.name).toBe("string");
      expect(pd.name.length).toBeGreaterThan(0);
    }
  });

  test("every practice direction link has a valid lastVerified ISO date", () => {
    for (const pd of PRACTICE_DIRECTION_LINKS) {
      expect(pd.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("getPracticeDirectionsForJurisdiction returns correct entries for HCA", () => {
    const hca = getPracticeDirectionsForJurisdiction("HCA");
    expect(hca.length).toBeGreaterThanOrEqual(1);
    expect(hca[0].jurisdiction).toBe("HCA");
  });

  test("getPracticeDirectionsForJurisdiction returns correct entries for FCA", () => {
    const fca = getPracticeDirectionsForJurisdiction("FCA");
    expect(fca.length).toBeGreaterThanOrEqual(1);
    expect(fca[0].jurisdiction).toBe("FCA");
    expect(fca[0].name).toContain("GPN-AUTH");
  });

  test("getPracticeDirectionsForJurisdiction returns empty for unknown jurisdiction", () => {
    const unknown = getPracticeDirectionsForJurisdiction("INVALID_COURT");
    expect(unknown).toEqual([]);
  });

  test("practice directions cover all major court groups", () => {
    const jurisdictionsCovered = new Set(
      PRACTICE_DIRECTION_LINKS.map((pd) => pd.jurisdiction),
    );
    // Federal
    expect(jurisdictionsCovered.has("HCA")).toBe(true);
    expect(jurisdictionsCovered.has("FCA")).toBe(true);
    expect(jurisdictionsCovered.has("FCFCOA")).toBe(true);
    // NSW
    expect(jurisdictionsCovered.has("NSWCA")).toBe(true);
    expect(jurisdictionsCovered.has("NSWSC")).toBe(true);
    // Vic
    expect(jurisdictionsCovered.has("VSCA")).toBe(true);
    expect(jurisdictionsCovered.has("VSC")).toBe(true);
    // Qld
    expect(jurisdictionsCovered.has("QCA")).toBe(true);
    expect(jurisdictionsCovered.has("QSC")).toBe(true);
    // Other states
    expect(jurisdictionsCovered.has("WASC")).toBe(true);
    expect(jurisdictionsCovered.has("SASC")).toBe(true);
    expect(jurisdictionsCovered.has("TASCSC")).toBe(true);
    expect(jurisdictionsCovered.has("ACTSC")).toBe(true);
    expect(jurisdictionsCovered.has("NTSC")).toBe(true);
    // Tribunals
    expect(jurisdictionsCovered.has("ART")).toBe(true);
    expect(jurisdictionsCovered.has("FWC")).toBe(true);
  });
});

// ─── 3. Preset Helper Sets ──────────────────────────────────────────────────

describe("Preset Helper Sets — UNREPORTED_GATE_JURISDICTIONS", () => {
  test("contains NSW, Qld, and Tas courts", () => {
    const expected: CourtJurisdiction[] = [
      "NSWCA", "NSWSC", "NSW_DISTRICT_LOCAL",
      "QCA", "QSC", "QLD_DISTRICT_MAG",
      "TASCSC",
    ];
    for (const j of expected) {
      expect(UNREPORTED_GATE_JURISDICTIONS.has(j)).toBe(true);
    }
  });

  test("does not contain Federal, Vic, or other state courts", () => {
    const notExpected: CourtJurisdiction[] = [
      "HCA", "FCA", "FCFCOA",
      "VSCA", "VSC", "VIC_COUNTY_MAG",
      "WASC", "SASC", "ACTSC", "NTSC",
      "ART", "FWC", "STATE_TRIBUNAL",
    ];
    for (const j of notExpected) {
      expect(UNREPORTED_GATE_JURISDICTIONS.has(j)).toBe(false);
    }
  });

  test("is derived from presets where unreportedGate === 'warn'", () => {
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      if (preset.unreportedGate === "warn") {
        expect(UNREPORTED_GATE_JURISDICTIONS.has(id as CourtJurisdiction)).toBe(true);
      } else {
        expect(UNREPORTED_GATE_JURISDICTIONS.has(id as CourtJurisdiction)).toBe(false);
      }
    }
  });
});

describe("Preset Helper Sets — QLD_JURISDICTIONS", () => {
  test("contains exactly QCA, QSC, QLD_DISTRICT_MAG", () => {
    expect(QLD_JURISDICTIONS.size).toBe(3);
    expect(QLD_JURISDICTIONS.has("QCA")).toBe(true);
    expect(QLD_JURISDICTIONS.has("QSC")).toBe(true);
    expect(QLD_JURISDICTIONS.has("QLD_DISTRICT_MAG")).toBe(true);
  });
});

describe("Preset Helper Sets — NSW_JURISDICTIONS", () => {
  test("contains exactly NSWCA, NSWSC, NSW_DISTRICT_LOCAL", () => {
    expect(NSW_JURISDICTIONS.size).toBe(3);
    expect(NSW_JURISDICTIONS.has("NSWCA")).toBe(true);
    expect(NSW_JURISDICTIONS.has("NSWSC")).toBe(true);
    expect(NSW_JURISDICTIONS.has("NSW_DISTRICT_LOCAL")).toBe(true);
  });
});

describe("Preset Helper Sets — VIC_JURISDICTIONS", () => {
  test("contains exactly VSCA, VSC, VIC_COUNTY_MAG", () => {
    expect(VIC_JURISDICTIONS.size).toBe(3);
    expect(VIC_JURISDICTIONS.has("VSCA")).toBe(true);
    expect(VIC_JURISDICTIONS.has("VSC")).toBe(true);
    expect(VIC_JURISDICTIONS.has("VIC_COUNTY_MAG")).toBe(true);
  });
});

describe("Preset Helper Sets — SUBSEQUENT_TREATMENT_OPTIONS", () => {
  test("has exactly 7 entries", () => {
    expect(SUBSEQUENT_TREATMENT_OPTIONS).toHaveLength(7);
  });

  test("first entry is the empty 'Select...' placeholder", () => {
    expect(SUBSEQUENT_TREATMENT_OPTIONS[0].value).toBe("");
    expect(SUBSEQUENT_TREATMENT_OPTIONS[0].label).toBe("Select...");
  });

  test("contains all expected treatment values", () => {
    const values = SUBSEQUENT_TREATMENT_OPTIONS.map((o) => o.value);
    expect(values).toContain("");
    expect(values).toContain("not-affected");
    expect(values).toContain("distinguished");
    expect(values).toContain("doubted");
    expect(values).toContain("not-followed");
    expect(values).toContain("overruled");
    expect(values).toContain("unknown");
  });

  test("every option has a non-empty label", () => {
    for (const opt of SUBSEQUENT_TREATMENT_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});

describe("Preset Helper Sets — NEGATIVE_TREATMENTS", () => {
  test("contains exactly doubted, not-followed, overruled", () => {
    expect(NEGATIVE_TREATMENTS.size).toBe(3);
    expect(NEGATIVE_TREATMENTS.has("doubted")).toBe(true);
    expect(NEGATIVE_TREATMENTS.has("not-followed")).toBe(true);
    expect(NEGATIVE_TREATMENTS.has("overruled")).toBe(true);
  });

  test("does not contain non-negative treatments", () => {
    expect(NEGATIVE_TREATMENTS.has("not-affected")).toBe(false);
    expect(NEGATIVE_TREATMENTS.has("distinguished")).toBe(false);
    expect(NEGATIVE_TREATMENTS.has("unknown")).toBe(false);
    expect(NEGATIVE_TREATMENTS.has("")).toBe(false);
  });
});

// ─── 4. Validator Orchestration ──────────────────────────────────────────────

describe("Validator Orchestration — validateDocument court mode routing", () => {
  test("validateDocument skips ibid check in court mode", () => {
    // Two footnotes where ibid is used after multi-source footnote:
    // In academic mode this would flag rule 1.4.3; in court mode it should not.
    const footnotes = [
      "Pape (2009) 238 CLR 1; Mabo (1992) 175 CLR 1.",
      "Ibid 42.",
    ];
    const courtResult = validateDocument(footnotes, [], undefined, "court");
    const courtIbidIssues = courtResult.errors.filter((e) => e.ruleNumber === "1.4.3");
    expect(courtIbidIssues).toHaveLength(0);

    // Verify academic mode DOES flag it
    const academicResult = validateDocument(footnotes, [], undefined, "academic");
    const academicIbidIssues = academicResult.errors.filter((e) => e.ruleNumber === "1.4.3");
    expect(academicIbidIssues.length).toBeGreaterThan(0);
  });

  test("validateDocument skips parallel citation warnings in court mode", () => {
    const courtResult = validateDocument([], [reportedCase], undefined, "court");
    const courtParallel = [
      ...courtResult.warnings.filter((w) => w.ruleNumber === "2.2.7"),
      ...courtResult.info.filter((i) => i.ruleNumber === "2.2.7"),
    ];
    expect(courtParallel).toHaveLength(0);
  });

  test("validateDocument emits parallel citation warnings in academic mode", () => {
    const result = validateDocument([], [reportedCase], undefined, "academic");
    const parallelIssues = [
      ...result.warnings.filter((w) => w.ruleNumber === "2.2.7"),
      ...result.info.filter((i) => i.ruleNumber === "2.2.7"),
    ];
    expect(parallelIssues.length).toBeGreaterThan(0);
  });

  test("validateDocument calls checkSubsequentTreatment for Qld jurisdictions in court mode", () => {
    const caseWithoutTreatment: Citation = {
      ...reportedCase,
      id: "int-qld-treat",
      data: {
        ...reportedCase.data,
        parallelCitations: [
          { yearType: "square" as const, year: 2009, reportSeries: "HCA", startingPage: 23 },
        ],
      },
    };
    const result = validateDocument([], [caseWithoutTreatment], undefined, "court", "QSC");
    // checkSubsequentTreatment issues reference "Qld SC PD 1/2024 cl 4(c)"
    const qldTreatmentIssues = result.info.filter(
      (i) => i.ruleNumber.includes("Qld SC PD"),
    );
    expect(qldTreatmentIssues.length).toBeGreaterThan(0);
  });

  test("validateDocument does NOT call checkSubsequentTreatment for non-Qld in court mode", () => {
    const result = validateDocument([], [reportedCase], undefined, "court", "FCA");
    const qldTreatmentIssues = result.info.filter(
      (i) => i.ruleNumber.includes("Qld SC PD"),
    );
    expect(qldTreatmentIssues).toHaveLength(0);
  });

  test("validateDocument does NOT call checkSubsequentTreatment in academic mode even with Qld jurisdiction", () => {
    const result = validateDocument([], [reportedCase], undefined, "academic", "QSC");
    const qldTreatmentIssues = result.info.filter(
      (i) => i.ruleNumber.includes("Qld SC PD"),
    );
    expect(qldTreatmentIssues).toHaveLength(0);
  });

  test("validateDocument still runs footnote format checks in court mode", () => {
    const footnotes = ["Missing closing punctuation"];
    const result = validateDocument(footnotes, [], undefined, "court");
    const formatIssues = result.errors.filter((e) => e.ruleNumber === "1.1.4");
    expect(formatIssues).toHaveLength(1);
  });

  test("validateDocument still runs citation completeness checks in court mode", () => {
    const incompleteCitation: Citation = {
      id: "int-incomplete",
      aglcVersion: "4",
      sourceType: "case.reported",
      data: {
        party1: "Alpha",
        // missing year and reportSeries
      },
      shortTitle: "Alpha",
      tags: [],
      createdAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-01T00:00:00Z",
    };
    const result = validateDocument([], [incompleteCitation], undefined, "court");
    const completenessIssues = result.errors.filter((e) => e.ruleNumber === "2.2");
    expect(completenessIssues.length).toBeGreaterThan(0);
  });
});

describe("Validator — checkSubsequentTreatment standalone", () => {
  test("flags case citations without subsequentTreatment field", () => {
    const issues = checkSubsequentTreatment([reportedCase]);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].ruleNumber).toContain("Qld SC PD");
  });

  test("does not flag legislation citations", () => {
    const issues = checkSubsequentTreatment([mockLegislation]);
    expect(issues).toHaveLength(0);
  });

  test("does not flag case with treatment recorded", () => {
    const withTreatment: Citation = {
      ...reportedCase,
      id: "int-with-treat",
      data: { ...reportedCase.data, subsequentTreatment: "Not affected" },
    };
    const issues = checkSubsequentTreatment([withTreatment]);
    expect(issues).toHaveLength(0);
  });
});

// ─── 5. Bibliography / LoA Routing ───────────────────────────────────────────

describe("Bibliography / LoA Routing — generateBibliographyForStandard", () => {
  const allCitations = [reportedCase, mockBook, mockJournal, mockLegislation];

  test("writingMode=court routes to generateListOfAuthorities", () => {
    const sections = generateBibliographyForStandard(allCitations, "aglc", "court");
    const headings = sections.map((s) => s.heading);
    // LoA has "Cases" and "Legislation" — not AGLC "A Articles/Books/Reports"
    expect(headings).toContain("Cases");
    expect(headings).toContain("Legislation");
    expect(headings).not.toContain("A Articles/Books/Reports");
  });

  test("secondary sources (books, journals) excluded from LoA", () => {
    const sections = generateBibliographyForStandard(allCitations, "aglc", "court");
    // Only cases + legislation sections
    expect(sections).toHaveLength(2);
    const allEntryText = sections
      .flatMap((s) => s.entries)
      .map((entry) => entry.map((r) => r.text).join(""))
      .join(" ");
    expect(allEntryText).not.toContain("Contract Law");
    expect(allEntryText).not.toContain("Tort Reform");
  });

  test("LoA entries for cases include MNC when available", () => {
    const sections = generateListOfAuthorities([reportedCase]);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Cases");
    const entryText = sections[0].entries[0].map((r) => r.text).join("");
    expect(entryText).toContain("[2009] HCA 23");
  });

  test("LoA entries for cases without MNC do not append spurious text", () => {
    const caseWithTitle: Citation = {
      ...reportedCaseNoMnc,
      data: { ...reportedCaseNoMnc.data, title: "Mabo v Queensland (No 2)" },
    };
    const sections = generateListOfAuthorities([caseWithTitle]);
    expect(sections).toHaveLength(1);
    const entryText = sections[0].entries[0].map((r) => r.text).join("");
    expect(entryText).toContain("Mabo");
    expect(entryText).not.toContain(";");
  });

  test("writingMode=academic with aglc structure produces standard bibliography", () => {
    const sections = generateBibliographyForStandard(allCitations, "aglc", "academic");
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain("A Articles/Books/Reports");
    expect(headings).toContain("B Cases");
    expect(headings).toContain("C Legislation");
  });

  test("writingMode=undefined defaults to standard bibliography", () => {
    const sections = generateBibliographyForStandard(allCitations, "aglc");
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain("A Articles/Books/Reports");
  });
});

// ─── 6. Edge Cases ───────────────────────────────────────────────────────────

describe("Edge Cases — report hierarchy case sensitivity", () => {
  test("getPreferredReportOrder is case-sensitive (lowercase returns empty)", () => {
    expect(getPreferredReportOrder("hca")).toEqual([]);
    expect(getPreferredReportOrder("nswsc")).toEqual([]);
  });

  test("getPreferredReportOrder with correct casing returns hierarchy", () => {
    expect(getPreferredReportOrder("HCA").length).toBeGreaterThan(0);
    expect(getPreferredReportOrder("NSWSC").length).toBeGreaterThan(0);
  });
});

describe("Edge Cases — zero business days in deadline calculation", () => {
  test("subtractBusinessDays with 0 returns the same date", () => {
    const wednesday = new Date(2026, 3, 22); // April 22, 2026 (Wednesday)
    const result = subtractBusinessDays(wednesday, 0);
    expect(result.getDate()).toBe(22);
    expect(result.getMonth()).toBe(3);
    expect(result.getFullYear()).toBe(2026);
  });
});

describe("Edge Cases — config pinpointStyle values matching preset values", () => {
  test("every preset pinpointStyle is a valid PinpointStyle value", () => {
    const validStyles: PinpointStyle[] = ["page-only", "para-only", "para-and-page"];
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      expect(validStyles).toContain(preset.pinpointStyle);
    }
  });

  test("court config with para-only matches NSW/Qld preset style", () => {
    const config = makeCourtConfig("para-only");
    expect(config.pinpointStyle).toBe(COURT_PRESETS.NSWCA.pinpointStyle);
    expect(config.pinpointStyle).toBe(COURT_PRESETS.QCA.pinpointStyle);
  });

  test("court config with para-and-page matches HCA/FCA/Vic preset style", () => {
    const config = makeCourtConfig("para-and-page");
    expect(config.pinpointStyle).toBe(COURT_PRESETS.HCA.pinpointStyle);
    expect(config.pinpointStyle).toBe(COURT_PRESETS.FCA.pinpointStyle);
    expect(config.pinpointStyle).toBe(COURT_PRESETS.VSCA.pinpointStyle);
  });

  test("default academic pinpointStyle is page-only", () => {
    expect(AGLC4_ACADEMIC.pinpointStyle).toBe("page-only");
  });
});

describe("Edge Cases — court mode with subsequent reference and pinpoint", () => {
  test("formatCitation subsequent reference with pinpoint in court mode includes pinpoint", () => {
    const context: CitationContext = {
      footnoteNumber: 3,
      isFirstCitation: false,
      isSameAsPreceding: false,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
      currentPinpoint: { type: "page", value: "42" },
    };
    const runs = formatCitation(reportedCase, context, AGLC4_COURT);
    const text = runs.map((r) => r.text).join("");
    expect(text).toContain("Pape");
    expect(text).toContain("42");
    expect(text).not.toContain("(n ");
  });
});

describe("Edge Cases — validateDocument with empty inputs", () => {
  test("validateDocument with no footnotes and no citations returns no issues", () => {
    const result = validateDocument([], [], undefined, "court");
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.info).toHaveLength(0);
  });

  test("validateDocument with empty footnote strings in court mode", () => {
    const result = validateDocument(["", ""], [], undefined, "court");
    // Empty footnotes should not trigger any structural issues
    expect(result.errors).toHaveLength(0);
  });
});
