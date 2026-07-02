/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AGLC4 Chapter 2 — Cases
 *
 * Each describe block references the AGLC4 rule number and example numbers.
 * Expected outputs are drawn directly from the AGLC4 text.
 */

import {
  formatCaseName,
  abbreviateCorporateNames,
  formatCrownParty,
  formatAttorneyGeneral,
  formatDPP,
  formatExParte,
  formatRe,
  formatAdmiraltyCase,
  suggestShortTitle,
  formatCaseWithoutName,
} from "../../src/engine/rules/v4/domestic/case-names";

import {
  formatYearAndVolume,
  formatReportSeries,
  getReportSeriesPreference,
  formatStartingPageAndPinpoint,
  formatCourtIdentifier,
  isCourtApparentFromSeries,
  formatReportedCase,
  formatParallelCitations,
} from "../../src/engine/rules/v4/domestic/cases";

import {
  formatUnreportedMnc,
  formatUnreportedNoMnc,
  formatProceeding,
  formatCourtOrder,
} from "../../src/engine/rules/v4/domestic/cases-unreported";

import {
  formatJudicialOfficers,
  formatCaseHistory,
  formatAdministrativeDecision,
  formatArbitration,
  formatTranscript,
  formatHcaTranscript,
  formatSubmission,
} from "../../src/engine/rules/v4/domestic/cases-supplementary";

import { FormattedRun } from "../../src/types/formattedRun";

/**
 * Helper: concatenate all text runs into a single plain string.
 */
function toPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

// ─── Rule 2.1.1 — Party Name Formatting ─────────────────────────────────────

describe("Rule 2.1.1 — Parties' Names (General)", () => {
  test("Example 1: strips given names from individual parties", () => {
    // Momentum Productions Pty Ltd v Lewarne
    // [Not: ... v Richard John Lewarne]
    const runs = formatCaseName("Momentum Productions Pty Ltd", "Richard John Lewarne");
    const text = toPlainText(runs);
    expect(text).toBe("Momentum Productions Pty Ltd v Lewarne");
    // Party names should be italic
    expect(runs[0].italic).toBe(true);
    expect(runs[2].italic).toBe(true);
  });

  test("Example 2: strips '& Ors' from party names", () => {
    // Hot Holdings Pty Ltd v Creasy
    // [Not: ... Creasy and Ors]
    const runs = formatCaseName("Hot Holdings Pty Ltd", "Creasy & Ors");
    expect(toPlainText(runs)).toBe("Hot Holdings Pty Ltd v Creasy");
  });

  test("Example 2 (variant): strips '& Anor' from party names", () => {
    const runs = formatCaseName("Smith", "Jones & Anor");
    expect(toPlainText(runs)).toBe("Smith v Jones");
  });

  test("Example 3: only first action cited (multiple actions separated by ;)", () => {
    // Tame v New South Wales
    // [Not: Tame v New South Wales; Annetts v Australian Stations Pty Ltd]
    const runs = formatCaseName("Tame", "New South Wales; Annetts v Australian Stations Pty Ltd");
    expect(toPlainText(runs)).toBe("Tame v New South Wales");
  });

  test("single party name containing '&' survives intact per AGLC4 ex 66 (rule 2.1.1)", () => {
    // Theophanous v Herald & Weekly Times Ltd (1994) 182 CLR 104
    const runs = formatCaseName("Theophanous", "Herald & Weekly Times Ltd");
    expect(toPlainText(runs)).toBe("Theophanous v Herald & Weekly Times Ltd");
  });

  test("single party name containing 'and' survives intact per AGLC4 ex 110 (rule 2.1.1)", () => {
    const runs = formatCaseName("Pochi", "Minister for Immigration and Ethnic Affairs");
    expect(toPlainText(runs)).toBe("Pochi v Minister for Immigration and Ethnic Affairs");
  });

  test("two capitalised words without corporate indicator are not corrupted (rule 2.1.1)", () => {
    // 'Hot Holdings' must not become 'Holdings' — two-word names are
    // ambiguous between personal and business names.
    const runs = formatCaseName("Hot Holdings", "Creasy");
    expect(toPlainText(runs)).toBe("Hot Holdings v Creasy");
  });

  test("extended case names with Ex parte are a single case name per AGLC4 ex 29 (rule 2.1.9)", () => {
    // R v Kirby; Ex parte Boilermakers' Society of Australia
    const runs = formatCaseName("R", "Kirby; Ex parte Boilermakers' Society of Australia");
    expect(toPlainText(runs)).toBe("R v Kirby; Ex parte Boilermakers' Society of Australia");
  });

  test("Rule 2.1.11: 'v' separator is italicised as part of the case name", () => {
    // AGLC4 rule 2.1.11: "'v' should not be followed by a full stop and
    // should be italicised."
    const runs = formatCaseName("Smith", "Jones");
    const vRun = runs.find((r) => r.text.trim() === "v");
    expect(vRun).toBeDefined();
    expect(vRun!.italic).toBe(true);
    expect(vRun!.text).toBe(" v ");
  });
});

// ─── Rule 2.1.2 — Business Corporations and Firms ───────────────────────────

