/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AGLC4 Part IV — International Materials (Chapters 8–14)
 *
 * Each test case references specific AGLC4 rule numbers and example footnote
 * numbers from the Guide. Expected outputs are derived from the AGLC4 text.
 */

import { formatTreaty } from "../../src/engine/rules/v4/international/treaties";
import {
  formatUnCharter,
  formatUnDocument,
  formatUnYearbook,
} from "../../src/engine/rules/v4/international/un";
import {
  formatIcjDecision,
  formatIcjPleading,
} from "../../src/engine/rules/v4/international/icj";
import {
  formatStateArbitrationReported,
  formatStateArbitration,
} from "../../src/engine/rules/v4/international/arbitral";
import { formatIccCase } from "../../src/engine/rules/v4/international/icc-tribunals";
import {
  formatWtoDocument,
  formatWtoDecision,
  formatGattDocument,
  formatGattPanelReport,
} from "../../src/engine/rules/v4/international/economic";
import {
  formatEchrReportedCase,
  formatEchrCase,
  formatEuOfficialJournal,
  formatCjeuCase,
} from "../../src/engine/rules/v4/international/supranational";
import { FormattedRun } from "../../src/types/formattedRun";

/** Helper: flatten FormattedRun[] to plain text for assertion. */
function toText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Helper: extract italic segments. */
function italicSegments(runs: FormattedRun[]): string[] {
  return runs.filter((r) => r.italic).map((r) => r.text);
}

// =============================================================================
// Chapter 8 — Treaties (Rules 8.1–8.8)
// =============================================================================

