/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AGLC4 Part IV — International Materials (Chapters 8–14)
 *
 * Each test case references specific AGLC4 rule numbers and example footnote
 * numbers from the Guide. Expected outputs are derived from the AGLC4 text.
 */

import { formatTreaty, formatMou } from "../../src/engine/rules/v4/international/treaties";
import {
  formatUnCharter,
  formatUnDocument,
  formatUnCommitteeDecision,
  formatUnCommunication,
  formatUnSubmission,
  formatUnYearbook,
} from "../../src/engine/rules/v4/international/un";
import {
  formatIcjDecision,
  formatIcjPleading,
  formatIcjUnreported,
} from "../../src/engine/rules/v4/international/icj";
import {
  formatStateArbitrationReported,
  formatStateArbitration,
  formatIcsidCase,
} from "../../src/engine/rules/v4/international/arbitral";
import {
  formatIccCase,
  formatIccCaseReported,
} from "../../src/engine/rules/v4/international/icc-tribunals";
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
  formatCjeuUnreportedCase,
  formatSupranationalDocument,
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
      title: "Rome Statute of the International Criminal Court",
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
    expect(italicSegments(runs)).toContain("Rome Statute of the International Criminal Court");
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
      title: "Charter of the Association of Southeast Asian Nations",
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
    expect(text).toContain("Canada\u2013Mexico\u2013United States of America");
  });

  // AGLC4 Rule 8.3.2: same-date compressed form (AGLC4 ex 8)
  test("formats same-date treaty with '(signed and entered into force)' per AGLC4 ex 8 (rule 8.3.2)", () => {
    const runs = formatTreaty({
      title: "Agreement Relating to Co-operation on Antitrust Matters",
      parties: ["Australia", "United States of America"],
      signedDate: "29 June 1982",
      treatySeries: "UNTS",
      seriesVolume: 1369,
      startingPage: 43,
      entryIntoForceDate: "29 June 1982",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Agreement Relating to Co-operation on Antitrust Matters, " +
        "Australia–United States of America, 1369 UNTS 43 " +
        "(signed and entered into force 29 June 1982)"
    );
  });

  // AGLC4 Rule 8.6: MOU where the descriptor already appears in the title
  test("formats MOU with descriptor suppressed and comma pinpoint per AGLC4 ex 15 (rule 8.6)", () => {
    const runs = formatMou({
      title:
        "Memorandum of Understanding between the Government of the United States of America and the Government of the Republic of Cuba",
      signedDate: "16 February 2016",
      pinpoint: { type: "section", value: "2" },
      url: "https://www.state.gov/e/eb/rls/othr/ata/c/cu/252525.htm",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Memorandum of Understanding between the Government of the United States of America " +
        "and the Government of the Republic of Cuba, signed 16 February 2016, s 2 " +
        "<https://www.state.gov/e/eb/rls/othr/ata/c/cu/252525.htm>"
    );
  });

  // AGLC4 Rule 8.6: MOU without pinpoint (AGLC4 ex 16)
  test("formats MOU without descriptor duplication per AGLC4 ex 16 (rule 8.6)", () => {
    const runs = formatMou({
      title:
        "Memorandum of Understanding between the Republic of Nauru and the Commonwealth of Australia, Relating to the Transfer to and Assessment of Persons in Nauru, and Related Issues",
      signedDate: "29 August 2012",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Memorandum of Understanding between the Republic of Nauru and the Commonwealth of Australia, " +
        "Relating to the Transfer to and Assessment of Persons in Nauru, and Related Issues, " +
        "signed 29 August 2012"
    );
  });

  // AGLC4 Rule 8.6: MOU whose title lacks the phrase keeps the descriptor,
  // parties joined by en-dashes (rule 8.2), pinpoint space-separated (rule 8.7)
  test("formats MOU with descriptor and en-dash parties (rule 8.6)", () => {
    const runs = formatMou({
      title: "Agreement on Defence Cooperation",
      parties: ["Australia", "Indonesia"],
      signedDate: "1 March 2010",
      pinpoint: { type: "article", value: "3" },
    });

    const text = toText(runs);
    expect(text).toBe(
      "Agreement on Defence Cooperation, Australia–Indonesia, " +
        "signed 1 March 2010 (Memorandum of Understanding) art 3"
    );
  });

  // Marrakesh Agreement (AGLC4 p 184 ex 1)
  test("Rule 8: Marrakesh Agreement (AGLC4 p 184 ex 1)", () => {
    const runs = formatTreaty({
      title: "Marrakesh Agreement Establishing the World Trade Organization",
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

  // AGLC4 Rule 9.2.2/9.2.3: SC resolutions have no title; the resolution
  // number is a roman element, never italicised
  test("formats titleless SC resolution with roman number per AGLC4 ex 53 (rules 9.2.2, 9.6)", () => {
    const runs = formatUnDocument({
      resolutionNumber: "SC Res 827",
      documentNumber: "S/RES/827",
      date: "25 May 1993",
    });

    const text = toText(runs);
    expect(text).toBe("SC Res 827, UN Doc S/RES/827 (25 May 1993)");
    // The resolution number is not a title — nothing here is italic
    expect(italicSegments(runs)).toEqual([]);
  });

  // AGLC4 Rule 9.2.6: no session numbers for SC resolutions. The guide's
  // ex 15 (rule 9.2.7) prints '59th sess' — an anomaly; rule text governs
  // per DECISION-012, so the session is suppressed.
  test("suppresses session for SC resolution per rule 9.2.6 (AGLC4 ex 15, session omitted per DECISION-012)", () => {
    const runs = formatUnDocument({
      resolutionNumber: "SC Res 1546",
      officialRecords: "UN SCOR",
      session: "59th sess",
      meetingNumber: "4987th mtg",
      documentNumber: "S/RES/1546",
      date: "8 June 2004",
    });

    const text = toText(runs);
    expect(text).toBe("SC Res 1546, UN SCOR, 4987th mtg, UN Doc S/RES/1546 (8 June 2004)");
  });

  // AGLC4 Rule 9.2.10: multiple document numbers use 'UN Docs' (the rule's
  // own ex 23 prints singular 'UN Doc' — anomaly; rule text per DECISION-012)
  test("formats multiple document numbers with 'UN Docs' per rule 9.2.10 (AGLC4 ex 23, rule-text form)", () => {
    const runs = formatUnDocument({
      title:
        "The Situation in the Occupied Territories of Azerbaijan: Report of the Secretary-General",
      documentNumber: "A/63/804 and Corr.1",
      date: "30 March 2009",
    });

    const text = toText(runs);
    expect(text).toBe(
      "The Situation in the Occupied Territories of Azerbaijan: " +
        "Report of the Secretary-General, UN Docs A/63/804 and Corr.1 (30 March 2009)"
    );
  });

  // AGLC4 Rule 9.2.13: pinpoints follow the parenthesised date with no
  // separating punctuation
  test("formats SC resolution pinpoint with no comma per AGLC4 ex 34 (rule 9.2.13)", () => {
    const runs = formatUnDocument({
      resolutionNumber: "SC Res 1717",
      documentNumber: "S/RES/1717",
      date: "13 October 2006",
      pinpoint: "Preamble paras 3–4",
    });

    expect(toText(runs)).toBe(
      "SC Res 1717, UN Doc S/RES/1717 (13 October 2006) Preamble paras 3–4"
    );
  });

  test("formats report pinpoint with no comma per AGLC4 ex 35 (rule 9.2.13)", () => {
    const runs = formatUnDocument({
      title:
        "Report of the Secretary-General Pursuant to General Assembly Resolution 53/35: The Fall of Srebrenica",
      documentNumber: "A/54/549",
      date: "15 November 1999",
      pinpoint: "6 [3]–[4]",
    });

    expect(toText(runs)).toBe(
      "Report of the Secretary-General Pursuant to General Assembly Resolution 53/35: " +
        "The Fall of Srebrenica, UN Doc A/54/549 (15 November 1999) 6 [3]–[4]"
    );
  });

  // AGLC4 Rules 9.2.5/9.2.8: committee number and plural agenda items.
  // Ex 12 anomalously omits the comma before 'UN Doc' and prints lowercase
  // 'Agenda items'; the rule-text form governs per DECISION-012.
  test("formats committee number and plural agenda items per AGLC4 ex 12 (rules 9.2.5, 9.2.8, rule-text form)", () => {
    const runs = formatUnDocument({
      title: "Summary Record of the 35th Meeting",
      officialRecords: "UN GAOR",
      committeeNumber: "3rd Comm",
      session: "47th sess",
      meetingNumber: "35th mtg",
      agendaItem: "94 and 96",
      documentNumber: "A/C.3/47/SR.35",
      date: "4 December 1992",
      pinpoint: "11 [57]",
    });

    expect(toText(runs)).toBe(
      "Summary Record of the 35th Meeting, UN GAOR, 3rd Comm, 47th sess, " +
        "35th mtg, Agenda Items 94 and 96, UN Doc A/C.3/47/SR.35 (4 December 1992) 11 [57]"
    );
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

  // AGLC4 Rule 9.2: Meeting records are titleless; 'UN GAOR' is the roman
  // Official Records element (rule 9.2.4), not an italic title
  test("formats titleless meeting record per AGLC4 ex 54 (rules 9.2.2, 9.2.4, 9.6)", () => {
    const runs = formatUnDocument({
      officialRecords: "UN GAOR",
      session: "63rd sess",
      meetingNumber: "55th plen mtg",
      documentNumber: "A/63/PV.55",
      date: "19 November 2008",
    });

    const text = toText(runs);
    expect(text).toBe("UN GAOR, 63rd sess, 55th plen mtg, UN Doc A/63/PV.55 (19 November 2008)");
    // Official Records element is never italic
    expect(italicSegments(runs)).toEqual([]);
  });

  // AGLC4 Rule 9.3.1: treaty-committee decisions follow rule 9.2 —
  // session before the UN Doc number, pinpoint space-separated
  test("formats treaty-committee decision per AGLC4 ex 38 (rule 9.3.1)", () => {
    const runs = formatUnCommunication({
      author: "Human Rights Committee",
      title: "Views: Communication No 1011/2001",
      committee: "",
      session: "81st sess",
      documentNumber: "CCPR/C/81/D/1011/2001",
      date: "26 August 2004",
      pinpoint: "21 [9.8]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Human Rights Committee, Views: Communication No 1011/2001, 81st sess, " +
        "UN Doc CCPR/C/81/D/1011/2001 (26 August 2004) 21 [9.8]"
    );
    expect(italicSegments(runs)).toContain("Views: Communication No 1011/2001");
  });

  // Same element order through the title-first formatter (rule 9.3.1)
  test("formats committee decision session before UN Doc number (rule 9.3.1)", () => {
    const runs = formatUnCommitteeDecision({
      title: "Views: Communication No 1011/2001",
      session: "81st sess",
      documentNumber: "CCPR/C/81/D/1011/2001",
      date: "26 August 2004",
      pinpoint: "21 [9.8]",
    });

    expect(toText(runs)).toBe(
      "Views: Communication No 1011/2001, 81st sess, " +
        "UN Doc CCPR/C/81/D/1011/2001 (26 August 2004) 21 [9.8]"
    );
  });

  // AGLC4 Rule 9.3.2: parties' communications and submissions
  test("formats party's communication per AGLC4 ex 41 (rule 9.3.2)", () => {
    const runs = formatUnSubmission({
      author: "Human Rights Law Resource Centre",
      documentTitle:
        "Individual Communication under the Optional Protocol to the International Covenant on Civil and Political Rights — Original Communication",
      documentType: "Communication",
      committee: "Human Rights Committee",
      caseName: "Nystrom v Australia",
      date: "4 April 2007",
      pinpoint: "[77]–[103]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Human Rights Law Resource Centre, 'Individual Communication under the " +
        "Optional Protocol to the International Covenant on Civil and Political Rights " +
        "— Original Communication', Communication to the Human Rights Committee in " +
        "Nystrom v Australia, 4 April 2007, [77]–[103]"
    );
    expect(italicSegments(runs)).toContain("Nystrom v Australia");
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
    expect(text).toBe("'Judge Bruno Simma' (2005) 59 International Court of Justice Yearbook 54");
    // Yearbook title must be italic
    expect(italicSegments(runs)).toContain("International Court of Justice Yearbook");
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
    expect(text).toBe("East Timor (Portugal v Australia) (Judgment) [1995] ICJ Rep 90, 93");
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
    expect(text).toBe("Western Sahara (Advisory Opinion) [1975] ICJ Rep 12, 17");
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
    expect(text).toContain("(Bosnia and Herzegovina v Yugoslavia)");
    expect(text).toContain("(Preliminary Objections)");
    expect(text).toContain("[1996] ICJ Rep 595");
  });

  // AGLC4 p 162 ex 8: Provisional Measures
  test("Rule 10.2.3: phase — Provisional Measures (AGLC4 p 162 ex 8)", () => {
    const runs = formatIcjDecision({
      caseName: "United States Diplomatic and Consular Staff in Tehran",
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
      documentTitle: "Written Statement of the Government of the Kingdom of Denmark",
      caseName: "Certain Expenses of the United Nations",
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
      documentTitle: "Questions Put to Professor Glennon by Judge Schwebel",
      caseName: "Military and Paramilitary Activities in and against Nicaragua",
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

  // AGLC4 Rule 10.4.1: unreported ICJ decision
  test("formats unreported ICJ decision per AGLC4 ex 30 (rule 10.4.1)", () => {
    const runs = formatIcjUnreported({
      caseName: "Certain Questions of Mutual Assistance in Criminal Matters",
      parties: "Djibouti v France",
      phase: "Judgment",
      generalListNumber: "136",
      date: "4 June 2008",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Certain Questions of Mutual Assistance in Criminal Matters " +
        "(Djibouti v France) (Judgment) " +
        "(International Court of Justice, General List No 136, 4 June 2008)"
    );
    expect(italicSegments(runs)).toContain(
      "Certain Questions of Mutual Assistance in Criminal Matters"
    );
  });

  // AGLC4 Rule 10.4.1: unreported decision with pinpoint and judge
  test("formats unreported ICJ decision with judge per AGLC4 ex 32 (rule 10.4.1)", () => {
    const runs = formatIcjUnreported({
      caseName: "Sovereignty over Pedra Branca/Pulau Batu Puteh, Middle Rocks and Southern Ledge",
      parties: "Malaysia v Singapore",
      phase: "Judgment",
      generalListNumber: "130",
      date: "23 May 2008",
      pinpoint: "[8]",
      judge: "Judge Parra-Aranguren",
    });

    expect(toText(runs)).toBe(
      "Sovereignty over Pedra Branca/Pulau Batu Puteh, Middle Rocks and Southern Ledge " +
        "(Malaysia v Singapore) (Judgment) " +
        "(International Court of Justice, General List No 130, 23 May 2008) [8] " +
        "(Judge Parra-Aranguren)"
    );
  });

  // AGLC4 Rule 10.4.2: unreported pleadings and other documents
  test("formats unreported ICJ pleading per AGLC4 ex 34 (rule 10.4.2)", () => {
    const runs = formatIcjUnreported({
      documentTitle: "Memorial Submitted by Romania",
      caseName: "Maritime Delimitation in the Black Sea",
      parties: "Romania v Ukraine",
      generalListNumber: "132",
      date: "19 August 2005",
      pinpoint: "[6.21]–[6.22]",
    });

    expect(toText(runs)).toBe(
      "'Memorial Submitted by Romania', Maritime Delimitation in the Black Sea " +
        "(Romania v Ukraine) " +
        "(International Court of Justice, General List No 132, 19 August 2005) [6.21]–[6.22]"
    );
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
    expect(italicSegments(runs)).toContain("Cordillera of the Andes Boundary");
  });

  // AGLC4 p 171 ex 3: with judge/arbitrator
  test("Rule 11.1.1: reported arbitration with arbitrator name (AGLC4 p 171 ex 3)", () => {
    const runs = formatStateArbitrationReported({
      caseName: "Responsibility for the Deaths of Letelier and Moffitt",
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
      parties: "Arctic Sunrise Arbitration (Netherlands v Russia)",
      awardDetails: "Award on Merits",
      tribunal: "Permanent Court of Arbitration",
      caseNumber: "2014-02",
      date: "14 August 2015",
      pinpoint: "[152]",
    });

    const text = toText(runs);
    expect(text).toContain("(Permanent Court of Arbitration, Case No 2014-02, 14 August 2015)");
    expect(text).toContain("[152]");
  });

  // AGLC4 Rule 11.2.1: reported individual–state decision (no separate
  // case-name element — the parties' names open the citation)
  test("formats reported individual-state decision per AGLC4 rule 11.2.1 (overview, Olguín v Paraguay)", () => {
    const runs = formatStateArbitrationReported({
      caseName: "Olguín v Paraguay",
      phase: "Decision on Jurisdiction",
      year: 2000,
      volume: 6,
      reportSeries: "ICSID Rep",
      startingPage: 154,
      pinpoint: "158",
    });

    expect(toText(runs)).toBe(
      "Olguín v Paraguay (Decision on Jurisdiction) (2000) 6 ICSID Rep 154, 158"
    );
  });

  // AGLC4 Rule 11.2.1 ex 6: ILM-reported decision with arbitrator
  test("formats reported individual-state decision per AGLC4 ex 6 (rule 11.2.1)", () => {
    const runs = formatStateArbitrationReported({
      caseName: "SD Myers v Canada",
      phase: "Partial Award",
      year: 2000,
      volume: 40,
      reportSeries: "ILM",
      startingPage: 1408,
      pinpoint: "1457",
      judge: "Dr Bryan Schwartz",
    });

    expect(toText(runs)).toBe(
      "SD Myers v Canada (Partial Award) (2000) 40 ILM 1408, 1457 (Dr Bryan Schwartz)"
    );
  });

  // AGLC4 Rule 11.2.2: unreported individual–state decision — phase in its
  // own italic parentheses, tribunal in the details parenthetical, pinpoint
  test("formats unreported individual-state decision per AGLC4 rule 11.2.2 (overview, Enron v Argentina)", () => {
    const runs = formatIcsidCase({
      caseName: "Enron Corporation v Argentina",
      awardType: "Jurisdiction",
      icsidNumber: "ARB/01/3",
      date: "14 January 2004",
      pinpoint: "[39]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Enron Corporation v Argentina (Jurisdiction) " +
        "(ICSID Arbitral Tribunal, Case No ARB/01/3, 14 January 2004) [39]"
    );
    expect(italicSegments(runs)).toContain("Enron Corporation v Argentina");
    expect(italicSegments(runs)).toContain("(Jurisdiction)");
  });

  // AGLC4 Rule 11.2.2 ex 12: non-ICSID tribunal named as on the decision
  test("formats unreported individual-state decision per AGLC4 ex 12 (rule 11.2.2)", () => {
    const runs = formatIcsidCase({
      caseName:
        "Re Polystyrene and Impact Crystal from the United States of America (United States of America v Mexico)",
      awardType: "Panel Decision",
      tribunal: "North American Free Trade Agreement Chapter 19 Panel",
      icsidNumber: "MEX-94-1904-03",
      date: "12 September 1996",
    });

    expect(toText(runs)).toBe(
      "Re Polystyrene and Impact Crystal from the United States of America " +
        "(United States of America v Mexico) (Panel Decision) " +
        "(North American Free Trade Agreement Chapter 19 Panel, " +
        "Case No MEX-94-1904-03, 12 September 1996)"
    );
  });

  // AGLC4 Rule 11.2.2 ex 15: annulment phase with paragraph pinpoints
  test("formats unreported individual-state decision per AGLC4 ex 15 (rule 11.2.2)", () => {
    const runs = formatIcsidCase({
      caseName: "CMS Gas Transmission Co v Argentina",
      awardType: "Annulment",
      icsidNumber: "ARB/01/8",
      date: "25 September 2007",
      pinpoint: "[158]–[159]",
    });

    expect(toText(runs)).toBe(
      "CMS Gas Transmission Co v Argentina (Annulment) " +
        "(ICSID Arbitral Tribunal, Case No ARB/01/8, 25 September 2007) [158]–[159]"
    );
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
    expect(text).toContain("International Criminal Tribunal for Rwanda");
    expect(text).toContain("[40]\u2013[41]");
  });

  // Phase must be italicised (Rule 12.2.2)
  test("Rule 12.2.2: phase is italicised", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Tadić",
      phase: "Judgement",
      court: "International Criminal Tribunal for the Former Yugoslavia",
      chamber: "Appeals Chamber",
      caseNumber: "IT-94-1-A",
      date: "15 July 1999",
    });

    const phaseRun = runs.find((r) => r.text === "(Judgement)");
    expect(phaseRun).toBeDefined();
    expect(phaseRun!.italic).toBe(true);
  });

  // AGLC4 Rule 12.2.5: multiple case numbers take 'Case Nos'
  test("formats multiple case numbers with 'Case Nos' per AGLC4 ex 18 (rule 12.2.5)", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Kunarac",
      phase: "Judgement",
      court: "International Criminal Tribunal for the Former Yugoslavia",
      chamber: "Trial Chamber II",
      caseNumber: "IT-96-23-T and IT-96-23/1-T",
      date: "22 February 2001",
    });

    expect(toText(runs)).toBe(
      "Prosecutor v Kunarac (Judgement) " +
        "(International Criminal Tribunal for the Former Yugoslavia, Trial Chamber II, " +
        "Case Nos IT-96-23-T and IT-96-23/1-T, 22 February 2001)"
    );
  });

  // AGLC4 Rule 12.2.8: judges' names follow pinpoints
  test("formats judge after pinpoint per AGLC4 ex 22 (rule 12.2.8)", () => {
    const runs = formatIccCase({
      caseName: "Prosecutor v Erdemović",
      phase: "Judgement",
      court: "International Criminal Tribunal for the Former Yugoslavia",
      chamber: "Appeals Chamber",
      caseNumber: "IT-96-22-A",
      date: "7 October 1997",
      pinpoint: "[6]",
      judge: "Judge Stephen",
    });

    expect(toText(runs)).toBe(
      "Prosecutor v Erdemović (Judgement) " +
        "(International Criminal Tribunal for the Former Yugoslavia, Appeals Chamber, " +
        "Case No IT-96-22-A, 7 October 1997) [6] (Judge Stephen)"
    );
  });

  // AGLC4 Rule 12.3: reported criminal tribunal decision
  test("formats reported tribunal decision per AGLC4 ex 23 (rule 12.3)", () => {
    const runs = formatIccCaseReported({
      caseName: "Prosecutor v Blaškić",
      phase: "Objection to the Issue of Subpoenae Duces Tecum",
      year: 1997,
      volume: 110,
      reportSeries: "ILR",
      startingPage: 608,
      pinpoint: "693 [15]",
      tribunal: "International Criminal Tribunal for the Former Yugoslavia",
      chamber: "Appeals Chamber",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Prosecutor v Blaškić (Objection to the Issue of Subpoenae Duces Tecum) " +
        "(1997) 110 ILR 608, 693 [15] " +
        "(International Criminal Tribunal for the Former Yugoslavia, Appeals Chamber)"
    );
    expect(italicSegments(runs)).toContain("Prosecutor v Blaškić");
    expect(italicSegments(runs)).toContain("(Objection to the Issue of Subpoenae Duces Tecum)");
  });

  // AGLC4 Rule 12.3: reported decision without pinpoint
  test("formats reported tribunal decision per AGLC4 ex 24 (rule 12.3)", () => {
    const runs = formatIccCaseReported({
      caseName: "Prosecutor v Ruggiu",
      phase: "Judgement and Sentence",
      year: 2000,
      volume: 39,
      reportSeries: "ILM",
      startingPage: 1338,
      tribunal: "International Criminal Tribunal for Rwanda",
      chamber: "Trial Chamber I",
    });

    expect(toText(runs)).toBe(
      "Prosecutor v Ruggiu (Judgement and Sentence) (2000) 39 ILM 1338 " +
        "(International Criminal Tribunal for Rwanda, Trial Chamber I)"
    );
  });
});

// =============================================================================
// Chapter 13 — International Economic Materials (Rules 13.1–13.4)
// =============================================================================

describe("Chapter 13 — International Economic Materials", () => {
  // AGLC4 p 186 ex 4: WTO Document
  test("Rule 13.1.2: WTO document (AGLC4 p 186 ex 4)", () => {
    const runs = formatWtoDocument({
      title: "China \u2014 Tariff Rate Quotas for Certain Agricultural Products",
      documentNumber: "WT/DS517/1 and G/L/1171",
      date: "21 December 2016",
    });

    const text = toText(runs);
    expect(text).toContain("WTO Doc WT/DS517/1 and G/L/1171");
    expect(text).toContain("(21 December 2016)");
  });

  // AGLC4 Rule 13.1.2: document description and treaty-like pinpoint
  test("formats WTO document with description and pinpoint per AGLC4 ex 5 (rule 13.1.2)", () => {
    const runs = formatWtoDocument({
      title: "Doha Work Programme",
      documentNumber: "WT/MIN(05)/DEC",
      date: "22 December 2005, adopted 18 December 2005",
      documentDescription: "Ministerial Declaration",
      pinpoint: "para 50(1)",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Doha Work Programme, WTO Doc WT/MIN(05)/DEC " +
        "(22 December 2005, adopted 18 December 2005) (Ministerial Declaration) para 50(1)"
    );
    expect(italicSegments(runs)).toContain("Doha Work Programme");
  });

  // AGLC4 Rule 13.1.2: secondary-source pinpoint in square brackets
  test("formats WTO document with paragraph pinpoint per AGLC4 ex 6 (rule 13.1.2)", () => {
    const runs = formatWtoDocument({
      title: "Notification",
      documentNumber: "G/TBT/N/BHR/188",
      date: "24 February 2010",
      pinpoint: "[7]",
    });

    expect(toText(runs)).toBe("Notification, WTO Doc G/TBT/N/BHR/188 (24 February 2010) [7]");
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

  // AGLC4 Rule 13.1.3: DSR reference — comma then precedes the pinpoint
  test("formats WTO panel report with DSR reference per AGLC4 ex 13 (rule 13.1.3)", () => {
    const runs = formatWtoDecision({
      documentDescription: "Panel Report",
      title: "Guatemala — Anti-Dumping Investigation regarding Portland Cement from Mexico",
      documentNumber: "WT/DS60/R",
      date: "19 June 1998, adopted 25 November 1998",
      dsrReference: "DSR 1998:IX, 3797",
      pinpoint: "[4.49]",
    });

    expect(toText(runs)).toBe(
      "Panel Report, " +
        "Guatemala — Anti-Dumping Investigation regarding Portland Cement from Mexico, " +
        "WTO Doc WT/DS60/R (19 June 1998, adopted 25 November 1998) DSR 1998:IX, 3797, [4.49]"
    );
  });

  // AGLC4 p 189: GATT Document
  test("Rule 13.2.1: GATT document (AGLC4 p 189 ex 17)", () => {
    const runs = formatGattDocument({
      title: "Report on the 1993 Consultation with the Republic of South Africa",
      documentNumber: "BOP/R/211",
      date: "30 July 1993",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Report on the 1993 Consultation with the Republic of South Africa, " +
        "GATT Doc BOP/R/211 (30 July 1993)"
    );
  });

  // AGLC4 Rule 13.2.1: document description
  test("formats GATT document with description per AGLC4 ex 14 (rule 13.2.1)", () => {
    const runs = formatGattDocument({
      title:
        "Communication from the Republic of the Philippines — Revised Conditional Offer by the Philippines on Initial Commitments on Trade in Services",
      documentNumber: "MTN.GNS/W/131/Rev.1/Corr.1",
      date: "16 October 1992",
      documentDescription: "Corrigendum",
    });

    expect(toText(runs)).toBe(
      "Communication from the Republic of the Philippines — Revised Conditional Offer " +
        "by the Philippines on Initial Commitments on Trade in Services, " +
        "GATT Doc MTN.GNS/W/131/Rev.1/Corr.1 (16 October 1992) (Corrigendum)"
    );
  });

  // AGLC4 Rule 13.2.1: no document number (no comma after title), BISD
  // reference, comma before pinpoint. Ex 16 omits that comma — an anomaly;
  // the rule text ('a comma should precede the pinpoint reference' where
  // BISD is cited) governs per DECISION-012.
  test("formats GATT document with BISD reference per AGLC4 ex 16 (rule 13.2.1, rule-text comma)", () => {
    const runs = formatGattDocument({
      title: "Waiver in Respect of the Trust Territory of the Pacific Islands",
      date: "8 September 1948",
      documentDescription: "Decision",
      bisdReference: "GATT BISD II/9",
      pinpoint: "para 2",
    });

    expect(toText(runs)).toBe(
      "Waiver in Respect of the Trust Territory of the Pacific Islands " +
        "(8 September 1948) (Decision) GATT BISD II/9, para 2"
    );
  });

  // AGLC4 p 190 ex 19: GATT Panel Report
  test("Rule 13.2.2: GATT Panel Report (AGLC4 p 190 ex 19)", () => {
    const runs = formatGattPanelReport({
      title: "United States \u2014 Taxes on Petroleum and Certain Imported Substances",
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
      caseName: "Wemhoff v Federal Republic of Germany",
      year: 1968,
      volume: "7",
      reportSeries: "Eur Court HR (ser A)",
      startingPage: undefined,
    });

    const text = toText(runs);
    // Pre-1996 uses round brackets for year, no starting page
    expect(text).toBe("Wemhoff v Federal Republic of Germany (1968) 7 Eur Court HR (ser A)");
    expect(italicSegments(runs)).toContain("Wemhoff v Federal Republic of Germany");
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
    expect(text).toBe("Bouchelkia v France [1997] I Eur Court HR 47, 67");
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
    expect(text).toBe("Boujlifa v France [1997] VI Eur Court HR 2250, 2264");
  });

  // AGLC4 Rule 14.3.2: reported ECtHR, ser A with phase (ex 30)
  test("formats reported ECtHR ser A decision per AGLC4 ex 30 (rule 14.3.2)", () => {
    const runs = formatEchrReportedCase({
      caseName: "Loizidou v Turkey (Preliminary Objections)",
      year: 1995,
      volume: "310",
      reportSeries: "Eur Court HR (ser A)",
    });

    expect(toText(runs)).toBe(
      "Loizidou v Turkey (Preliminary Objections) (1995) 310 Eur Court HR (ser A)"
    );
  });

  // AGLC4 Rule 14.3.2: reported ECtHR from 1996 (ex 31)
  test("formats reported ECtHR decision per AGLC4 ex 31 (rule 14.3.2)", () => {
    const runs = formatEchrReportedCase({
      caseName: "MSS v Belgium",
      year: 2011,
      volume: "I",
      reportSeries: "Eur Court HR",
      startingPage: 255,
    });

    expect(toText(runs)).toBe("MSS v Belgium [2011] I Eur Court HR 255");
  });

  // AGLC4 Rule 14.3.2: ser A pinpoint takes no comma — ser A citations
  // have no starting page for the comma convention to attach to (ex 32)
  test("formats ser A pinpoint without comma per AGLC4 ex 32 (rule 14.3.2)", () => {
    const runs = formatEchrReportedCase({
      caseName: "Nasri v France",
      year: 1995,
      volume: "320-B",
      reportSeries: "Eur Court HR (ser A)",
      pinpoint: "28",
      judge: "Judge Pettiti",
    });

    expect(toText(runs)).toBe(
      "Nasri v France (1995) 320-B Eur Court HR (ser A) 28 (Judge Pettiti)"
    );
  });

  // AGLC4 Rule 14.3.3: European Commission of Human Rights — round-bracket
  // year (volume-organised), starting page and comma-preceded pinpoint
  test("formats Eur Comm HR decision per AGLC4 ex 35 (rule 14.3.3)", () => {
    const runs = formatEchrReportedCase({
      caseName: "X v Austria",
      year: 1979,
      volume: "17",
      reportSeries: "Eur Comm HR",
      startingPage: 80,
      pinpoint: "85–6",
    });

    expect(toText(runs)).toBe("X v Austria (1979) 17 Eur Comm HR 80, 85–6");
  });

  // AGLC4 Rule 14.3.2: unreported ECtHR — chamber element is 'Grand
  // Chamber'/'Chamber'; 'Application Nos' for multiple numbers
  test("formats unreported ECtHR decision per AGLC4 ex 33 (rule 14.3.2)", () => {
    const runs = formatEchrCase({
      caseName: "S v United Kingdom",
      chamber: "Grand Chamber",
      applicationNumber: "30562/04 and 30566/04",
      date: "4 December 2008",
      pinpoint: "[125]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "S v United Kingdom " +
        "(European Court of Human Rights, Grand Chamber, " +
        "Application Nos 30562/04 and 30566/04, 4 December 2008) [125]"
    );
  });

  // AGLC4 Rule 14.2.1: the instrument designation is part of the italic
  // title; there is no separate leading element; pinpoint comma-preceded
  test("formats OJ citation per AGLC4 ex 6 (rule 14.2.1)", () => {
    const runs = formatEuOfficialJournal({
      title:
        "Commission Decision of 18 December 2002 Relating to National Provisions on Limiting the Importation and Placement on the Market of Certain NK Fertilisers of High Nitrogen Content and Containing Chlorine Notified by France Pursuant to Article 95(5) of the EC Treaty",
      year: 2003,
      ojSeries: "L",
      page: "1/72",
      pinpoint: "79",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Commission Decision of 18 December 2002 Relating to National Provisions " +
        "on Limiting the Importation and Placement on the Market of Certain NK Fertilisers " +
        "of High Nitrogen Content and Containing Chlorine Notified by France Pursuant to " +
        "Article 95(5) of the EC Treaty [2003] OJ L 1/72, 79"
    );
    expect(italicSegments(runs)).toHaveLength(1);
  });

  // AGLC4 Rule 14.2.1: S-series contract notice, no pinpoint (ex 11)
  test("formats OJ S-series citation per AGLC4 ex 11 (rule 14.2.1)", () => {
    const runs = formatEuOfficialJournal({
      title: "Contract Notice — Switzerland-Chur: Engineering Services",
      year: 2016,
      ojSeries: "S",
      page: "240",
    });

    expect(toText(runs)).toBe(
      "Contract Notice — Switzerland-Chur: Engineering Services [2016] OJ S 240"
    );
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

  // AGLC4 Rule 14.2.3: unreported EU court decision with ECLI
  test("formats unreported CJEU decision per AGLC4 ex 23 (rule 14.2.3)", () => {
    const runs = formatCjeuUnreportedCase({
      caseName: "Huawei Technologies Co Ltd v ZTE Corporation",
      court: "Court of Justice of the European Union",
      caseNumber: "C-170/13",
      ecli: "ECLI:EU:C:2015:477",
      date: "16 July 2015",
      pinpoint: "[9]",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Huawei Technologies Co Ltd v ZTE Corporation " +
        "(Court of Justice of the European Union, C-170/13, ECLI:EU:C:2015:477, 16 July 2015) [9]"
    );
    expect(italicSegments(runs)).toContain("Huawei Technologies Co Ltd v ZTE Corporation");
  });

  // AGLC4 Rule 14.2.3: unreported form without an ECLI
  test("formats unreported CJEU decision without ECLI (rule 14.2.3)", () => {
    const runs = formatCjeuUnreportedCase({
      caseName: "Achmea BV v Slovak Republic",
      court: "Court of Justice of the European Union",
      caseNumber: "C-284/16",
      date: "6 March 2018",
    });

    expect(toText(runs)).toBe(
      "Achmea BV v Slovak Republic " +
        "(Court of Justice of the European Union, C-284/16, 6 March 2018)"
    );
  });

  // AGLC4 Rule 14.5: comma-separated date (not parenthesised) and session
  test("formats supranational body document per AGLC4 ex 44 (rule 14.5)", () => {
    const runs = formatSupranationalDocument({
      body: "Assembly of the African Union",
      title:
        "Decision on the Scale of Assessment and Alternative Sources of Financing the African Union",
      documentNumber: "Assembly/AU/Dec.578(XXV)",
      session: "25th ord sess",
      date: "14–15 June 2015",
    });

    const text = toText(runs);
    expect(text).toBe(
      "Assembly of the African Union, " +
        "Decision on the Scale of Assessment and Alternative Sources of Financing the African Union, " +
        "Doc No Assembly/AU/Dec.578(XXV), 25th ord sess, 14–15 June 2015"
    );
    expect(italicSegments(runs)).toContain(
      "Decision on the Scale of Assessment and Alternative Sources of Financing the African Union"
    );
  });

  // AGLC4 Rule 14.5: organisation + body, extraordinary session (ex 49)
  test("formats supranational body document per AGLC4 ex 49 (rule 14.5)", () => {
    const runs = formatSupranationalDocument({
      body: "Organization of American States, Inter-American Commission on Human Rights",
      title: "Report on Admissibility: Raul Rolando Romero Feris",
      documentNumber: "Doc No OEA/Ser.L/V/II.Doc.5",
      session: "152nd extraord period sess",
      date: "29 January 2015",
    });

    expect(toText(runs)).toBe(
      "Organization of American States, Inter-American Commission on Human Rights, " +
        "Report on Admissibility: Raul Rolando Romero Feris, " +
        "Doc No OEA/Ser.L/V/II.Doc.5, 152nd extraord period sess, 29 January 2015"
    );
  });
});
