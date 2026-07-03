/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * PARITY-117: Dataset parity tests.
 *
 * Asserts that the typed datasets in src/engine/data/ match the AGLC4
 * in-chapter tables row for row:
 *   - rule 2.2.2/2.2.3 report series tables (PDF pp.75–76)
 *   - rule 2.3.1 court identifier table (PDF pp.79–81)
 *   - rule 2.4.1 judicial officers table (PDF pp.83–85) + plurals (2.4.5)
 *   - rule 3.1.4 pinpoint designation table (PDF p.94)
 *   - rule 21.1.3 NZ identifier years and 21.1.4 minute books (PDF pp.265–6)
 *   - rule 24.1.2 Law Reports table (PDF pp.276–277) and 24.1.5 identifiers
 *   - rule 24.1.6 UK judicial titles table (PDF pp.281–282)
 *
 * Appendix-A/B/C-dependent rows are NOT asserted here (DECISION-015) —
 * only rows the in-chapter tables govern.
 */

import { REPORT_SERIES, getByAbbreviation } from "../../src/engine/data/report-series";
import { getByCode } from "../../src/engine/data/court-identifiers";
import {
  PINPOINT_ABBREVIATIONS,
  getPinpointAbbreviation,
} from "../../src/engine/data/pinpoint-abbrevs";
import {
  NZ_COURT_IDENTIFIERS,
  NZ_MINUTE_BOOKS,
  getNZCourtByCode,
} from "../../src/engine/data/nz-court-identifiers";
import { NZ_REPORT_SERIES } from "../../src/engine/data/nz-report-series";
import {
  UK_REPORT_SERIES,
  getUKReportSeriesByAbbreviation,
} from "../../src/engine/data/uk-report-series";
import { getUKCourtByCode } from "../../src/engine/data/uk-court-identifiers";
import { EU_CASE_PREFIXES } from "../../src/engine/data/eu-case-prefixes";
import {
  AU_JUDICIAL_TITLES,
  UK_JUDICIAL_TITLES,
  getJudicialTitle,
  getJudicialTitlePlural,
  isTitleBeforeName,
} from "../../src/engine/data/judicial-titles";

// ─── Rule 2.2.2/2.2.3 — report series (PDF pp.75–76) ─────────────────────────