describe("Rule 2.1.2 — Corporate Abbreviations", () => {
  test("Company -> Co", () => {
    expect(abbreviateCorporateNames("Shelton Company")).toBe("Shelton Co");
  });

  test("Limited -> Ltd", () => {
    expect(abbreviateCorporateNames("Alpha Healthcare Limited")).toBe("Alpha Healthcare Ltd");
  });

  test("Proprietary -> Pty", () => {
    expect(abbreviateCorporateNames("Hot Holdings Proprietary")).toBe("Hot Holdings Pty");
  });

  test("Incorporated -> Inc", () => {
    expect(abbreviateCorporateNames("Sandline International Incorporated")).toBe(
      "Sandline International Inc"
    );
  });

  test("(in liquidation) -> (in liq)", () => {
    // Example 6: Lumbers v W Cook Builders Pty Ltd (in liq)
    expect(abbreviateCorporateNames("W Cook Builders Pty Ltd (in liquidation)")).toBe(
      "W Cook Builders Pty Ltd (in liq)"
    );
  });

  test("(in provisional liquidation) -> (in prov liq)", () => {
    expect(abbreviateCorporateNames("Acme Pty Ltd (in provisional liquidation)")).toBe(
      "Acme Pty Ltd (in prov liq)"
    );
  });

  test("(administrator appointed) -> (admin apptd)", () => {
    expect(abbreviateCorporateNames("Acme Pty Ltd (administrator appointed)")).toBe(
      "Acme Pty Ltd (admin apptd)"
    );
  });

  test("(receiver appointed) -> (rec apptd)", () => {
    expect(abbreviateCorporateNames("Acme Pty Ltd (receiver appointed)")).toBe(
      "Acme Pty Ltd (rec apptd)"
    );
  });

  test("strips trading names (t/as)", () => {
    // Example 8: strips "trading as 'Mulsol' Laboratories"
    expect(abbreviateCorporateNames("Harem t/as Mulsol Laboratories")).toBe("Harem");
  });

  test("strips 'trading as' form", () => {
    expect(abbreviateCorporateNames("Harem trading as Mulsol Laboratories")).toBe("Harem");
  });

  test("strips ACN when other name exists", () => {
    expect(abbreviateCorporateNames("Acme Pty Ltd ACN 123 456 789")).toBe("Acme Pty Ltd");
  });

  test("removes full stops from abbreviations", () => {
    expect(abbreviateCorporateNames("Pty. Ltd.")).toBe("Pty Ltd");
  });

  test("Example 4: full compound abbreviation", () => {
    // Andrew Shelton & Co Pty Ltd
    expect(abbreviateCorporateNames("Andrew Shelton & Co Pty Ltd")).toBe(
      "Andrew Shelton & Co Pty Ltd"
    );
  });

  test("preserves 'The' in corporate names", () => {
    // Example 8: The Mond Staffordshire Refining Co Ltd
    expect(abbreviateCorporateNames("The Mond Staffordshire Refining Co Ltd")).toBe(
      "The Mond Staffordshire Refining Co Ltd"
    );
  });

  test("and -> & where the party is a corporation or firm (rule 2.1.2 table)", () => {
    expect(abbreviateCorporateNames("Herald and Weekly Times Ltd")).toBe(
      "Herald & Weekly Times Ltd"
    );
  });

  test("'and' preserved in non-corporate party names (rule 2.1.2)", () => {
    // The and->& abbreviation applies only to business corporations and
    // firms; 'Re Judiciary and Navigation Acts' (ex 25) keeps 'and'.
    expect(abbreviateCorporateNames("Judiciary and Navigation Acts")).toBe(
      "Judiciary and Navigation Acts"
    );
  });

  test("'Corporation' is NOT abbreviated per AGLC4 ex 39 (rule 2.1.2)", () => {
    // Kuwait Airlines Corporation v Iraqi Airways Co [Nos 4 and 5]
    expect(abbreviateCorporateNames("Kuwait Airlines Corporation")).toBe(
      "Kuwait Airlines Corporation"
    );
  });

  test("'Department' and 'Commission' are NOT abbreviated per AGLC4 ex 22 (rule 2.1.2)", () => {
    expect(
      abbreviateCorporateNames("Department of Industrial Relations and Technology (NSW)")
    ).toBe("Department of Industrial Relations and Technology (NSW)");
    expect(abbreviateCorporateNames("Australian Competition and Consumer Commission")).toBe(
      "Australian Competition and Consumer Commission"
    );
  });
});

// ─── Rule 2.1.3–2.1.7 — Crown, Government, A-G, DPP ────────────────────────

describe("Rule 2.1.4 — The Crown", () => {
  test("Crown as first-named party is 'R' per AGLC4 ex 11 (rule 2.1.4)", () => {
    // Example 11: R v Reid
    expect(formatCrownParty()).toBe("R");
  });

  test("Crown as respondent is written in full per AGLC4 ex 12 (rule 2.1.4)", () => {
    // Example 12: Honeysett v The Queen
    expect(formatCrownParty("respondent", "Queen")).toBe("The Queen");
    expect(formatCrownParty("respondent", "King")).toBe("The King");
  });
});

describe("Rule 2.1.7 — Attorneys-General", () => {
  test("A-G with jurisdiction in footnote", () => {
    // Example 24: Bradshaw v A-G (Qld)
    expect(formatAttorneyGeneral("Qld")).toBe("A-G (Qld)");
  });

  test("A-G (Cth)", () => {
    expect(formatAttorneyGeneral("Cth")).toBe("A-G (Cth)");
  });
});

describe("Rule 2.1.7 — DPP", () => {
  test("DPP with jurisdiction in footnote", () => {
    // Example 23: DPP (Vic) v Finn
    expect(formatDPP("Vic")).toBe("DPP (Vic)");
  });

  test("DPP without jurisdiction", () => {
    expect(formatDPP()).toBe("DPP");
  });
});

// ─── Rule 2.1.8 — Re ────────────────────────────────────────────────────────

describe("Rule 2.1.8 — Re", () => {
  test("Example 25: Re Judiciary and Navigation Acts", () => {
    const runs = formatRe("Judiciary and Navigation Acts");
    const text = toPlainText(runs);
    expect(text).toBe("Re Judiciary and Navigation Acts");
    expect(runs[0].italic).toBe(true);
  });
});

// ─── Rule 2.1.9 — Ex parte ──────────────────────────────────────────────────

describe("Rule 2.1.9 — Ex parte", () => {
  test("Example 27: Ex parte Australian Catholic Bishops Conference", () => {
    const runs = formatExParte("Australian Catholic Bishops Conference");
    const text = toPlainText(runs);
    expect(text).toBe("Ex parte Australian Catholic Bishops Conference");
    expect(runs[0].italic).toBe(true);
  });
});

// ─── Rule 2.1.12 — Admiralty Cases ──────────────────────────────────────────

describe("Rule 2.1.12 — Admiralty Cases", () => {
  test("Example 33: ship name only for in rem", () => {
    const runs = formatAdmiraltyCase("The Maria Luisa");
    expect(toPlainText(runs)).toBe("The Maria Luisa");
    expect(runs[0].italic).toBe(true);
  });
});

// ─── Rule 2.1.14 — Short Titles ─────────────────────────────────────────────

describe("Rule 2.1.14 — Shortened Case Names", () => {
  test("short title is first-named party", () => {
    expect(suggestShortTitle("McGinty", "Western Australia", "v")).toBe("McGinty");
  });

  test("short title uses second party when first is Crown ('R')", () => {
    expect(suggestShortTitle("R", "Tang", "v")).toBe("Tang");
  });

  test("preserves [No 2] suffix", () => {
    expect(suggestShortTitle("Cubillo", "Commonwealth [No 2]", "v")).toBe("Cubillo [No 2]");
  });
});

// ─── Rule 2.1.15 — Omitting Case Name ───────────────────────────────────────

describe("Rule 2.1.15 — Omitting the Case Name", () => {
  test("Example 47: citation without case name, round brackets", () => {
    // (2007) 233 CLR 307
    const runs = formatCaseWithoutName("round", 2007, 233, "CLR", 307);
    expect(toPlainText(runs)).toBe("(2007) 233 CLR 307");
  });

  test("Example 49: citation without case name, round brackets", () => {
    // (1983) 158 CLR 1
    const runs = formatCaseWithoutName("round", 1983, 158, "CLR", 1);
    expect(toPlainText(runs)).toBe("(1983) 158 CLR 1");
  });

  test("square brackets year (no volume)", () => {
    const runs = formatCaseWithoutName("square", 1974, undefined, "VR", 253);
    expect(toPlainText(runs)).toBe("[1974] VR 253");
  });
});

// ─── Rule 2.2.1 — Year and Volume ───────────────────────────────────────────

