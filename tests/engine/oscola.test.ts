/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Comprehensive OSCOLA Formatter Tests (OSC-001 through OSC-014)
 *
 * Covers all exported functions from the OSCOLA rules modules and data files.
 * Test cases derived from JSDoc examples and edge cases.
 */

import { FormattedRun } from "../../src/types/formattedRun";

// ─── Cases ────────────────────────────────────────────────────────────────────
import {
  formatOscolaCase,
  OSCOLA_REPORT_HIERARCHY,
} from "../../src/engine/rules/oscola/cases";
import {
  formatOscolaScottishCase,
  SCOTTISH_COURT_IDS,
  SCOTTISH_HISTORICAL_SERIES,
} from "../../src/engine/rules/oscola/cases-scotland";
import {
  formatOscolaNICase,
  NI_COURT_IDS,
} from "../../src/engine/rules/oscola/cases-ni";

// ─── Legislation ──────────────────────────────────────────────────────────────
import {
  formatOscolaPrimaryLegislation,
  formatOscolaSecondaryLegislation,
} from "../../src/engine/rules/oscola/legislation";

// ─── Parliamentary ────────────────────────────────────────────────────────────
import {
  formatOscolaHansard,
  formatOscolaCommandPaper,
  formatOscolaLawCommission,
  formatOscolaParliamentaryReport,
} from "../../src/engine/rules/oscola/parliamentary";

// ─── EU ───────────────────────────────────────────────────────────────────────
import {
  formatEuLegislation,
  formatCjeuCase,
  formatGeneralCourtCase,
  formatAssimilatedEuLaw,
  formatEuTreaty,
} from "../../src/engine/rules/oscola/eu";

// ─── ECHR ─────────────────────────────────────────────────────────────────────
import {
  formatEcthrCase,
  formatEcthrDecision,
  formatEcommhrDecision,
  formatCouncilOfEuropeTreaty,
  formatCouncilOfEuropeDocument,
} from "../../src/engine/rules/oscola/echr";

// ─── International ────────────────────────────────────────────────────────────
import {
  formatTreaty,
  formatUnDocument,
  formatUnResolution,
  formatIcjCase,
  formatItlosCase,
  formatIccCase,
  formatWtoReport,
} from "../../src/engine/rules/oscola/international";

// ─── Secondary Sources ───────────────────────────────────────────────────────
import { formatOscolaThesis } from "../../src/engine/rules/oscola/secondary";

// ─── GenAI ────────────────────────────────────────────────────────────────────
import { formatGenAiCitation } from "../../src/engine/rules/oscola/genai";

// ─── Tables ───────────────────────────────────────────────────────────────────
import {
  generateTableOfCases,
  generateTableOfLegislation,
} from "../../src/engine/rules/oscola/tables";

// ─── Ireland ──────────────────────────────────────────────────────────────────
import {
  formatIrishCase,
  formatIrishAct,
  formatIrishStatutoryInstrument,
  formatBunreachtNaHEireann,
} from "../../src/engine/rules/oscola/ireland";

// ─── Secondary Sources (shared formatters via engine dispatcher) ─────────────
import { formatBook, formatEdition } from "../../src/engine/rules/v4/secondary/books";
import { formatJournalArticle } from "../../src/engine/rules/v4/secondary/journals";
import { formatCitation } from "../../src/engine/engine";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";

// ─── Data Files ───────────────────────────────────────────────────────────────
import {
  searchUKReportSeries,
  getUKReportSeriesByAbbreviation,
  getUKReportSeriesByJurisdiction,
  UK_REPORT_SERIES,
} from "../../src/engine/data/uk-report-series";
import {
  searchUKCourtIdentifiers,
  getUKCourtByCode,
  getUKCourtsByJurisdiction,
  UK_COURT_IDENTIFIERS,
} from "../../src/engine/data/uk-court-identifiers";
import {
  searchIrishCourtIdentifiers,
  getIrishCourtByCode,
  searchIrishReportSeries,
  getIrishReportSeriesByAbbreviation,
  IRISH_COURT_IDENTIFIERS,
  IRISH_REPORT_SERIES,
} from "../../src/engine/data/irish-courts";
import {
  getEUCasePrefixByPrefix,
  parseECLI,
  getOJSeriesByCode,
  searchEUCasePrefixes,
  getECLICountryCode,
  EU_CASE_PREFIXES,
  OJ_SERIES,
} from "../../src/engine/data/eu-case-prefixes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Join all runs into plain text */
const joinText = (runs: FormattedRun[]): string =>
  runs.map((r) => r.text).join("");

// =============================================================================
// 1. OSCOLA UK CASES (cases.ts)
// =============================================================================

describe("OSC-001/002: formatOscolaCase", () => {
  it("formats modern parallel case (JSDoc: Corr v IBC Vehicles)", () => {
    const runs = formatOscolaCase({
      caseName: "Corr v IBC Vehicles Ltd",
      neutralCitation: { year: 2008, court: "UKHL", number: 15 },
      reportCitation: {
        year: 2008,
        yearType: "square",
        volume: 1,
        series: "AC",
        startPage: 884,
      },
    });
    expect(joinText(runs)).toBe(
      "Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884"
    );
  });

  it("formats pre-2001 case with court (JSDoc: Donoghue v Stevenson)", () => {
    const runs = formatOscolaCase({
      caseName: "Donoghue v Stevenson",
      reportCitation: {
        year: 1932,
        yearType: "square",
        series: "AC",
        startPage: 562,
      },
      courtId: "HL",
    });
    // AC is in implied-court set, so no (HL)
    expect(joinText(runs)).toBe("Donoghue v Stevenson [1932] AC 562");
  });

  it("renders italic case name with roman 'v'", () => {
    const runs = formatOscolaCase({
      caseName: "Smith v Jones",
      neutralCitation: { year: 2020, court: "UKSC", number: 1 },
    });
    expect(runs[0]).toEqual({ text: "Smith", italic: true });
    expect(runs[1]).toEqual({ text: " v " });
    expect(runs[2]).toEqual({ text: "Jones", italic: true });
  });

  it("renders case name without 'v' as single italic run", () => {
    const runs = formatOscolaCase({
      caseName: "Re McFarland",
      neutralCitation: { year: 2004, court: "UKHL", number: 17 },
    });
    expect(runs[0]).toEqual({ text: "Re McFarland", italic: true });
  });

  it("disregards BAILII retrospective neutral citation", () => {
    const runs = formatOscolaCase({
      caseName: "R v Brown",
      neutralCitation: { year: 1994, court: "UKHL", number: 99 },
      reportCitation: {
        year: 1994,
        yearType: "square",
        volume: 1,
        series: "AC",
        startPage: 212,
      },
      bailiiRetrospective: true,
    });
    // Neutral citation should be disregarded; report only
    expect(joinText(runs)).toBe("R v Brown [1994] 1 AC 212");
  });

  it("formats EWHC with division in neutral citation", () => {
    const runs = formatOscolaCase({
      caseName: "Test v Party",
      neutralCitation: {
        year: 2020,
        court: "EWHC",
        number: 100,
        ewhcDivision: "Admin",
      },
    });
    expect(joinText(runs)).toBe("Test v Party [2020] EWHC 100 (Admin)");
  });

  it("adds court in parentheses for non-implied series (pre-2001)", () => {
    const runs = formatOscolaCase({
      caseName: "A v B",
      reportCitation: {
        year: 1990,
        yearType: "round",
        volume: 5,
        series: "Cr App R",
        startPage: 100,
      },
      courtId: "CA",
    });
    expect(joinText(runs)).toBe("A v B (1990) 5 Cr App R 100 (CA)");
  });

  it("does not add court for implied series (AC)", () => {
    const runs = formatOscolaCase({
      caseName: "X v Y",
      reportCitation: {
        year: 1980,
        yearType: "square",
        series: "AC",
        startPage: 100,
      },
      courtId: "HL",
    });
    expect(joinText(runs)).not.toContain("(HL)");
  });

  it("includes pinpoint after comma", () => {
    const runs = formatOscolaCase({
      caseName: "A v B",
      neutralCitation: { year: 2010, court: "UKSC", number: 5 },
      pinpoint: "[25]",
    });
    expect(joinText(runs)).toBe("A v B [2010] UKSC 5, [25]");
  });

  it("handles neutral citation only (no report)", () => {
    const runs = formatOscolaCase({
      caseName: "X v Y",
      neutralCitation: { year: 2022, court: "EWCA Civ", number: 42 },
    });
    expect(joinText(runs)).toBe("X v Y [2022] EWCA Civ 42");
  });

  it("handles report citation with round bracket year", () => {
    const runs = formatOscolaCase({
      caseName: "A v B",
      reportCitation: {
        year: 1985,
        yearType: "round",
        volume: 3,
        series: "All ER",
        startPage: 1,
      },
    });
    expect(joinText(runs)).toBe("A v B (1985) 3 All ER 1");
  });

  it("OSCOLA_REPORT_HIERARCHY has correct order", () => {
    expect(OSCOLA_REPORT_HIERARCHY[0]).toBe("AC");
    expect(OSCOLA_REPORT_HIERARCHY).toContain("WLR");
    expect(OSCOLA_REPORT_HIERARCHY).toContain("All ER");
  });
});

// =============================================================================
// 2. OSCOLA SCOTTISH CASES (cases-scotland.ts)
// =============================================================================