describe("report-series.ts vs rule 2.2.2/2.2.3 tables", () => {
  test("Qd R is the authorised Queensland series 1958– (rule 2.2.3)", () => {
    const qdr = getByAbbreviation("Qd R");
    expect(qdr?.type).toBe("authorised");
    expect(qdr?.fullName).toBe("Queensland Reports");
  });

  test("fabricated 'QR' abbreviation is absent (rule 2.2.3 gives 'Qd R')", () => {
    expect(getByAbbreviation("QR")).toBeUndefined();
  });

  test("SR (NSW) is authorised, 'State Reports (New South Wales)' (rule 2.2.3)", () => {
    const entry = getByAbbreviation("SR (NSW)");
    expect(entry?.type).toBe("authorised");
    expect(entry?.fullName).toBe("State Reports (New South Wales)");
  });

  test("all rule 2.2.3 authorised historical series are present and authorised", () => {
    // Full second column of the rule 2.2.3 table (PDF p.76).
    const authorised = [
      "CLR",
      "FCR",
      "ACTLR",
      "SR (NSW)",
      "NSWR",
      "NSWLR",
      "NTR",
      "NTLR",
      "St R Qd",
      "Qd R",
      "SALR",
      "SASR",
      "Tas LR",
      "Tas SR",
      "Tas R",
      "VLR",
      "VR",
      "WALR",
      "WAR",
    ];
    for (const abbrev of authorised) {
      const entry = getByAbbreviation(abbrev);
      expect(entry).toBeDefined();
      expect(entry?.type).toBe("authorised");
    }
  });

  test("'WASR' (not an AGLC4 series) is absent", () => {
    expect(getByAbbreviation("WASR")).toBeUndefined();
  });

  test("'Fam CA' duplicate of the FamCA identifier is absent", () => {
    expect(getByAbbreviation("Fam CA")).toBeUndefined();
  });

  test("NTLR is volume-organised per ex 60: (2013) 33 NTLR 65", () => {
    expect(getByAbbreviation("NTLR")?.yearOrganised).toBe(false);
  });

  test("WAR is volume-organised per ex 93: (1995) 14 WAR 373", () => {
    expect(getByAbbreviation("WAR")?.yearOrganised).toBe(false);
  });

  test("medium neutral identifiers are flagged (rule 2.2.2 ranks MNC below series)", () => {
    for (const abbrev of ["HCA", "FCA", "FCAFC", "FamCA", "FamCAFC", "NSWSC", "VSC"]) {
      expect(getByAbbreviation(abbrev)?.mediumNeutral).toBe(true);
    }
  });

  test("report series proper are not flagged medium neutral", () => {
    for (const abbrev of ["CLR", "NSWLR", "Qd R", "ALR", "ALJR", "IPR"]) {
      expect(getByAbbreviation(abbrev)?.mediumNeutral).toBeUndefined();
    }
  });

  test("generalist unauthorised examples typed per rule 2.2.2 (ALR, ALJR, FLR, ACTR)", () => {
    for (const abbrev of ["ALR", "ALJR", "FLR", "ACTR"]) {
      expect(getByAbbreviation(abbrev)?.type).toBe("unauthorised_generalist");
    }
  });

  test("subject-specific examples typed per rule 2.2.2 (A Crim R, ACSR, IR, IPR)", () => {
    for (const abbrev of ["A Crim R", "ACSR", "IR", "IPR"]) {
      expect(getByAbbreviation(abbrev)?.type).toBe("unauthorised_subject");
    }
  });

  test("duplicate abbreviations are disambiguated by jurisdiction", () => {
    expect(getByAbbreviation("IR")?.fullName).toBe("Industrial Reports");
    expect(getByAbbreviation("IR", "IE")?.fullName).toBe("Irish Reports");
    expect(getByAbbreviation("BCLC", "UK")?.fullName).toBe("Butterworths Company Law Cases (UK)");
  });

  test("no duplicate abbreviation+jurisdiction pairs", () => {
    const seen = new Set<string>();
    for (const entry of REPORT_SERIES) {
      const key = `${entry.abbreviation}|${entry.jurisdiction}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test("SR (SA) fullName no longer collides with SASR", () => {
    expect(getByAbbreviation("SR (SA)")?.fullName).toBe("State Reports (South Australia)");
    expect(getByAbbreviation("SASR")?.fullName).toBe("South Australian State Reports");
  });
});

// ─── Rule 2.3.1 — court identifiers (PDF pp.79–81) ───────────────────────────

describe("court-identifiers.ts vs rule 2.3.1 table", () => {
  test("HCASL: High Court Special Leave Dispositions, 2008–", () => {
    const entry = getByCode("HCASL");
    expect(entry?.fullName).toBe("High Court of Australia — Special Leave Dispositions");
    expect(entry?.mncFrom).toBe(2008);
  });

  test("FamCA: Family Court of Australia, 1998–", () => {
    expect(getByCode("FamCA")?.mncFrom).toBe(1998);
  });

  test("FamCAFC: Family Court Full Court, 2008–", () => {
    expect(getByCode("FamCAFC")?.mncFrom).toBe(2008);
  });

  test("NTCCA: NT Court of Criminal Appeal, 2000–", () => {
    expect(getByCode("NTCCA")?.mncFrom).toBe(2000);
  });

  test("TASCCA: Tasmanian Court of Criminal Appeal, 2010–", () => {
    expect(getByCode("TASCCA")?.mncFrom).toBe(2010);
  });

  test("allocation years match the rule 2.3.1 table for superior courts", () => {
    const years: Record<string, number> = {
      HCA: 1998,
      FCA: 1999,
      FCAFC: 2002,
      ACTSC: 1998,
      ACTCA: 2002,
      NSWSC: 1999,
      NSWCA: 1999,
      NSWCCA: 1999,
      NTSC: 1999,
      NTCA: 2000,
      QSC: 1998,
      QCA: 1998,
      SASC: 1999,
      SASCFC: 2010,
      TASSC: 1999,
      TASFC: 2010,
      VSC: 1998,
      VSCA: 1998,
      WASC: 1999,
      WASCA: 1999,
    };
    for (const [code, year] of Object.entries(years)) {
      expect(getByCode(code)?.mncFrom).toBe(year);
    }
  });

  test("the guide's worked-example typo 'TASCC' has not leaked in", () => {
    expect(getByCode("TASCC")).toBeUndefined();
    expect(getByCode("TASCSC")).toBeUndefined();
  });
});

// ─── Rule 3.1.4 — pinpoint designations (PDF p.94) ───────────────────────────

describe("pinpoint-abbrevs.ts vs rule 3.1.4 table", () => {
  test("all 13 table rows present with exact singular/plural forms", () => {
    const table: Array<[string, string, string]> = [
      ["appendix", "app", "apps"],
      ["article", "art", "arts"],
      ["chapter", "ch", "chs"],
      ["clause", "cl", "cls"],
      ["division", "div", "divs"],
      ["paragraph", "para", "paras"],
      ["part", "pt", "pts"],
      ["schedule", "sch", "schs"],
      ["section", "s", "ss"],
      ["sub-clause", "sub-cl", "sub-cls"],
      ["subdivision", "sub-div", "sub-divs"],
      ["sub-paragraph", "sub-para", "sub-paras"],
      ["subsection", "sub-s", "sub-ss"],
    ];
    for (const [type, singular, plural] of table) {
      expect(getPinpointAbbreviation(type, false)).toBe(singular);
      expect(getPinpointAbbreviation(type, true)).toBe(plural);
    }
  });

  test("order abbreviates to 'ord', never 'O' (rule 3.1.4 notes)", () => {
    expect(getPinpointAbbreviation("order", false)).toBe("ord");
  });

  test("rule abbreviates to 'r'/'rr' (rule 3.1.4 notes)", () => {
    expect(getPinpointAbbreviation("rule", false)).toBe("r");
    expect(getPinpointAbbreviation("rule", true)).toBe("rr");
  });

  test("hyphen variants normalise (sub-section/subsection → sub-s)", () => {
    expect(getPinpointAbbreviation("sub-section", false)).toBe("sub-s");
    expect(getPinpointAbbreviation("Subsection", true)).toBe("sub-ss");
    expect(getPinpointAbbreviation("subparagraph", false)).toBe("sub-para");
  });

  test("no duplicate type keys", () => {
    const types = PINPOINT_ABBREVIATIONS.map((p) => p.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

// ─── Rule 2.4.1/2.4.5 — AU judicial titles (PDF pp.83–87) ────────────────────

describe("judicial-titles.ts vs rule 2.4.1 table", () => {
  test("covers all 30 table rows (25 offices, 5 plural rows merged)", () => {
    expect(AU_JUDICIAL_TITLES.length).toBe(25);
    const withPlural = AU_JUDICIAL_TITLES.filter((t) => t.abbreviationPlural);
    expect(withPlural.length).toBe(5);
  });

  test("exact abbreviations for compound offices", () => {
    expect(getJudicialTitle("CJ at CL")?.office).toBe("Chief Judge at Common Law");
    expect(getJudicialTitle("CJ in Eq")?.office).toBe("Chief Judge in Equity");
    expect(getJudicialTitle("CJ Comm D")?.office).toBe("Chief Judge of the Commercial Division");
    expect(getJudicialTitle("AsJ")?.office).toBe("Associate Justice");
    expect(getJudicialTitle("V-P")?.office).toBe("Vice-President");
    expect(getJudicialTitle("SPJ")?.office).toBe("Senior Puisne Judge");
  });

  test("case-sensitive lookup rejects non-AGLC forms ('VP', 'ASJ')", () => {
    expect(getJudicialTitle("VP")).toBeUndefined();
    expect(getJudicialTitle("ASJ")).toBeUndefined();
  });

  test("asterisked offices appear in full before the name (ex 93 '(Commissioner Buss)')", () => {
    for (const title of ["Commissioner", "Judge", "Magistrate", "Master"]) {
      expect(isTitleBeforeName(title)).toBe(true);
    }
    expect(isTitleBeforeName("J")).toBe(false);
    expect(isTitleBeforeName("CJ")).toBe(false);
  });

  test("plural abbreviations per rule 2.4.5 (J→JJ, JA→JJA, AJA→AJJA, AJ→AJJ, SJ→SJJ)", () => {
    expect(getJudicialTitlePlural("J")).toBe("JJ");
    expect(getJudicialTitlePlural("JA")).toBe("JJA");
    expect(getJudicialTitlePlural("AJA")).toBe("AJJA");
    expect(getJudicialTitlePlural("AJ")).toBe("AJJ");
    expect(getJudicialTitlePlural("SJ")).toBe("SJJ");
    expect(getJudicialTitlePlural("CJ")).toBeUndefined();
  });
});

// ─── Rule 24.1.6 — UK judicial titles (PDF pp.281–282) ───────────────────────

describe("judicial-titles.ts vs rule 24.1.6 table", () => {
  test("covers all 21 table rows", () => {
    expect(UK_JUDICIAL_TITLES.length).toBe(21);
  });

  test("Deputy President of the UKSC is 'DPSC', not the example band's 'DP' (DECISION-012)", () => {
    expect(getJudicialTitle("DPSC", "UK")?.office).toBe(
      "Deputy President of the Supreme Court of the United Kingdom"
    );
    expect(getJudicialTitle("DP", "UK")).toBeUndefined();
  });

  test("asterisked UK titles precede the name ('Lord Diplock', 'Baroness Hale')", () => {
    for (const title of [
      "Baroness",
      "Judge",
      "Lord",
      "Lord Commissioner",
      "Master",
      "Recorder",
      "Registrar",
    ]) {
      expect(isTitleBeforeName(title, "UK")).toBe(true);
    }
    expect(isTitleBeforeName("LJ", "UK")).toBe(false);
    expect(isTitleBeforeName("MR", "UK")).toBe(false);
  });

  test("LJ pluralises to LJJ ('James, Baggallay and Bramwell LJJ')", () => {
    expect(getJudicialTitlePlural("LJ", "UK")).toBe("LJJ");
  });

  test("core UK abbreviations resolve (MR, V-C, PSC, JSC, LC, CB)", () => {
    expect(getJudicialTitle("MR", "UK")?.office).toBe("Master of the Rolls");
    expect(getJudicialTitle("V-C", "UK")?.office).toBe("Vice-Chancellor");
    expect(getJudicialTitle("PSC", "UK")?.office).toBe(
      "President of the Supreme Court of the United Kingdom"
    );
    expect(getJudicialTitle("JSC", "UK")?.office).toBe(
      "Justice of the Supreme Court of the United Kingdom"
    );
    expect(getJudicialTitle("LC", "UK")?.office).toBe("Lord Chancellor");
    expect(getJudicialTitle("CB", "UK")?.office).toBe("Chief Baron");
  });
});

// ─── Rule 21.1.3/21.1.4 — NZ identifiers and minute books ────────────────────

describe("nz-court-identifiers.ts vs rule 21.1.3/21.1.4 tables", () => {
  test("identifier years match the rule 21.1.3 table exactly", () => {
    const years: Record<string, number> = {
      NZSC: 2005,
      NZCA: 2007,
      NZHC: 2012,
      NZEmpC: 2010,
      NZEnvC: 2010,
      NZFC: 2012,
    };
    for (const [code, year] of Object.entries(years)) {
      expect(getNZCourtByCode(code)?.neutralCitationFrom).toBe(year);
    }
  });

  test("rule 21.1.4 minute book abbreviations (MB, ACMB, CJMB)", () => {
    expect(NZ_MINUTE_BOOKS.map((m) => m.abbreviation)).toEqual(["MB", "ACMB", "CJMB"]);
    expect(NZ_MINUTE_BOOKS.find((m) => m.abbreviation === "ACMB")?.fullName).toBe(
      "Appellate Court Minute Book"
    );
    expect(NZ_MINUTE_BOOKS.find((m) => m.abbreviation === "CJMB")?.fullName).toBe(
      "Chief Judge's Minute Book"
    );
  });

  test("no duplicate NZ court codes", () => {
    const codes = NZ_COURT_IDENTIFIERS.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("nz-report-series.ts hygiene", () => {
  test("no duplicate abbreviations (NZAR/NZCPR previously shadowed)", () => {
    const abbrevs = NZ_REPORT_SERIES.map((e) => e.abbreviation);
    expect(new Set(abbrevs).size).toBe(abbrevs.length);
  });
});

// ─── Rule 24.1.2/24.1.5 — UK report series and identifiers ───────────────────

describe("uk-report-series.ts vs rule 24.1.2 table", () => {
  test("1875–90 divisional series present (Ch D, QBD, PD, Ex D)", () => {
    for (const abbrev of ["Ch D", "QBD", "PD", "Ex D"]) {
      const entry = getUKReportSeriesByAbbreviation(abbrev);
      expect(entry).toBeDefined();
      expect(entry?.type).toBe("authorised");
      // Volume-organised: (1881) 17 Ch D 772 style.
      expect(entry?.yearOrganised).toBe(false);
    }
  });

  test("all 1865–75 'LR'-prefixed predecessor series present", () => {
    const lrSeries = [
      "LR Adm & Eccl",
      "LR Ch App",
      "LR CP",
      "LR CCR",
      "LR HL",
      "LR Eq",
      "LR Ex",
      "LR PC",
      "LR P&D",
      "LR QB",
      "LR Sc & Div",
      "LR RP",
    ];
    for (const abbrev of lrSeries) {
      expect(getUKReportSeriesByAbbreviation(abbrev)).toBeDefined();
    }
  });

  test("LR P&D has no spaces around '&' (rule 24.1.2 table)", () => {
    expect(getUKReportSeriesByAbbreviation("LR P & D")).toBeUndefined();
    expect(getUKReportSeriesByAbbreviation("LR P&D")).toBeDefined();
  });

  test("RR (Revised Reports) present for rule 24.1.3 parallel citations", () => {
    expect(getUKReportSeriesByAbbreviation("RR")?.fullName).toBe("Revised Reports");
  });

  test("no duplicate UK abbreviations", () => {
    const abbrevs = UK_REPORT_SERIES.map((e) => e.abbreviation);
    expect(new Set(abbrevs).size).toBe(abbrevs.length);
  });
});

describe("uk-court-identifiers.ts vs rule 24.1.5 table", () => {
  test("HCJT (Scotland High Court of Justiciary — Trial Court, 2005–) present", () => {
    expect(getUKCourtByCode("HCJT")?.fullName).toBe("High Court of Justiciary (Trial Court)");
  });

  test("unparenthesised 'EWHC Admin' (2001–02) present alongside 'EWHC (Admin)'", () => {
    expect(getUKCourtByCode("EWHC Admin")).toBeDefined();
    expect(getUKCourtByCode("EWHC (Admin)")).toBeDefined();
  });
});

// ─── EU case prefixes ────────────────────────────────────────────────────────

describe("eu-case-prefixes.ts hygiene", () => {
  test("exactly C-, T-, F- — no fabricated 'P-' prefix, no duplicate rows", () => {
    expect(EU_CASE_PREFIXES.map((p) => p.prefix)).toEqual(["C-", "T-", "F-"]);
  });
});