describe("Rule 2.2.1 — Year and Volume", () => {
  test("Example 56: round brackets with volume — (2008) 190", () => {
    // R v Lester (2008) 190 A Crim R 468
    const runs = formatYearAndVolume("round", 2008, 190);
    expect(toPlainText(runs)).toBe("(2008) 190");
  });

  test("Example 58: square brackets, no volume — [1974]", () => {
    // King v King [1974] Qd R 253
    const runs = formatYearAndVolume("square", 1974);
    expect(toPlainText(runs)).toBe("[1974]");
  });

  test("Example 59: square brackets with volume — [1976] 2", () => {
    // Rowe v McCartney [1976] 2 NSWLR 72
    const runs = formatYearAndVolume("square", 1976, 2);
    expect(toPlainText(runs)).toBe("[1976] 2");
  });

  test("round brackets year only (no volume)", () => {
    const runs = formatYearAndVolume("round", 1992);
    expect(toPlainText(runs)).toBe("(1992)");
  });
});

// ─── Rule 2.2.2–2.2.3 — Report Series ──────────────────────────────────────

describe("Rule 2.2.2 — Report Series", () => {
  test("series abbreviation is plain text", () => {
    const runs = formatReportSeries("CLR");
    expect(runs[0].text).toBe("CLR");
    expect(runs[0].italic).toBeUndefined();
  });
});

describe("Rule 2.2.2 — Preference of Report Series", () => {
  test("CLR is authorised (rank 1)", () => {
    expect(getReportSeriesPreference("CLR")).toBe(1);
  });

  test("FCR is authorised (rank 1)", () => {
    expect(getReportSeriesPreference("FCR")).toBe(1);
  });

  test("Qd R is authorised (rank 1) per rule 2.2.3 table", () => {
    expect(getReportSeriesPreference("Qd R")).toBe(1);
  });

  test("ALJR is generalist unauthorised (rank 2)", () => {
    expect(getReportSeriesPreference("ALJR")).toBe(2);
  });

  test("FLR is generalist unauthorised (rank 2) per rule 2.2.2 table", () => {
    expect(getReportSeriesPreference("FLR")).toBe(2);
  });

  test("IR is subject-specific (rank 3) per rule 2.2.2 table", () => {
    expect(getReportSeriesPreference("IR")).toBe(3);
  });

  test("A Crim R is subject-specific (rank 3)", () => {
    expect(getReportSeriesPreference("A Crim R")).toBe(3);
  });

  test("FCAFC is a court identifier, not an authorised report series", () => {
    expect(getReportSeriesPreference("FCAFC")).not.toBe(1);
  });
});

// ─── Rule 2.2.4–2.2.5 — Starting Page and Pinpoints ────────────────────────

describe("Rule 2.2.4–2.2.5 — Starting Page and Pinpoints", () => {
  test("starting page only", () => {
    const runs = formatStartingPageAndPinpoint(104);
    expect(toPlainText(runs)).toBe("104");
  });

  test("Example 69: page pinpoint — 388, 402", () => {
    const runs = formatStartingPageAndPinpoint(388, {
      type: "page",
      value: "402",
    });
    expect(toPlainText(runs)).toBe("388, 402");
  });

  test("Example 69: page + paragraph pinpoint — 402 [29]", () => {
    const runs = formatStartingPageAndPinpoint(388, {
      type: "page",
      value: "402",
      subPinpoint: { type: "paragraph", value: "[29]" },
    });
    expect(toPlainText(runs)).toBe("388, 402 [29]");
  });

  test("paragraph pinpoint only", () => {
    const runs = formatStartingPageAndPinpoint(82, {
      type: "paragraph",
      value: "[18]",
    });
    expect(toPlainText(runs)).toBe("82 [18]");
  });

  test("footnote pinpoint — n 5", () => {
    const runs = formatStartingPageAndPinpoint(100, {
      type: "footnote",
      value: "5",
    });
    expect(toPlainText(runs)).toBe("100 n 5");
  });
});

// ─── Rule 2.2.6 — Court Identification ──────────────────────────────────────

describe("Rule 2.2.6 — Identifying the Court", () => {
  test("CLR implies HCA — court omitted", () => {
    expect(isCourtApparentFromSeries("CLR")).toBe(true);
    const runs = formatCourtIdentifier("HCA", "CLR");
    expect(runs).toHaveLength(0);
  });

  test("FCR implies FCA — court omitted", () => {
    expect(isCourtApparentFromSeries("FCR")).toBe(true);
    const runs = formatCourtIdentifier("FCA", "FCR");
    expect(runs).toHaveLength(0);
  });

  test("NSWLR implies NSWSC — court omitted", () => {
    expect(isCourtApparentFromSeries("NSWLR")).toBe(true);
  });

  test("VR implies VSC — court omitted", () => {
    expect(isCourtApparentFromSeries("VR")).toBe(true);
  });

  test("A Crim R — court NOT apparent, court name (not code) included", () => {
    // Rule 2.2.6: the parenthetical takes the court's NAME, never the
    // Appendix B identifier code. Jurisdiction is not suppressed because
    // A Crim R is a national series.
    expect(isCourtApparentFromSeries("A Crim R")).toBe(false);
    const runs = formatCourtIdentifier("QCA", "A Crim R");
    expect(toPlainText(runs)).toBe(" (Queensland Court of Appeal)");
  });

  test("ALR — court NOT apparent, court name included", () => {
    expect(isCourtApparentFromSeries("ALR")).toBe(false);
    const runs = formatCourtIdentifier("HCA");
    expect(toPlainText(runs)).toBe(" (High Court of Australia)");
  });

  test("court name passed through as given when not an identifier code", () => {
    const runs = formatCourtIdentifier("Court of Appeal", "Qd R");
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe(" (Court of Appeal)");
  });

  test("jurisdiction suppressed when apparent from series per AGLC4 ex 77 (rule 2.2.6)", () => {
    // Aldrick v EM Investments (Qld) Pty Ltd [2000] 2 Qd R 346 (Court of Appeal)
    // [Not: ... Qd R 346 (Queensland Court of Appeal).]
    // Qd R implies QSC; the actual court QCA differs, so the court is
    // shown — but as '(Court of Appeal)' because Qd R already makes the
    // jurisdiction apparent.
    const runs = formatCourtIdentifier("QCA", "Qd R");
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe(" (Court of Appeal)");
  });

  test("AUDIT2-018: court omitted only when actual court matches implied court", () => {
    // Qd R implies QSC — if actual court IS QSC, omit
    expect(formatCourtIdentifier("QSC", "Qd R")).toHaveLength(0);
    // Legacy 'QR' alias behaves identically
    expect(formatCourtIdentifier("QSC", "QR")).toHaveLength(0);
  });
});

// ─── Rule 2.2 — Full Reported Case Assembly ─────────────────────────────────