describe("OSC-003: formatOscolaScottishCase", () => {
  it("formats modern Scottish case with neutral citation (JSDoc: AXA v Lord Advocate)", () => {
    const runs = formatOscolaScottishCase({
      caseName: "AXA General Insurance Ltd v Lord Advocate",
      year: 2011,
      yearType: "round",
      reportSeries: "SC",
      startPage: 158,
      neutralCitation: { year: 2011, court: "CSIH", number: 31 },
    });
    expect(joinText(runs)).toBe(
      "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, (2011) SC 158"
    );
  });

  it("formats pre-1906 historical series (JSDoc: Balfour v Baird)", () => {
    const runs = formatOscolaScottishCase({
      caseName: "Balfour v Baird",
      year: 1857,
      yearType: "round",
      volume: 19,
      reportSeries: "D",
      startPage: 534,
      historicalSeries: true,
    });
    expect(joinText(runs)).toBe("Balfour v Baird (1857) 19 D 534");
  });

  it("renders italic case name with roman 'v'", () => {
    const runs = formatOscolaScottishCase({
      caseName: "Smith v Jones",
      year: 2020,
      yearType: "round",
      reportSeries: "SC",
      startPage: 1,
    });
    expect(runs[0]).toEqual({ text: "Smith", italic: true });
    expect(runs[1]).toEqual({ text: " v " });
    expect(runs[2]).toEqual({ text: "Jones", italic: true });
  });

  it("adds court identifier for non-implied series without neutral citation", () => {
    const runs = formatOscolaScottishCase({
      caseName: "A v B",
      year: 1990,
      yearType: "round",
      reportSeries: "GWD",
      startPage: 100,
      courtId: "CSIH",
    });
    expect(joinText(runs)).toBe("A v B (1990) GWD 100 (CSIH)");
  });

  it("does not add court for implied series (SC)", () => {
    const runs = formatOscolaScottishCase({
      caseName: "A v B",
      year: 2000,
      yearType: "round",
      reportSeries: "SC",
      startPage: 50,
      courtId: "CSIH",
    });
    expect(joinText(runs)).not.toContain("(CSIH)");
  });

  it("does not add court when neutral citation present", () => {
    const runs = formatOscolaScottishCase({
      caseName: "A v B",
      year: 2010,
      yearType: "round",
      reportSeries: "GWD",
      startPage: 100,
      neutralCitation: { year: 2010, court: "CSOH", number: 5 },
      courtId: "CSOH",
    });
    expect(joinText(runs)).not.toContain("(CSOH)");
  });

  it("includes pinpoint", () => {
    const runs = formatOscolaScottishCase({
      caseName: "A v B",
      year: 2000,
      yearType: "round",
      reportSeries: "SC",
      startPage: 50,
      pinpoint: "[10]",
    });
    expect(joinText(runs)).toContain(", [10]");
  });

  it("formats square bracket year", () => {
    const runs = formatOscolaScottishCase({
      caseName: "A v B",
      year: 2015,
      yearType: "square",
      reportSeries: "SC",
      startPage: 10,
    });
    expect(joinText(runs)).toContain("[2015] SC 10");
  });

  it("SCOTTISH_COURT_IDS includes expected courts", () => {
    expect(SCOTTISH_COURT_IDS).toContain("CSIH");
    expect(SCOTTISH_COURT_IDS).toContain("CSOH");
    expect(SCOTTISH_COURT_IDS).toContain("HCJAC");
  });

  it("SCOTTISH_HISTORICAL_SERIES maps correctly", () => {
    expect(SCOTTISH_HISTORICAL_SERIES.get("S")).toBe("Shaw");
    expect(SCOTTISH_HISTORICAL_SERIES.get("D")).toBe("Dunlop");
    expect(SCOTTISH_HISTORICAL_SERIES.get("R")).toBe("Rettie");
    expect(SCOTTISH_HISTORICAL_SERIES.get("F")).toBe("Fraser");
    expect(SCOTTISH_HISTORICAL_SERIES.get("M")).toBe("Macpherson");
  });
});

// =============================================================================
// 3. OSCOLA NI CASES (cases-ni.ts)
// =============================================================================

describe("OSC-004: formatOscolaNICase", () => {
  it("formats NI case with neutral + report (JSDoc: Re McFarland)", () => {
    const runs = formatOscolaNICase({
      caseName: "Re McFarland",
      neutralCitation: { year: 2004, court: "NICA", number: 29 },
      reportCitation: {
        year: 2004,
        yearType: "square",
        series: "NI",
        startPage: 380,
      },
    });
    expect(joinText(runs)).toBe(
      "Re McFarland [2004] NICA 29, [2004] NI 380"
    );
  });

  it("formats NI case with neutral only (JSDoc: R v Magee)", () => {
    const runs = formatOscolaNICase({
      caseName: "R v Magee",
      neutralCitation: { year: 2001, court: "NIQB", number: 14 },
    });
    expect(joinText(runs)).toBe("R v Magee [2001] NIQB 14");
  });

  it("renders italic case name with roman 'v'", () => {
    const runs = formatOscolaNICase({
      caseName: "R v Magee",
      neutralCitation: { year: 2001, court: "NIQB", number: 14 },
    });
    expect(runs[0]).toEqual({ text: "R", italic: true });
    expect(runs[1]).toEqual({ text: " v " });
    expect(runs[2]).toEqual({ text: "Magee", italic: true });
  });

  it("adds court for non-implied series without neutral citation", () => {
    const runs = formatOscolaNICase({
      caseName: "A v B",
      reportCitation: {
        year: 1998,
        yearType: "square",
        series: "NI",
        startPage: 50,
      },
      courtId: "NICA",
    });
    // NI is not in the implied set, so court should appear
    expect(joinText(runs)).toBe("A v B [1998] NI 50 (NICA)");
  });

  it("does not add court when neutral citation present", () => {
    const runs = formatOscolaNICase({
      caseName: "A v B",
      neutralCitation: { year: 2010, court: "NICA", number: 1 },
      reportCitation: {
        year: 2010,
        yearType: "square",
        series: "NI",
        startPage: 100,
      },
      courtId: "NICA",
    });
    expect(joinText(runs)).not.toContain("(NICA)");
  });

  it("does not add court for implied series (NIJB) without neutral", () => {
    const runs = formatOscolaNICase({
      caseName: "A v B",
      reportCitation: {
        year: 2005,
        yearType: "square",
        series: "NIJB",
        startPage: 10,
      },
      courtId: "NIQB",
    });
    expect(joinText(runs)).not.toContain("(NIQB)");
  });

  it("includes pinpoint", () => {
    const runs = formatOscolaNICase({
      caseName: "A v B",
      neutralCitation: { year: 2020, court: "NICA", number: 5 },
      pinpoint: "[15]",
    });
    expect(joinText(runs)).toBe("A v B [2020] NICA 5, [15]");
  });

  it("handles report citation with volume", () => {
    const runs = formatOscolaNICase({
      caseName: "X v Y",
      reportCitation: {
        year: 2000,
        yearType: "square",
        volume: 2,
        series: "NI",
        startPage: 100,
      },
    });
    expect(joinText(runs)).toBe("X v Y [2000] 2 NI 100");
  });

  it("NI_COURT_IDS includes expected courts", () => {
    expect(NI_COURT_IDS).toContain("NICA");
    expect(NI_COURT_IDS).toContain("NIQB");
    expect(NI_COURT_IDS).toContain("NICh");
    expect(NI_COURT_IDS).toContain("NIFam");
  });
});

// =============================================================================
// 4. OSCOLA LEGISLATION (legislation.ts)
// =============================================================================

describe("OSC-005: formatOscolaPrimaryLegislation", () => {
  it("formats UK Act (JSDoc: Human Rights Act 1998)", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Human Rights Act",
      year: 1998,
      type: "uk",
      pinpoint: "s 6",
    });
    expect(joinText(runs)).toBe("Human Rights Act 1998, s 6");
  });

  it("formats UK Act without pinpoint (JSDoc: Scotland Act)", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Scotland Act",
      year: 1998,
      type: "uk",
      pinpoint: "s 29",
    });
    expect(joinText(runs)).toBe("Scotland Act 1998, s 29");
  });

  it("formats Scottish asp (JSDoc: Adoption and Children)", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Adoption and Children (Scotland) Act",
      year: 2007,
      type: "asp",
      number: 4,
    });
    expect(joinText(runs)).toBe(
      "Adoption and Children (Scotland) Act 2007 (asp 4)"
    );
  });

  it("formats Welsh anaw (JSDoc: Legislation (Wales) Act)", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Legislation (Wales) Act",
      year: 2019,
      type: "anaw",
      number: 4,
    });
    expect(joinText(runs)).toBe("Legislation (Wales) Act 2019 (anaw 4)");
  });

  it("formats NI Act (JSDoc: Justice (Northern Ireland) Act)", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Justice (Northern Ireland) Act",
      year: 2002,
      type: "ni",
    });
    expect(joinText(runs)).toBe("Justice (Northern Ireland) Act 2002 (NI)");
  });

  it("formats Welsh asc type", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Curriculum and Assessment (Wales) Act",
      year: 2021,
      type: "asc",
      number: 4,
    });
    expect(joinText(runs)).toBe(
      "Curriculum and Assessment (Wales) Act 2021 (asc 4)"
    );
  });

  it("renders in roman (not italic)", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Human Rights Act",
      year: 1998,
      type: "uk",
    });
    expect(runs[0].italic).toBeUndefined();
  });

  it("includes regnal year and chapter for historical statutes", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Combination Act",
      year: 1799,
      type: "uk",
      regnalYear: "39 & 40 Geo III",
      chapter: "c 67",
    });
    expect(joinText(runs)).toBe(
      "Combination Act 1799, 39 & 40 Geo III, c 67"
    );
  });

  it("includes regnal year without chapter", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Statute of Uses",
      year: 1535,
      type: "uk",
      regnalYear: "27 Hen VIII",
    });
    expect(joinText(runs)).toBe("Statute of Uses 1535, 27 Hen VIII");
  });

  it("asp without number omits suffix", () => {
    const runs = formatOscolaPrimaryLegislation({
      title: "Test Act",
      year: 2010,
      type: "asp",
    });
    expect(joinText(runs)).toBe("Test Act 2010");
  });
});

