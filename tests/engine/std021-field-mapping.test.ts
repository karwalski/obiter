/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-021 — field mapping for UK and NZ cases and legislation.
 *
 * The OSCOLA and NZLSG adapters in src/engine/engine.ts read the AGLC form's
 * keys (`courtId`, `mnc`, `reportSeries`/`volume`/`startingPage`,
 * `caseNumber`) through src/engine/fieldAliases.ts as well as their native
 * keys, so a case entered on the AGLC form renders under every standard.
 * The Waitangi Tribunal classification is derived from the record, and the
 * `waitangi_tribunal` tag is a hint only.
 *
 * Rule sources: NZLSG 3 §3.2, §3.2.7, §5.1.1, §8.2.3, §8.5 and OSCOLA 5
 * §2.1.1–2.1.3, §2.6.1–2.6.2 as recorded in docs/standards-rule-notes.md
 * and tests/fixtures/standards/{oscola5,nzlsg3}.ts.
 */

import { getFormattedPreview } from "../../src/engine/engine";
import { getStandardConfig } from "../../src/engine/standards";
import type { CitationStandardId } from "../../src/engine/standards/types";
import { isWaitangiTribunalReport } from "../../src/engine/rules/v4/general/bibliography";
import { getFieldAliases, readFieldWithAliases } from "../../src/engine/fieldAliases";
import {
  isDerivedTag,
  isSystemTag,
  normaliseTag,
  userTags,
  withUserTags,
} from "../../src/engine/tags";
import type { Citation, SourceType } from "../../src/types/citation";

const STAMP = "2026-01-01T00:00:00.000Z";

function cite(
  sourceType: SourceType,
  data: Record<string, unknown>,
  tags: string[] = []
): Citation {
  return {
    id: "c1",
    aglcVersion: "4",
    sourceType,
    data,
    tags,
    createdAt: STAMP,
    modifiedAt: STAMP,
  };
}

function render(citation: Citation, standardId: CitationStandardId): string {
  return getFormattedPreview(citation, getStandardConfig(standardId))
    .map((r) => r.text)
    .join("")
    .trim()
    .replace(/\.$/, "");
}

// ─── NZLSG: cases from the AGLC form keys ───────────────────────────────────