describe("Rule 2.2 — Full Reported Case Citation", () => {
  test("Mabo v Queensland (No 2) style — round brackets with volume", () => {
    // R v Tang (2008) 237 CLR 1, 7
    const caseName: FormattedRun[] = [
      { text: "R", italic: true },
      { text: " v ", italic: true },
      { text: "Tang", italic: true },
    ];
    const runs = formatReportedCase({
      caseName,
      yearType: "round",
      year: 2008,
      volume: 237,
      reportSeries: "CLR",
      startingPage: 1,
      pinpoint: { type: "page", value: "7" },
    });
    const text = toPlainText(runs);
    expect(text).toBe("R v Tang (2008) 237 CLR 1, 7");
  });

  test("Bakker v Stewart style — square brackets, no volume", () => {
    // Bakker v Stewart [1980] VR 17, 22
    const caseName: FormattedRun[] = [
      { text: "Bakker", italic: true },
      { text: " v ", italic: true },
      { text: "Stewart", italic: true },
    ];
    const runs = formatReportedCase({
      caseName,
      yearType: "square",
      year: 1980,
      reportSeries: "VR",
      startingPage: 17,
      pinpoint: { type: "page", value: "22" },
    });
    const text = toPlainText(runs);
    expect(text).toBe("Bakker v Stewart [1980] VR 17, 22");
  });

  test("court omitted when apparent from CLR", () => {
    const caseName: FormattedRun[] = [{ text: "Smith", italic: true }];
    const runs = formatReportedCase({
      caseName,
      yearType: "round",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
      courtId: "HCA",
    });
    const text = toPlainText(runs);
    expect(text).not.toContain("(HCA)");
    expect(text).toBe("Smith (1992) 175 CLR 1");
  });

  test("court name included when not apparent from series", () => {
    const caseName: FormattedRun[] = [{ text: "Smith", italic: true }];
    const runs = formatReportedCase({
      caseName,
      yearType: "round",
      year: 2008,
      volume: 186,
      reportSeries: "A Crim R",
      startingPage: 235,
      courtId: "VSCA",
    });
    const text = toPlainText(runs);
    expect(text).toBe("Smith (2008) 186 A Crim R 235 (Victorian Court of Appeal)");
  });

  test("formats court parenthetical per AGLC4 ex 77 (rule 2.2.6)", () => {
    // Aldrick v EM Investments (Qld) Pty Ltd [2000] 2 Qd R 346 (Court of Appeal)
    const caseName: FormattedRun[] = [
      { text: "Aldrick", italic: true },
      { text: " v ", italic: true },
      { text: "EM Investments (Qld) Pty Ltd", italic: true },
    ];
    const runs = formatReportedCase({
      caseName,
      yearType: "square",
      year: 2000,
      volume: 2,
      reportSeries: "Qd R",
      startingPage: 346,
      courtId: "QCA",
    });
    expect(toPlainText(runs)).toBe(
      "Aldrick v EM Investments (Qld) Pty Ltd [2000] 2 Qd R 346 (Court of Appeal)"
    );
  });

  test("judicial officers precede the court parenthetical per AGLC4 ex 79 (rule 2.2.6)", () => {
    // A-G (Cth) v The Queen (1957) 95 CLR 529, 533 (Viscount Simonds for
    // the Court) (Privy Council)
    const caseName: FormattedRun[] = [
      { text: "A-G (Cth)", italic: true },
      { text: " v ", italic: true },
      { text: "The Queen", italic: true },
    ];
    const runs = formatReportedCase({
      caseName,
      yearType: "round",
      year: 1957,
      volume: 95,
      reportSeries: "CLR",
      startingPage: 529,
      pinpoint: { type: "page", value: "533" },
      courtId: "Privy Council",
      judicialOfficers: formatJudicialOfficers([
        { name: "Viscount Simonds", title: "", role: "for_the_court" },
      ]),
    });
    expect(toPlainText(runs)).toBe(
      "A-G (Cth) v The Queen (1957) 95 CLR 529, 533 (Viscount Simonds for the Court) (Privy Council)"
    );
  });

  test("formats unique reference instead of starting page per AGLC4 ex 67 (rule 2.2.4)", () => {
    // Borg v Commissioner, Department of Corrective Services (2002) EOC ¶93-198
    const caseName: FormattedRun[] = [
      { text: "Borg", italic: true },
      { text: " v ", italic: true },
      { text: "Commissioner, Department of Corrective Services", italic: true },
    ];
    const runs = formatReportedCase({
      caseName,
      yearType: "round",
      year: 2002,
      reportSeries: "EOC",
      startingPage: "¶93-198",
    });
    expect(toPlainText(runs)).toBe(
      "Borg v Commissioner, Department of Corrective Services (2002) EOC ¶93-198"
    );
  });

  test("formats unique reference with pinpoint per AGLC4 ex 75 (rule 2.2.5)", () => {
    // Garry Rogers Motors (Aust) Pty Ltd v Subaru (Aust) Pty Ltd (1999)
    // ATPR ¶41-703, 43,014
    const caseName: FormattedRun[] = [
      { text: "Garry Rogers Motors (Aust) Pty Ltd", italic: true },
      { text: " v ", italic: true },
      { text: "Subaru (Aust) Pty Ltd", italic: true },
    ];
    const runs = formatReportedCase({
      caseName,
      yearType: "round",
      year: 1999,
      reportSeries: "ATPR",
      startingPage: "¶41-703",
      pinpoint: { type: "page", value: "43,014" },
    });
    expect(toPlainText(runs)).toBe(
      "Garry Rogers Motors (Aust) Pty Ltd v Subaru (Aust) Pty Ltd (1999) ATPR ¶41-703, 43,014"
    );
  });
});

// ─── Rule 2.2.7 — Parallel Citations ────────────────────────────────────────

describe("Rule 2.2.7 — Parallel Citations", () => {
  test("Example 80: parallel citations should NOT be used for AU cases", () => {
    // AGLC4 says: "Parallel citations should not be used in citations
    // to Australian cases." The formatParallelCitations function exists
    // for UK/US cases that need them; for AU cases it should return empty.
    const runs = formatParallelCitations([]);
    expect(runs).toHaveLength(0);
  });

  test("formats UK-style parallel citation if provided", () => {
    const runs = formatParallelCitations([
      { yearType: "square", year: 1974, reportSeries: "VR", startingPage: 1 },
      {
        yearType: "round",
        year: 1974,
        volume: 4,
        reportSeries: "ALR",
        startingPage: 57,
      },
    ]);
    expect(toPlainText(runs)).toBe("[1974] VR 1; (1974) 4 ALR 57");
  });
});

// ─── Rule 2.3.1 — Unreported with MNC ───────────────────────────────────────