describe("Chapter 8 — Treaties", () => {
  // AGLC4 Rule 8: Multilateral treaty — 'opened for signature'
  // Example: Rome Statute (from Rule 12.1.1 example 1, which cites a treaty)
  test("Rule 8.1–8.5: multilateral treaty with entry into force (AGLC4 p 176 ex 1)", () => {
    const runs = formatTreaty({
      title:
        "Rome Statute of the International Criminal Court",
      openedDate: "17 July 1998",
      treatySeries: "UNTS",
      seriesVolume: 2187,
      startingPage: 90,
      entryIntoForceDate: "1 July 2002",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Rome Statute of the International Criminal Court, " +
        "opened for signature 17 July 1998, 2187 UNTS 90 " +
        "(entered into force 1 July 2002)"
    );
    // Title must be italic (Rule 8.2)
    expect(italicSegments(runs)).toContain(
      "Rome Statute of the International Criminal Court"
    );
  });

  // AGLC4 Rule 8.3: Bilateral treaty — 'signed'
  test("Rule 8.3: bilateral treaty uses 'signed' (AGLC4 Rule 8.3)", () => {
    const runs = formatTreaty({
      title:
        "Agreement between the United Nations and the Government of Sierra Leone on the Establishment of a Special Court for Sierra Leone",
      parties: undefined,
      signedDate: "16 January 2002",
      treatySeries: "UNTS",
      seriesVolume: 2178,
      startingPage: 137,
      entryIntoForceDate: "12 April 2002",
    });

    const text = toText(runs);
    expect(text).toContain("signed 16 January 2002");
    expect(text).not.toContain("opened for signature");
  });

  // AGLC4 Rule 8.5: Treaty not yet in force
  test("Rule 8.5: treaty not yet in force", () => {
    const runs = formatTreaty({
      title: "Convention on Cluster Munitions",
      openedDate: "30 May 2008",
      treatySeries: "UNTS",
      seriesVolume: 2688,
      startingPage: 39,
      notYetInForce: true,
    });

    expect(toText(runs)).toContain("(not yet in force)");
    expect(toText(runs)).not.toContain("entered into force");
  });

  // AGLC4 Rule 8.6/8.8: Pinpoint reference to an article
  test("Rule 8.6: treaty pinpoint to article", () => {
    const runs = formatTreaty({
      title:
        "Charter of the Association of Southeast Asian Nations",
      openedDate: "20 November 2007",
      treatySeries: "UNTS",
      seriesVolume: 2624,
      startingPage: 223,
      entryIntoForceDate: "15 December 2008",
      pinpoint: { type: "article", value: "5" },
    });

    const text = toText(runs);
    expect(text).toContain("art 5");
  });

  // AGLC4 Rule 8.7: Bilateral treaty with parties
  test("Rule 8.7: bilateral treaty with parties listed", () => {
    const runs = formatTreaty({
      title: "North American Free Trade Agreement",
      parties: ["Canada", "Mexico", "United States of America"],
      signedDate: "17 December 1992",
      treatySeries: "[1994] CTS",
      startingPage: 2,
      entryIntoForceDate: "1 January 1994",
    });

    const text = toText(runs);
    // Parties separated by en-dash
    expect(text).toContain(
      "Canada\u2013Mexico\u2013United States of America"
    );
  });

  // Marrakesh Agreement (AGLC4 p 184 ex 1)
  test("Rule 8: Marrakesh Agreement (AGLC4 p 184 ex 1)", () => {
    const runs = formatTreaty({
      title:
        "Marrakesh Agreement Establishing the World Trade Organization",
      openedDate: "15 April 1994",
      treatySeries: "UNTS",
      seriesVolume: 1867,
      startingPage: 3,
      entryIntoForceDate: "1 January 1995",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Marrakesh Agreement Establishing the World Trade Organization, " +
        "opened for signature 15 April 1994, 1867 UNTS 3 " +
        "(entered into force 1 January 1995)"
    );
  });
});

// =============================================================================
// Chapter 9 — UN Materials (Rules 9.1–9.5)
// =============================================================================

describe("Chapter 9 — UN Materials", () => {
  // AGLC4 Rule 9.1: UN Charter
  test("Rule 9.1: UN Charter citation (AGLC4 Rule 9.1)", () => {
    const runs = formatUnCharter("2(4)");
    const text = toText(runs);

    expect(text).toBe("Charter of the United Nations art 2(4)");
    // Title is italicised
    expect(italicSegments(runs)).toContain("Charter of the United Nations");
  });

  // AGLC4 Rule 9.2: Security Council Resolution (AGLC4 p 158 ex 53)
  test("Rule 9.2: SC Resolution (AGLC4 p 158 ex 53)", () => {
    const runs = formatUnDocument({
      title: "SC Res 827",
      documentNumber: "S/RES/827",
      date: "25 May 1993",
    });

    const text = toText(runs);
    expect(text).toBe(
      "SC Res 827, UN Doc S/RES/827 (25 May 1993)"
    );
    expect(italicSegments(runs)).toContain("SC Res 827");
  });

  // AGLC4 Rule 9.2: GA Resolution (AGLC4 p 158 ex 52)
  test("Rule 9.2: GA Resolution (AGLC4 p 158 ex 52)", () => {
    const runs = formatUnDocument({
      title: "Prevention of Armed Conflict",
      resolutionNumber: "GA Res 57/337",
      documentNumber: "A/RES/57/337",
      date: "18 July 2003, adopted 3 July 2003",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Prevention of Armed Conflict, GA Res 57/337, " +
        "UN Doc A/RES/57/337 (18 July 2003, adopted 3 July 2003)"
    );
  });

  // AGLC4 Rule 9.2: Meeting Record (AGLC4 p 158 ex 54)
  test("Rule 9.2: Meeting Record (AGLC4 p 158 ex 54)", () => {
    const runs = formatUnDocument({
      title: "UN GAOR",
      session: "63rd sess",
      meetingNumber: "55th plen mtg",
      documentNumber: "A/63/PV.55",
      date: "19 November 2008",
    });

    const text = toText(runs);
    expect(text).toContain("UN GAOR");
    expect(text).toContain("63rd sess");
    expect(text).toContain("55th plen mtg");
    expect(text).toContain("UN Doc A/63/PV.55");
  });

  // AGLC4 Rule 9.4: UN Yearbook with volume (AGLC4 p 156 ex 43)
  test("Rule 9.4: Yearbook with volume (AGLC4 p 156 ex 43)", () => {
    const runs = formatUnYearbook({
      title: "Judge Bruno Simma",
      yearbook: "International Court of Justice Yearbook",
      year: 2005,
      yearType: "round",
      volume: "59",
      startingPage: 54,
    });

    const text = toText(runs);
    expect(text).toBe(
      "'Judge Bruno Simma' (2005) 59 International Court of Justice Yearbook 54"
    );
    // Yearbook title must be italic
    expect(italicSegments(runs)).toContain(
      "International Court of Justice Yearbook"
    );
  });

  // AGLC4 Rule 9.4: Yearbook with composite volume (AGLC4 p 156 ex 44)
  test("Rule 9.4: Yearbook with composite volume (AGLC4 p 156 ex 44)", () => {
    const runs = formatUnYearbook({
      title: "Developments and Trends, 2007",
      yearbook: "United Nations Disarmament Yearbook",
      year: 2007,
      yearType: "round",
      volume: "32(II)",
      startingPage: 3,
      pinpoint: "4",
    });

    const text = toText(runs);
    expect(text).toBe(
      "'Developments and Trends, 2007' (2007) 32(II) United Nations Disarmament Yearbook 3, 4"
    );
  });

  // AGLC4 Rule 9.4: Yearbook with year-indexed volumes (AGLC4 p 156 ex 42)
  test("Rule 9.4: Yearbook organised by year (AGLC4 p 156 ex 42)", () => {
    const runs = formatUnYearbook({
      title:
        "National Legislation Providing for the Levying of Certain Air Travel Taxes \u2014 The United Nations Should Be Exempt from Such Taxes under Section 7(a) of the Convention on the Privileges and Immunities of the United Nations",
      yearbook: "United Nations Juridical Yearbook",
      year: 1973,
      yearType: "square",
      startingPage: 132,
      pinpoint: "135",
    });

    const text = toText(runs);
    expect(text).toContain("[1973]");
    expect(text).toContain("United Nations Juridical Yearbook");
    expect(text).toContain("132, 135");
  });
});

// =============================================================================
// Chapter 10 — ICJ and PCIJ (Rules 10.1–10.5)
// =============================================================================

describe("Chapter 10 — ICJ and PCIJ", () => {
  // AGLC4 Rule 10.2: Reported ICJ decision — East Timor (p 160 example)
  test("Rule 10.2: ICJ reported decision (AGLC4 p 160 East Timor)", () => {
    const runs = formatIcjDecision({
      caseName: "East Timor",
      parties: "Portugal v Australia",
      phase: "Judgment",
      year: 1995,
      reportSeries: "ICJ Rep",
      page: 90,
      pinpoint: "93",
    });

    const text = toText(runs);
    expect(text).toBe(
      "East Timor (Portugal v Australia) (Judgment) [1995] ICJ Rep 90, 93"
    );
    // Case name must be italic
    expect(italicSegments(runs)).toContain("East Timor");
    // Parties must be italic
    expect(italicSegments(runs)).toContain("(Portugal v Australia)");
    // Phase must be italic
    expect(italicSegments(runs)).toContain("(Judgment)");
  });

  // AGLC4 Rule 10.2: Advisory Opinion — Western Sahara (p 160 example)
  test("Rule 10.2: ICJ advisory opinion (AGLC4 p 160 Western Sahara)", () => {
    const runs = formatIcjDecision({
      caseName: "Western Sahara",
      parties: "Advisory Opinion",
      year: 1975,
      reportSeries: "ICJ Rep",
      page: 12,
      pinpoint: "17",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Western Sahara (Advisory Opinion) [1975] ICJ Rep 12, 17"
    );
  });

  // AGLC4 Rule 10.2: PCIJ decision — Mavrommatis (p 160 example)
  test("Rule 10.2: PCIJ decision with series letter (AGLC4 p 160 Mavrommatis)", () => {
    const runs = formatIcjDecision({
      caseName: "Mavrommatis Palestine Concessions",
      parties: "Greece v United Kingdom",
      phase: "Jurisdiction",
      year: 1924,
      reportSeries: "PCIJ",
      seriesLetter: "A",
      caseNumber: 2,
      pinpoint: "10",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Mavrommatis Palestine Concessions (Greece v United Kingdom) (Jurisdiction) [1924] PCIJ (ser A) No 2, 10"
    );
  });

  // AGLC4 p 161 ex 5: Genocide case
  test("Rule 10.2.2: parties in elaborate form (AGLC4 p 161 ex 5)", () => {
    const runs = formatIcjDecision({
      caseName:
        "Application of the Convention on the Prevention and Punishment of the Crime of Genocide",
      parties: "Bosnia and Herzegovina v Yugoslavia",
      phase: "Preliminary Objections",
      year: 1996,
      reportSeries: "ICJ Rep",
      page: 595,
    });

    const text = toText(runs);
    expect(text).toContain(
      "(Bosnia and Herzegovina v Yugoslavia)"
    );
    expect(text).toContain("(Preliminary Objections)");
    expect(text).toContain("[1996] ICJ Rep 595");
  });

  // AGLC4 p 162 ex 8: Provisional Measures
  test("Rule 10.2.3: phase — Provisional Measures (AGLC4 p 162 ex 8)", () => {
    const runs = formatIcjDecision({
      caseName:
        "United States Diplomatic and Consular Staff in Tehran",
      parties: "United States of America v Iran",
      phase: "Provisional Measures",
      year: 1979,
      reportSeries: "ICJ Rep",
      page: 7,
      pinpoint: "12 [10]\u2013[11]",
    });

    const text = toText(runs);
    expect(text).toContain("(Provisional Measures)");
    expect(text).toContain("7, 12 [10]\u2013[11]");
  });

  // AGLC4 p 165 ex 23: Identifying judges (separate/dissenting)
  test("Rule 10.2.8: identifying judges (AGLC4 p 165 ex 23)", () => {
    const runs = formatIcjDecision({
      caseName: "Interhandel",
      parties: "Switzerland v United States of America",
      phase: "Preliminary Objections",
      year: 1959,
      reportSeries: "ICJ Rep",
      page: 6,
      pinpoint: "78",
      judge: "President Klaestad",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Interhandel (Switzerland v United States of America) (Preliminary Objections) [1959] ICJ Rep 6, 78 (President Klaestad)"
    );
  });

  // AGLC4 p 166 ex 27: ICJ Pleading
  test("Rule 10.3: ICJ pleading (AGLC4 p 166 ex 27)", () => {
    const runs = formatIcjPleading({
      documentTitle:
        "Written Statement of the Government of the Kingdom of Denmark",
      caseName:
        "Certain Expenses of the United Nations",
      parties: "Advisory Opinion",
      year: 1962,
      page: 137,
    });

    const text = toText(runs);
    expect(text).toBe(
      "'Written Statement of the Government of the Kingdom of Denmark', " +
        "Certain Expenses of the United Nations (Advisory Opinion) [1962] ICJ Pleadings 137"
    );
  });

  // AGLC4 p 167 ex 29: ICJ Pleading with volume
  test("Rule 10.3: ICJ pleading with volume (AGLC4 p 167 ex 29)", () => {
    const runs = formatIcjPleading({
      documentTitle:
        "Questions Put to Professor Glennon by Judge Schwebel",
      caseName:
        "Military and Paramilitary Activities in and against Nicaragua",
      parties: "Nicaragua v United States of America",
      year: 1986,
      volume: "V",
      page: 78,
      pinpoint: "78",
      speaker: "Judge Schwebel",
    });

    const text = toText(runs);
    expect(text).toContain("[1986] V ICJ Pleadings 78, 78 (Judge Schwebel)");
  });
});

// =============================================================================
// Chapter 11 — International Arbitral Decisions (Rules 11.1–11.3)
// =============================================================================

describe("Chapter 11 — International Arbitral Decisions", () => {
  // AGLC4 p 171 ex 1: Reported state-state arbitration
  test("Rule 11.1.1: reported state-state arbitration (AGLC4 p 171 ex 1)", () => {
    const runs = formatStateArbitrationReported({
      caseName: "Cordillera of the Andes Boundary",
      parties: "Argentina v Chile",
      phase: "Report of the Tribunal Appointed by the Arbitrator",
      year: 1902,
      volume: 9,
      reportSeries: "RIAA",
      startingPage: 29,
    });

    const text = toText(runs);
    expect(text).toBe(
      "Cordillera of the Andes Boundary (Argentina v Chile) " +
        "(Report of the Tribunal Appointed by the Arbitrator) " +
        "(1902) 9 RIAA 29"
    );
    expect(italicSegments(runs)).toContain(
      "Cordillera of the Andes Boundary"
    );
  });

  // AGLC4 p 171 ex 3: with judge/arbitrator
  test("Rule 11.1.1: reported arbitration with arbitrator name (AGLC4 p 171 ex 3)", () => {
    const runs = formatStateArbitrationReported({
      caseName:
        "Responsibility for the Deaths of Letelier and Moffitt",
      parties: "United States of America v Chile",
      phase: "Decision",
      year: 1992,
      volume: 25,
      reportSeries: "RIAA",
      startingPage: 1,
      pinpoint: "12\u201313",
      judge: "Prof Orrego Vicu\u00f1a",
    });

    const text = toText(runs);
    expect(text).toContain("(1992) 25 RIAA 1, 12\u201313 (Prof Orrego Vicu\u00f1a)");
  });

  // AGLC4 p 172 ex 4: Unreported state-state arbitration
  test("Rule 11.1.2: unreported state-state arbitration (AGLC4 p 172 ex 4)", () => {
    const runs = formatStateArbitration({
      parties:
        "Arctic Sunrise Arbitration (Netherlands v Russia)",
      awardDetails: "Award on Merits",
      tribunal: "Permanent Court of Arbitration",
      caseNumber: "2014-02",
      date: "14 August 2015",
      pinpoint: "[152]",
    });

    const text = toText(runs);
    expect(text).toContain(
      "(Permanent Court of Arbitration, Case No 2014-02, 14 August 2015)"
    );
    expect(text).toContain("[152]");
  });
});

// =============================================================================
// Chapter 12 — International Criminal Tribunals (Rules 12.1–12.4)
// =============================================================================

describe("Chapter 12 — International Criminal Tribunals", () => {
  // AGLC4 p 179 ex 9: ICC case
  test("Rule 12.2: ICC case (AGLC4 p 179 ex 9)", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Lubanga",
      phase:
        "Decision on the Manner of Questioning Witnesses by the Legal Representatives of Victims",
      court: "International Criminal Court",
      chamber: "Trial Chamber I",
      caseNumber: "ICC-01/04-01/06",
      date: "16 September 2009",
      pinpoint: "[6]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Prosecutor v Lubanga " +
        "(Decision on the Manner of Questioning Witnesses by the Legal Representatives of Victims) " +
        "(International Criminal Court, Trial Chamber I, Case No ICC-01/04-01/06, 16 September 2009) [6]"
    );
    expect(italicSegments(runs)).toContain("Prosecutor v Lubanga");
  });

  // AGLC4 p 179 ex 10: ICTR appeal — reversed names
  test("Rule 12.2.1: reversed names for appeal (AGLC4 p 179 ex 10)", () => {
    const runs = formatIccCase({
      caseName: "Simba v Prosecutor",
      phase: "Judgement",
      court: "International Criminal Tribunal for Rwanda",
      chamber: "Appeals Chamber",
      caseNumber: "ICTR-01-76-A",
      date: "27 November 2007",
      pinpoint: "[40]\u2013[41]",
    });

    const text = toText(runs);
    expect(text).toContain("Simba v Prosecutor");
    expect(text).toContain(
      "International Criminal Tribunal for Rwanda"
    );
    expect(text).toContain("[40]\u2013[41]");
  });

  // Phase must be italicised (Rule 12.2.2)
  test("Rule 12.2.2: phase is italicised", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Tadić",
      phase: "Judgement",
      court:
        "International Criminal Tribunal for the Former Yugoslavia",
      chamber: "Appeals Chamber",
      caseNumber: "IT-94-1-A",
      date: "15 July 1999",
    });

    const phaseRun = runs.find((r) => r.text === "(Judgement)");
    expect(phaseRun).toBeDefined();
    expect(phaseRun!.italic).toBe(true);
  });
});

// =============================================================================
// Chapter 13 — International Economic Materials (Rules 13.1–13.4)
// =============================================================================

describe("Chapter 13 — International Economic Materials", () => {
  // AGLC4 p 186 ex 4: WTO Document
  test("Rule 13.1.2: WTO document (AGLC4 p 186 ex 4)", () => {
    const runs = formatWtoDocument({
      title:
        "China \u2014 Tariff Rate Quotas for Certain Agricultural Products",
      documentNumber: "WT/DS517/1 and G/L/1171",
      date: "21 December 2016",
    });

    const text = toText(runs);
    expect(text).toContain("WTO Doc WT/DS517/1 and G/L/1171");
    expect(text).toContain("(21 December 2016)");
  });

  // AGLC4 p 188 ex 9: WTO Panel Report
  test("Rule 13.1.3: WTO Panel Report (AGLC4 p 188 ex 9)", () => {
    const runs = formatWtoDecision({
      documentDescription: "Panel Report",
      title:
        "China \u2014 Measures Affecting the Protection and Enforcement of Intellectual Property Rights",
      documentNumber: "WT/DS362/R",
      date: "26 January 2009",
      pinpoint: "[7.28]\u2013[7.50]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Panel Report, " +
        "China \u2014 Measures Affecting the Protection and Enforcement of Intellectual Property Rights, " +
        "WTO Doc WT/DS362/R (26 January 2009) [7.28]\u2013[7.50]"
    );
  });

  // AGLC4 p 188 ex 11: Appellate Body Report
  test("Rule 13.1.3: Appellate Body Report (AGLC4 p 188 ex 11)", () => {
    const runs = formatWtoDecision({
      documentDescription: "Appellate Body Report",
      title:
        "Colombia \u2014 Measures Relating to the Importation of Textiles, Apparel and Footwear",
      documentNumber: "WT/DS461/AB/R",
      date: "7 June 2016",
      pinpoint: "[5.96]",
    });

    const text = toText(runs);
    expect(text).toContain("Appellate Body Report, ");
    expect(text).toContain("[5.96]");
  });

  // AGLC4 p 189: GATT Document
  test("Rule 13.2.1: GATT document (AGLC4 p 189 ex 17)", () => {
    const runs = formatGattDocument({
      title:
        "Report on the 1993 Consultation with the Republic of South Africa",
      documentNumber: "BOP/R/211",
      date: "30 July 1993",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Report on the 1993 Consultation with the Republic of South Africa, " +
        "GATT Doc BOP/R/211 (30 July 1993)"
    );
  });

  // AGLC4 p 190 ex 19: GATT Panel Report
  test("Rule 13.2.2: GATT Panel Report (AGLC4 p 190 ex 19)", () => {
    const runs = formatGattPanelReport({
      title:
        "United States \u2014 Taxes on Petroleum and Certain Imported Substances",
      documentNumber: "L/6175",
      date: "5 June 1987, adopted 17 June 1987",
      bisdReference: "GATT BISD 34S/136",
      pinpoint: "[4.1.1]\u2013[4.1.4]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "GATT Panel Report, " +
        "United States \u2014 Taxes on Petroleum and Certain Imported Substances, " +
        "GATT Doc L/6175 (5 June 1987, adopted 17 June 1987) GATT BISD 34S/136, " +
        "[4.1.1]\u2013[4.1.4]"
    );
  });
});

// =============================================================================
// Chapter 14 — Supranational Materials (Rules 14.1–14.6)
// =============================================================================

describe("Chapter 14 — Supranational Materials", () => {
  // AGLC4 Rule 14.3.2: Reported ECtHR — pre-1996 (ser A)
  test("Rule 14.3.2: ECtHR reported case pre-1996 (AGLC4 p 202 Wemhoff)", () => {
    const runs = formatEchrReportedCase({
      caseName:
        "Wemhoff v Federal Republic of Germany",
      year: 1968,
      volume: "7",
      reportSeries: "Eur Court HR (ser A)",
      startingPage: undefined,
    });

    const text = toText(runs);
    // Pre-1996 uses round brackets for year, no starting page
    expect(text).toBe(
      "Wemhoff v Federal Republic of Germany (1968) 7 Eur Court HR (ser A)"
    );
    expect(italicSegments(runs)).toContain(
      "Wemhoff v Federal Republic of Germany"
    );
  });

  // AGLC4 Rule 14.3.2: Reported ECtHR — post-1996
  test("Rule 14.3.2: ECtHR reported case post-1996 (AGLC4 p 202 Bouchelkia)", () => {
    const runs = formatEchrReportedCase({
      caseName: "Bouchelkia v France",
      year: 1997,
      volume: "I",
      reportSeries: "Eur Court HR",
      startingPage: 47,
      pinpoint: "67",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Bouchelkia v France [1997] I Eur Court HR 47, 67"
    );
  });

  // AGLC4 Rule 14.3.2: Post-1996 (AGLC4 p 203 ex 28)
  test("Rule 14.3.2: ECtHR reported post-1996 (AGLC4 p 203 ex 28)", () => {
    const runs = formatEchrReportedCase({
      caseName: "Boujlifa v France",
      year: 1997,
      volume: "VI",
      reportSeries: "Eur Court HR",
      startingPage: 2250,
      pinpoint: "2264",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Boujlifa v France [1997] VI Eur Court HR 2250, 2264"
    );
  });

  // AGLC4 Rule 14.3.2: Unreported ECtHR
  test("Rule 14.3.2: ECtHR unreported case", () => {
    const runs = formatEchrCase({
      caseName: "Othman (Abu Qatada) v United Kingdom",
      applicationNumber: "8139/09",
      chamber: "Fourth Section",
      date: "17 January 2012",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Othman (Abu Qatada) v United Kingdom " +
        "(European Court of Human Rights, Fourth Section, Application No 8139/09, 17 January 2012)"
    );
  });

  // AGLC4 Rule 14.2.1: EU Official Journal (AGLC4 p 194 example)
  test("Rule 14.2.1: EU Official Journal (AGLC4 p 194)", () => {
    const runs = formatEuOfficialJournal({
      instrumentType:
        "Council Directive 93/13/EEC of 5 April 1993 on Unfair Terms in Consumer Contracts",
      title:
        "Council Directive 93/13/EEC of 5 April 1993 on Unfair Terms in Consumer Contracts",
      year: 1993,
      ojSeries: "L",
      page: "95/29",
    });

    const text = toText(runs);
    expect(text).toContain("[1993] OJ L 95/29");
  });

  // AGLC4 Rule 14.2.3: CJEU case (AGLC4 p 200 ex Costa v ENEL)
  test("Rule 14.2.3: CJEU case (AGLC4 p 200 Costa v ENEL)", () => {
    const runs = formatCjeuCase({
      caseName: "Costa v ENEL",
      caseNumber: "C-6/64",
      year: 1964,
      reportSeries: "ECR",
      page: "585",
    });

    const text = toText(runs);
    expect(text).toBe("Costa v ENEL (C-6/64) [1964] ECR 585");
    expect(italicSegments(runs)).toContain("Costa v ENEL");
  });

  // AGLC4 Rule 14.2.3: CJEU with pinpoint (AGLC4 p 200)
  test("Rule 14.2.3: CJEU case with pinpoint (AGLC4 p 200)", () => {
    const runs = formatCjeuCase({
      caseName: "Costa v ENEL",
      caseNumber: "C-6/64",
      year: 1964,
      reportSeries: "ECR",
      page: "585, 594",
    });

    const text = toText(runs);
    expect(text).toBe("Costa v ENEL (C-6/64) [1964] ECR 585, 594");
  });
});
