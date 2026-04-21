/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * NZLSG formatter tests — comprehensive coverage of all NZ-specific rule modules.
 */

import {
  formatNeutralCitation,
  formatPreNeutralCase,
} from "../../src/engine/rules/nzlsg/cases";
import { formatMaoriLandCourt } from "../../src/engine/rules/nzlsg/maori-land-court";
import { formatWaitangiTribunalReport } from "../../src/engine/rules/nzlsg/waitangi";
import {
  formatLegislation,
  formatDelegatedLegislation,
  formatBill,
} from "../../src/engine/rules/nzlsg/legislation";
import {
  formatNZPD,
  formatSelectCommitteeSubmission,
  formatCabinetDocument,
  formatNZGazette,
  formatAJHR,
} from "../../src/engine/rules/nzlsg/parliamentary";
import {
  formatBook,
  formatJournalArticle,
  formatLawCommission,
  formatThesis,
  formatOnlineLooseleaf,
} from "../../src/engine/rules/nzlsg/secondary";
import {
  formatGeneralSubsequent,
  formatCommercialSubsequent,
} from "../../src/engine/rules/nzlsg/styles";
import { formatTreatyOfWaitangi } from "../../src/engine/rules/nzlsg/treaty-of-waitangi";
import {
  formatTreaty,
  formatUNDocument,
  formatICJCase,
} from "../../src/engine/rules/nzlsg/international";
import {
  searchNZReportSeries,
  getNZReportSeriesByAbbreviation,
  NZ_REPORT_SERIES,
} from "../../src/engine/data/nz-report-series";
import {
  searchNZCourtIdentifiers,
  getNZCourtByCode,
  getNZCourtsByLevel,
  MAORI_LAND_COURT_BLOCKS,
  NZ_COURT_IDENTIFIERS,
} from "../../src/engine/data/nz-court-identifiers";
import type { FormattedRun } from "../../src/types/formattedRun";

/** Helper: join run texts for easy assertion. */
function runsToText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Helper: check if a specific run is italic. */
function isRunItalic(runs: FormattedRun[], index: number): boolean {
  return runs[index]?.italic === true;
}

/** Helper: find the run containing a substring and check if italic. */
function isTextItalic(runs: FormattedRun[], substring: string): boolean {
  const run = runs.find((r) => r.text.includes(substring));
  return run?.italic === true;
}

// =============================================================================
// 1. NZLSG Cases (cases.ts)
// =============================================================================

describe("NZLSG Cases — formatNeutralCitation", () => {
  test("JSDoc example: R v Fonotia with parallel report", () => {
    const runs = formatNeutralCitation({
      caseName: "R v Fonotia",
      year: 2007,
      courtIdentifier: "NZCA",
      decisionNumber: 188,
      parallelReport: {
        year: 2007,
        volume: 3,
        reportSeries: "NZLR",
        startPage: 338,
      },
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338"
    );
    expect(isRunItalic(runs, 0)).toBe(true);
  });

  test("neutral citation without parallel report", () => {
    const runs = formatNeutralCitation({
      caseName: "Ortiz v R",
      year: 2023,
      courtIdentifier: "NZSC",
      decisionNumber: 45,
    });
    expect(runsToText(runs)).toBe("Ortiz v R [2023] NZSC 45");
    expect(isRunItalic(runs, 0)).toBe(true);
  });

  test("neutral citation with pinpoint", () => {
    const runs = formatNeutralCitation({
      caseName: "Ortiz v R",
      year: 2023,
      courtIdentifier: "NZSC",
      decisionNumber: 45,
      pinpoint: "[12]",
    });
    expect(runsToText(runs)).toBe("Ortiz v R [2023] NZSC 45 at [12]");
  });

  test("parallel report without volume number", () => {
    const runs = formatNeutralCitation({
      caseName: "X v Y",
      year: 2010,
      courtIdentifier: "NZHC",
      decisionNumber: 100,
      parallelReport: {
        year: 2010,
        reportSeries: "NZFLR",
        startPage: 50,
      },
    });
    expect(runsToText(runs)).toBe(
      "X v Y [2010] NZHC 100, [2010] NZFLR 50"
    );
  });

  test("parallel report with pinpoint", () => {
    const runs = formatNeutralCitation({
      caseName: "A v B",
      year: 2015,
      courtIdentifier: "NZCA",
      decisionNumber: 200,
      parallelReport: {
        year: 2015,
        volume: 2,
        reportSeries: "NZLR",
        startPage: 100,
      },
      pinpoint: "105",
    });
    expect(runsToText(runs)).toBe(
      "A v B [2015] NZCA 200, [2015] 2 NZLR 100 at 105"
    );
  });

  test("case name is italic, rest is roman", () => {
    const runs = formatNeutralCitation({
      caseName: "Smith v Jones",
      year: 2020,
      courtIdentifier: "NZDC",
      decisionNumber: 1,
    });
    expect(runs[0].italic).toBe(true);
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].italic).toBeUndefined();
    }
  });
});