describe("Rule 2.3.1 — Unreported Decisions with MNC", () => {
  test("Example 82: Re Culleton [No 2] [2017] HCA 4, [57] (Nettle J)", () => {
    const runs = formatUnreportedMnc({
      caseName: [{ text: "Re Culleton [No 2]" }],
      year: 2017,
      courtIdentifier: "HCA",
      caseNumber: 4,
      pinpoint: { type: "paragraph", value: "[57]" },
      judicialOfficer: "Nettle J",
    });
    const text = toPlainText(runs);
    expect(text).toBe("Re Culleton [No 2] [2017] HCA 4, [57] (Nettle J)");
  });

  test("Example 83: R v De Gruchy [2006] VSCA 10, [4]–[5] (Vincent JA)", () => {
    const runs = formatUnreportedMnc({
      caseName: [{ text: "R" }, { text: " v " }, { text: "De Gruchy" }],
      year: 2006,
      courtIdentifier: "VSCA",
      caseNumber: 10,
      pinpoint: { type: "paragraph", value: "[4]–[5]" },
      judicialOfficer: "Vincent JA",
    });
    const text = toPlainText(runs);
    expect(text).toBe("R v De Gruchy [2006] VSCA 10, [4]–[5] (Vincent JA)");
  });

  test("MNC without pinpoint or judicial officer", () => {
    const runs = formatUnreportedMnc({
      caseName: [{ text: "Smith" }, { text: " v " }, { text: "Jones" }],
      year: 2023,
      courtIdentifier: "FCA",
      caseNumber: 456,
    });
    const text = toPlainText(runs);
    expect(text).toBe("Smith v Jones [2023] FCA 456");
  });

  test("year is always in square brackets for MNC", () => {
    const runs = formatUnreportedMnc({
      caseName: [{ text: "Test" }],
      year: 2020,
      courtIdentifier: "NSWSC",
      caseNumber: 100,
    });
    const text = toPlainText(runs);
    expect(text).toContain("[2020]");
  });
});

// ─── Rule 2.3.2 — Unreported without MNC ────────────────────────────────────

describe("Rule 2.3.2 — Unreported Decisions without MNC", () => {
  test("formats unreported decision per AGLC4 ex 84 (rule 2.3.2)", () => {
    // Ross v Chambers (Supreme Court of the Northern Territory,
    // Kriewaldt J, 5 April 1956) 77–8
    const runs = formatUnreportedNoMnc({
      caseName: [
        { text: "Ross", italic: true },
        { text: " v ", italic: true },
        { text: "Chambers", italic: true },
      ],
      courtIdentifier: "Supreme Court of the Northern Territory",
      judges: "Kriewaldt J",
      fullDate: "5 April 1956",
      pinpoint: { type: "page", value: "77–8" },
    });
    const text = toPlainText(runs);
    expect(text).toBe(
      "Ross v Chambers (Supreme Court of the Northern Territory, Kriewaldt J, 5 April 1956) 77–8"
    );
  });

  test("formats multi-judge unreported decision per AGLC4 ex 95 (rules 2.3.2, 2.4.1)", () => {
    // R v Hoxha (Victorian Court of Appeal, Charles, Callaway JJA and
    // Vincent AJA, 1 November 1995)
    const runs = formatUnreportedNoMnc({
      caseName: [
        { text: "R", italic: true },
        { text: " v ", italic: true },
        { text: "Hoxha", italic: true },
      ],
      courtIdentifier: "Victorian Court of Appeal",
      judges: "Charles, Callaway JJA and Vincent AJA",
      fullDate: "1 November 1995",
    });
    expect(toPlainText(runs)).toBe(
      "R v Hoxha (Victorian Court of Appeal, Charles, Callaway JJA and Vincent AJA, 1 November 1995)"
    );
  });

  test("proceeding number is not a rule 2.3.2 element and is never emitted", () => {
    const runs = formatUnreportedNoMnc({
      caseName: [{ text: "Smith v Jones", italic: true }],
      courtIdentifier: "Supreme Court of New South Wales",
      fullDate: "15 March 2021",
      proceedingNumber: "12345/2020",
    });
    expect(toPlainText(runs)).toBe(
      "Smith v Jones (Supreme Court of New South Wales, 15 March 2021)"
    );
  });
});

// ─── Rule 2.3.3 — Proceedings ────────────────────────────────────────────────

describe("Rule 2.3.3 — Proceedings", () => {
  test("Example 85: ACCC v Olex", () => {
    const runs = formatProceeding({
      caseName: [{ text: "ACCC v Olex Australia Pty Ltd", italic: true }],
      court: "Federal Court of Australia",
      proceedingNumber: "VID725/2014",
      commencedDate: "3 December 2014",
    });
    const text = toPlainText(runs);
    expect(text).toContain("commenced 3 December 2014");
    expect(text).toContain("VID725/2014");
  });
});

// ─── Rule 2.3.4 — Court Orders ──────────────────────────────────────────────

describe("Rule 2.3.4 — Court Orders", () => {
  test("formats court order per AGLC4 ex 88 (rule 2.3.4)", () => {
    // Order of Burley J in Seiko Epson Corporation v Calidad Pty Ltd
    // (Federal Court of Australia, NSD1519/2004, 21 December 2016)
    const runs = formatCourtOrder({
      caseName: [
        { text: "Seiko Epson Corporation", italic: true },
        { text: " v ", italic: true },
        { text: "Calidad Pty Ltd", italic: true },
      ],
      judicialOfficers: "Burley J",
      court: "Federal Court of Australia",
      proceedingNumber: "NSD1519/2004",
      orderDate: "21 December 2016",
    });
    expect(toPlainText(runs)).toBe(
      "Order of Burley J in Seiko Epson Corporation v Calidad Pty Ltd " +
        "(Federal Court of Australia, NSD1519/2004, 21 December 2016)"
    );
    // 'Order of … in' template head is roman; the case name is italic.
    expect(runs[0].italic).toBeUndefined();
    expect(runs[1].italic).toBe(true);
  });

  test("formats court order per AGLC4 ex 89 (rule 2.3.4)", () => {
    // Order of Murphy J in Duffy v Darmanin (Federal Court of Australia,
    // VID1218/2017, 10 November 2017)
    const runs = formatCourtOrder({
      caseName: [
        { text: "Duffy", italic: true },
        { text: " v ", italic: true },
        { text: "Darmanin", italic: true },
      ],
      judicialOfficers: "Murphy J",
      court: "Federal Court of Australia",
      proceedingNumber: "VID1218/2017",
      orderDate: "10 November 2017",
    });
    expect(toPlainText(runs)).toBe(
      "Order of Murphy J in Duffy v Darmanin " +
        "(Federal Court of Australia, VID1218/2017, 10 November 2017)"
    );
  });

  test("proceeding number omitted when not on the court order (rule 2.3.4)", () => {
    const runs = formatCourtOrder({
      caseName: [{ text: "Duffy v Darmanin", italic: true }],
      judicialOfficers: "Murphy J",
      court: "Federal Court of Australia",
      orderDate: "10 November 2017",
    });
    expect(toPlainText(runs)).toBe(
      "Order of Murphy J in Duffy v Darmanin (Federal Court of Australia, 10 November 2017)"
    );
  });
});

// ─── Rule 2.4 — Identifying Judicial Officers ──────────────────────────────