describe("OSC-006: formatOscolaSecondaryLegislation", () => {
  it("formats SI (JSDoc: Civil Procedure Rules)", () => {
    const runs = formatOscolaSecondaryLegislation({
      title: "Civil Procedure Rules",
      year: 1998,
      type: "si",
      number: 3132,
    });
    expect(joinText(runs)).toBe(
      "Civil Procedure Rules 1998, SI 1998/3132"
    );
  });

  it("formats SSI (JSDoc: NHS Scotland Regulations)", () => {
    const runs = formatOscolaSecondaryLegislation({
      title:
        "National Health Service (General Medical Services Contracts) (Scotland) Regulations",
      year: 2018,
      type: "ssi",
      number: 66,
    });
    expect(joinText(runs)).toBe(
      "National Health Service (General Medical Services Contracts) (Scotland) Regulations 2018, SSI 2018/66"
    );
  });

  it("formats SR (JSDoc: Phosphorus Compounds)", () => {
    const runs = formatOscolaSecondaryLegislation({
      title:
        "Phosphorus Compounds (Prohibition) Regulations (Northern Ireland)",
      year: 1989,
      type: "sr",
      number: 182,
    });
    expect(joinText(runs)).toBe(
      "Phosphorus Compounds (Prohibition) Regulations (Northern Ireland) 1989, SR 1989/182"
    );
  });

  it("formats WSI", () => {
    const runs = formatOscolaSecondaryLegislation({
      title: "Education (Wales) Regulations",
      year: 2020,
      type: "wsi",
      number: 100,
    });
    expect(joinText(runs)).toBe(
      "Education (Wales) Regulations 2020, WSI 2020/100"
    );
  });

  it("includes pinpoint", () => {
    const runs = formatOscolaSecondaryLegislation({
      title: "Civil Procedure Rules",
      year: 1998,
      type: "si",
      number: 3132,
      pinpoint: "r 3.1",
    });
    expect(joinText(runs)).toBe(
      "Civil Procedure Rules 1998, SI 1998/3132, r 3.1"
    );
  });

  it("renders in roman (not italic)", () => {
    const runs = formatOscolaSecondaryLegislation({
      title: "Test Rules",
      year: 2020,
      type: "si",
      number: 1,
    });
    expect(runs[0].italic).toBeUndefined();
  });
});

// =============================================================================
// 5. OSCOLA PARLIAMENTARY (parliamentary.ts)
// =============================================================================

describe("OSC-007: formatOscolaHansard", () => {
  it("formats HC Deb with speaker (JSDoc)", () => {
    const runs = formatOscolaHansard({
      chamber: "HC",
      date: "3 March 2020",
      volume: 672,
      column: 800,
      speaker: "Boris Johnson",
    });
    expect(joinText(runs)).toBe(
      "HC Deb 3 March 2020, vol 672, col 800 (Boris Johnson)"
    );
  });

  it("formats HL Deb without speaker (JSDoc)", () => {
    const runs = formatOscolaHansard({
      chamber: "HL",
      date: "18 November 2019",
      volume: 800,
      column: 60,
    });
    expect(joinText(runs)).toBe(
      "HL Deb 18 November 2019, vol 800, col 60"
    );
  });

  it("handles column range as string", () => {
    const runs = formatOscolaHansard({
      chamber: "HC",
      date: "1 January 2020",
      volume: 100,
      column: "800-05",
    });
    expect(joinText(runs)).toBe(
      "HC Deb 1 January 2020, vol 100, col 800-05"
    );
  });
});

describe("OSC-007: formatOscolaCommandPaper", () => {
  it("formats command paper (JSDoc: Striking the Balance)", () => {
    const runs = formatOscolaCommandPaper({
      author: "Lord Chancellor's Department",
      title: "Striking the Balance",
      seriesPrefix: "Cm",
      paperNumber: "6189",
      year: 2004,
    });
    expect(joinText(runs)).toBe(
      "Lord Chancellor's Department, Striking the Balance (Cm 6189, 2004)"
    );
  });

  it("title is italic", () => {
    const runs = formatOscolaCommandPaper({
      author: "Ministry of Justice",
      title: "Proposals for the Reform of Legal Aid in England and Wales",
      seriesPrefix: "Cm",
      paperNumber: "7967",
      year: 2010,
    });
    const titleRun = runs.find(
      (r) =>
        r.text ===
        "Proposals for the Reform of Legal Aid in England and Wales"
    );
    expect(titleRun?.italic).toBe(true);
  });

  it("includes pinpoint", () => {
    const runs = formatOscolaCommandPaper({
      author: "Author",
      title: "Title",
      seriesPrefix: "Cm",
      paperNumber: "1234",
      year: 2020,
      pinpoint: "para 5",
    });
    expect(joinText(runs)).toBe("Author, Title (Cm 1234, 2020) para 5");
  });
});

describe("OSC-007: formatOscolaLawCommission", () => {
  it("formats Law Commission report (JSDoc)", () => {
    const runs = formatOscolaLawCommission({
      title: "Aggravated, Exemplary and Restitutionary Damages",
      reportNumber: 247,
      year: 1997,
    });
    expect(joinText(runs)).toBe(
      "Law Commission, Aggravated, Exemplary and Restitutionary Damages (Law Com No 247, 1997)"
    );
  });

  it("title is italic", () => {
    const runs = formatOscolaLawCommission({
      title: "Test Report",
      reportNumber: 100,
      year: 2020,
    });
    const titleRun = runs.find((r) => r.text === "Test Report");
    expect(titleRun?.italic).toBe(true);
  });

  it("includes pinpoint", () => {
    const runs = formatOscolaLawCommission({
      title: "Report",
      reportNumber: 100,
      year: 2020,
      pinpoint: "para 2.5",
    });
    expect(joinText(runs)).toContain("para 2.5");
  });
});

describe("OSC-007: formatOscolaParliamentaryReport", () => {
  it("formats parliamentary report (JSDoc: Coroner Service)", () => {
    const runs = formatOscolaParliamentaryReport({
      committee: "House of Commons Justice Committee",
      title: "The Coroner Service",
      session: "2019-21",
      paperNumber: "HC 68",
      year: 2021,
    });
    expect(joinText(runs)).toBe(
      "House of Commons Justice Committee, The Coroner Service (2019-21, HC 68)"
    );
  });

  it("title is italic", () => {
    const runs = formatOscolaParliamentaryReport({
      committee: "Committee",
      title: "Report Title",
      year: 2020,
    });
    const titleRun = runs.find((r) => r.text === "Report Title");
    expect(titleRun?.italic).toBe(true);
  });

  it("omits parenthetical when no session or paper number", () => {
    const runs = formatOscolaParliamentaryReport({
      committee: "Committee",
      title: "Title",
      year: 2020,
    });
    expect(joinText(runs)).toBe("Committee, Title");
  });

  it("includes only session without paper number", () => {
    const runs = formatOscolaParliamentaryReport({
      committee: "Committee",
      title: "Title",
      session: "2020-21",
      year: 2021,
    });
    expect(joinText(runs)).toBe("Committee, Title (2020-21)");
  });

  it("includes pinpoint", () => {
    const runs = formatOscolaParliamentaryReport({
      committee: "Committee",
      title: "Title",
      session: "2020-21",
      paperNumber: "HC 1",
      year: 2021,
      pinpoint: "para 10",
    });
    expect(joinText(runs)).toContain("para 10");
  });
});

// =============================================================================
// 6. OSCOLA EU (eu.ts)
// =============================================================================

describe("OSC-008: formatEuLegislation", () => {
  it("formats EU regulation (JSDoc)", () => {
    const runs = formatEuLegislation({
      instrumentType: "Council Regulation (EC)",
      number: "139/2004",
      title:
        "on the control of concentrations between undertakings",
      year: 2004,
      ojSeries: "L24",
      ojPage: "1",
    });
    expect(joinText(runs)).toBe(
      "Council Regulation (EC) 139/2004 on the control of concentrations between undertakings [2004] OJ L24/1"
    );
  });

  it("renders title in roman (not italic)", () => {
    const runs = formatEuLegislation({
      instrumentType: "Directive",
      number: "2006/123/EC",
      title: "on services in the internal market",
      year: 2006,
      ojSeries: "L376",
      ojPage: "36",
    });
    const titleRun = runs.find(
      (r) => r.text === "on services in the internal market"
    );
    expect(titleRun?.italic).toBeUndefined();
  });
});