describe("NZLSG Cases — formatPreNeutralCase", () => {
  test("JSDoc example: Taylor v Beere", () => {
    const runs = formatPreNeutralCase({
      caseName: "Taylor v Beere",
      court: "HC",
      registry: "Wellington",
      fileNumber: "CP 291/85",
      date: "7 November 1985",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Taylor v Beere HC Wellington CP 291/85, 7 November 1985"
    );
    expect(isRunItalic(runs, 0)).toBe(true);
  });

  test("pre-neutral case without registry (single-registry court)", () => {
    const runs = formatPreNeutralCase({
      caseName: "X v Y",
      court: "CA",
      fileNumber: "CA 123/90",
      date: "15 March 1990",
    });
    expect(runsToText(runs)).toBe("X v Y CA CA 123/90, 15 March 1990");
  });

  test("pre-neutral case with pinpoint", () => {
    const runs = formatPreNeutralCase({
      caseName: "Taylor v Beere",
      court: "HC",
      registry: "Wellington",
      fileNumber: "CP 291/85",
      date: "7 November 1985",
      pinpoint: "5",
    });
    expect(runsToText(runs)).toBe(
      "Taylor v Beere HC Wellington CP 291/85, 7 November 1985 at 5"
    );
  });

  test("case name is italic", () => {
    const runs = formatPreNeutralCase({
      caseName: "Doe v Roe",
      court: "HC",
      registry: "Auckland",
      fileNumber: "CIV 001/99",
      date: "1 January 1999",
    });
    expect(runs[0].italic).toBe(true);
  });
});

// =============================================================================
// 2. Maori Land Court (maori-land-court.ts)
// =============================================================================

describe("NZLSG Maori Land Court — formatMaoriLandCourt", () => {
  test("JSDoc example: Pomare with short-form parenthetical", () => {
    const runs = formatMaoriLandCourt({
      caseName: "Pomare \u2013 Peter Here Pomare",
      year: 2015,
      blockNumber: 103,
      minuteBookDistrict: "Taitokerau",
      minuteBookAbbrev: "MB",
      page: 95,
      shortBlockNumber: 103,
      shortCourtAbbrev: "TTK",
      shortPage: 95,
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Pomare \u2013 Peter Here Pomare (2015) 103 Taitokerau MB 95 (103 TTK 95)"
    );
    expect(isRunItalic(runs, 0)).toBe(true);
  });

  test("without short-form parenthetical", () => {
    const runs = formatMaoriLandCourt({
      caseName: "Te Whaiti v. Te Whaiti",
      year: 2010,
      blockNumber: 55,
      minuteBookDistrict: "Waiariki",
      minuteBookAbbrev: "MB",
      page: 200,
    });
    expect(runsToText(runs)).toBe(
      "Te Whaiti v. Te Whaiti (2010) 55 Waiariki MB 200"
    );
  });

  test("macron preservation in district name", () => {
    const runs = formatMaoriLandCourt({
      caseName: "T\u0101mati v. R\u014dpata",
      year: 2018,
      blockNumber: 77,
      minuteBookDistrict: "T\u0101rawhiti",
      minuteBookAbbrev: "MB",
      page: 12,
    });
    const text = runsToText(runs);
    expect(text).toContain("T\u0101rawhiti");
    expect(text).toContain("T\u0101mati");
  });

  test("with pinpoint", () => {
    const runs = formatMaoriLandCourt({
      caseName: "Pomare \u2013 Peter Here Pomare",
      year: 2015,
      blockNumber: 103,
      minuteBookDistrict: "Taitokerau",
      minuteBookAbbrev: "MB",
      page: 95,
      pinpoint: "96",
    });
    expect(runsToText(runs)).toContain("at 96");
  });

  test("appellate court variant uses same format", () => {
    const runs = formatMaoriLandCourt({
      caseName: "Smith v. Jones",
      year: 2020,
      blockNumber: 10,
      minuteBookDistrict: "Aotea",
      minuteBookAbbrev: "MB",
      page: 5,
      isAppellateCourt: true,
    });
    // The format is the same; isAppellateCourt may be used for metadata
    expect(runsToText(runs)).toBe(
      "Smith v. Jones (2020) 10 Aotea MB 5"
    );
  });

  test("short-form parenthetical requires all three fields", () => {
    // Only shortBlockNumber provided, no shortCourtAbbrev or shortPage
    const runs = formatMaoriLandCourt({
      caseName: "Test",
      year: 2020,
      blockNumber: 10,
      minuteBookDistrict: "Aotea",
      minuteBookAbbrev: "MB",
      page: 5,
      shortBlockNumber: 10,
    });
    expect(runsToText(runs)).toBe("Test (2020) 10 Aotea MB 5");
  });
});

// =============================================================================
// 3. Waitangi Tribunal (waitangi.ts)
// =============================================================================

describe("NZLSG Waitangi Tribunal — formatWaitangiTribunalReport", () => {
  test("JSDoc example: Ko Aotearoa Tenei with pinpoint", () => {
    const runs = formatWaitangiTribunalReport({
      title: "Ko Aotearoa T\u0113nei",
      waiNumber: 262,
      year: 2011,
      pinpoint: "23",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Waitangi Tribunal Ko Aotearoa T\u0113nei (Wai 262, 2011) at 23"
    );
  });

  test("title is italic", () => {
    const runs = formatWaitangiTribunalReport({
      title: "Ko Aotearoa T\u0113nei",
      waiNumber: 262,
      year: 2011,
    });
    expect(isTextItalic(runs, "Ko Aotearoa")).toBe(true);
  });

  test("without pinpoint", () => {
    const runs = formatWaitangiTribunalReport({
      title: "Te Whanau o Waipareira Report",
      waiNumber: 414,
      year: 1998,
    });
    expect(runsToText(runs)).toBe(
      "Waitangi Tribunal Te Whanau o Waipareira Report (Wai 414, 1998)"
    );
  });

  test("starts with 'Waitangi Tribunal' as author", () => {
    const runs = formatWaitangiTribunalReport({
      title: "Test",
      waiNumber: 1,
      year: 2020,
    });
    expect(runs[0].text).toBe("Waitangi Tribunal ");
    expect(runs[0].italic).toBeUndefined();
  });
});

// =============================================================================
// 4. Legislation (legislation.ts)
// =============================================================================

describe("NZLSG Legislation — formatLegislation", () => {
  test("JSDoc example: NZ domestic with pinpoint", () => {
    const runs = formatLegislation({
      title: "Property Law Act",
      year: 2007,
      pinpoint: "s 27",
    });
    expect(runsToText(runs)).toBe("Property Law Act 2007, s 27");
  });

  test("JSDoc example: foreign legislation with jurisdiction", () => {
    const runs = formatLegislation({
      title: "Counter-Terrorism Act",
      year: 2008,
      jurisdiction: "UK",
    });
    expect(runsToText(runs)).toBe("Counter-Terrorism Act 2008 (UK)");
  });

  test("NZ domestic without pinpoint (no jurisdiction)", () => {
    const runs = formatLegislation({
      title: "Companies Act",
      year: 1993,
    });
    expect(runsToText(runs)).toBe("Companies Act 1993");
  });

  test("title is roman (not italic)", () => {
    const runs = formatLegislation({
      title: "Property Law Act",
      year: 2007,
    });
    expect(runs[0].italic).toBeUndefined();
  });

  test("foreign legislation with pinpoint", () => {
    const runs = formatLegislation({
      title: "Human Rights Act",
      year: 1998,
      jurisdiction: "UK",
      pinpoint: "s 3",
    });
    expect(runsToText(runs)).toBe("Human Rights Act 1998 (UK), s 3");
  });
});

describe("NZLSG Legislation — formatDelegatedLegislation", () => {
  test("JSDoc example: Land Transfer Regulations with pinpoint", () => {
    const runs = formatDelegatedLegislation({
      title: "Land Transfer Regulations",
      year: 2002,
      pinpoint: "reg 4",
    });
    expect(runsToText(runs)).toBe("Land Transfer Regulations 2002, reg 4");
  });

  test("delegated legislation without pinpoint", () => {
    const runs = formatDelegatedLegislation({
      title: "Resource Management Regulations",
      year: 2004,
    });
    expect(runsToText(runs)).toBe("Resource Management Regulations 2004");
  });

  test("title is roman (not italic)", () => {
    const runs = formatDelegatedLegislation({
      title: "Test Regulations",
      year: 2000,
    });
    expect(runs[0].italic).toBeUndefined();
  });
});

describe("NZLSG Legislation — formatBill", () => {
  test("JSDoc example: Trusts Bill", () => {
    const runs = formatBill({
      title: "Trusts Bill",
      billNumber: "105-2",
      pinpoint: "cl 5",
    });
    expect(runsToText(runs)).toBe("Trusts Bill (no 105-2), cl 5");
  });

  test("bill title is italic", () => {
    const runs = formatBill({
      title: "Trusts Bill",
      billNumber: "105-2",
    });
    expect(runs[0].italic).toBe(true);
  });

  test("bill without pinpoint", () => {
    const runs = formatBill({
      title: "Electoral Amendment Bill",
      billNumber: "200-1",
    });
    expect(runsToText(runs)).toBe("Electoral Amendment Bill (no 200-1)");
  });

  test("bill number in (no X-N) format", () => {
    const runs = formatBill({
      title: "Test Bill",
      billNumber: "42-3",
    });
    expect(runsToText(runs)).toContain("(no 42-3)");
  });
});

// =============================================================================
// 5. Parliamentary Materials (parliamentary.ts)
// =============================================================================

describe("NZLSG Parliamentary — formatNZPD", () => {
  test("JSDoc example: NZPD with speaker", () => {
    const runs = formatNZPD({
      date: "21 July 2009",
      volume: 656,
      page: 5531,
      speaker: "Christopher Finlayson",
    });
    expect(runsToText(runs)).toBe(
      "(21 July 2009) 656 NZPD 5531 (Christopher Finlayson)"
    );
  });

  test("NZPD without speaker", () => {
    const runs = formatNZPD({
      date: "1 March 2020",
      volume: 700,
      page: 100,
    });
    expect(runsToText(runs)).toBe("(1 March 2020) 700 NZPD 100");
  });

  test("NZPD with pinpoint", () => {
    const runs = formatNZPD({
      date: "21 July 2009",
      volume: 656,
      page: 5531,
      pinpoint: "5535",
    });
    expect(runsToText(runs)).toContain("at 5535");
  });
});

describe("NZLSG Parliamentary — formatSelectCommitteeSubmission", () => {
  test("JSDoc example: NZLS submission", () => {
    const runs = formatSelectCommitteeSubmission({
      submitter: "New Zealand Law Society",
      committee: "Justice and Electoral Committee",
      inquiryTitle: "Search and Surveillance Bill",
      date: "2009",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      'New Zealand Law Society \u201CSubmission to the Justice and Electoral Committee on the Search and Surveillance Bill\u201D (2009)'
    );
  });

  test("uses double quotation marks (U+201C/U+201D)", () => {
    const runs = formatSelectCommitteeSubmission({
      submitter: "Test",
      committee: "Test Committee",
      inquiryTitle: "Test Bill",
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201C");
    expect(text).toContain("\u201D");
  });

  test("without date", () => {
    const runs = formatSelectCommitteeSubmission({
      submitter: "Test Org",
      committee: "Finance Committee",
      inquiryTitle: "Taxation Bill",
    });
    const text = runsToText(runs);
    expect(text).not.toContain("(");
  });

  test("with pinpoint", () => {
    const runs = formatSelectCommitteeSubmission({
      submitter: "Test",
      committee: "Test Committee",
      inquiryTitle: "Test Bill",
      date: "2020",
      pinpoint: "5",
    });
    expect(runsToText(runs)).toContain("at 5");
  });
});

describe("NZLSG Parliamentary — formatCabinetDocument", () => {
  test("JSDoc example: Cabinet Office document", () => {
    const runs = formatCabinetDocument({
      title:
        "Power to Delay Commencement of the Search and Surveillance Act 2012",
      reference: "CAB Min (12) 14/11",
      date: "30 April 2012",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      'Cabinet Office \u201CPower to Delay Commencement of the Search and Surveillance Act 2012\u201D (CAB Min (12) 14/11, 30 April 2012)'
    );
  });

  test("uses double quotation marks for title", () => {
    const runs = formatCabinetDocument({
      title: "Test Title",
      reference: "REF-1",
      date: "1 Jan 2020",
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CTest Title\u201D");
  });

  test("with pinpoint", () => {
    const runs = formatCabinetDocument({
      title: "Test",
      reference: "REF-1",
      date: "1 Jan 2020",
      pinpoint: "3",
    });
    expect(runsToText(runs)).toContain("at 3");
  });

  test("starts with 'Cabinet Office' as author", () => {
    const runs = formatCabinetDocument({
      title: "Test",
      reference: "REF-1",
      date: "1 Jan 2020",
    });
    expect(runs[0].text).toBe("Cabinet Office ");
  });
});

describe("NZLSG Parliamentary — formatNZGazette", () => {
  test("JSDoc example: NZ Gazette notice", () => {
    const runs = formatNZGazette({
      title: "Notice Title",
      year: 2018,
      page: 1234,
    });
    expect(runsToText(runs)).toBe(
      '\u201CNotice Title\u201D (2018) New Zealand Gazette 1234'
    );
  });

  test("uses double quotation marks for title", () => {
    const runs = formatNZGazette({
      title: "Test",
      year: 2020,
      page: 1,
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CTest\u201D");
  });

  test("with pinpoint", () => {
    const runs = formatNZGazette({
      title: "Test",
      year: 2020,
      page: 1,
      pinpoint: "2",
    });
    expect(runsToText(runs)).toContain("at 2");
  });
});

describe("NZLSG Parliamentary — formatAJHR", () => {
  test("JSDoc example: AJHR with author", () => {
    const runs = formatAJHR({
      author: "Department of Justice",
      title: "Reform of the Law of Contempt",
      reference: "AJHR 1987 I.11",
    });
    expect(runsToText(runs)).toBe(
      "Department of Justice Reform of the Law of Contempt AJHR 1987 I.11"
    );
  });

  test("AJHR title is italic", () => {
    const runs = formatAJHR({
      author: "Test",
      title: "Test Title",
      reference: "AJHR 2020 X.1",
    });
    expect(isTextItalic(runs, "Test Title")).toBe(true);
  });

  test("AJHR without author", () => {
    const runs = formatAJHR({
      title: "Some Report",
      reference: "AJHR 2000 A.1",
    });
    expect(runsToText(runs)).toBe("Some Report AJHR 2000 A.1");
  });

  test("AJHR with pinpoint", () => {
    const runs = formatAJHR({
      author: "Test",
      title: "Test Title",
      reference: "AJHR 2020 X.1",
      pinpoint: "15",
    });
    expect(runsToText(runs)).toContain("at 15");
  });
});

// =============================================================================
// 6. Secondary Sources (secondary.ts)
// =============================================================================

describe("NZLSG Secondary — formatBook", () => {
  test("JSDoc example: Butler and Butler with edition and pinpoint", () => {
    const runs = formatBook({
      author: "Andrew Butler and Petra Butler",
      title: "The New Zealand Bill of Rights Act: A Commentary",
      edition: "2nd ed",
      publisher: "LexisNexis",
      place: "Wellington",
      year: 2015,
      pinpoint: "134",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary (2nd ed, LexisNexis, Wellington, 2015) at 134"
    );
  });

  test("book title is italic", () => {
    const runs = formatBook({
      author: "Test Author",
      title: "Test Title",
      publisher: "Publisher",
      place: "Place",
      year: 2020,
    });
    expect(isTextItalic(runs, "Test Title")).toBe(true);
  });

  test("book without edition (first edition)", () => {
    const runs = formatBook({
      author: "John Smith",
      title: "Contract Law in New Zealand",
      publisher: "Thomson Reuters",
      place: "Wellington",
      year: 2020,
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "John Smith Contract Law in New Zealand (Thomson Reuters, Wellington, 2020)"
    );
  });

  test("book without pinpoint", () => {
    const runs = formatBook({
      author: "Test",
      title: "Title",
      publisher: "Pub",
      place: "Place",
      year: 2020,
    });
    expect(runsToText(runs)).not.toContain("at");
  });

  test("'at' pinpoint prefix is used", () => {
    const runs = formatBook({
      author: "Test",
      title: "Title",
      publisher: "Pub",
      place: "Place",
      year: 2020,
      pinpoint: "42",
    });
    expect(runsToText(runs)).toContain("at 42");
  });
});

describe("NZLSG Secondary — formatJournalArticle", () => {
  test("JSDoc example: Geiringer with volume", () => {
    const runs = formatJournalArticle({
      author: "Claudia Geiringer",
      title:
        "On a Road to Nowhere: Implied Declaration of Inconsistency and the New Zealand Bill of Rights Act",
      year: 2009,
      volume: 40,
      journal: "VUWLR",
      startPage: 613,
    });
    const text = runsToText(runs);
    expect(text).toBe(
      'Claudia Geiringer \u201COn a Road to Nowhere: Implied Declaration of Inconsistency and the New Zealand Bill of Rights Act\u201D (2009) 40 VUWLR 613'
    );
  });

  test("article title uses double quotation marks (U+201C/U+201D)", () => {
    const runs = formatJournalArticle({
      author: "Test",
      title: "Test Article",
      year: 2020,
      volume: 1,
      journal: "NZLR",
      startPage: 1,
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CTest Article\u201D");
  });

  test("journal article without volume", () => {
    const runs = formatJournalArticle({
      author: "Jane Doe",
      title: "Some Topic",
      year: 2020,
      journal: "NZLJ",
      startPage: 100,
    });
    const text = runsToText(runs);
    expect(text).toBe('Jane Doe \u201CSome Topic\u201D (2020) NZLJ 100');
  });

  test("journal article with pinpoint", () => {
    const runs = formatJournalArticle({
      author: "Test",
      title: "Title",
      year: 2020,
      volume: 1,
      journal: "NZLR",
      startPage: 10,
      pinpoint: "15",
    });
    expect(runsToText(runs)).toContain("at 15");
  });
});

describe("NZLSG Secondary — formatLawCommission", () => {
  test("JSDoc example: R type report", () => {
    const runs = formatLawCommission({
      title: "Review of the Privacy Act 1993",
      reportType: "R",
      reportNumber: 123,
      year: 2011,
      pinpoint: "55",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Law Commission Review of the Privacy Act 1993 (NZLC R123, 2011) at 55"
    );
  });

  test("SP type report", () => {
    const runs = formatLawCommission({
      title: "Test Study Paper",
      reportType: "SP",
      reportNumber: 10,
      year: 2015,
    });
    expect(runsToText(runs)).toContain("NZLC SP10");
  });

  test("IP type report", () => {
    const runs = formatLawCommission({
      title: "Test Issues Paper",
      reportType: "IP",
      reportNumber: 5,
      year: 2018,
    });
    expect(runsToText(runs)).toContain("NZLC IP5");
  });

  test("PP type report", () => {
    const runs = formatLawCommission({
      title: "Preliminary Paper",
      reportType: "PP",
      reportNumber: 50,
      year: 2000,
    });
    expect(runsToText(runs)).toContain("NZLC PP50");
  });

  test("title is italic", () => {
    const runs = formatLawCommission({
      title: "Test Title",
      reportType: "R",
      reportNumber: 1,
      year: 2020,
    });
    expect(isTextItalic(runs, "Test Title")).toBe(true);
  });

  test("starts with 'Law Commission' as author", () => {
    const runs = formatLawCommission({
      title: "Test",
      reportType: "R",
      reportNumber: 1,
      year: 2020,
    });
    expect(runs[0].text).toBe("Law Commission ");
    expect(runs[0].italic).toBeUndefined();
  });

  test("without pinpoint", () => {
    const runs = formatLawCommission({
      title: "Test",
      reportType: "R",
      reportNumber: 1,
      year: 2020,
    });
    expect(runsToText(runs)).not.toContain("at");
  });
});

describe("NZLSG Secondary — formatThesis", () => {
  test("JSDoc example: LLM thesis with pinpoint", () => {
    const runs = formatThesis({
      author: "John Smith",
      title: "The Impact of Treaty Settlements",
      degree: "LLM",
      university: "Victoria University of Wellington",
      year: 2015,
      pinpoint: "45",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      'John Smith \u201CThe Impact of Treaty Settlements\u201D (LLM Thesis, Victoria University of Wellington, 2015) at 45'
    );
  });

  test("thesis title uses double quotation marks (not italic)", () => {
    const runs = formatThesis({
      author: "Test",
      title: "Test Title",
      degree: "PhD",
      university: "Auckland",
      year: 2020,
    });
    const text = runsToText(runs);
    expect(text).toContain("\u201CTest Title\u201D");
    // Should NOT be italic
    const titleRun = runs.find((r) => r.text.includes("Test Title"));
    expect(titleRun?.italic).toBeUndefined();
  });

  test("thesis without pinpoint", () => {
    const runs = formatThesis({
      author: "Test",
      title: "Title",
      degree: "PhD",
      university: "University",
      year: 2020,
    });
    expect(runsToText(runs)).not.toContain("at");
  });
});

describe("NZLSG Secondary — formatOnlineLooseleaf", () => {
  test("JSDoc example: Todd looseleaf", () => {
    const runs = formatOnlineLooseleaf({
      editor: "Stephen Todd",
      title: "The Law of Torts in New Zealand",
      publisher: "Brookers",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Stephen Todd (ed) The Law of Torts in New Zealand (online ed, Brookers)"
    );
  });

  test("looseleaf title is italic", () => {
    const runs = formatOnlineLooseleaf({
      editor: "Test",
      title: "Test Title",
      publisher: "Publisher",
    });
    expect(isTextItalic(runs, "Test Title")).toBe(true);
  });

  test("looseleaf with pinpoint", () => {
    const runs = formatOnlineLooseleaf({
      editor: "Test",
      title: "Title",
      publisher: "Publisher",
      pinpoint: "ch 5",
    });
    expect(runsToText(runs)).toContain("at ch 5");
  });

  test("editor has (ed) designation", () => {
    const runs = formatOnlineLooseleaf({
      editor: "Jane Doe",
      title: "Title",
      publisher: "Publisher",
    });
    expect(runs[0].text).toBe("Jane Doe (ed) ");
  });
});

// =============================================================================
// 7. Styles (styles.ts)
// =============================================================================

describe("NZLSG Styles — formatGeneralSubsequent", () => {
  test("JSDoc example: above n with pinpoint", () => {
    const runs = formatGeneralSubsequent({
      authorOrTitle: "Butler and Butler",
      footnoteNumber: 12,
      pinpoint: "134",
    });
    expect(runsToText(runs)).toBe(
      "Butler and Butler, above n 12, at 134"
    );
  });

  test("general subsequent without pinpoint", () => {
    const runs = formatGeneralSubsequent({
      authorOrTitle: "Smith",
      footnoteNumber: 5,
    });
    expect(runsToText(runs)).toBe("Smith, above n 5");
  });

  test("'above n' format is used (no ibid)", () => {
    const runs = formatGeneralSubsequent({
      authorOrTitle: "Test",
      footnoteNumber: 1,
    });
    expect(runsToText(runs)).toContain("above n");
  });
});

describe("NZLSG Styles — formatCommercialSubsequent", () => {
  test("JSDoc example: short-form with pinpoint", () => {
    const runs = formatCommercialSubsequent({
      authorOrTitle: "Butler and Butler",
      pinpoint: "134",
    });
    expect(runsToText(runs)).toBe("Butler and Butler at 134");
  });

  test("commercial subsequent without pinpoint", () => {
    const runs = formatCommercialSubsequent({
      authorOrTitle: "Smith",
    });
    expect(runsToText(runs)).toBe("Smith");
  });

  test("no cross-reference (no 'above n')", () => {
    const runs = formatCommercialSubsequent({
      authorOrTitle: "Test",
      pinpoint: "10",
    });
    expect(runsToText(runs)).not.toContain("above n");
  });

  test("short title overrides author", () => {
    const runs = formatCommercialSubsequent({
      authorOrTitle: "Butler and Butler",
      shortTitle: "NZBORA Commentary",
      pinpoint: "50",
    });
    expect(runsToText(runs)).toBe("NZBORA Commentary at 50");
  });

  test("short title without pinpoint", () => {
    const runs = formatCommercialSubsequent({
      authorOrTitle: "Butler and Butler",
      shortTitle: "NZBORA Commentary",
    });
    expect(runsToText(runs)).toBe("NZBORA Commentary");
  });
});

// =============================================================================
// 8. Treaty of Waitangi (treaty-of-waitangi.ts)
// =============================================================================

describe("NZLSG Treaty of Waitangi — formatTreatyOfWaitangi", () => {
  test("JSDoc example: English version art 2", () => {
    const runs = formatTreatyOfWaitangi({
      language: "english",
      article: 2,
    });
    expect(runsToText(runs)).toBe("Treaty of Waitangi art 2");
  });

  test("JSDoc example: Maori version art 3", () => {
    const runs = formatTreatyOfWaitangi({
      language: "maori",
      article: 3,
    });
    expect(runsToText(runs)).toBe("Te Tiriti o Waitangi art 3");
  });

  test("JSDoc example: English preamble", () => {
    const runs = formatTreatyOfWaitangi({
      language: "english",
      preamble: true,
    });
    expect(runsToText(runs)).toBe("Treaty of Waitangi, preamble");
  });

  test("Maori preamble", () => {
    const runs = formatTreatyOfWaitangi({
      language: "maori",
      preamble: true,
    });
    expect(runsToText(runs)).toBe("Te Tiriti o Waitangi, preamble");
  });

  test("English version without article or preamble", () => {
    const runs = formatTreatyOfWaitangi({
      language: "english",
    });
    expect(runsToText(runs)).toBe("Treaty of Waitangi");
  });

  test("Maori version without article or preamble", () => {
    const runs = formatTreatyOfWaitangi({
      language: "maori",
    });
    expect(runsToText(runs)).toBe("Te Tiriti o Waitangi");
  });

  test("article 1 (English)", () => {
    const runs = formatTreatyOfWaitangi({
      language: "english",
      article: 1,
    });
    expect(runsToText(runs)).toBe("Treaty of Waitangi art 1");
  });
});

// =============================================================================
// 9. International (international.ts)
// =============================================================================

describe("NZLSG International — formatTreaty", () => {
  test("JSDoc example: Vienna Convention", () => {
    const runs = formatTreaty({
      title: "Vienna Convention on the Law of Treaties",
      signingEvent: "opened for signature 23 May 1969",
      entryIntoForce: "entered into force 27 January 1980",
      pinpoint: "art 31",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Vienna Convention on the Law of Treaties (opened for signature 23 May 1969, entered into force 27 January 1980) at art 31"
    );
  });

  test("treaty title is italic", () => {
    const runs = formatTreaty({
      title: "Test Treaty",
    });
    expect(runs[0].italic).toBe(true);
  });

  test("treaty with parties (bilateral)", () => {
    const runs = formatTreaty({
      title: "Treaty of Commerce",
      parties: "New Zealand\u2013Australia",
    });
    expect(runsToText(runs)).toContain(
      ", New Zealand\u2013Australia"
    );
  });

  test("treaty with treaty series", () => {
    const runs = formatTreaty({
      title: "Test Treaty",
      treatySeries: "1155 UNTS 331",
    });
    expect(runsToText(runs)).toContain("1155 UNTS 331");
  });

  test("treaty with no optional fields", () => {
    const runs = formatTreaty({
      title: "Some Treaty",
    });
    expect(runsToText(runs)).toBe("Some Treaty");
  });

  test("treaty with only signing event (no entry into force)", () => {
    const runs = formatTreaty({
      title: "Test",
      signingEvent: "opened for signature 1 Jan 2000",
    });
    expect(runsToText(runs)).toBe(
      "Test (opened for signature 1 Jan 2000)"
    );
  });

  test("'at' pinpoint prefix", () => {
    const runs = formatTreaty({
      title: "Test",
      pinpoint: "art 5",
    });
    expect(runsToText(runs)).toContain("at art 5");
  });
});

describe("NZLSG International — formatUNDocument", () => {
  test("JSDoc example: UNDRIP", () => {
    const runs = formatUNDocument({
      body: "UN General Assembly",
      title:
        "United Nations Declaration on the Rights of Indigenous Peoples",
      documentSymbol: "A/RES/61/295",
      date: "2007",
      pinpoint: "art 26",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "UN General Assembly United Nations Declaration on the Rights of Indigenous Peoples A/RES/61/295 (2007) at art 26"
    );
  });

  test("UN document title is italic", () => {
    const runs = formatUNDocument({
      body: "UN Security Council",
      title: "Some Resolution",
    });
    expect(isTextItalic(runs, "Some Resolution")).toBe(true);
  });

  test("UN document without title", () => {
    const runs = formatUNDocument({
      body: "UN General Assembly",
      documentSymbol: "A/RES/1/1",
      date: "1946",
    });
    const text = runsToText(runs);
    expect(text).toBe("UN General Assembly A/RES/1/1 (1946)");
  });

  test("UN document with session", () => {
    const runs = formatUNDocument({
      body: "UN General Assembly",
      title: "Test",
      session: "61st sess",
      date: "2007",
    });
    expect(runsToText(runs)).toContain("61st sess");
  });

  test("UN document without date", () => {
    const runs = formatUNDocument({
      body: "UN General Assembly",
      title: "Test",
    });
    expect(runsToText(runs)).toBe("UN General Assembly Test");
  });
});

describe("NZLSG International — formatICJCase", () => {
  test("JSDoc example: Nuclear Tests", () => {
    const runs = formatICJCase({
      caseName: "Nuclear Tests (New Zealand v France)",
      phase: "Interim Protection",
      year: 1973,
      icjReportsPage: 135,
      pinpoint: "139",
    });
    const text = runsToText(runs);
    expect(text).toBe(
      "Nuclear Tests (New Zealand v France) (Interim Protection) [1973] ICJ Rep 135 at 139"
    );
  });

  test("ICJ case name is italic", () => {
    const runs = formatICJCase({
      caseName: "Test Case",
      year: 2020,
    });
    expect(runs[0].italic).toBe(true);
  });

  test("ICJ case without phase", () => {
    const runs = formatICJCase({
      caseName: "Test Case (A v B)",
      year: 2020,
      icjReportsPage: 100,
    });
    expect(runsToText(runs)).toBe(
      "Test Case (A v B) [2020] ICJ Rep 100"
    );
  });

  test("ICJ case without reports page", () => {
    const runs = formatICJCase({
      caseName: "Test Case",
      year: 2020,
    });
    expect(runsToText(runs)).toBe("Test Case [2020]");
  });

  test("ICJ case with phase but no reports page", () => {
    const runs = formatICJCase({
      caseName: "Test",
      phase: "Merits",
      year: 2020,
    });
    expect(runsToText(runs)).toBe("Test (Merits) [2020]");
  });

  test("'at' pinpoint prefix", () => {
    const runs = formatICJCase({
      caseName: "Test",
      year: 2020,
      icjReportsPage: 50,
      pinpoint: "55",
    });
    expect(runsToText(runs)).toContain("at 55");
  });
});

// =============================================================================
// 10. NZ Report Series Data (nz-report-series.ts)
// =============================================================================

describe("NZ Report Series Data — searchNZReportSeries", () => {
  test("search by abbreviation", () => {
    const results = searchNZReportSeries("NZLR");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.abbreviation === "NZLR")).toBe(true);
  });

  test("search by full name (case-insensitive)", () => {
    const results = searchNZReportSeries("family");
    expect(results.some((r) => r.abbreviation === "NZFLR")).toBe(true);
  });

  test("search returns empty for non-matching query", () => {
    const results = searchNZReportSeries("xxxxxxxxx");
    expect(results).toEqual([]);
  });

  test("search is case-insensitive", () => {
    const resultsUpper = searchNZReportSeries("NZLR");
    const resultsLower = searchNZReportSeries("nzlr");
    expect(resultsUpper.length).toBe(resultsLower.length);
  });
});

describe("NZ Report Series Data — getNZReportSeriesByAbbreviation", () => {
  test("exact match returns entry", () => {
    const result = getNZReportSeriesByAbbreviation("NZLR");
    expect(result).toBeDefined();
    expect(result?.fullName).toBe("New Zealand Law Reports");
    expect(result?.jurisdiction).toBe("NZ");
  });

  test("non-matching abbreviation returns undefined", () => {
    const result = getNZReportSeriesByAbbreviation("XXXXX");
    expect(result).toBeUndefined();
  });

  test("case-sensitive (lowercase does not match)", () => {
    const result = getNZReportSeriesByAbbreviation("nzlr");
    expect(result).toBeUndefined();
  });

  test("Gazette Law Reports entry", () => {
    const result = getNZReportSeriesByAbbreviation("GLR");
    expect(result).toBeDefined();
    expect(result?.type).toBe("authorised");
  });
});

describe("NZ Report Series Data — NZ_REPORT_SERIES array", () => {
  test("all entries have NZ jurisdiction", () => {
    NZ_REPORT_SERIES.forEach((entry) => {
      expect(entry.jurisdiction).toBe("NZ");
    });
  });

  test("all entries have required fields", () => {
    NZ_REPORT_SERIES.forEach((entry) => {
      expect(entry.abbreviation).toBeTruthy();
      expect(entry.fullName).toBeTruthy();
      expect(entry.type).toBeTruthy();
    });
  });
});

// =============================================================================
// 11. NZ Court Identifiers Data (nz-court-identifiers.ts)
// =============================================================================

describe("NZ Court Identifiers — searchNZCourtIdentifiers", () => {
  test("search by code", () => {
    const results = searchNZCourtIdentifiers("NZSC");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.code === "NZSC")).toBe(true);
  });

  test("search by full name (case-insensitive)", () => {
    const results = searchNZCourtIdentifiers("supreme");
    expect(results.some((r) => r.code === "NZSC")).toBe(true);
  });

  test("search returns empty for non-matching query", () => {
    const results = searchNZCourtIdentifiers("xxxxxxxxx");
    expect(results).toEqual([]);
  });
});

describe("NZ Court Identifiers — getNZCourtByCode", () => {
  test("exact match returns entry", () => {
    const result = getNZCourtByCode("NZSC");
    expect(result).toBeDefined();
    expect(result?.fullName).toBe("Supreme Court of New Zealand");
    expect(result?.level).toBe("supreme");
  });

  test("NZCA returns Court of Appeal", () => {
    const result = getNZCourtByCode("NZCA");
    expect(result).toBeDefined();
    expect(result?.fullName).toBe("Court of Appeal of New Zealand");
    expect(result?.level).toBe("court_of_appeal");
  });

  test("non-matching code returns undefined", () => {
    const result = getNZCourtByCode("XXXX");
    expect(result).toBeUndefined();
  });

  test("case-sensitive (lowercase does not match)", () => {
    const result = getNZCourtByCode("nzsc");
    expect(result).toBeUndefined();
  });
});

describe("NZ Court Identifiers — getNZCourtsByLevel", () => {
  test("supreme level returns NZSC", () => {
    const results = getNZCourtsByLevel("supreme");
    expect(results.length).toBe(1);
    expect(results[0].code).toBe("NZSC");
  });

  test("court_of_appeal level returns NZCA", () => {
    const results = getNZCourtsByLevel("court_of_appeal");
    expect(results.length).toBe(1);
    expect(results[0].code).toBe("NZCA");
  });

  test("district level returns multiple courts", () => {
    const results = getNZCourtsByLevel("district");
    expect(results.length).toBeGreaterThan(1);
    expect(results.some((r) => r.code === "NZDC")).toBe(true);
    expect(results.some((r) => r.code === "NZFC")).toBe(true);
  });

  test("tribunal level returns multiple entries", () => {
    const results = getNZCourtsByLevel("tribunal");
    expect(results.length).toBeGreaterThan(5);
  });

  test("specialist level returns specialist courts", () => {
    const results = getNZCourtsByLevel("specialist");
    expect(results.some((r) => r.code === "NZEnvC")).toBe(true);
    expect(results.some((r) => r.code === "NZEmpC")).toBe(true);
  });

  test("maori_land_court level returns MLC and MAC", () => {
    const results = getNZCourtsByLevel("maori_land_court");
    expect(results.some((r) => r.code === "NZMLC")).toBe(true);
    expect(results.some((r) => r.code === "NZMAC")).toBe(true);
  });
});

describe("NZ Court Identifiers — MAORI_LAND_COURT_BLOCKS", () => {
  test("TTK maps to Te Tai Tokerau", () => {
    expect(MAORI_LAND_COURT_BLOCKS["TTK"]).toBe("Te Tai Tokerau");
  });

  test("WHK maps to Waiariki", () => {
    expect(MAORI_LAND_COURT_BLOCKS["WHK"]).toBe("Waiariki");
  });

  test("WGN maps to Wellington district", () => {
    expect(MAORI_LAND_COURT_BLOCKS["WGN"]).toBe(
      "Te Whanganui-a-Tara (Wellington)"
    );
  });

  test("all block abbreviations are 3-letter codes", () => {
    Object.keys(MAORI_LAND_COURT_BLOCKS).forEach((key) => {
      expect(key.length).toBe(3);
    });
  });

  test("has 8 block entries", () => {
    expect(Object.keys(MAORI_LAND_COURT_BLOCKS).length).toBe(8);
  });
});

describe("NZ Court Identifiers — NZ_COURT_IDENTIFIERS array", () => {
  test("all entries have required fields", () => {
    NZ_COURT_IDENTIFIERS.forEach((entry) => {
      expect(entry.code).toBeTruthy();
      expect(entry.fullName).toBeTruthy();
      expect(entry.level).toBeTruthy();
    });
  });

  test("NZHC has neutral citation from 2003", () => {
    const hc = NZ_COURT_IDENTIFIERS.find((e) => e.code === "NZHC");
    expect(hc?.neutralCitationFrom).toBe(2003);
  });

  test("NZSC has neutral citation from 2004", () => {
    const sc = NZ_COURT_IDENTIFIERS.find((e) => e.code === "NZSC");
    expect(sc?.neutralCitationFrom).toBe(2004);
  });
});