describe("Rule 2.4.1 — Identifying Judicial Officers", () => {
  test("single justice", () => {
    const runs = formatJudicialOfficers([{ name: "McHugh", title: "J" }]);
    expect(toPlainText(runs)).toBe("(McHugh J)");
  });

  test("Chief Justice", () => {
    const runs = formatJudicialOfficers([{ name: "Barwick", title: "CJ" }]);
    expect(toPlainText(runs)).toBe("(Barwick CJ)");
  });

  test("compound office abbreviation per AGLC4 ex 92 (rule 2.4.1)", () => {
    // R v Merritt (2004) 59 NSWLR 557, 567 [35]–[38] (Wood CJ at CL)
    const runs = formatJudicialOfficers([{ name: "Wood", title: "CJ at CL" }]);
    expect(toPlainText(runs)).toBe("(Wood CJ at CL)");
  });

  test("asterisked office appears in full before the name per AGLC4 ex 93 (rule 2.4.1)", () => {
    // Ottobrino v Espinoza (1995) 14 WAR 373, 377 (Commissioner Buss)
    const runs = formatJudicialOfficers([{ name: "Buss", title: "Commissioner" }]);
    expect(toPlainText(runs)).toBe("(Commissioner Buss)");
  });

  test("pre-name offices: Judge, Magistrate, Master (rule 2.4.1 table)", () => {
    expect(toPlainText(formatJudicialOfficers([{ name: "Lacava", title: "Judge" }]))).toBe(
      "(Judge Lacava)"
    );
    expect(toPlainText(formatJudicialOfficers([{ name: "Smith", title: "Magistrate" }]))).toBe(
      "(Magistrate Smith)"
    );
    expect(toPlainText(formatJudicialOfficers([{ name: "Sanderson", title: "Master" }]))).toBe(
      "(Master Sanderson)"
    );
  });
});

describe("Rule 2.4.5 — Two or More Judicial Officers", () => {
  test("joint judgment takes the plural title per AGLC4 ex 91 (rule 2.4.5)", () => {
    // Kartinyeri v Commonwealth: (Gummow and Hayne JJ)
    const runs = formatJudicialOfficers([
      { name: "Gummow", title: "J" },
      { name: "Hayne", title: "J" },
    ]);
    expect(toPlainText(runs)).toBe("(Gummow and Hayne JJ)");
  });

  test("three justices: Gummow, Hayne and Heydon JJ", () => {
    const runs = formatJudicialOfficers([
      { name: "Gummow", title: "J" },
      { name: "Hayne", title: "J" },
      { name: "Heydon", title: "J" },
    ]);
    expect(toPlainText(runs)).toBe("(Gummow, Hayne and Heydon JJ)");
  });

  test("formats mixed titles per AGLC4 ex 94 (rules 2.4.1, 2.4.5)", () => {
    // Re Zoudi (2006) 14 VR 580, 587–9 [24]–[28] (Maxwell P, Buchanan,
    // Nettle, Neave and Redlich JJA)
    const runs = formatJudicialOfficers([
      { name: "Maxwell", title: "P" },
      { name: "Buchanan", title: "JA" },
      { name: "Nettle", title: "JA" },
      { name: "Neave", title: "JA" },
      { name: "Redlich", title: "JA" },
    ]);
    expect(toPlainText(runs)).toBe("(Maxwell P, Buchanan, Nettle, Neave and Redlich JJA)");
  });

  test("separate judgments keep the singular title per AGLC4 fn 106 (rule 2.4.5)", () => {
    // Heydon J, Kirby J and Crennan J were of the same view in each of
    // their judgments. [Not: Heydon, Kirby and Crennan JJ were of …]
    const runs = formatJudicialOfficers([
      { name: "Heydon", title: "J", judgmentGroup: "heydon" },
      { name: "Kirby", title: "J", judgmentGroup: "kirby" },
      { name: "Crennan", title: "J", judgmentGroup: "crennan" },
    ]);
    expect(toPlainText(runs)).toBe("(Heydon J, Kirby J and Crennan J)");
  });

  test("titles without a plural form repeat the singular (rule 2.4.5)", () => {
    const runs = formatJudicialOfficers([
      { name: "Smith", title: "AsJ" },
      { name: "Jones", title: "AsJ" },
    ]);
    expect(toPlainText(runs)).toBe("(Smith AsJ and Jones AsJ)");
  });

  test("plural forms from the rule 2.4.1 table: AJJ and SJJ", () => {
    expect(
      toPlainText(
        formatJudicialOfficers([
          { name: "Smith", title: "AJ" },
          { name: "Jones", title: "AJ" },
        ])
      )
    ).toBe("(Smith and Jones AJJ)");
    expect(
      toPlainText(
        formatJudicialOfficers([
          { name: "Smith", title: "SJ" },
          { name: "Jones", title: "SJ" },
        ])
      )
    ).toBe("(Smith and Jones SJJ)");
  });
});

describe("Rule 2.4.2 — Agreement or Dissent", () => {
  test("dissent indicated in the same manner (rule 2.4.2)", () => {
    const runs = formatJudicialOfficers([{ name: "Kirby", title: "J", role: "dissenting" }]);
    expect(toPlainText(runs)).toBe("(Kirby J dissenting)");
  });

  test("agreeing role", () => {
    const runs = formatJudicialOfficers([{ name: "Webb", title: "J", role: "agreeing" }]);
    expect(toPlainText(runs)).toBe("(Webb J agreeing)");
  });

  test("formats agreement with 'at' pinpoint per AGLC4 ex 96 (rule 2.4.2)", () => {
    // Guinea Airways Ltd v Federal Commissioner of Taxation (1950) 83
    // CLR 584, 592–3 (Kitto J, Webb J agreeing at 591)
    const runs = formatJudicialOfficers([
      { name: "Kitto", title: "J" },
      { name: "Webb", title: "J", role: "agreeing", agreeingAt: "591" },
    ]);
    expect(toPlainText(runs)).toBe("(Kitto J, Webb J agreeing at 591)");
  });

  test("formats joint agreeing judgment per AGLC4 ex 97 (rules 2.4.2, 2.4.5)", () => {
    // Vakauta v Kelly (1989) 167 CLR 568, 589 (Toohey J, Brennan, Deane
    // and Gaudron JJ agreeing at 570)
    const runs = formatJudicialOfficers([
      { name: "Toohey", title: "J" },
      { name: "Brennan", title: "J", role: "agreeing", agreeingAt: "570" },
      { name: "Deane", title: "J", role: "agreeing", agreeingAt: "570" },
      { name: "Gaudron", title: "J", role: "agreeing", agreeingAt: "570" },
    ]);
    expect(toPlainText(runs)).toBe("(Toohey J, Brennan, Deane and Gaudron JJ agreeing at 570)");
  });

  test("formats multiple separate agreements per AGLC4 ex 98 (rule 2.4.2)", () => {
    // Grassby v The Queen (1989) 168 CLR 1, 22 (Dawson J, Mason CJ
    // agreeing at 4, Brennan J agreeing at 4)
    const runs = formatJudicialOfficers([
      { name: "Dawson", title: "J" },
      { name: "Mason", title: "CJ", role: "agreeing", agreeingAt: "4" },
      { name: "Brennan", title: "J", role: "agreeing", agreeingAt: "4" },
    ]);
    expect(toPlainText(runs)).toBe("(Dawson J, Mason CJ agreeing at 4, Brennan J agreeing at 4)");
  });

  test("formats mixed joint and separate agreements per AGLC4 ex 99 (rule 2.4.2)", () => {
    // D'Arcy v Myriad Genetics Inc (2015) 258 CLR 334, 373 [96] (French
    // CJ, Kiefel, Bell and Keane JJ, Gageler and Nettle JJ agreeing at
    // 397 [172], Gordon J agreeing at 419 [285])
    const runs = formatJudicialOfficers([
      { name: "French", title: "CJ" },
      { name: "Kiefel", title: "J" },
      { name: "Bell", title: "J" },
      { name: "Keane", title: "J" },
      { name: "Gageler", title: "J", role: "agreeing", agreeingAt: "397 [172]" },
      { name: "Nettle", title: "J", role: "agreeing", agreeingAt: "397 [172]" },
      { name: "Gordon", title: "J", role: "agreeing", agreeingAt: "419 [285]" },
    ]);
    expect(toPlainText(runs)).toBe(
      "(French CJ, Kiefel, Bell and Keane JJ, Gageler and Nettle JJ agreeing at 397 [172], " +
        "Gordon J agreeing at 419 [285])"
    );
  });
});