describe("OSC-008: formatCjeuCase", () => {
  it("formats CJEU case with ECLI (JSDoc: Kadi)", () => {
    const runs = formatCjeuCase({
      caseNumber: "C-402/05 P",
      caseName: "Kadi v Council of the European Union",
      ecli: "ECLI:EU:C:2008:461",
    });
    expect(joinText(runs)).toBe(
      "Case C-402/05 P Kadi v Council of the European Union ECLI:EU:C:2008:461"
    );
  });

  it("formats CJEU case with ECR (JSDoc: Costa v ENEL)", () => {
    const runs = formatCjeuCase({
      caseNumber: "C-6/64",
      caseName: "Costa v ENEL",
      year: 1964,
      reportSeries: "ECR",
      page: "585",
    });
    expect(joinText(runs)).toBe(
      "Case C-6/64 Costa v ENEL [1964] ECR 585"
    );
  });

  it("case name is italic", () => {
    const runs = formatCjeuCase({
      caseNumber: "C-1/00",
      caseName: "Test Case",
      ecli: "ECLI:EU:C:2000:1",
    });
    const nameRun = runs.find((r) => r.text === "Test Case");
    expect(nameRun?.italic).toBe(true);
  });

  it("includes pinpoint", () => {
    const runs = formatCjeuCase({
      caseNumber: "C-1/00",
      caseName: "Test",
      ecli: "ECLI:EU:C:2000:1",
      pinpoint: "para 25",
    });
    expect(joinText(runs)).toContain(", para 25");
  });

  it("handles case with no ECLI and no ECR", () => {
    const runs = formatCjeuCase({
      caseNumber: "C-999/99",
      caseName: "Bare Case",
    });
    expect(joinText(runs)).toBe("Case C-999/99 Bare Case");
  });
});

describe("OSC-008: formatGeneralCourtCase", () => {
  it("formats General Court case (JSDoc: Kadi T-315/01)", () => {
    const runs = formatGeneralCourtCase({
      caseNumber: "T-315/01",
      caseName: "Kadi v Council of the European Union",
      year: 2005,
      reportSeries: "ECR",
      page: "II-3649",
    });
    expect(joinText(runs)).toBe(
      "Case T-315/01 Kadi v Council of the European Union [2005] ECR II-3649"
    );
  });
});

describe("OSC-008: formatAssimilatedEuLaw", () => {
  it("formats assimilated EU law (JSDoc: General Food Regulations)", () => {
    const runs = formatAssimilatedEuLaw({
      shortTitle: "General Food Regulations 2004",
      siYear: 2004,
      siNumber: 3279,
      originalInstrument: "Council Regulation (EC) 178/2002",
    });
    expect(joinText(runs)).toBe(
      "General Food Regulations 2004, SI 2004/3279 (originally Council Regulation (EC) 178/2002)"
    );
  });

  it("includes 'as amended' note", () => {
    const runs = formatAssimilatedEuLaw({
      shortTitle: "Test Regs",
      siYear: 2020,
      siNumber: 100,
      originalInstrument: "Directive 2008/50/EC",
      amended: true,
    });
    expect(joinText(runs)).toContain("(as amended)");
  });

  it("includes pinpoint", () => {
    const runs = formatAssimilatedEuLaw({
      shortTitle: "Test Regs",
      siYear: 2020,
      siNumber: 100,
      originalInstrument: "Directive 2008/50/EC",
      pinpoint: "reg 5",
    });
    expect(joinText(runs)).toContain("reg 5");
  });
});

describe("OSC-008: formatEuTreaty", () => {
  it("formats EU treaty (JSDoc: TFEU)", () => {
    const runs = formatEuTreaty({
      title:
        "Treaty on the Functioning of the European Union",
      year: 2012,
      ojReference: "C326/47",
      pinpoint: "art 267",
    });
    expect(joinText(runs)).toBe(
      "Treaty on the Functioning of the European Union [2012] OJ C326/47, art 267"
    );
  });

  it("renders title in roman", () => {
    const runs = formatEuTreaty({ title: "Treaty Title" });
    expect(runs[0].italic).toBeUndefined();
  });

  it("handles title only (no OJ, no pinpoint)", () => {
    const runs = formatEuTreaty({
      title: "Treaty on European Union",
    });
    expect(joinText(runs)).toBe("Treaty on European Union");
  });
});

// =============================================================================
// 7. OSCOLA ECHR (echr.ts)
// =============================================================================

describe("OSC-009: formatEcthrCase", () => {
  it("formats ECtHR case (JSDoc: Othman)", () => {
    const runs = formatEcthrCase({
      caseName: "Othman (Abu Qatada)",
      respondentState: "United Kingdom",
      applicationNumber: "8139/09",
      date: "17 January 2012",
    });
    expect(joinText(runs)).toBe(
      "Othman (Abu Qatada) v United Kingdom App no 8139/09 (ECtHR, 17 January 2012)"
    );
  });

  it("formats Grand Chamber case (JSDoc: Al-Adsani)", () => {
    const runs = formatEcthrCase({
      caseName: "Al-Adsani",
      respondentState: "United Kingdom",
      applicationNumber: "35763/97",
      chamber: "Grand Chamber",
      date: "21 November 2001",
    });
    expect(joinText(runs)).toBe(
      "Al-Adsani v United Kingdom App no 35763/97 (ECtHR [GC], 21 November 2001)"
    );
  });

  it("case name is italic", () => {
    const runs = formatEcthrCase({
      caseName: "Test",
      respondentState: "France",
      applicationNumber: "1/01",
      date: "1 January 2020",
    });
    expect(runs[0].italic).toBe(true);
  });

  it("uses full name if caseName already contains 'v'", () => {
    const runs = formatEcthrCase({
      caseName: "A v United Kingdom",
      respondentState: "United Kingdom",
      applicationNumber: "1/01",
      date: "1 January 2020",
    });
    expect(runs[0].text).toBe("A v United Kingdom");
  });

  it("Section chamber renders without chamber designation", () => {
    const runs = formatEcthrCase({
      caseName: "Test",
      respondentState: "Italy",
      applicationNumber: "1/01",
      chamber: "Section",
      date: "1 January 2020",
    });
    expect(joinText(runs)).toContain("(ECtHR, 1 January 2020)");
  });

  it("custom chamber name is included", () => {
    const runs = formatEcthrCase({
      caseName: "Test",
      respondentState: "Germany",
      applicationNumber: "1/01",
      chamber: "Fourth Section",
      date: "1 January 2020",
    });
    expect(joinText(runs)).toContain("ECtHR, Fourth Section");
  });

  it("includes report reference", () => {
    const runs = formatEcthrCase({
      caseName: "Test",
      respondentState: "UK",
      applicationNumber: "1/01",
      date: "1 January 2020",
      reportReference: "ECHR 2020-I",
    });
    expect(joinText(runs)).toContain("ECHR 2020-I");
  });

  it("includes pinpoint", () => {
    const runs = formatEcthrCase({
      caseName: "Test",
      respondentState: "UK",
      applicationNumber: "1/01",
      date: "1 January 2020",
      pinpoint: "para 50",
    });
    expect(joinText(runs)).toContain("para 50");
  });
});

describe("OSC-009: formatEcthrDecision", () => {
  it("formats ECtHR decision (JSDoc: Bosphorus)", () => {
    const runs = formatEcthrDecision({
      caseName: "Bosphorus Hava Yollari Turizm ve Ticaret AS",
      respondentState: "Ireland",
      applicationNumber: "45036/98",
      date: "13 September 2001",
    });
    expect(joinText(runs)).toBe(
      "Bosphorus Hava Yollari Turizm ve Ticaret AS v Ireland (dec) App no 45036/98 (ECtHR, 13 September 2001)"
    );
  });

  it("includes (dec) marker", () => {
    const runs = formatEcthrDecision({
      caseName: "X",
      respondentState: "UK",
      applicationNumber: "1/01",
      date: "1 January 2020",
    });
    expect(joinText(runs)).toContain("(dec)");
  });

  it("Grand Chamber decision", () => {
    const runs = formatEcthrDecision({
      caseName: "Test",
      respondentState: "France",
      applicationNumber: "1/01",
      date: "1 January 2020",
      chamber: "Grand Chamber",
    });
    expect(joinText(runs)).toContain("ECtHR [GC]");
  });
});

describe("OSC-009: formatEcommhrDecision", () => {
  it("formats Commission decision (JSDoc: X v UK)", () => {
    const runs = formatEcommhrDecision({
      caseName: "X",
      respondentState: "United Kingdom",
      applicationNumber: "7215/75",
      date: "12 July 1978",
    });
    expect(joinText(runs)).toBe(
      "X v United Kingdom App no 7215/75 (Commission decision, 12 July 1978)"
    );
  });

  it("case name is italic", () => {
    const runs = formatEcommhrDecision({
      caseName: "Y",
      respondentState: "France",
      applicationNumber: "1/01",
      date: "1 January 1980",
    });
    expect(runs[0].italic).toBe(true);
  });
});

describe("OSC-009: formatCouncilOfEuropeTreaty", () => {
  it("formats CoE treaty (JSDoc: ECHR)", () => {
    const runs = formatCouncilOfEuropeTreaty({
      title:
        "Convention for the Protection of Human Rights and Fundamental Freedoms",
      shortTitle: "European Convention on Human Rights, as amended",
      etsNumber: "CETS No 005",
    });
    expect(joinText(runs)).toBe(
      "Convention for the Protection of Human Rights and Fundamental Freedoms (European Convention on Human Rights, as amended) (CETS No 005)"
    );
  });

  it("title is italic", () => {
    const runs = formatCouncilOfEuropeTreaty({
      title: "Test Treaty",
    });
    expect(runs[0].italic).toBe(true);
  });

  it("includes adopted date", () => {
    const runs = formatCouncilOfEuropeTreaty({
      title: "Test Treaty",
      adoptedDate: "4 November 1950",
    });
    expect(joinText(runs)).toContain("(adopted 4 November 1950)");
  });

  it("includes pinpoint", () => {
    const runs = formatCouncilOfEuropeTreaty({
      title: "ECHR",
      pinpoint: "art 6",
    });
    expect(joinText(runs)).toContain("art 6");
  });
});