describe("STD-021: NZLSG reads the AGLC reported-case form", () => {
  const corrForm = cite("case.reported", {
    party1: "Corr",
    party2: "IBC Vehicles Ltd",
    yearType: "square",
    year: "2008",
    volume: "1",
    reportSeries: "AC",
    startingPage: "884",
    mnc: "[2008] UKHL 13",
    jurisdiction: "UK",
  });

  test("a UK case with an `mnc` string renders neutral citation, comma, report (NZLSG 3 §3.2, §8.4)", () => {
    expect(render(corrForm, "nzlsg3")).toBe(
      "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884"
    );
  });

  test("the MNC year is the neutral citation's, the form year the report's (Wilson [2009] NICA 30, [2010] NI 48)", () => {
    const wilson = cite("case.reported", {
      party1: "Wilson",
      party2: "Commissioner of Valuation",
      yearType: "square",
      year: 2010,
      reportSeries: "NI",
      startingPage: 48,
      mnc: "[2009] NICA 30",
      jurisdiction: "NI",
    });
    expect(render(wilson, "nzlsg3")).toBe(
      "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48"
    );
  });

  test("a report without a neutral citation carries the court identifier in brackets (§3.2.7)", () => {
    const taylor = cite("case.reported", {
      party1: "Taylor",
      party2: "New Zealand Poultry Board",
      yearType: "square",
      year: 1984,
      volume: 1,
      reportSeries: "NZLR",
      startingPage: 394,
      courtId: "CA",
      jurisdiction: "NZ",
    });
    expect(render(taylor, "nzlsg3")).toBe(
      "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA)"
    );
  });

  test("a single-court series omits the court identifier and a retrospective AustLII MNC is not cited (§3.2.7, §8.2.3)", () => {
    const mabo = cite("case.reported", {
      party1: "Mabo",
      party2: "Queensland",
      yearType: "round",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
      courtId: "HCA",
      mnc: "[1992] HCA 23",
      jurisdiction: "Cth",
    });
    expect(render(mabo, "nzlsg3")).toBe("Mabo v Queensland (1992) 175 CLR 1");
  });

  test("an Australian MNC the court issued is cited (from 1998)", () => {
    const modern = cite("case.reported", {
      party1: "Smith",
      party2: "Jones",
      yearType: "round",
      year: 2005,
      volume: 220,
      reportSeries: "CLR",
      startingPage: 1,
      mnc: "[2005] HCA 10",
      jurisdiction: "Cth",
    });
    expect(render(modern, "nzlsg3")).toBe("Smith v Jones [2005] HCA 10, (2005) 220 CLR 1");
  });

  test("a Scottish report takes no brackets round its locating year (§8.5)", () => {
    const axa = cite("case.reported", {
      party1: "AXA General Insurance Ltd",
      party2: "Lord Advocate",
      yearType: "round",
      year: 2011,
      reportSeries: "SC",
      startingPage: 158,
      mnc: "[2011] CSIH 31",
      jurisdiction: "Scot",
    });
    expect(render(axa, "nzlsg3")).toBe(
      "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158"
    );
  });

  test("an unreported-MNC case gains its parallel report from the AGLC report keys (Update from source)", () => {
    const fonotia = cite("case.unreported.mnc", {
      party1: "R",
      party2: "Fonotia",
      year: "2007",
      court: "NZCA",
      caseNumber: "188",
      reportSeries: "NZLR",
      volume: "3",
      startingPage: "338",
    });
    expect(render(fonotia, "nzlsg3")).toBe("R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338");
  });

  test("the native NZLSG keys still work and win over the aliases", () => {
    const native = cite("case.reported", {
      caseName: "Brooker v Police",
      year: 2007,
      courtIdentifier: "NZSC",
      decisionNumber: 30,
      court: "IGNORED",
      caseNumber: 99,
      parallelReport: { year: 2007, volume: 3, reportSeries: "NZLR", startPage: 91 },
    });
    expect(render(native, "nzlsg3")).toBe("Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91");
  });

  test("the UK Hansard renders in the NZLSG foreign form from the AGLC fields (§5.1.1)", () => {
    const hc = cite("hansard", {
      jurisdiction: "UK",
      chamber: "HC",
      date: "3 February 1977",
      volume: 389,
      column: 973,
    });
    expect(render(hc, "nzlsg3")).toBe("(3 February 1977) 389 GBPD HC 973");
  });
});

// ─── OSCOLA: cases and legislation from the AGLC form keys ──────────────────

describe("STD-021: OSCOLA reads the AGLC form", () => {
  test("a reported case with an `mnc` string renders the neutral citation before the report (§2.1.3)", () => {
    const brooker = cite("case.reported", {
      party1: "Brooker",
      party2: "Police",
      yearType: "square",
      year: 2007,
      volume: 3,
      reportSeries: "NZLR",
      startingPage: 91,
      mnc: "[2007] NZSC 30",
      jurisdiction: "NZ",
    });
    expect(render(brooker, "oscola5")).toBe("Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91");
  });

  test("an AGLC-form Mabo keeps the OSCOLA foreign form without the retrospective MNC (§2.6.1)", () => {
    const mabo = cite("case.reported", {
      party1: "Mabo",
      party2: "Queensland",
      yearType: "round",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
      courtId: "HCA",
      mnc: "[1992] HCA 23",
      jurisdiction: "Cth",
    });
    expect(render(mabo, "oscola5")).toBe("Mabo v Queensland (1992) 175 CLR 1 (HCA)");
  });

  test("an unreported-MNC case renders from `court` + `caseNumber` + `year` (§2.1.2)", () => {
    const corr = cite("case.unreported.mnc", {
      party1: "Corr",
      party2: "IBC Vehicles Ltd",
      year: "2008",
      court: "UKHL",
      caseNumber: "13",
    });
    expect(render(corr, "oscola5")).toBe("Corr v IBC Vehicles Ltd [2008] UKHL 13");
  });

  test("foreign legislation carries its jurisdiction in brackets; UK legislation does not (§2.6.2)", () => {
    const nz = cite("legislation.statute", {
      title: "Privacy Act",
      year: 2020,
      jurisdiction: "NZ",
    });
    const uk = cite("legislation.statute", {
      title: "Human Rights Act",
      year: 1998,
      jurisdiction: "UK",
    });
    expect(render(nz, "oscola5")).toBe("Privacy Act 2020 (NZ)");
    expect(render(uk, "oscola5")).toBe("Human Rights Act 1998");
  });

  test("a foreign Hansard is cited as at home: NZPD form for NZ, AGLC form for the Commonwealth (§1.4)", () => {
    const nz = cite("hansard", {
      jurisdiction: "NZ",
      nzpd: true,
      date: "6 April 2005",
      volume: 624,
      page: 19676,
    });
    const cth = cite("hansard", {
      jurisdiction: "Commonwealth",
      chamber: "House of Representatives",
      date: "12 March 2020",
      page: "2345",
      speaker: "Anthony Albanese",
    });
    expect(render(nz, "oscola5")).toBe("(6 April 2005) 624 NZPD 19676");
    expect(render(cth, "oscola5")).toBe(
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 2345 (Anthony Albanese)"
    );
  });
});

