/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-VALID-001 / COURT-VALID-002 / COURT-VALID-003 Tests
 *
 * Validates court-mode-specific validation rules, filing deadline
 * calculations, and submission formatting checks.
 */

import {
  validateCourtMode,
  checkSubmissionFormatting,
} from "../../src/engine/validator";
import type {
  CourtModeConfig,
  DocumentFormattingMetrics,
} from "../../src/engine/validator";
import {
  calculateDeadlines,
  subtractBusinessDays,
  addCalendarDays,
} from "../../src/engine/court/deadlines";
import type { Citation } from "../../src/types/citation";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const reportedCaseWithBoth: Citation = {
  id: "cv-001",
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

const reportedCaseWithParallels: Citation = {
  ...reportedCaseWithBoth,
  id: "cv-001b",
  data: {
    ...reportedCaseWithBoth.data,
    parallelCitations: [
      { yearType: "square" as const, year: 2009, reportSeries: "HCA", startingPage: 23 },
    ],
  },
};

const unreportedCase: Citation = {
  id: "cv-002",
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

const unreportedCaseConfirmed: Citation = {
  ...unreportedCase,
  id: "cv-002b",
  data: {
    ...unreportedCase.data,
    unreportedConfirmed: true,
  },
};

const legislationWithJurisdiction: Citation = {
  id: "cv-003",
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

const legislationWithoutJurisdiction: Citation = {
  id: "cv-004",
  aglcVersion: "4",
  sourceType: "legislation.statute",
  data: {
    title: "Evidence Act",
    year: 1995,
    jurisdiction: "",
  },
  shortTitle: "Evidence Act",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const caseWithoutTreatment: Citation = {
  id: "cv-005",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Alpha",
    year: 2020,
    reportSeries: "QCA",
    startingPage: 1,
    mnc: "[2020] QCA 1",
    parallelCitations: [
      { yearType: "square" as const, year: 2020, reportSeries: "QCA", startingPage: 1 },
    ],
  },
  shortTitle: "Alpha",
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const caseWithTreatment: Citation = {
  ...caseWithoutTreatment,
  id: "cv-005b",
  data: {
    ...caseWithoutTreatment.data,
    subsequentTreatment: "Not affected",
  },
};

function makeFcaConfig(overrides?: Partial<CourtModeConfig>): CourtModeConfig {
  return {
    jurisdiction: "FCA",
    parallelCitationMode: "mandatory",
    unreportedGate: "off",
    ...overrides,
  };
}

function makeNswcaConfig(overrides?: Partial<CourtModeConfig>): CourtModeConfig {
  return {
    jurisdiction: "NSWCA",
    parallelCitationMode: "mandatory",
    unreportedGate: "warn",
    ...overrides,
  };
}

function makeQldConfig(overrides?: Partial<CourtModeConfig>): CourtModeConfig {
  return {
    jurisdiction: "QSC",
    parallelCitationMode: "mandatory",
    unreportedGate: "warn",
    ...overrides,
  };
}

function makeHcaConfig(overrides?: Partial<CourtModeConfig>): CourtModeConfig {
  return {
    jurisdiction: "HCA",
    parallelCitationMode: "mandatory",
    unreportedGate: "off",
    ...overrides,
  };
}

// ─── COURT-VALID-001: Court mode validation ruleset ─────────────────────────

describe("COURT-VALID-001: Court mode validation ruleset", () => {
  describe("Error: parallel citation missing (mandatory mode)", () => {
    test("flags error when both report + MNC available but no parallels recorded", () => {
      const result = validateCourtMode([], [reportedCaseWithBoth], makeFcaConfig());
      const errors = result.errors.filter((e) => e.message.includes("Parallel citation required"));
      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe("error");
      expect(errors[0].ruleNumber).toContain("FCA");
    });

    test("no error when parallels are recorded", () => {
      const result = validateCourtMode([], [reportedCaseWithParallels], makeFcaConfig());
      const errors = result.errors.filter((e) => e.message.includes("Parallel citation required"));
      expect(errors).toHaveLength(0);
    });

    test("no error when parallel citation mode is preferred", () => {
      const config = makeFcaConfig({ parallelCitationMode: "preferred" });
      const result = validateCourtMode([], [reportedCaseWithBoth], config);
      const errors = result.errors.filter((e) => e.message.includes("Parallel citation required"));
      expect(errors).toHaveLength(0);
    });

    test("no error when parallel citation mode is off", () => {
      const config = makeFcaConfig({ parallelCitationMode: "off" });
      const result = validateCourtMode([], [reportedCaseWithBoth], config);
      const errors = result.errors.filter((e) => e.message.includes("Parallel citation required"));
      expect(errors).toHaveLength(0);
    });
  });

  describe("Warning: ibid detected in footnotes", () => {
    test("flags ibid in footnote text", () => {
      const footnotes = ["See Pape (2009) 238 CLR 1.", "Ibid 42."];
      const result = validateCourtMode(footnotes, [], makeFcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Ibid"));
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe("warning");
    });

    test("flags case-insensitive ibid", () => {
      const footnotes = ["ibid."];
      const result = validateCourtMode(footnotes, [], makeFcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Ibid") || w.message.includes("ibid"));
      expect(warnings).toHaveLength(1);
    });

    test("no warning when no ibid present", () => {
      const footnotes = ["See Pape (2009) 238 CLR 1."];
      const result = validateCourtMode(footnotes, [], makeFcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Ibid"));
      expect(warnings).toHaveLength(0);
    });
  });

  describe("Warning: (n X) pattern detected in footnotes", () => {
    test("flags (n X) cross-reference", () => {
      const footnotes = ["Pape (n 3) [45]."];
      const result = validateCourtMode(footnotes, [], makeFcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("cross-reference"));
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe("warning");
    });

    test("no warning when no (n X) present", () => {
      const footnotes = ["Pape [45]."];
      const result = validateCourtMode(footnotes, [], makeFcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("cross-reference"));
      expect(warnings).toHaveLength(0);
    });
  });

  describe("Warning: unreported judgment without confirmation (NSW/Qld/Tas)", () => {
    test("flags unreported case in NSW when not confirmed", () => {
      const result = validateCourtMode([], [unreportedCase], makeNswcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Unreported judgment"));
      expect(warnings).toHaveLength(1);
      expect(warnings[0].ruleNumber).toContain("NSW");
    });

    test("no warning when unreported case is confirmed", () => {
      const result = validateCourtMode([], [unreportedCaseConfirmed], makeNswcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Unreported judgment"));
      expect(warnings).toHaveLength(0);
    });

    test("no warning when unreported gate is off", () => {
      const config = makeNswcaConfig({ unreportedGate: "off" });
      const result = validateCourtMode([], [unreportedCase], config);
      const warnings = result.warnings.filter((w) => w.message.includes("Unreported judgment"));
      expect(warnings).toHaveLength(0);
    });

    test("flags unreported case in Qld", () => {
      const result = validateCourtMode([], [unreportedCase], makeQldConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Unreported judgment"));
      expect(warnings).toHaveLength(1);
    });

    test("no warning in FCA (gate off by default)", () => {
      const result = validateCourtMode([], [unreportedCase], makeFcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Unreported judgment"));
      expect(warnings).toHaveLength(0);
    });
  });

  describe("Info: subsequent treatment not recorded (Qld only)", () => {
    test("flags case without subsequent treatment in Qld", () => {
      const result = validateCourtMode([], [caseWithoutTreatment], makeQldConfig());
      const infos = result.info.filter((i) => i.message.includes("Subsequent treatment"));
      expect(infos).toHaveLength(1);
      expect(infos[0].ruleNumber).toContain("Qld");
    });

    test("no flag when subsequent treatment is recorded", () => {
      const result = validateCourtMode([], [caseWithTreatment], makeQldConfig());
      const infos = result.info.filter((i) => i.message.includes("Subsequent treatment"));
      expect(infos).toHaveLength(0);
    });

    test("no flag for non-Qld jurisdictions", () => {
      const result = validateCourtMode([], [caseWithoutTreatment], makeFcaConfig());
      const infos = result.info.filter((i) => i.message.includes("Subsequent treatment"));
      expect(infos).toHaveLength(0);
    });
  });

  describe("Info: more than 30 authorities cited (proportionality)", () => {
    test("flags when more than 30 authorities are cited", () => {
      const citations: Citation[] = [];
      for (let i = 0; i < 31; i++) {
        citations.push({
          ...reportedCaseWithParallels,
          id: `case-${i}`,
          shortTitle: `Case ${i}`,
        });
      }
      const result = validateCourtMode([], citations, makeFcaConfig());
      const infos = result.info.filter((i) => i.message.includes("authorities cited"));
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain("31");
    });

    test("no flag when 30 or fewer authorities", () => {
      const citations: Citation[] = [];
      for (let i = 0; i < 30; i++) {
        citations.push({
          ...reportedCaseWithParallels,
          id: `case-${i}`,
          shortTitle: `Case ${i}`,
        });
      }
      const result = validateCourtMode([], citations, makeFcaConfig());
      const infos = result.info.filter((i) => i.message.includes("authorities cited"));
      expect(infos).toHaveLength(0);
    });
  });

  describe("Info: legislation without jurisdiction identifier", () => {
    test("flags legislation with empty jurisdiction", () => {
      const result = validateCourtMode([], [legislationWithoutJurisdiction], makeFcaConfig());
      const infos = result.info.filter((i) => i.message.includes("jurisdiction identifier"));
      expect(infos).toHaveLength(1);
    });

    test("no flag when jurisdiction is present", () => {
      const result = validateCourtMode([], [legislationWithJurisdiction], makeFcaConfig());
      const infos = result.info.filter((i) => i.message.includes("jurisdiction identifier"));
      expect(infos).toHaveLength(0);
    });
  });

  describe("Each result references practice direction, not AGLC4 rule", () => {
    test("FCA results reference FCA GPN-AUTH", () => {
      const footnotes = ["Ibid."];
      const result = validateCourtMode(footnotes, [], makeFcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Ibid"));
      expect(warnings[0].ruleNumber).toContain("FCA GPN-AUTH");
    });

    test("NSW results reference NSW SC PN Gen 20", () => {
      const result = validateCourtMode([], [unreportedCase], makeNswcaConfig());
      const warnings = result.warnings.filter((w) => w.message.includes("Unreported"));
      expect(warnings[0].ruleNumber).toContain("NSW SC PN Gen 20");
    });

    test("Qld subsequent treatment references Qld SC PD 1 of 2024 cl 4(c)", () => {
      const result = validateCourtMode([], [caseWithoutTreatment], makeQldConfig());
      const infos = result.info.filter((i) => i.message.includes("Subsequent treatment"));
      expect(infos[0].ruleNumber).toBe("Qld SC PD 1 of 2024 cl 4(c)");
    });
  });
});

// ─── COURT-VALID-002: Filing deadline reminders ─────────────────────────────

describe("COURT-VALID-002: Filing deadline reminders", () => {
  describe("subtractBusinessDays", () => {
    test("subtracts business days skipping weekends", () => {
      // 2026-04-22 is a Wednesday
      const wednesday = new Date(2026, 3, 22);
      const result = subtractBusinessDays(wednesday, 3);
      // 3 business days back from Wed: Tue, Mon, Fri = 2026-04-17 (Friday)
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(17);
    });

    test("skips Saturday and Sunday when subtracting", () => {
      // 2026-04-20 is a Monday
      const monday = new Date(2026, 3, 20);
      const result = subtractBusinessDays(monday, 1);
      // 1 business day back from Mon = Fri 2026-04-17
      expect(result.getDate()).toBe(17);
    });

    test("handles multiple weekend crossings", () => {
      // 2026-04-22 is a Wednesday
      const wednesday = new Date(2026, 3, 22);
      const result = subtractBusinessDays(wednesday, 7);
      // 7 business days back: Tue 21, Mon 20, Fri 17, Thu 16, Wed 15, Tue 14, Mon 13
      expect(result.getDate()).toBe(13);
    });
  });

  describe("addCalendarDays", () => {
    test("adds calendar days correctly", () => {
      const date = new Date(2026, 3, 10);
      const result = addCalendarDays(date, 14);
      expect(result.getDate()).toBe(24);
    });

    test("crosses month boundary", () => {
      const date = new Date(2026, 3, 25); // April 25
      const result = addCalendarDays(date, 14);
      expect(result.getMonth()).toBe(4); // May
      expect(result.getDate()).toBe(9);
    });
  });

  describe("FCA deadlines", () => {
    test("calculates applicant and respondent LOA deadlines", () => {
      // Hearing on Wednesday 2026-04-22
      const hearing = new Date(2026, 3, 22);
      const deadlines = calculateDeadlines(hearing, "FCA");

      expect(deadlines).toHaveLength(2);

      // Applicant: 5 business days before = Wed 15
      const applicant = deadlines.find((d) => d.label.includes("Applicant"));
      expect(applicant).toBeDefined();
      expect(applicant!.deadline.getDate()).toBe(15);
      expect(applicant!.deadline.getHours()).toBe(16); // 4pm
      expect(applicant!.jurisdiction).toBe("FCA");

      // Respondent: 4 business days before = Thu 16
      const respondent = deadlines.find((d) => d.label.includes("Respondent"));
      expect(respondent).toBeDefined();
      expect(respondent!.deadline.getDate()).toBe(16);
      expect(respondent!.deadline.getHours()).toBe(16); // 4pm
    });

    test("deadlines are sorted chronologically", () => {
      const hearing = new Date(2026, 3, 22);
      const deadlines = calculateDeadlines(hearing, "FCA");
      expect(deadlines[0].deadline.getTime()).toBeLessThanOrEqual(
        deadlines[1].deadline.getTime(),
      );
    });
  });

  describe("HCA deadlines", () => {
    test("calculates JBA deadline 14 days after reply", () => {
      const replyDate = new Date(2026, 3, 10);
      const deadlines = calculateDeadlines(replyDate, "HCA");

      expect(deadlines).toHaveLength(1);
      expect(deadlines[0].label).toContain("Joint Book of Authorities");
      expect(deadlines[0].deadline.getDate()).toBe(24); // 10 + 14
      expect(deadlines[0].jurisdiction).toBe("HCA");
    });
  });

  describe("NSWCA deadlines", () => {
    test("calculates email and hardcopy deadlines", () => {
      // Hearing on Wednesday 2026-04-22
      const hearing = new Date(2026, 3, 22);
      const deadlines = calculateDeadlines(hearing, "NSWCA");

      expect(deadlines).toHaveLength(2);

      // Email: 2 business days before = Mon 20
      const email = deadlines.find((d) => d.label.includes("Email"));
      expect(email).toBeDefined();
      expect(email!.deadline.getDate()).toBe(20);
      expect(email!.deadline.getHours()).toBe(10); // 10am

      // Hardcopy: 1 business day before = Tue 21
      const hardcopy = deadlines.find((d) => d.label.includes("Hardcopy"));
      expect(hardcopy).toBeDefined();
      expect(hardcopy!.deadline.getDate()).toBe(21);
      expect(hardcopy!.deadline.getHours()).toBe(10); // 10am
    });

    test("NSWCA deadlines sorted chronologically", () => {
      const hearing = new Date(2026, 3, 22);
      const deadlines = calculateDeadlines(hearing, "NSWCA");
      // Email (2 days before) should come before hardcopy (1 day before)
      expect(deadlines[0].label).toContain("Email");
      expect(deadlines[1].label).toContain("Hardcopy");
    });
  });

  describe("Return shape", () => {
    test("each deadline has label, deadline Date, and jurisdiction", () => {
      const hearing = new Date(2026, 3, 22);
      const deadlines = calculateDeadlines(hearing, "FCA");

      for (const d of deadlines) {
        expect(typeof d.label).toBe("string");
        expect(d.label.length).toBeGreaterThan(0);
        expect(d.deadline).toBeInstanceOf(Date);
        expect(typeof d.jurisdiction).toBe("string");
      }
    });
  });
});

// ─── COURT-VALID-003: Submission formatting checks ──────────────────────────

describe("COURT-VALID-003: Submission formatting checks", () => {
  describe("FCA checks", () => {
    const fcaConfig = makeFcaConfig();

    test("warns when submission exceeds 10 pages", () => {
      const formatting: DocumentFormattingMetrics = { pageCount: 12 };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("pages"));
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain("12 pages");
      expect(infos[0].message).toContain("10 pages");
    });

    test("warns when reply exceeds 5 pages", () => {
      const formatting: DocumentFormattingMetrics = { pageCount: 7, isReply: true };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("pages"));
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain("reply");
      expect(infos[0].message).toContain("5 pages");
    });

    test("no warning when under page limit", () => {
      const formatting: DocumentFormattingMetrics = { pageCount: 8 };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("pages"));
      expect(infos).toHaveLength(0);
    });

    test("warns when font size below 12pt", () => {
      const formatting: DocumentFormattingMetrics = { minFontSizePt: 10 };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("font size"));
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain("10pt");
    });

    test("no warning when font size is 12pt or above", () => {
      const formatting: DocumentFormattingMetrics = { minFontSizePt: 12 };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("font size"));
      expect(infos).toHaveLength(0);
    });

    test("warns when line spacing below 1.5", () => {
      const formatting: DocumentFormattingMetrics = { minLineSpacing: 1.15 };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("spacing"));
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain("1.15");
    });

    test("no warning when line spacing is 1.5 or above", () => {
      const formatting: DocumentFormattingMetrics = { minLineSpacing: 1.5 };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("spacing"));
      expect(infos).toHaveLength(0);
    });

    test("all FCA formatting issues are info-level", () => {
      const formatting: DocumentFormattingMetrics = {
        pageCount: 15,
        minFontSizePt: 10,
        minLineSpacing: 1.0,
      };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const formattingIssues = result.info.filter(
        (i) =>
          i.message.includes("pages") ||
          i.message.includes("font size") ||
          i.message.includes("spacing"),
      );
      expect(formattingIssues.length).toBe(3);
      for (const issue of formattingIssues) {
        expect(issue.severity).toBe("info");
      }
    });

    test("FCA formatting issues reference practice note", () => {
      const formatting: DocumentFormattingMetrics = { pageCount: 15 };
      const result = validateCourtMode([], [], fcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("pages"));
      expect(infos[0].ruleNumber).toContain("FCA Practice Note APP 2");
    });
  });

  describe("HCA checks", () => {
    const hcaConfig = makeHcaConfig();

    test("warns when submission exceeds HCA Part 44 page limit", () => {
      const formatting: DocumentFormattingMetrics = { pageCount: 25 };
      const result = validateCourtMode([], [], hcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("pages"));
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain("Part 44");
    });

    test("no warning when under HCA page limit", () => {
      const formatting: DocumentFormattingMetrics = { pageCount: 18 };
      const result = validateCourtMode([], [], hcaConfig, formatting);
      const infos = result.info.filter((i) => i.message.includes("pages"));
      expect(infos).toHaveLength(0);
    });

    test("respects custom page limit from config", () => {
      const config = makeHcaConfig({ pageLimit: 15 });
      const formatting: DocumentFormattingMetrics = { pageCount: 18 };
      const result = validateCourtMode([], [], config, formatting);
      const infos = result.info.filter((i) => i.message.includes("pages"));
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain("15 pages");
    });
  });

  describe("Non-FCA/HCA jurisdictions", () => {
    test("no submission formatting warnings for NSW", () => {
      const formatting: DocumentFormattingMetrics = {
        pageCount: 50,
        minFontSizePt: 8,
        minLineSpacing: 1.0,
      };
      const result = validateCourtMode([], [], makeNswcaConfig(), formatting);
      const formattingIssues = result.info.filter(
        (i) =>
          i.message.includes("pages") ||
          i.message.includes("font size") ||
          i.message.includes("spacing"),
      );
      expect(formattingIssues).toHaveLength(0);
    });
  });

  describe("checkSubmissionFormatting standalone", () => {
    test("returns empty array when no formatting issues", () => {
      const issues = checkSubmissionFormatting(makeFcaConfig(), {
        pageCount: 5,
        minFontSizePt: 14,
        minLineSpacing: 2.0,
      });
      expect(issues).toHaveLength(0);
    });

    test("returns empty when no metrics provided", () => {
      const issues = checkSubmissionFormatting(makeFcaConfig(), {});
      expect(issues).toHaveLength(0);
    });
  });
});