describe("Rule 2.4.3 — Joint and Separate Judgments", () => {
  test("formats 'for the Court' per AGLC4 ex 100 (rule 2.4.3)", () => {
    // Ewart v Fox [1954] VLR 699, 705 (Hudson AJ for the Court)
    const runs = formatJudicialOfficers([{ name: "Hudson", title: "AJ", role: "for_the_court" }]);
    expect(toPlainText(runs)).toBe("(Hudson AJ for the Court)");
  });

  test("formats 'for «names»' per AGLC4 ex 101 (rule 2.4.3)", () => {
    // Taylor v McQueen [1954] VLR 661, 666 (Hudson J for Gavan Duffy and
    // Hudson JJ)
    const runs = formatJudicialOfficers([
      {
        name: "Hudson",
        title: "J",
        onBehalfOf: [
          { name: "Gavan Duffy", title: "J" },
          { name: "Hudson", title: "J" },
        ],
      },
    ]);
    expect(toPlainText(runs)).toBe("(Hudson J for Gavan Duffy and Hudson JJ)");
  });
});

describe("Rule 2.4.4 — During Argument", () => {
  test("during argument renders in separate parentheses per AGLC4 ex 102 (rule 2.4.4)", () => {
    // Stephens v Abrahams [No 2] (1903) 29 VLR 229, 239 (Williams J)
    // (during argument)
    const runs = formatJudicialOfficers([
      { name: "Williams", title: "J", role: "during_argument" },
    ]);
    const text = toPlainText(runs);
    expect(text).toBe("(Williams J) (during argument)");
    // Should NOT contain 'arguendo'
    expect(text.toLowerCase()).not.toContain("arguendo");
  });
});

// ─── Rule 2.5 — Case History ────────────────────────────────────────────────

describe("Rule 2.5 — Case History", () => {
  test("Example 107: revd", () => {
    // King v Philcox ..., revd (2015) 255 CLR 304
    const runs = formatCaseHistory([
      {
        phrase: "revd",
        citation: [{ text: "(2015) 255 CLR 304" }],
      },
    ]);
    const text = toPlainText(runs);
    expect(text).toBe(", revd (2015) 255 CLR 304");
  });

  test("Example 108: affd with different case name", () => {
    const runs = formatCaseHistory([
      {
        phrase: "affd",
        citation: [
          { text: "Butcher v Lachlan Elder Realty Pty Ltd", italic: true },
          { text: " (2004) 218 CLR 592" },
        ],
      },
    ]);
    const text = toPlainText(runs);
    expect(text).toBe(", affd Butcher v Lachlan Elder Realty Pty Ltd (2004) 218 CLR 592");
  });
});

// ─── Rule 2.6.1 — Administrative Decisions ──────────────────────────────────

describe("Rule 2.6.1 — Administrative Decisions", () => {
  test("formats administrative decision per AGLC4 ex 110 (rule 2.6.1)", () => {
    const runs = formatAdministrativeDecision({
      party: "Pochi",
      department: "Minister for Immigration and Ethnic Affairs",
      year: 1979,
      volume: 26,
      reportSeries: "ALR",
      startingPage: 247,
    });
    const text = toPlainText(runs);
    expect(text).toBe("Re Pochi and Minister for Immigration and Ethnic Affairs (1979) 26 ALR 247");
    // 'Re' should be italic
    expect(runs[0].italic).toBe(true);
  });

  test("number/code titles take no 'Re' per AGLC4 ex 109 (rule 2.6.1)", () => {
    // AAT Case 7422 (1991) 22 ATR 3450, 3456 [28]
    const runs = formatAdministrativeDecision({
      party: "AAT Case 7422",
      department: "",
      year: 1991,
      volume: 22,
      reportSeries: "ATR",
      startingPage: 3450,
      pinpoint: {
        type: "page",
        value: "3456",
        subPinpoint: { type: "paragraph", value: "[28]" },
      },
    });
    expect(toPlainText(runs)).toBe("AAT Case 7422 (1991) 22 ATR 3450, 3456 [28]");
  });
});