describe("OSC-009: formatCouncilOfEuropeDocument", () => {
  it("formats CoE document (JSDoc: Recommendation)", () => {
    const runs = formatCouncilOfEuropeDocument({
      body: "Committee of Ministers",
      title:
        "Recommendation Rec(2004)6 of the Committee of Ministers to Member States on the Improvement of Domestic Remedies",
      date: "12 May 2004",
    });
    expect(joinText(runs)).toBe(
      "Committee of Ministers, Recommendation Rec(2004)6 of the Committee of Ministers to Member States on the Improvement of Domestic Remedies (12 May 2004)"
    );
  });

  it("title is italic", () => {
    const runs = formatCouncilOfEuropeDocument({
      body: "Body",
      title: "Document Title",
      date: "1 January 2020",
    });
    const titleRun = runs.find((r) => r.text === "Document Title");
    expect(titleRun?.italic).toBe(true);
  });

  it("includes document number", () => {
    const runs = formatCouncilOfEuropeDocument({
      body: "Body",
      title: "Title",
      documentNumber: "Doc 123",
      date: "1 January 2020",
    });
    expect(joinText(runs)).toContain("(Doc 123, 1 January 2020)");
  });

  it("omits document number when absent", () => {
    const runs = formatCouncilOfEuropeDocument({
      body: "Body",
      title: "Title",
      date: "1 January 2020",
    });
    expect(joinText(runs)).toContain("(1 January 2020)");
  });
});

// =============================================================================
// 8. OSCOLA INTERNATIONAL (international.ts)
// =============================================================================

describe("OSC-010: formatTreaty", () => {
  it("formats treaty (JSDoc: Convention on the Rights of the Child)", () => {
    const runs = formatTreaty({
      title: "Convention on the Rights of the Child",
      adoptedDate: "20 November 1989",
      entryIntoForceDate: "2 September 1990",
      treatySeries: "UNTS",
      seriesVolume: 1577,
      startingPage: 3,
    });
    expect(joinText(runs)).toBe(
      "Convention on the Rights of the Child (adopted 20 November 1989, entered into force 2 September 1990) 1577 UNTS 3"
    );
  });

  it("formats treaty with pinpoint (JSDoc: VCLT)", () => {
    const runs = formatTreaty({
      title: "Vienna Convention on the Law of Treaties",
      adoptedDate: "23 May 1969",
      entryIntoForceDate: "27 January 1980",
      treatySeries: "UNTS",
      seriesVolume: 1155,
      startingPage: 331,
      pinpoint: "art 31",
    });
    expect(joinText(runs)).toBe(
      "Vienna Convention on the Law of Treaties (adopted 23 May 1969, entered into force 27 January 1980) 1155 UNTS 331, art 31"
    );
  });

  it("title is italic", () => {
    const runs = formatTreaty({ title: "Test Treaty" });
    expect(runs[0].italic).toBe(true);
  });

  it("handles not yet in force", () => {
    const runs = formatTreaty({
      title: "Test Treaty",
      adoptedDate: "1 January 2025",
      notYetInForce: true,
    });
    expect(joinText(runs)).toContain("not yet in force");
  });

  it("handles treaty with no dates or series", () => {
    const runs = formatTreaty({ title: "Bare Treaty" });
    expect(joinText(runs)).toBe("Bare Treaty");
  });
});

describe("OSC-010: formatUnDocument", () => {
  it("formats UN document (JSDoc: UNGA Res 217A)", () => {
    const runs = formatUnDocument({
      body: "UNGA",
      resolutionNumber: "217A",
      sessionInfo: "III",
      date: "10 December 1948",
      documentSymbol: "A/810",
    });
    expect(joinText(runs)).toBe(
      "UNGA Res 217A (III) (10 December 1948) UN Doc A/810"
    );
  });

  it("formats UNSC resolution (JSDoc: UNSC Res 1373)", () => {
    const runs = formatUnDocument({
      body: "UNSC",
      resolutionNumber: "1373",
      date: "28 September 2001",
      documentSymbol: "S/RES/1373",
    });
    expect(joinText(runs)).toBe(
      "UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373"
    );
  });

  it("includes title in italic when provided", () => {
    const runs = formatUnDocument({
      body: "UNGA",
      title: "Important Resolution",
      date: "1 January 2020",
      documentSymbol: "A/DOC/1",
    });
    const titleRun = runs.find((r) => r.text === "Important Resolution");
    expect(titleRun?.italic).toBe(true);
  });

  it("includes pinpoint", () => {
    const runs = formatUnDocument({
      body: "UNGA",
      date: "1 January 2020",
      documentSymbol: "A/1",
      pinpoint: "para 5",
    });
    expect(joinText(runs)).toContain(", para 5");
  });
});

describe("OSC-010: formatUnResolution", () => {
  it("formats UN resolution (JSDoc: UNGA Res 61/295)", () => {
    const runs = formatUnResolution({
      body: "UNGA",
      resolutionNumber: "61/295",
      date: "13 September 2007",
    });
    expect(joinText(runs)).toBe(
      "UNGA Res 61/295 (13 September 2007)"
    );
  });

  it("includes document symbol", () => {
    const runs = formatUnResolution({
      body: "UNSC",
      resolutionNumber: "1373",
      date: "28 September 2001",
      documentSymbol: "S/RES/1373",
    });
    expect(joinText(runs)).toContain("UN Doc S/RES/1373");
  });

  it("includes pinpoint", () => {
    const runs = formatUnResolution({
      body: "UNGA",
      resolutionNumber: "1/1",
      date: "1 January 2020",
      pinpoint: "art 1",
    });
    expect(joinText(runs)).toContain(", art 1");
  });
});

describe("OSC-010: formatIcjCase", () => {
  it("formats ICJ case (JSDoc: Congo v Uganda)", () => {
    const runs = formatIcjCase({
      caseName:
        "Case Concerning Armed Activities on the Territory of the Congo (Democratic Republic of the Congo v Uganda)",
      phase: "Merits",
      year: 2005,
      page: 168,
    });
    expect(joinText(runs)).toBe(
      "Case Concerning Armed Activities on the Territory of the Congo (Democratic Republic of the Congo v Uganda) (Merits) [2005] ICJ Rep 168"
    );
  });

  it("case name is italic", () => {
    const runs = formatIcjCase({
      caseName: "Test Case",
      year: 2000,
    });
    expect(runs[0].italic).toBe(true);
  });

  it("includes pinpoint and judge", () => {
    const runs = formatIcjCase({
      caseName: "Test Case",
      year: 2000,
      page: 100,
      pinpoint: "para 5",
      judge: "Judge X dissenting",
    });
    expect(joinText(runs)).toContain(", para 5");
    expect(joinText(runs)).toContain("(Judge X dissenting)");
  });

  it("handles custom report series", () => {
    const runs = formatIcjCase({
      caseName: "Test",
      year: 2000,
      reportSeries: "PCIJ Rep",
      page: 10,
    });
    expect(joinText(runs)).toContain("PCIJ Rep");
  });

  it("handles no page", () => {
    const runs = formatIcjCase({
      caseName: "Test",
      year: 2020,
    });
    expect(joinText(runs)).toBe("Test [2020] ICJ Rep");
  });
});

describe("OSC-010: formatItlosCase", () => {
  it("formats ITLOS case (JSDoc: Saiga)", () => {
    const runs = formatItlosCase({
      caseName:
        'The M/V "Saiga" (No 2) Case (Saint Vincent and the Grenadines v Guinea)',
      phase: "Merits",
      year: 1999,
      page: 10,
    });
    expect(joinText(runs)).toBe(
      'The M/V "Saiga" (No 2) Case (Saint Vincent and the Grenadines v Guinea) (Merits) (1999) ITLOS Reports 10'
    );
  });

  it("includes case number", () => {
    const runs = formatItlosCase({
      caseName: "Test Case",
      year: 2010,
      caseNumber: "25",
    });
    expect(joinText(runs)).toContain("(Case No 25)");
  });

  it("includes pinpoint", () => {
    const runs = formatItlosCase({
      caseName: "Test",
      year: 2010,
      pinpoint: "para 5",
    });
    expect(joinText(runs)).toContain(", para 5");
  });
});

describe("OSC-010: formatIccCase", () => {
  it("formats ICC case (JSDoc: Lubanga)", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Lubanga",
      phase: "Judgment",
      court: "ICC",
      chamber: "Trial Chamber I",
      caseNumber: "ICC-01/04-01/06",
      date: "14 March 2012",
    });
    expect(joinText(runs)).toBe(
      "Prosecutor v Lubanga (Judgment) (ICC, Trial Chamber I, Case No ICC-01/04-01/06, 14 March 2012)"
    );
  });

  it("case name is italic", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Test",
      phase: "Phase",
      court: "ICC",
      chamber: "Chamber",
      caseNumber: "ICC-01",
      date: "1 Jan 2020",
    });
    expect(runs[0].italic).toBe(true);
  });

  it("includes pinpoint", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Test",
      phase: "Phase",
      court: "ICC",
      chamber: "Chamber",
      caseNumber: "ICC-01",
      date: "1 Jan 2020",
      pinpoint: "para 10",
    });
    expect(joinText(runs)).toContain("para 10");
  });
});