// ─── Alias table ────────────────────────────────────────────────────────────

describe("STD-021: FIELD_ALIASES for the OSCOLA / NZLSG dispatcher keys", () => {
  test("NZLSG courtIdentifier and decisionNumber read the AGLC keys", () => {
    expect(readFieldWithAliases({ courtId: "HCA" }, "courtIdentifier")).toBe("HCA");
    expect(readFieldWithAliases({ court: "HCA" }, "courtIdentifier")).toBe("HCA");
    expect(readFieldWithAliases({ caseNumber: 23 }, "decisionNumber")).toBe(23);
  });

  test("courtId has no alias: an MNC record's `court` never folds into the AGLC reported-case row", () => {
    expect(getFieldAliases("courtId")).toEqual([]);
    expect(readFieldWithAliases({ court: "HCA" }, "courtId")).toBeUndefined();
  });

  test("a report's year is not a neutral citation year", () => {
    expect(getFieldAliases("neutralCitationYear")).toEqual([]);
  });
});

// ─── Waitangi Tribunal classification ───────────────────────────────────────

describe("STD-021: the Waitangi Tribunal classification is derived from the record", () => {
  test.each([
    [
      "source type",
      cite("report.waitangi_tribunal", { title: "Ko Aotearoa Tēnei", waiNumber: 262, year: 2011 }),
    ],
    [
      "Wai claim number",
      cite("report", { body: "Tribunal", title: "T", waiNumber: "262", year: 2011 }),
    ],
    [
      "'Wai n' report number",
      cite("report", { body: "Tribunal", title: "T", reportNumber: "Wai 262", year: 2011 }),
    ],
    ["body in English", cite("report", { body: "Waitangi Tribunal", title: "T", year: 2011 })],
    [
      "body in te reo",
      cite("report", { body: "Te Rōpū Whakamana i te Tiriti o Waitangi", title: "T", year: 2011 }),
    ],
    [
      "legacy tag hint",
      cite("report", { body: "Tribunal", title: "T", year: 2011 }, ["waitangi_tribunal"]),
    ],
  ])("classified by %s", (_label, citation) => {
    expect(isWaitangiTribunalReport(citation)).toBe(true);
  });

  test("a plain report and a case are not classified", () => {
    expect(
      isWaitangiTribunalReport(cite("report", { body: "Treasury", title: "Budget", year: 2011 }))
    ).toBe(false);
    expect(
      isWaitangiTribunalReport(cite("case.reported", { party1: "Waitangi Tribunal", party2: "X" }))
    ).toBe(false);
  });

  test("the tag is a derived hint: never a system or user tag, never typed, kept on save", () => {
    expect(isSystemTag("waitangi_tribunal")).toBe(false);
    expect(isDerivedTag("waitangi_tribunal")).toBe(true);
    expect(userTags(["waitangi_tribunal", "treaty-claims"])).toEqual(["treaty-claims"]);
    expect(normaliseTag("waitangi_tribunal")).toBeUndefined();
    expect(withUserTags(["import", "waitangi_tribunal", "old"], ["new"])).toEqual([
      "import",
      "waitangi_tribunal",
      "new",
    ]);
  });
});