describe("Rule 2.6.2 — Arbitration", () => {
  test("formats arbitration with arbitrators as forum per AGLC4 ex 112 (rule 2.6.2)", () => {
    // Sandline International Inc v Papua New Guinea (Award, Sir Edward
    // Somers, Sir Michael Kerr and Sir Daryl Dawson, 9 October 1998) [10.2]
    const runs = formatArbitration({
      parties: "Sandline International Inc v Papua New Guinea",
      awardDescription: "Award",
      forum: "Sir Edward Somers, Sir Michael Kerr and Sir Daryl Dawson",
      date: "9 October 1998",
      pinpoint: "[10.2]",
    });
    expect(toPlainText(runs)).toBe(
      "Sandline International Inc v Papua New Guinea " +
        "(Award, Sir Edward Somers, Sir Michael Kerr and Sir Daryl Dawson, 9 October 1998) [10.2]"
    );
  });

  test("formats reproduced award per AGLC4 ex 113 (rule 2.6.2)", () => {
    // Beckman Instruments Inc v Overseas Private Investment Corporation
    // (Award and Opinion, American Arbitration Association Commercial
    // Arbitration Tribunal, Case No 16 199 00209 87G, 20 February 1988)
    // reported in (1988) 27 ILM 1260, 1263
    const runs = formatArbitration({
      parties: "Beckman Instruments Inc v Overseas Private Investment Corporation",
      awardDescription: "Award and Opinion",
      forum: "American Arbitration Association Commercial Arbitration Tribunal",
      caseNumber: "Case No 16 199 00209 87G",
      date: "20 February 1988",
      reportedIn: [{ text: "(1988) 27 ILM 1260, 1263" }],
    });
    expect(toPlainText(runs)).toBe(
      "Beckman Instruments Inc v Overseas Private Investment Corporation " +
        "(Award and Opinion, American Arbitration Association Commercial Arbitration Tribunal, " +
        "Case No 16 199 00209 87G, 20 February 1988) reported in (1988) 27 ILM 1260, 1263"
    );
  });

  test("formats award without party names per AGLC4 ex 115 (rule 2.6.2)", () => {
    // Final Award, Netherlands Arbitration Institute, Case No 1930,
    // 12 October 1999 reported in (2001) 26 Yearbook — Commercial
    // Arbitration 181, 184 [5]–[6]
    const runs = formatArbitration({
      awardDescription: "Final Award",
      forum: "Netherlands Arbitration Institute",
      caseNumber: "Case No 1930",
      date: "12 October 1999",
      reportedIn: [
        { text: "(2001) 26 " },
        { text: "Yearbook — Commercial Arbitration", italic: true },
        { text: " 181, 184 [5]–[6]" },
      ],
    });
    const text = toPlainText(runs);
    expect(text).toBe(
      "Final Award, Netherlands Arbitration Institute, Case No 1930, 12 October 1999 " +
        "reported in (2001) 26 Yearbook — Commercial Arbitration 181, 184 [5]–[6]"
    );
    // No parentheses around the details when party names are omitted.
    expect(text).not.toContain("(Final Award");
  });
});

// ─── Rule 2.7.1 — Transcripts ───────────────────────────────────────────────

describe("Rule 2.7.1 — Transcripts of Proceedings", () => {
  test("formats transcript without proceeding number per AGLC4 ex 116 (rule 2.7.1)", () => {
    // Transcript of Proceedings, North East Solution Pty Ltd v Masters
    // Home Improvement Australia Pty Ltd (Supreme Court of Victoria,
    // Croft J, 18 May 2015) 31 (PJ Bick QC)
    const runs = formatTranscript({
      caseName: [
        {
          text: "North East Solution Pty Ltd v Masters Home Improvement Australia Pty Ltd",
          italic: true,
        },
      ],
      court: "Supreme Court of Victoria",
      judicialOfficers: "Croft J",
      date: "18 May 2015",
      pinpoints: [{ value: "31", speaker: "PJ Bick QC" }],
    });
    expect(toPlainText(runs)).toBe(
      "Transcript of Proceedings, " +
        "North East Solution Pty Ltd v Masters Home Improvement Australia Pty Ltd " +
        "(Supreme Court of Victoria, Croft J, 18 May 2015) 31 (PJ Bick QC)"
    );
  });

  test("formats transcript with proceeding number per AGLC4 ex 117 (rules 2.7.1, 2.4.1)", () => {
    // Transcript of Proceedings, Celano v Swan (County Court of
    // Victoria, 09/0867, Judge Lacava, 27 August 2009) 11 (SM Petrovich)
    const runs = formatTranscript({
      caseName: [{ text: "Celano v Swan", italic: true }],
      court: "County Court of Victoria",
      proceedingNumber: "09/0867",
      judicialOfficers: "Judge Lacava",
      date: "27 August 2009",
      pinpoints: [{ value: "11", speaker: "SM Petrovich" }],
    });
    expect(toPlainText(runs)).toBe(
      "Transcript of Proceedings, Celano v Swan " +
        "(County Court of Victoria, 09/0867, Judge Lacava, 27 August 2009) 11 (SM Petrovich)"
    );
  });

  test("empty proceeding number does not leave a dangling comma (rule 2.7.1)", () => {
    const runs = formatTranscript({
      caseName: [{ text: "Celano v Swan", italic: true }],
      court: "County Court of Victoria",
      proceedingNumber: "",
      judicialOfficers: "Judge Lacava",
      date: "27 August 2009",
    });
    expect(toPlainText(runs)).toBe(
      "Transcript of Proceedings, Celano v Swan " +
        "(County Court of Victoria, Judge Lacava, 27 August 2009)"
    );
  });
});

describe("Rule 2.7.2 — HCA Transcripts", () => {
  test("Example 118: HCATrans format", () => {
    // Transcript of Proceedings, Ruhani v Director of Police [2005] HCATrans 205
    const runs = formatHcaTranscript({
      caseName: [{ text: "Ruhani v Director of Police", italic: true }],
      year: 2005,
      number: 205,
    });
    const text = toPlainText(runs);
    expect(text).toBe("Transcript of Proceedings, Ruhani v Director of Police [2005] HCATrans 205");
  });

  test("formats line-number pinpoints and speakers per AGLC4 ex 119 (rule 2.7.2)", () => {
    // Transcript of Proceedings, Mulholland v Australian Electoral
    // Commission [2004] HCATrans 8, 2499–517 (Callinan J and JBR Beach
    // QC), 2589–93 (McHugh J)
    const runs = formatHcaTranscript({
      caseName: [{ text: "Mulholland v Australian Electoral Commission", italic: true }],
      year: 2004,
      number: 8,
      pinpoints: [
        { value: "2499–517", speaker: "Callinan J and JBR Beach QC" },
        { value: "2589–93", speaker: "McHugh J" },
      ],
    });
    expect(toPlainText(runs)).toBe(
      "Transcript of Proceedings, Mulholland v Australian Electoral Commission " +
        "[2004] HCATrans 8, 2499–517 (Callinan J and JBR Beach QC), 2589–93 (McHugh J)"
    );
  });
});

// ─── Rule 2.8 — Submissions in Cases ────────────────────────────────────────

describe("Rule 2.8 — Submissions in Cases", () => {
  test("Example 120: Attorney-General (Cth) submission", () => {
    const runs = formatSubmission({
      partyName: "Attorney-General (Cth)",
      submissionTitle:
        "Outline of Submissions of the Attorney-General of the Commonwealth as Amicus Curiae",
      caseName: [
        {
          text: "Humane Society International Inc v Kyodo Senpaku Kaisha Ltd",
          italic: true,
        },
      ],
      proceedingNumber: "NSD1519/2004",
      date: "25 January 2005",
      pinpoint: { type: "paragraph", value: "[10]" },
    });
    const text = toPlainText(runs);
    // Check key components
    expect(text).toContain("Attorney-General (Cth)");
    expect(text).toContain(
      "\u2018Outline of Submissions of the Attorney-General of the Commonwealth as Amicus Curiae\u2019"
    );
    expect(text).toContain("Submission in");
    expect(text).toContain("NSD1519/2004");
    expect(text).toContain("25 January 2005");
    expect(text).toContain("[10]");
  });
});