describe("OSC-010: formatWtoReport", () => {
  it("formats WTO report (JSDoc: Shrimp)", () => {
    const runs = formatWtoReport({
      reportType: "Appellate Body Report",
      title:
        "United States \u2014 Import Prohibition of Certain Shrimp and Shrimp Products",
      documentNumber: "WT/DS58/AB/R",
      date: "12 October 1998",
    });
    expect(joinText(runs)).toBe(
      "Appellate Body Report, United States \u2014 Import Prohibition of Certain Shrimp and Shrimp Products, WT/DS58/AB/R (12 October 1998)"
    );
  });

  it("title is italic", () => {
    const runs = formatWtoReport({
      reportType: "Panel Report",
      title: "Test Title",
      documentNumber: "WT/DS1",
      date: "1 Jan 2020",
    });
    const titleRun = runs.find((r) => r.text === "Test Title");
    expect(titleRun?.italic).toBe(true);
  });

  it("includes pinpoint", () => {
    const runs = formatWtoReport({
      reportType: "Panel Report",
      title: "Title",
      documentNumber: "WT/DS1",
      date: "1 Jan 2020",
      pinpoint: "para 7.5",
    });
    expect(joinText(runs)).toContain(", para 7.5");
  });
});

// =============================================================================
// 9. OSCOLA GenAI (genai.ts)
// =============================================================================

describe("OSC-011: formatGenAiCitation", () => {
  it("formats ChatGPT citation (JSDoc)", () => {
    const runs = formatGenAiCitation({
      toolName: "ChatGPT",
      provider: "OpenAI",
      prompt: "Summarise the rule in Donoghue v Stevenson",
      dateGenerated: "15 March 2026",
      url: "https://chat.openai.com/share/abc123",
    });
    expect(joinText(runs)).toBe(
      "ChatGPT (OpenAI), \u2018Summarise the rule in Donoghue v Stevenson\u2019 (response generated 15 March 2026) <https://chat.openai.com/share/abc123>"
    );
  });

  it("formats Claude citation without URL (JSDoc)", () => {
    const runs = formatGenAiCitation({
      toolName: "Claude",
      provider: "Anthropic",
      prompt:
        "What are the elements of negligence in English law?",
      dateGenerated: "10 January 2026",
    });
    expect(joinText(runs)).toBe(
      "Claude (Anthropic), \u2018What are the elements of negligence in English law?\u2019 (response generated 10 January 2026)"
    );
  });

  it("handles version", () => {
    const runs = formatGenAiCitation({
      toolName: "ChatGPT",
      prompt: "Test prompt",
      dateGenerated: "1 January 2026",
      version: "GPT-4",
    });
    expect(joinText(runs)).toContain("(version GPT-4)");
  });

  it("handles tool without provider", () => {
    const runs = formatGenAiCitation({
      toolName: "Perplexity",
      prompt: "Test",
      dateGenerated: "1 January 2026",
    });
    expect(joinText(runs)).toBe(
      "Perplexity, \u2018Test\u2019 (response generated 1 January 2026)"
    );
  });

  it("uses single curly quotes", () => {
    const runs = formatGenAiCitation({
      toolName: "AI",
      prompt: "Hello",
      dateGenerated: "1 Jan 2026",
    });
    const promptRun = runs.find((r) => r.text.includes("Hello"));
    expect(promptRun?.text).toContain("\u2018");
    expect(promptRun?.text).toContain("\u2019");
  });
});

// =============================================================================
// 10. OSCOLA TABLES (tables.ts)
// =============================================================================

describe("OSC-012: generateTableOfCases", () => {
  it("groups and sorts cases by jurisdiction", () => {
    const sections = generateTableOfCases([
      {
        caseName: "Zebra v Alpha",
        citation: "[2020] UKSC 1",
        jurisdiction: "UK",
      },
      {
        caseName: "Alpha v Beta",
        citation: "[2020] UKSC 2",
        jurisdiction: "UK",
      },
      {
        caseName: "EU Case",
        citation: "Case C-1/00",
        jurisdiction: "EU",
      },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("UK Cases");
    expect(sections[1].heading).toBe("EU Cases");
    // Alpha comes before Zebra
    const ukEntries = sections[0].entries;
    expect(joinText(ukEntries[0])).toContain("Alpha v Beta");
    expect(joinText(ukEntries[1])).toContain("Zebra v Alpha");
  });

  it("case names are NOT italic (de-italicised per OSCOLA 1.6.2)", () => {
    const sections = generateTableOfCases([
      {
        caseName: "Test v Case",
        citation: "[2020] UKSC 1",
        jurisdiction: "UK",
      },
    ]);
    const firstRun = sections[0].entries[0][0];
    expect(firstRun.italic).toBeUndefined();
  });

  it("includes parallel citations", () => {
    const sections = generateTableOfCases([
      {
        caseName: "A v B",
        citation: "[2020] UKSC 1",
        parallelCitations: ["[2020] 1 AC 100"],
        jurisdiction: "UK",
      },
    ]);
    const text = joinText(sections[0].entries[0]);
    expect(text).toContain("[2020] 1 AC 100");
  });

  it("returns empty array for no cases", () => {
    const sections = generateTableOfCases([]);
    expect(sections).toHaveLength(0);
  });

  it("maps unknown jurisdiction to Foreign", () => {
    const sections = generateTableOfCases([
      {
        caseName: "Test",
        citation: "[2020] 1",
        jurisdiction: "Australia",
      },
    ]);
    expect(sections[0].heading).toBe("Foreign Cases");
  });

  it("skips empty jurisdictions", () => {
    const sections = generateTableOfCases([
      {
        caseName: "Test",
        citation: "[2020] 1",
        jurisdiction: "ECtHR",
      },
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("ECtHR Cases");
  });
});

describe("OSC-013: generateTableOfLegislation", () => {
  it("groups legislation by category", () => {
    const sections = generateTableOfLegislation([
      { title: "Act B", year: 2000, category: "primary" },
      { title: "Act A", year: 1999, category: "primary" },
      {
        title: "SI 2020/1",
        year: 2020,
        category: "secondary",
        additionalInfo: "SI 2020/1",
      },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("Primary Legislation");
    expect(sections[1].heading).toBe("Secondary Legislation");
    // Sorted alphabetically
    expect(joinText(sections[0].entries[0])).toContain("Act A");
    expect(joinText(sections[0].entries[1])).toContain("Act B");
  });

  it("legislation is roman (not italic)", () => {
    const sections = generateTableOfLegislation([
      { title: "Test Act", year: 2020, category: "primary" },
    ]);
    expect(sections[0].entries[0][0].italic).toBeUndefined();
  });

  it("includes additional info", () => {
    const sections = generateTableOfLegislation([
      {
        title: "Regs",
        year: 2020,
        additionalInfo: "SI 2020/100",
        category: "secondary",
      },
    ]);
    const text = joinText(sections[0].entries[0]);
    expect(text).toContain("SI 2020/100");
  });

  it("handles EU legislation category", () => {
    const sections = generateTableOfLegislation([
      {
        title: "Regulation 139/2004",
        category: "eu",
        additionalInfo: "[2004] OJ L24/1",
      },
    ]);
    expect(sections[0].heading).toBe("EU Legislation");
  });

  it("handles treaty category", () => {
    const sections = generateTableOfLegislation([
      { title: "ECHR", category: "treaty" },
    ]);
    expect(sections[0].heading).toBe(
      "Treaties and International Instruments"
    );
  });

  it("returns empty array for no legislation", () => {
    expect(generateTableOfLegislation([])).toHaveLength(0);
  });
});

// =============================================================================
// 11. OSCOLA IRELAND (ireland.ts)
// =============================================================================

describe("OSC-014: formatIrishCase", () => {
  it("formats Irish case with neutral citation (JSDoc: Langan)", () => {
    const runs = formatIrishCase({
      caseName: "Langan v Health Service Executive",
      neutralCitation: { year: 2024, court: "IESC", number: 1 },
    });
    expect(joinText(runs)).toBe(
      "Langan v Health Service Executive [2024] IESC 1"
    );
  });

  it("formats Irish case with report citation (JSDoc: Maguire v Ardagh)", () => {
    const runs = formatIrishCase({
      caseName: "Maguire v Ardagh",
      reportCitation: { year: 2002, volume: 1, series: "IR", page: 385 },
    });
    expect(joinText(runs)).toBe("Maguire v Ardagh [2002] 1 IR 385");
  });

  it("case name is italic", () => {
    const runs = formatIrishCase({
      caseName: "Test v Case",
      neutralCitation: { year: 2020, court: "IEHC", number: 1 },
    });
    expect(runs[0].italic).toBe(true);
  });

  it("includes parallel report citation", () => {
    const runs = formatIrishCase({
      caseName: "A v B",
      neutralCitation: { year: 2020, court: "IESC", number: 5 },
      reportCitation: { year: 2020, volume: 1, series: "IR", page: 100 },
    });
    expect(joinText(runs)).toBe("A v B [2020] IESC 5, [2020] 1 IR 100");
  });

  it("includes pinpoint", () => {
    const runs = formatIrishCase({
      caseName: "A v B",
      neutralCitation: { year: 2020, court: "IESC", number: 5 },
      pinpoint: "[25]",
    });
    expect(joinText(runs)).toContain(", [25]");
  });

  it("handles report without volume", () => {
    const runs = formatIrishCase({
      caseName: "Test",
      reportCitation: { year: 2020, series: "ILRM", page: 50 },
    });
    expect(joinText(runs)).toBe("Test [2020] ILRM 50");
  });
});

describe("OSC-014: formatIrishAct", () => {
  it("formats Irish Act (JSDoc: Planning and Development Act)", () => {
    const runs = formatIrishAct({
      shortTitle: "Planning and Development Act",
      year: 2000,
      pinpoint: "s 37",
    });
    expect(joinText(runs)).toBe(
      "Planning and Development Act 2000, s 37"
    );
  });

  it("formats Irish Act without pinpoint (JSDoc: Criminal Justice Act)", () => {
    const runs = formatIrishAct({
      shortTitle: "Criminal Justice Act",
      year: 1999,
    });
    expect(joinText(runs)).toBe("Criminal Justice Act 1999");
  });

  it("renders in roman (not italic)", () => {
    const runs = formatIrishAct({
      shortTitle: "Test Act",
      year: 2020,
    });
    expect(runs[0].italic).toBeUndefined();
  });
});

describe("OSC-014: formatIrishStatutoryInstrument", () => {
  it("formats Irish SI (JSDoc: District Court Small Claims)", () => {
    const runs = formatIrishStatutoryInstrument({
      shortTitle: "District Court (Small Claims) Rules",
      year: 1997,
      siNumber: 356,
    });
    expect(joinText(runs)).toBe(
      "District Court (Small Claims) Rules 1997, SI No 356/1997"
    );
  });

  it("includes pinpoint", () => {
    const runs = formatIrishStatutoryInstrument({
      shortTitle: "Test Rules",
      year: 2020,
      siNumber: 100,
      pinpoint: "r 3",
    });
    expect(joinText(runs)).toContain(", r 3");
  });
});

describe("OSC-014: formatBunreachtNaHEireann", () => {
  it("formats with article (JSDoc: art 40.3.1)", () => {
    const runs = formatBunreachtNaHEireann({
      article: "40.3",
      subsection: "1",
    });
    expect(joinText(runs)).toBe("Bunreacht na h\u00C9ireann, art 40.3.1");
  });

  it("formats without subsection (JSDoc: art 34)", () => {
    const runs = formatBunreachtNaHEireann({
      article: "34",
    });
    expect(joinText(runs)).toBe("Bunreacht na h\u00C9ireann, art 34");
  });

  it("title is italic", () => {
    const runs = formatBunreachtNaHEireann({ article: "1" });
    expect(runs[0].italic).toBe(true);
  });
});

// =============================================================================
// 12. UK REPORT SERIES DATA (uk-report-series.ts)
// =============================================================================

describe("Data: UK Report Series", () => {
  it("searchUKReportSeries finds by abbreviation", () => {
    const results = searchUKReportSeries("AC");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.abbreviation === "AC")).toBe(true);
  });

  it("searchUKReportSeries finds by full name", () => {
    const results = searchUKReportSeries("Appeal Cases");
    expect(results.some((r) => r.abbreviation === "AC")).toBe(true);
  });

  it("searchUKReportSeries is case-insensitive", () => {
    const results = searchUKReportSeries("weekly law");
    expect(results.some((r) => r.abbreviation === "WLR")).toBe(true);
  });

  it("searchUKReportSeries returns empty for no match", () => {
    expect(searchUKReportSeries("ZZZNONEXISTENT")).toHaveLength(0);
  });

  it("getUKReportSeriesByAbbreviation returns exact match", () => {
    const entry = getUKReportSeriesByAbbreviation("AC");
    expect(entry).toBeDefined();
    expect(entry!.fullName).toBe("Appeal Cases");
    expect(entry!.jurisdiction).toBe("UK");
  });

  it("getUKReportSeriesByAbbreviation returns undefined for no match", () => {
    expect(getUKReportSeriesByAbbreviation("ZZZZ")).toBeUndefined();
  });

  it("getUKReportSeriesByAbbreviation is case-sensitive", () => {
    expect(getUKReportSeriesByAbbreviation("ac")).toBeUndefined();
  });

  it("getUKReportSeriesByJurisdiction returns NI entries", () => {
    const results = getUKReportSeriesByJurisdiction("NI");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.jurisdiction === "NI")).toBe(true);
  });

  it("getUKReportSeriesByJurisdiction returns Scottish entries", () => {
    const results = getUKReportSeriesByJurisdiction("Scot");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.abbreviation === "SC")).toBe(true);
  });

  it("UK_REPORT_SERIES has expected length (>80 entries)", () => {
    expect(UK_REPORT_SERIES.length).toBeGreaterThan(80);
  });
});

// =============================================================================
// 13. UK COURT IDENTIFIERS DATA (uk-court-identifiers.ts)
// =============================================================================

describe("Data: UK Court Identifiers", () => {
  it("searchUKCourtIdentifiers finds by code", () => {
    const results = searchUKCourtIdentifiers("UKSC");
    expect(results.some((r) => r.code === "UKSC")).toBe(true);
  });

  it("searchUKCourtIdentifiers finds by full name", () => {
    const results = searchUKCourtIdentifiers("Supreme Court");
    expect(results.some((r) => r.code === "UKSC")).toBe(true);
  });

  it("searchUKCourtIdentifiers is case-insensitive", () => {
    const results = searchUKCourtIdentifiers("supreme");
    expect(results.length).toBeGreaterThan(0);
  });

  it("searchUKCourtIdentifiers returns empty for no match", () => {
    expect(searchUKCourtIdentifiers("ZZZNONEXIST")).toHaveLength(0);
  });

  it("getUKCourtByCode returns exact match", () => {
    const court = getUKCourtByCode("UKSC");
    expect(court).toBeDefined();
    expect(court!.fullName).toBe("United Kingdom Supreme Court");
    expect(court!.level).toBe("supreme");
  });

  it("getUKCourtByCode returns EWHC divisions", () => {
    const court = getUKCourtByCode("EWHC (Admin)");
    expect(court).toBeDefined();
    expect(court!.division).toBe("Admin");
  });

  it("getUKCourtByCode returns undefined for no match", () => {
    expect(getUKCourtByCode("ZZZZ")).toBeUndefined();
  });

  it("getUKCourtsByJurisdiction returns NI courts", () => {
    const results = getUKCourtsByJurisdiction("NI");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.code === "NICA")).toBe(true);
  });

  it("getUKCourtsByJurisdiction returns Scottish courts", () => {
    const results = getUKCourtsByJurisdiction("Scot");
    expect(results.some((r) => r.code === "CSIH")).toBe(true);
  });

  it("UK_COURT_IDENTIFIERS has expected entries (>30)", () => {
    expect(UK_COURT_IDENTIFIERS.length).toBeGreaterThan(30);
  });
});

// =============================================================================
// 14. IRISH COURTS DATA (irish-courts.ts)
// =============================================================================

describe("Data: Irish Courts", () => {
  it("searchIrishCourtIdentifiers finds by code", () => {
    const results = searchIrishCourtIdentifiers("IESC");
    expect(results.some((r) => r.code === "IESC")).toBe(true);
  });

  it("searchIrishCourtIdentifiers finds by full name", () => {
    const results = searchIrishCourtIdentifiers("High Court");
    expect(results.some((r) => r.code === "IEHC")).toBe(true);
  });

  it("searchIrishCourtIdentifiers is case-insensitive", () => {
    const results = searchIrishCourtIdentifiers("supreme");
    expect(results.length).toBeGreaterThan(0);
  });

  it("getIrishCourtByCode returns exact match", () => {
    const court = getIrishCourtByCode("IEHC");
    expect(court).toBeDefined();
    expect(court!.fullName).toBe("High Court of Ireland");
  });

  it("getIrishCourtByCode returns undefined for no match", () => {
    expect(getIrishCourtByCode("ZZZZ")).toBeUndefined();
  });

  it("searchIrishReportSeries finds by abbreviation", () => {
    const results = searchIrishReportSeries("IR");
    expect(results.some((r) => r.abbreviation === "IR")).toBe(true);
  });

  it("searchIrishReportSeries finds by full name", () => {
    const results = searchIrishReportSeries("Irish Reports");
    expect(results.some((r) => r.abbreviation === "IR")).toBe(true);
  });

  it("getIrishReportSeriesByAbbreviation returns exact match", () => {
    const series = getIrishReportSeriesByAbbreviation("IR");
    expect(series).toBeDefined();
    expect(series!.fullName).toBe("Irish Reports");
    expect(series!.type).toBe("authorised");
  });

  it("getIrishReportSeriesByAbbreviation returns undefined for no match", () => {
    expect(getIrishReportSeriesByAbbreviation("ZZZZ")).toBeUndefined();
  });

  it("IRISH_COURT_IDENTIFIERS has entries", () => {
    expect(IRISH_COURT_IDENTIFIERS.length).toBeGreaterThan(5);
  });

  it("IRISH_REPORT_SERIES has entries", () => {
    expect(IRISH_REPORT_SERIES.length).toBeGreaterThan(5);
  });
});

// =============================================================================
// 15. EU CASE PREFIXES DATA (eu-case-prefixes.ts)
// =============================================================================

describe("Data: EU Case Prefixes", () => {
  it("getEUCasePrefixByPrefix returns C- prefix", () => {
    const entry = getEUCasePrefixByPrefix("C-");
    expect(entry).toBeDefined();
    expect(entry!.court).toBe("CJEU");
  });

  it("getEUCasePrefixByPrefix returns T- prefix", () => {
    const entry = getEUCasePrefixByPrefix("T-");
    expect(entry).toBeDefined();
    expect(entry!.court).toBe("General Court");
  });

  it("getEUCasePrefixByPrefix returns undefined for no match", () => {
    expect(getEUCasePrefixByPrefix("Z-")).toBeUndefined();
  });

  it("searchEUCasePrefixes finds by court name", () => {
    const results = searchEUCasePrefixes("General Court");
    expect(results.length).toBeGreaterThan(0);
  });

  it("parseECLI parses valid ECLI", () => {
    const result = parseECLI("ECLI:EU:C:2008:461");
    expect(result).toEqual({
      country: "EU",
      court: "C",
      year: "2008",
      number: "461",
    });
  });

  it("parseECLI returns null for invalid format", () => {
    expect(parseECLI("not-an-ecli")).toBeNull();
    expect(parseECLI("ECLI:XX:C:2008")).toBeNull();
    expect(parseECLI("")).toBeNull();
  });

  it("parseECLI handles complex number components", () => {
    const result = parseECLI("ECLI:EU:T:2005:332");
    expect(result).toEqual({
      country: "EU",
      court: "T",
      year: "2005",
      number: "332",
    });
  });

  it("getOJSeriesByCode returns L series", () => {
    const entry = getOJSeriesByCode("L");
    expect(entry).toBeDefined();
    expect(entry!.fullName).toContain("Legislation");
    expect(entry!.active).toBe(true);
  });

  it("getOJSeriesByCode returns C series", () => {
    const entry = getOJSeriesByCode("C");
    expect(entry).toBeDefined();
    expect(entry!.active).toBe(true);
  });

  it("getOJSeriesByCode returns undefined for no match", () => {
    expect(getOJSeriesByCode("ZZZ")).toBeUndefined();
  });

  it("getECLICountryCode returns EU", () => {
    const entry = getECLICountryCode("EU");
    expect(entry).toBeDefined();
    expect(entry!.country).toBe("European Union");
  });

  it("getECLICountryCode is case-insensitive", () => {
    const entry = getECLICountryCode("eu");
    expect(entry).toBeDefined();
  });

  it("EU_CASE_PREFIXES has entries", () => {
    expect(EU_CASE_PREFIXES.length).toBeGreaterThan(3);
  });

  it("OJ_SERIES has entries", () => {
    expect(OJ_SERIES.length).toBeGreaterThan(3);
  });
});

// =============================================================================
// 16. OSCOLA THESIS/DISSERTATION (secondary.ts)
// =============================================================================

describe("OSC-ENH-006: formatOscolaThesis", () => {
  it("formats DPhil thesis (JSDoc example)", () => {
    const runs = formatOscolaThesis({
      author: "John Smith",
      title: "The Doctrine of Legitimate Expectations in EU Law",
      thesisType: "DPhil thesis",
      university: "University of Oxford",
      year: 2020,
      pinpoint: "45",
    });
    expect(joinText(runs)).toBe(
      "John Smith, \u2018The Doctrine of Legitimate Expectations in EU Law\u2019 (DPhil thesis, University of Oxford 2020) 45"
    );
  });

  it("formats PhD thesis", () => {
    const runs = formatOscolaThesis({
      author: "Jane Doe",
      title: "Comparative Constitutional Review",
      thesisType: "PhD thesis",
      university: "University of Cambridge",
      year: 2018,
      pinpoint: "112",
    });
    expect(joinText(runs)).toBe(
      "Jane Doe, \u2018Comparative Constitutional Review\u2019 (PhD thesis, University of Cambridge 2018) 112"
    );
  });

  it("formats LLM thesis", () => {
    const runs = formatOscolaThesis({
      author: "Alice Brown",
      title: "The Regulation of FinTech in the UK",
      thesisType: "LLM thesis",
      university: "London School of Economics",
      year: 2022,
    });
    expect(joinText(runs)).toBe(
      "Alice Brown, \u2018The Regulation of FinTech in the UK\u2019 (LLM thesis, London School of Economics 2022)"
    );
  });

  it("omits pinpoint when not provided", () => {
    const runs = formatOscolaThesis({
      author: "Bob White",
      title: "International Humanitarian Law",
      thesisType: "MPhil thesis",
      university: "University of Edinburgh",
      year: 2019,
    });
    const text = joinText(runs);
    expect(text).toBe(
      "Bob White, \u2018International Humanitarian Law\u2019 (MPhil thesis, University of Edinburgh 2019)"
    );
    // Ensure no trailing space or 'at'
    expect(text).not.toContain(" at ");
    expect(text.endsWith(")")).toBe(true);
  });

  it("title is NOT italic (single curly quotes instead)", () => {
    const runs = formatOscolaThesis({
      author: "Test Author",
      title: "Test Title",
      thesisType: "PhD thesis",
      university: "Test University",
      year: 2021,
    });
    // The title run should contain single curly quotes and NOT be italic
    const titleRun = runs.find((r) => r.text.includes("Test Title"));
    expect(titleRun).toBeDefined();
    expect(titleRun!.italic).toBeUndefined();
    expect(titleRun!.text).toContain("\u2018");
    expect(titleRun!.text).toContain("\u2019");
    // No run should be italic
    runs.forEach((r) => {
      expect(r.italic).toBeUndefined();
    });
  });
});

// =============================================================================
// 17. OSC-ENH-004: OSCOLA Secondary Source Formatting
// =============================================================================

describe("OSC-ENH-004: OSCOLA secondary source formatting", () => {
  const oscolaConfig = STANDARD_PROFILES.oscola5.config;

  describe("Book edition abbreviation", () => {
    it('formatBook with editionAbbreviation "edn" produces "3rd edn"', () => {
      const runs = formatBook({
        authors: [{ givenNames: "Andrew", surname: "Ashworth" }],
        title: "Principles of Criminal Law",
        publisher: "OUP",
        edition: 3,
        year: 1999,
        editionAbbreviation: "edn",
      });
      const text = joinText(runs);
      expect(text).toContain("3rd edn");
      expect(text).not.toContain("3rd ed,");
      expect(text).not.toContain("3rd ed)");
    });

    it('formatBook without editionAbbreviation defaults to "ed"', () => {
      const runs = formatBook({
        authors: [{ givenNames: "Andrew", surname: "Ashworth" }],
        title: "Principles of Criminal Law",
        publisher: "OUP",
        edition: 3,
        year: 1999,
      });
      const text = joinText(runs);
      expect(text).toContain("3rd ed");
      expect(text).not.toContain("3rd edn");
    });

    it("formatEdition directly produces correct OSCOLA abbreviation", () => {
      expect(formatEdition(2, false, { abbreviation: "edn" })).toBe("2nd edn");
      expect(formatEdition(3, false, { abbreviation: "edn" })).toBe("3rd edn");
      expect(formatEdition(5, false, { abbreviation: "edn" })).toBe("5th edn");
    });

    it("formatEdition with revised edition and OSCOLA abbreviation", () => {
      expect(formatEdition(3, true, { abbreviation: "edn" })).toBe("3rd rev edn");
    });
  });

  describe("Book via engine dispatcher with OSCOLA config", () => {
    it('dispatchBook passes editionAbbreviation "edn" from OSCOLA config', () => {
      const runs = formatCitation(
        {
          id: "test-book-1",
          aglcVersion: "4",
          sourceType: "book",
          data: {
            authors: [{ givenNames: "Andrew", surname: "Ashworth" }],
            title: "Principles of Criminal Law",
            publisher: "OUP",
            edition: 6,
            year: 2009,
          },
          tags: [],
          createdAt: "2026-01-01T00:00:00Z",
          modifiedAt: "2026-01-01T00:00:00Z",
        },
        { footnoteNumber: 1, isFirstCitation: true, isSameAsPreceding: false, precedingFootnoteCitationCount: 0, firstFootnoteNumber: 1, isWithinSameFootnote: false, formatPreference: "full" },
        oscolaConfig,
      );
      const text = joinText(runs);
      expect(text).toContain("6th edn");
      expect(text).not.toContain("6th ed,");
      expect(text).not.toContain("6th ed)");
    });

    it("publisher renders correctly for OSCOLA books (OUP)", () => {
      const runs = formatBook({
        authors: [{ givenNames: "HLA", surname: "Hart" }],
        title: "The Concept of Law",
        publisher: "OUP",
        edition: 3,
        year: 2012,
        editionAbbreviation: "edn",
      });
      const text = joinText(runs);
      expect(text).toContain("(OUP, 3rd edn, 2012)");
    });
  });

  describe("Journal article title quoting", () => {
    it("journal article title uses single curly quotes (OSCOLA convention)", () => {
      const runs = formatJournalArticle({
        authors: [{ givenNames: "William", surname: "Twining" }],
        title: "The Ratio Decidendi of Premises",
        year: 1988,
        volume: 52,
        journal: "Modern Law Review",
        startingPage: 1,
      });
      const text = joinText(runs);
      // Single curly quotes: U+2018 and U+2019
      expect(text).toContain("\u2018");
      expect(text).toContain("\u2019");
      // Not double quotes
      expect(text).not.toContain('"');
      expect(text).not.toContain("\u201C");
      expect(text).not.toContain("\u201D");
    });
  });
});
