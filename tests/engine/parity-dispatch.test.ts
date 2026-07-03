/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * PARITY wave 2 — engine dispatch wiring tests.
 *
 * These tests exercise the full formatCitation dispatch path (not the
 * formatters directly) for behaviours wired in wave 2: PARITY-102,
 * PARITY-114 and the wave-1 handoff items. Expected strings are the
 * guide's own examples, matching the formatter-level tests pinned in
 * wave 1.
 */

import { formatCitation, getFormattedPreview, type CitationContext } from "../../src/engine/engine";
import type { Citation, SourceType, SourceData } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

function makeCitation(
  sourceType: SourceType,
  data: SourceData,
  extra: Partial<Citation> = {}
): Citation {
  return {
    id: "test-citation",
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

const toPlainText = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

const italicText = (runs: FormattedRun[]): string =>
  runs
    .filter((r) => r.italic)
    .map((r) => r.text)
    .join("");

// ─── PARITY-102(a) — short-title introduction suppression (rules 1.4.4/2.1.14/3.5) ──

describe("PARITY-102(a): short-title introductions are suppressed only on true redundancy", () => {
  test("introduces a contained legislation short title per AGLC4 ch 3 ex 29 (rule 3.5)", () => {
    const runs = formatCitation(
      makeCitation(
        "legislation.statute",
        {
          title: "Criminal Code Act",
          year: 1995,
          jurisdiction: "Cth",
          pinpoint: { type: "schedule", value: "1" },
        },
        { shortTitle: "Criminal Code" }
      )
    );
    expect(toPlainText(runs)).toBe("Criminal Code Act 1995 (Cth) sch 1 (‘Criminal Code’)");
    // The short title itself is italic; the parens/quotes are roman
    expect(italicText(runs)).toContain("Criminal Code");
  });

  test("introduces a first-party case short title per AGLC4 ex 40 (rule 2.1.14)", () => {
    const runs = formatCitation(
      makeCitation(
        "case.reported",
        {
          party1: "McGinty",
          party2: "Western Australia",
          yearType: "round",
          year: 1996,
          volume: 186,
          reportSeries: "CLR",
          startingPage: 140,
        },
        { shortTitle: "McGinty" }
      )
    );
    expect(toPlainText(runs)).toBe("McGinty v Western Australia (1996) 186 CLR 140 (‘McGinty’)");
  });

  test("suppresses the introduction only when the short title IS the whole citation", () => {
    const runs = formatCitation(
      makeCitation("custom", { customText: "Watt v R" }, { shortTitle: "Watt v R" })
    );
    expect(toPlainText(runs)).toBe("Watt v R");
  });
});

// ─── PARITY-102(b) — signals on ibid/short-form references (rules 1.4.3/1.2) ──

describe("PARITY-102(b): signals apply to subsequent references", () => {
  const ibidContext: CitationContext = {
    footnoteNumber: 2,
    isFirstCitation: false,
    isSameAsPreceding: true,
    precedingFootnoteCitationCount: 1,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "ibid",
  };

  test("produces 'See ibid' per AGLC4 ex 69 (rules 1.4.3, 1.2)", () => {
    const runs = formatCitation(
      makeCitation(
        "case.reported",
        {
          party1: "Pape",
          party2: "Commissioner of Taxation",
          yearType: "round",
          year: 2009,
          volume: 238,
          reportSeries: "CLR",
          startingPage: 1,
        },
        { signal: "See" }
      ),
      ibidContext
    );
    expect(toPlainText(runs)).toBe("See ibid");
  });

  test("'Ibid' keeps its capital when it opens the footnote (no signal)", () => {
    const runs = formatCitation(
      makeCitation("case.reported", {
        party1: "Pape",
        party2: "Commissioner of Taxation",
        yearType: "round",
        year: 2009,
        volume: 238,
        reportSeries: "CLR",
        startingPage: 1,
      }),
      ibidContext
    );
    expect(toPlainText(runs)).toBe("Ibid");
  });
});

// ─── Cases handoff — dispatchReportedCase wiring (rules 2.2.4/2.2.6/2.2.7) ──

describe("Reported-case dispatch wiring (rules 2.2.4, 2.2.6, 2.2.7)", () => {
  test("judicial officers precede the court parenthetical per AGLC4 ex 79 (rule 2.2.6)", () => {
    const runs = formatCitation(
      makeCitation("case.reported", {
        party1: "A-G (Cth)",
        party2: "The Queen",
        yearType: "round",
        year: 1957,
        volume: 95,
        reportSeries: "CLR",
        startingPage: 529,
        pinpoint: { type: "page", value: "533" },
        courtId: "Privy Council",
        judicialOfficers: [{ name: "Viscount Simonds", title: "", role: "for_the_court" }],
      })
    );
    expect(toPlainText(runs)).toBe(
      "A-G (Cth) v The Queen (1957) 95 CLR 529, 533 (Viscount Simonds for the Court) (Privy Council)"
    );
  });

  test("parallel citations are dropped in AGLC academic mode per rule 2.2.7 (ex 80)", () => {
    const runs = formatCitation(
      makeCitation("case.reported", {
        party1: "Plaintiff M68/2015",
        party2: "Minister for Immigration and Border Protection",
        yearType: "round",
        year: 2016,
        volume: 257,
        reportSeries: "CLR",
        startingPage: 42,
        parallelCitations: [
          { yearType: "round", year: 2016, volume: 327, reportSeries: "ALR", startingPage: 369 },
        ],
      })
    );
    expect(toPlainText(runs)).toBe(
      "Plaintiff M68/2015 v Minister for Immigration and Border Protection (2016) 257 CLR 42"
    );
  });

  test("unique reference passes through instead of a starting page per AGLC4 ex 67 (rule 2.2.4)", () => {
    const runs = formatCitation(
      makeCitation("case.reported", {
        party1: "Borg",
        party2: "Commissioner, Department of Corrective Services",
        yearType: "round",
        year: 2002,
        reportSeries: "EOC",
        startingPage: "¶93-198",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Borg v Commissioner, Department of Corrective Services (2002) EOC ¶93-198"
    );
  });
});

// ─── Cases handoff — 2.3.x / 2.7.x dispatch wiring ──

describe("Unreported/order/transcript dispatch wiring (rules 2.3.2, 2.3.4, 2.7.1)", () => {
  test("formats unreported decision with judges and pinpoint per AGLC4 ex 84 (rule 2.3.2)", () => {
    const runs = formatCitation(
      makeCitation("case.unreported.no_mnc", {
        party1: "Ross",
        party2: "Chambers",
        courtIdentifier: "Supreme Court of the Northern Territory",
        judges: "Kriewaldt J",
        fullDate: "5 April 1956",
        pinpoint: { type: "page", value: "77–8" },
      })
    );
    expect(toPlainText(runs)).toBe(
      "Ross v Chambers (Supreme Court of the Northern Territory, Kriewaldt J, 5 April 1956) 77–8"
    );
  });

  test("formats court order with officers and proceeding number per AGLC4 ex 88 (rule 2.3.4)", () => {
    const runs = formatCitation(
      makeCitation("case.court_order", {
        party1: "Seiko Epson Corporation",
        party2: "Calidad Pty Ltd",
        judicialOfficers: "Burley J",
        court: "Federal Court of Australia",
        proceedingNumber: "NSD1519/2004",
        orderDate: "21 December 2016",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Order of Burley J in Seiko Epson Corporation v Calidad Pty Ltd " +
        "(Federal Court of Australia, NSD1519/2004, 21 December 2016)"
    );
  });

  test("formats transcript with officers and speaker pinpoint per AGLC4 ex 116 (rule 2.7.1)", () => {
    const runs = formatCitation(
      makeCitation("case.transcript", {
        party1: "North East Solution Pty Ltd",
        party2: "Masters Home Improvement Australia Pty Ltd",
        court: "Supreme Court of Victoria",
        judicialOfficers: "Croft J",
        date: "18 May 2015",
        pinpoint: "31",
        speaker: "PJ Bick QC",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Transcript of Proceedings, " +
        "North East Solution Pty Ltd v Masters Home Improvement Australia Pty Ltd " +
        "(Supreme Court of Victoria, Croft J, 18 May 2015) 31 (PJ Bick QC)"
    );
  });
});

// ─── Legislation handoff — H3/H4/H5 dispatch wiring ──

describe("Legislation dispatch wiring (rules 3.1.6, 3.6, 3.8)", () => {
  test("legislative history is reachable through dispatch per AGLC4 fn 61 (rule 3.8)", () => {
    const runs = formatCitation(
      makeCitation("legislation.statute", {
        title: "Anti-Discrimination Act",
        year: 1977,
        jurisdiction: "NSW",
        pinpoint: { type: "section", value: "4(1)" },
        legislativeHistory: { connector: "as at", asAtDate: "28 June 1994" },
      })
    );
    expect(toPlainText(runs)).toBe("Anti-Discrimination Act 1977 (NSW) s 4(1), as at 28 June 1994");
  });

  test("definitions are reachable through dispatch per AGLC4 ex 24 (rule 3.1.6)", () => {
    const runs = formatCitation(
      makeCitation("legislation.statute", {
        title: "Property Law Act",
        year: 1958,
        jurisdiction: "Vic",
        pinpoint: { type: "section", value: "3" },
        definedTerm: "legal practitioner",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Property Law Act 1958 (Vic) s 3 (definition of ‘legal practitioner’)"
    );
  });

  test("Cth self-government Acts do not collapse to 'Australian Constitution' per AGLC4 ex 50 (rule 3.6)", () => {
    const runs = formatCitation(
      makeCitation("legislation.constitution", {
        title: "Australian Capital Territory (Self-Government) Act",
        year: 1988,
        jurisdiction: "Cth",
        pinpoint: { type: "section", value: "22(1)" },
      })
    );
    expect(toPlainText(runs)).toBe(
      "Australian Capital Territory (Self-Government) Act 1988 (Cth) s 22(1)"
    );
  });

  test("the Commonwealth Constitution itself still collapses per rule 3.6 (ex 49)", () => {
    const runs = formatCitation(
      makeCitation("legislation.constitution", {
        title: "Australian Constitution",
        jurisdiction: "Cth",
        pinpoint: { type: "section", value: "51" },
      })
    );
    expect(toPlainText(runs)).toBe("Australian Constitution s 51");
  });

  test("practice directions route through dispatch per AGLC4 ch 3 ex 78 (rule 3.9.4)", () => {
    const runs = formatCitation(
      makeCitation("legislation.quasi", {
        court: "Supreme Court of Victoria",
        designation: "Practice Note",
        identifier: "8 of 2010",
        title: "Management of Group Proceedings",
        date: "5 November 2010",
      })
    );
    expect(toPlainText(runs)).toContain(
      "Supreme Court of Victoria, Practice Note No 8 of 2010: Management of Group Proceedings"
    );
  });
});

// ─── Secondary handoff — journal/book dispatch wiring ──

describe("Journal and book dispatch wiring (rules 5.3, 5.8, 6.5)", () => {
  test("year-organised journal renders [Year] through dispatch per AGLC4 (rule 5.3)", () => {
    const runs = formatCitation(
      makeCitation("journal.article", {
        authors: [{ givenNames: "Lord", surname: "Woolf" }],
        title: "Droit Public: English Style",
        year: 1995,
        issue: "Spring",
        journal: "Public Law",
        startingPage: 57,
        pinpoint: { type: "page", value: "60" },
      })
    );
    expect(toPlainText(runs)).toBe(
      "Lord Woolf, ‘Droit Public: English Style’ [1995] (Spring) Public Law 57, 60"
    );
  });

  test("multi-part article renders (Pt N) through dispatch per AGLC4 ex 17 (rule 5.8)", () => {
    const runs = formatCitation(
      makeCitation("journal.article", {
        authors: [{ givenNames: "Jacobus", surname: "tenBroek" }],
        title:
          "California's Dual System of Family Law: Its Origin, Development, and Present Status — Part I",
        partNumber: 1,
        year: 1964,
        volume: 16,
        issue: "2",
        journal: "Stanford Law Review",
        startingPage: 257,
      })
    );
    expect(toPlainText(runs)).toBe(
      "Jacobus tenBroek, ‘California's Dual System of Family Law: Its Origin, Development, and Present Status’ (Pt 1) (1964) 16(2) Stanford Law Review 257"
    );
  });

  test("multi-volume book renders vol N through dispatch per AGLC4 (rule 6.5)", () => {
    const runs = formatCitation(
      makeCitation("book", {
        authors: [{ givenNames: "Joel", surname: "Feinberg" }],
        title: "The Moral Limits of the Criminal Law",
        publisher: "Oxford University Press",
        year: "1984–88",
        volume: 4,
        pinpoint: { type: "page", value: "45" },
      })
    );
    expect(toPlainText(runs)).toBe(
      "Joel Feinberg, The Moral Limits of the Criminal Law (Oxford University Press, 1984–88) vol 4, 45"
    );
  });
});

// ─── International handoff — dispatch wiring (chapters 8–14) ──

describe("International dispatch wiring (chapters 8-14)", () => {
  test("ICJ unreported decisions route via the General List number (rule 10.4.1, ex 30)", () => {
    const runs = formatCitation(
      makeCitation("icj.decision", {
        caseTitle: "Pulp Mills on the River Uruguay",
        parties: "Argentina v Uruguay",
        phase: "Order of 20 April 2010",
        generalListNumber: "135",
        date: "20 April 2010",
      })
    );
    const text = toPlainText(runs);
    expect(text).toContain("(International Court of Justice, General List No 135, 20 April 2010)");
    expect(text).not.toContain("ICJ Rep");
  });

  test("reported investor-state awards route per AGLC4 rule 11.2.1 (Olguín v Paraguay)", () => {
    const runs = formatCitation(
      makeCitation("arbitral.individual_state", {
        parties: "Olguín v Paraguay",
        phase: "Decision on Jurisdiction",
        year: 2000,
        volume: 6,
        reportSeries: "ICSID Rep",
        startingPage: 154,
        pinpoint: "158",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Olguín v Paraguay (Decision on Jurisdiction) (2000) 6 ICSID Rep 154, 158"
    );
  });

  test("UN party submissions route through dispatch per AGLC4 ex 41 (rule 9.3.2)", () => {
    const runs = formatCitation(
      makeCitation("un.communication", {
        author: "Human Rights Law Resource Centre",
        documentTitle:
          "Individual Communication under the Optional Protocol to the International Covenant on Civil and Political Rights — Original Communication",
        documentType: "Communication",
        committee: "Human Rights Committee",
        caseName: "Nystrom v Australia",
        date: "4 April 2007",
        pinpoint: "[77]–[103]",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Human Rights Law Resource Centre, 'Individual Communication under the " +
        "Optional Protocol to the International Covenant on Civil and Political Rights " +
        "— Original Communication', Communication to the Human Rights Committee in " +
        "Nystrom v Australia, 4 April 2007, [77]–[103]"
    );
  });

  test("unreported CJEU decisions route through dispatch per AGLC4 ex 23 (rule 14.2.3)", () => {
    const runs = formatCitation(
      makeCitation("eu.court", {
        caseName: "Huawei Technologies Co Ltd v ZTE Corporation",
        caseNumber: "C-170/13",
        ecli: "ECLI:EU:C:2015:477",
        date: "16 July 2015",
        pinpoint: "[9]",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Huawei Technologies Co Ltd v ZTE Corporation " +
        "(Court of Justice of the European Union, C-170/13, ECLI:EU:C:2015:477, 16 July 2015) [9]"
    );
  });

  test("reported ECtHR decisions route through dispatch (rule 14.3.2, ex 31)", () => {
    const runs = formatCitation(
      makeCitation("echr.decision", {
        caseName: "Bouchelkia v France",
        year: 1997,
        volume: "I",
        reportSeries: "Eur Court HR",
        startingPage: 47,
        pinpoint: "67",
      })
    );
    expect(toPlainText(runs)).toBe("Bouchelkia v France [1997] I Eur Court HR 47, 67");
  });

  test("the UN Charter is reachable through dispatch (rule 9.1)", () => {
    const runs = formatCitation(
      makeCitation("un.document", {
        title: "Charter of the United Nations",
        article: "art 2(4)",
      })
    );
    expect(toPlainText(runs)).toContain("Charter of the United Nations");
    expect(toPlainText(runs)).toContain("art 2(4)");
  });

  test("MOUs route through formatMou (rule 8.6, ex 16)", () => {
    const runs = formatCitation(
      makeCitation("treaty.mou", {
        title:
          "Memorandum of Understanding between the Republic of Nauru and the Commonwealth of Australia, Relating to the Transfer to and Assessment of Persons in Nauru, and Related Issues",
        signedDate: "3 August 2013",
      })
    );
    const text = toPlainText(runs);
    expect(text).toContain("signed 3 August 2013");
    // The descriptor parenthetical is suppressed when the title already
    // says 'Memorandum of Understanding'
    expect(text).not.toContain("(Memorandum of Understanding)");
  });
});

// ─── PARITY-114 — foreign dispatch routing (chapters 15–26) ──

describe("PARITY-114: foreign dispatch routes to per-country formatters", () => {
  test("routes a UK case from citationDetails ([2017] UKSC 5, rule 24.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "case",
        title: "R (Miller) v Secretary of State for Exiting the European Union",
        citationDetails: "[2017] UKSC 5",
      })
    );
    expect(toPlainText(runs)).toBe(
      "R (Miller) v Secretary of State for Exiting the European Union [2017] UKSC 5"
    );
    expect(italicText(runs)).toBe("R (Miller) v Secretary of State for Exiting the European Union");
  });

  test("routes a US case with reporter volume (347 US 483 (1954), rule 25.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "case",
        title: "Brown v Board of Education",
        citationDetails: "347 US 483 (1954)",
      })
    );
    const text = toPlainText(runs);
    expect(text).toContain("347 US 483");
    expect(text).toContain("1954");
    expect(italicText(runs)).toContain("Brown v Board of Education");
  });

  test("foreign legislation italicises per chapter rules (UK, rule 24.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "legislation",
        title: "Human Rights Act",
        year: 1998,
        pinpoint: "s 6",
      })
    );
    expect(toPlainText(runs)).toBe("Human Rights Act 1998 (UK) s 6");
    expect(italicText(runs)).toBe("Human Rights Act 1998");
  });

  test("generic fallback italicises legislation titles and drops the comma-prefixed pinpoint", () => {
    const runs = formatCitation(
      makeCitation("foreign.other", {
        foreignSubType: "legislation",
        title: "Some Foreign Statute",
        citationDetails: "Official Gazette No 45",
        pinpoint: "art 3",
      })
    );
    const text = toPlainText(runs);
    expect(text).toBe("Some Foreign Statute Official Gazette No 45 art 3");
    expect(text).not.toContain(", art 3");
    expect(italicText(runs)).toBe("Some Foreign Statute");
  });

  test("generic fallback keeps unparseable case details verbatim with a space-separated pinpoint", () => {
    const runs = formatCitation(
      makeCitation("foreign.france", {
        foreignSubType: "case",
        title: "Arrêt Nicolo",
        citationDetails: "Conseil d'État, 20 October 1989",
        pinpoint: "[3]",
      })
    );
    const text = toPlainText(runs);
    expect(text).toBe("Arrêt Nicolo Conseil d'État, 20 October 1989 [3]");
    expect(italicText(runs)).toBe("Arrêt Nicolo");
  });
});

// ─── PARITY wave 3 — foreign court-decision / delegated-legislation wiring ──

describe("PARITY wave 3: field-indicated foreign court-decision routing", () => {
  test("routes a French case to the court-led form per AGLC4 ch 17 ex 1 (rule 17.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.france", {
        foreignSubType: "case",
        court: "Cour de cassation",
        courtTranslation: "French Court of Cassation",
        caseNumber: "06-81968",
        date: "5 December 2006",
        reportedIn: "(2006) Bull crim nº 304, 1095",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Cour de cassation [French Court of Cassation], 06-81968, " +
        "5 December 2006 reported in (2006) Bull crim nº 304, 1095"
    );
    // The court name is roman (rule 17.1)
    expect(italicText(runs)).toBe("");
  });

  test("routes an unreported German case with a popular name per AGLC4 ch 18 ex 4 (rule 18.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.germany", {
        foreignSubType: "case",
        title: "Pumuckl",
        court: "Oberlandesgericht München",
        courtTranslation: "Munich Court of Appeal",
        caseNumber: "29 U 4743/02",
        date: "4 September 2003",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Pumuckl, Oberlandesgericht München [Munich Court of Appeal], 29 U 4743/02, 4 September 2003"
    );
    expect(italicText(runs)).toBe("Pumuckl");
  });

  test("routes an unreported Chinese judgment per AGLC4 ch 16 ex 7 (rule 16.2.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.china", {
        foreignSubType: "case",
        title: "焦其铸与重庆市信心农牧科技有限公司租赁合同纠纷案",
        translation:
          "Jiao Qizhu v Confidence Farming Technology Co Ltd of Chongqing Municipality — Lease Contract Dispute Case",
        court: "重庆市第五中级人民法院",
        courtTranslation:
          "Fifth Intermediate People's Court of Chongqing Municipality, People's Republic of China",
        caseNumber: "渝五中民终字第93号",
        caseNumberTranslation: "Economic Appeal No 93",
        date: "24 April 2008",
      })
    );
    expect(toPlainText(runs)).toBe(
      "«焦其铸与重庆市信心农牧科技有限公司租赁合同纠纷案» [Jiao Qizhu v Confidence Farming " +
        "Technology Co Ltd of Chongqing Municipality — Lease Contract Dispute Case], " +
        "重庆市第五中级人民法院 [Fifth Intermediate People's Court of Chongqing Municipality, " +
        "People's Republic of China], 渝五中民终字第93号 [Economic Appeal No 93], 24 April 2008"
    );
  });

  test("routes an unreported US case by docket number per AGLC4 ch 25 ex 26 (rule 25.1.7)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "case",
        title: "Red Hat Inc v The SCO Group Inc",
        court: "D Del",
        docketNumber: "Civ No 03-772-SLR",
        date: "6 April 2004",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Red Hat Inc v The SCO Group Inc (D Del, Civ No 03-772-SLR, 6 April 2004)"
    );
    expect(italicText(runs)).toBe("Red Hat Inc v The SCO Group Inc");
  });

  test("routes a continuously paginated slip opinion per AGLC4 ch 25 ex 28 (rule 25.1.7)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "case",
        title: "Charlesworth v Mack",
        court: "1st Cir",
        docketNumber: "No 90-567",
        date: "19 January 1991",
        slipOpStartingPage: 3458,
        slipOpPinpoint: "3464",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Charlesworth v Mack (1st Cir, No 90-567, 19 January 1991) slip op 3458, 3464"
    );
  });

  test("routes a Māori Land Court minute book per AGLC4 ch 21 ex 13 (rule 21.1.4)", () => {
    const runs = formatCitation(
      makeCitation("foreign.new_zealand", {
        foreignSubType: "case",
        title: "O'Rorke v Hohaia",
        blockName: "Pukekohatu 7B Block",
        year: 2006,
        caseNumber: 173,
        registry: "Aotea",
        startingPage: 114,
        pinpoint: "117 [12]–[13]",
        judicialOfficer: "Judge Harvey",
      })
    );
    expect(toPlainText(runs)).toBe(
      "O'Rorke v Hohaia — Pukekohatu 7B Block (2006) 173 Aotea MB 114, 117 [12]–[13] (Judge Harvey)"
    );
    expect(italicText(runs)).toBe("O'Rorke v Hohaia — Pukekohatu 7B Block");
  });

  test("routes a non-common-law decision per AGLC4 ch 26 ex 12 (rule 26.2)", () => {
    const runs = formatCitation(
      makeCitation("foreign.other", {
        foreignSubType: "case",
        court: "Corte costituzionale",
        courtTranslation: "Italian Constitutional Court",
        caseNumber: "No 239",
        date: "29 December 1982",
        reportedIn: "[1983] I Il Foro Italiano: Raccolta Generale di Giurisprudenza 2",
        pinpoint: "4–5",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Corte costituzionale [Italian Constitutional Court], No 239, 29 December 1982 " +
        "reported in [1983] I Il Foro Italiano: Raccolta Generale di Giurisprudenza 2, 4–5"
    );
  });

  test("appends UK judicial officers after the pinpoint per AGLC4 ch 24 ex 25 (rule 24.1.6)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "case",
        title: "Ivey v Genting Casinos (UK) Ltd",
        citationDetails: "[2017] 3 WLR 1212",
        pinpoint: "1215–19 [2]–[27]",
        judicialOfficers:
          "Lord Hughes JSC, Baroness Hale PSC, Lords Kerr JSC, Neuberger and Thomas agreeing",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Ivey v Genting Casinos (UK) Ltd [2017] 3 WLR 1212, 1215–19 [2]–[27] " +
        "(Lord Hughes JSC, Baroness Hale PSC, Lords Kerr JSC, Neuberger and Thomas agreeing)"
    );
  });

  test("groups structured UK officers with plural titles per the rule 24.1.6 example band", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "case",
        title: "Ivey v Genting Casinos (UK) Ltd",
        citationDetails: "[2017] 3 WLR 1212",
        pinpoint: "1215",
        judicialOfficers: [
          { name: "James", title: "LJ" },
          { name: "Baggallay", title: "LJ" },
          { name: "Bramwell", title: "LJ" },
        ],
      })
    );
    // Officers fragment from the rule 24.1.6 example band
    expect(toPlainText(runs)).toContain("(James, Baggallay and Bramwell LJJ)");
  });
});

describe("PARITY wave 3: foreign delegated legislation and constitutions", () => {
  test("routes a revised Canadian regulation per AGLC4 ch 15 ex 17 (rule 15.4.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.canada", {
        foreignSubType: "legislation",
        title: "Maple Products Regulations",
        regulationCitation: "CRC, c 289",
        pinpoint: "s 9",
      })
    );
    expect(toPlainText(runs)).toBe("Maple Products Regulations, CRC, c 289, s 9");
    expect(italicText(runs)).toBe("Maple Products Regulations");
  });

  test("routes an unrevised federal regulation from citationDetails per AGLC4 ch 15 ex 19 (rule 15.4.2)", () => {
    const runs = formatCitation(
      makeCitation("foreign.canada", {
        foreignSubType: "legislation",
        title: "Regulations Amending the Food and Drug Regulations",
        citationDetails: "SOR/98-580",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Regulations Amending the Food and Drug Regulations, SOR/98-580"
    );
  });

  test("routes the Charter fixed form per AGLC4 rule 15.3.1", () => {
    const runs = formatCitation(
      makeCitation("foreign.canada", {
        foreignSubType: "constitution",
        constitutionInstrument: "charter",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Canada Act 1982 (UK) c 11, sch B pt I ('Canadian Charter of Rights and Freedoms')"
    );
  });

  test("routes a Chinese legislative act per AGLC4 ch 16 ex 8 (rule 16.3.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.china", {
        foreignSubType: "legislation",
        title: "中华人民共和国合同法",
        translation: "Contract Law of the People's Republic of China",
        jurisdiction: "People's Republic of China",
        promulgatingBody: "National People's Congress",
        instrumentNumber: "Order No 15",
        promulgationDate: "15 March 1999",
      })
    );
    expect(toPlainText(runs)).toBe(
      "«中华人民共和国合同法» [Contract Law of the People's Republic of China] " +
        "(People's Republic of China) National People's Congress, Order No 15, 15 March 1999"
    );
  });

  test("routes the PRC Constitution per AGLC4 ch 16 ex 13 (rule 16.3.2)", () => {
    const runs = formatCitation(
      makeCitation("foreign.china", {
        foreignSubType: "constitution",
        title: "中华人民共和国宪法",
        translation: "Constitution of the People's Republic of China",
        pinpoint: "art 3",
      })
    );
    expect(toPlainText(runs)).toBe(
      "«中华人民共和国宪法» [Constitution of the People's Republic of China] art 3"
    );
  });

  test("builds a UK regnal year from structured fields per AGLC4 ch 24 ex 36 (rule 24.2.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "legislation",
        title: "Workmen's Compensation Act",
        year: 1906,
        yearsOfReign: "6",
        monarch: "Edward",
        regnalNumber: 7,
        chapter: "c 58",
      })
    );
    expect(toPlainText(runs)).toBe("Workmen's Compensation Act 1906, 6 Edw 7, c 58");
    expect(italicText(runs)).toBe("Workmen's Compensation Act 1906");
  });

  test("defaults UK 1890–1947 instruments to 'SR & O' per AGLC4 ch 24 ex 40 (rule 24.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "legislation",
        title: "Aden Colony Order",
        year: 1936,
        siNumber: "1031",
      })
    );
    expect(toPlainText(runs)).toBe("Aden Colony Order 1936 (UK) SR & O 1936/1031");
  });

  test("comma-prefixes SI pinpoints per AGLC4 ch 24 ex 44 (rule 24.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "legislation",
        title: "Magistrates' Courts (International Criminal Court) (Forms) Rules",
        year: 2001,
        siNumber: "2600",
        pinpoint: "r 4",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Magistrates' Courts (International Criminal Court) (Forms) Rules 2001 (UK) SI 2001/2600, r 4"
    );
  });

  test("routes a US state constitution per AGLC4 ch 25 ex 77 (rule 25.4)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "constitution",
        title: "Texas Constitution",
        article: "1",
        section: "8",
      })
    );
    expect(toPlainText(runs)).toBe("Texas Constitution art 1 § 8");
    expect(italicText(runs)).toBe("Texas Constitution");
  });

  test("routes the federal Constitution per AGLC4 ch 25 ex 75 (rule 25.4)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "constitution",
        title: "United States Constitution",
        article: "IV",
        section: "3",
      })
    );
    expect(toPlainText(runs)).toBe("United States Constitution art IV § 3");
  });

  test("routes a titled CFR regulation per AGLC4 ch 25 ex 79 (rule 25.5.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "legislation",
        title: "Whaling Provisions",
        cfrTitle: 50,
        cfrSection: "230",
        year: 2009,
      })
    );
    expect(toPlainText(runs)).toBe("Whaling Provisions, 50 CFR § 230 (2009)");
    expect(italicText(runs)).toBe("Whaling Provisions");
  });

  test("routes a Federal Register citation per AGLC4 ch 25 ex 80 (rule 25.5.1)", () => {
    // PARITY-121: a titled instrument needs an explicit Fed Reg signal
    // (foreignSubType or fedRegVolume) — generic volume/page/date fields
    // alone no longer misroute titled non-Fed-Reg instruments here.
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "federal_register",
        title: "Enhancing Airline Passenger Protections",
        volume: 74,
        startingPage: 68983,
        pinpoint: "68985",
        date: "30 December 2009",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Enhancing Airline Passenger Protections, 74 Fed Reg 68983, 68985 (30 December 2009)"
    );
    expect(italicText(runs)).toBe("Enhancing Airline Passenger Protections");
  });

  test("emits rule 26.3 other-information and the final [tr author] marker per AGLC4 ch 26 ex 1 (rule 26.1.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.other", {
        foreignSubType: "legislation",
        title: "Urheberrechtsgesetz",
        translatedTitle: "Copyright Law",
        jurisdiction: "Switzerland",
        otherInformation: "9 October 1992, SR 231.1",
        pinpoint: "art 29(2)(a)",
        translator: "author",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Urheberrechtsgesetz [Copyright Law] (Switzerland) 9 October 1992, SR 231.1, " +
        "art 29(2)(a) [tr author]"
    );
    expect(italicText(runs)).toBe("Urheberrechtsgesetz");
  });
});

describe("PARITY wave 3: foreign secondary-source routing", () => {
  test("routes a bound Congressional Record debate per AGLC4 ch 25 ex 83 (rule 25.6.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "secondary",
        volume: 1,
        page: "10",
        year: 1874,
        speaker: "James Garfield",
        chamber: "House of Representatives",
      })
    );
    expect(toPlainText(runs)).toBe(
      "1 Congressional Record 10 (James Garfield) (1874, House of Representatives)"
    );
    expect(italicText(runs)).toBe("Congressional Record");
  });

  test("routes a Daily Edition Congressional Record debate per AGLC4 ch 25 ex 84 (rule 25.6.1)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "secondary",
        volume: 156,
        page: "H148",
        year: 2010,
        speaker: "Ann Kirkpatrick",
        edition: "daily",
        date: "19 January 2010",
      })
    );
    expect(toPlainText(runs)).toBe(
      "156 Congressional Record H148 (Ann Kirkpatrick) (daily ed, 19 January 2010)"
    );
  });

  test("routes a Restatement per AGLC4 ch 25 ex 90 (rule 25.7)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "secondary",
        subject: "Contracts",
        edition: "Second",
        section: "176",
        year: 1981,
      })
    );
    expect(toPlainText(runs)).toBe(
      "American Law Institute, Restatement (Second) of Contracts (1981) § 176"
    );
    expect(italicText(runs)).toBe("Restatement (Second) of Contracts");
  });

  test("routes a TRC report as a chapter 6 book per AGLC4 ch 23 ex 11 (rule 23.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.south_africa", {
        foreignSubType: "trc_report",
        title: "Report",
        years: "1998–2003",
        volume: 3,
        pinpoint: "155",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Truth and Reconciliation Commission of South Africa, Report (1998–2003) vol 3, 155"
    );
    expect(italicText(runs)).toBe("Report");
  });
});

// ─── Secondary handoff — chapter 7 dispatch wiring spot checks ──

describe("Chapter 7 dispatch wiring", () => {
  test("royal commission reports render without an author (rule 7.1.3)", () => {
    const runs = formatCitation(
      makeCitation("report.royal_commission", {
        title: "Royal Commission into the Building and Construction Industry: Final Report",
        author: "Commissioner Cole",
        documentType: "Final Report",
        date: "February 2003",
        volume: 1,
      })
    );
    const text = toPlainText(runs);
    expect(text).not.toContain("Commissioner Cole");
    expect(text).toContain("(Final Report, February 2003)");
  });

  test("periodical date parenthetical precedes the italic periodical name (rule 7.11.3, ex 89)", () => {
    const runs = formatCitation(
      makeCitation("periodical", {
        author: "Frank Riley",
        title: "High Court Overturns Double Jeopardy Rules",
        periodicalName: "Law Society Journal",
        datePeriod: "November 2019",
        page: "20",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Frank Riley, ‘High Court Overturns Double Jeopardy Rules’ (November 2019) Law Society Journal 20"
    );
  });

  test("editorials route to formatEditorial (rule 7.11.4)", () => {
    const runs = formatCitation(
      makeCitation("newspaper", {
        isEditorial: true,
        title: "A Nation's Shame",
        newspaper: "The Age",
        place: "Melbourne",
        date: "15 August 2017",
        page: "18",
      })
    );
    expect(toPlainText(runs)).toContain("Editorial");
  });

  test("podcasts route to formatPodcast (rule 7.14.4)", () => {
    const runs = formatCitation(
      makeCitation("film_tv_media", {
        medium: "Podcast",
        episodeTitle: "The Broncos Broke My Heart",
        seriesTitle: "The Grade Cricketer",
        producer: "Bugle Podcasts",
        date: "5 June 2019",
        url: "https://example.com",
      })
    );
    const text = toPlainText(runs);
    expect(text).toContain("The Grade Cricketer");
    expect(text).toContain("Bugle Podcasts");
    expect(text).not.toContain("Directed by");
  });

  test("films render without 'Directed by' (rule 7.14.1)", () => {
    const runs = formatCitation(
      makeCitation("film_tv_media", {
        medium: "Film",
        title: "The Castle",
        productionCompany: "Working Dog Productions",
        year: 1997,
      })
    );
    const text = toPlainText(runs);
    expect(text).not.toContain("Directed by");
    expect(text).toContain("Working Dog Productions");
  });
});

// ─── DECISION-019 — book.ebook renders as an ordinary book (rules 6.1–6.5) ──

describe("DECISION-019: book.ebook renders as a rule 6.1–6.5 book", () => {
  test("formats an ebook exactly as a book, appending the URL (rules 6.1–6.5)", () => {
    // Book form per the AGLC4 ch 6 table: Malcolm N Shaw, International Law
    // (Cambridge University Press, 7th ed, 2014) 578 — with <URL> appended.
    const runs = formatCitation(
      makeCitation("book.ebook", {
        authors: [{ givenNames: "Malcolm N", surname: "Shaw" }],
        title: "International Law",
        publisher: "Cambridge University Press",
        edition: 7,
        year: 2014,
        pinpoint: { type: "page", value: "578" },
        url: "https://www.cambridge.org/core/books/international-law",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Malcolm N Shaw, International Law (Cambridge University Press, 7th ed, 2014) 578 <https://www.cambridge.org/core/books/international-law>"
    );
    expect(italicText(runs)).toBe("International Law");
  });

  test("emits no '[Platform]' bracket even when a platform value is stored", () => {
    const runs = formatCitation(
      makeCitation("book.ebook", {
        authors: [{ givenNames: "Ralph H", surname: "Folsom" }],
        title: "Principles of European Union Law",
        publisher: "Thomson West",
        year: 2005,
        platform: "Kindle",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Ralph H Folsom, Principles of European Union Law (Thomson West, 2005)"
    );
  });
});

// ─── BUG-001 — '&'/'and' party names through the full dispatch path (rule 2.1.1) ──

describe("BUG-001: dispatch never truncates party names containing '&' / 'and'", () => {
  // Raw form-style data: the reported-case form stores its inputs as
  // strings (party1/party2/yearType/year/volume/reportSeries/startingPage).
  const smithFormData: SourceData = {
    party1: "Smith",
    party2: "Land & House Property Corporation",
    yearType: "round",
    year: "1884",
    volume: "28",
    reportSeries: "Ch D",
    startingPage: "7",
  };

  test("formats the field-reported citation end-to-end from raw form data (case.reported, rules 2.1.1/2.2)", () => {
    const runs = getFormattedPreview(makeCitation("case.reported", smithFormData));
    expect(toPlainText(runs)).toBe("Smith v Land & House Property Corporation (1884) 28 Ch D 7.");
    expect(italicText(runs)).toBe("Smith v Land & House Property Corporation");
  });

  test("'and' variant is never truncated (case.reported, rules 2.1.1/2.1.2)", () => {
    const runs = getFormattedPreview(
      makeCitation("case.reported", {
        ...smithFormData,
        party2: "Land and House Property Corporation",
      })
    );
    expect(toPlainText(runs)).toBe("Smith v Land and House Property Corporation (1884) 28 Ch D 7.");
  });

  test("UI flow with the suggested short title introduces (‘Smith’) whole (rules 2.1.14/1.4.4)", () => {
    // The insert form auto-suggests shortTitle = party1 ('Smith'); the
    // refresher renders the actual footnote via formatCitation (which
    // appends the rule 1.4.4 introduction) and adds the closing stop.
    const runs = formatCitation(
      makeCitation("case.reported", smithFormData, { shortTitle: "Smith" })
    );
    expect(toPlainText(runs)).toBe(
      "Smith v Land & House Property Corporation (1884) 28 Ch D 7 (‘Smith’)"
    );
  });

  test("subsequent reference uses the first-named party short form (rules 2.1.14/1.4.1)", () => {
    const runs = formatCitation(
      makeCitation("case.reported", smithFormData, { shortTitle: "Smith" }),
      {
        footnoteNumber: 12,
        isFirstCitation: false,
        isSameAsPreceding: false,
        precedingFootnoteCitationCount: 1,
        firstFootnoteNumber: 4,
        isWithinSameFootnote: false,
        formatPreference: "auto",
      }
    );
    expect(toPlainText(runs)).toBe("Smith (n 4)");
  });

  test("'&' survives inside a longer short title in subsequent references (rule 1.4.1)", () => {
    const runs = formatCitation(
      makeCitation(
        "case.reported",
        {
          party1: "Popovic",
          party2: "Herald & Weekly Times Ltd",
          yearType: "round",
          year: "2002",
          reportSeries: "VSC",
          startingPage: "174",
        },
        { shortTitle: "Herald & Weekly Times" }
      ),
      {
        footnoteNumber: 9,
        isFirstCitation: false,
        isSameAsPreceding: false,
        precedingFootnoteCitationCount: 1,
        firstFootnoteNumber: 2,
        isWithinSameFootnote: false,
        formatPreference: "auto",
      }
    );
    expect(toPlainText(runs)).toBe("Herald & Weekly Times (n 2)");
  });

  test("same case dispatched as a foreign UK case keeps the '&' party whole (rule 24.1.2, Ch D)", () => {
    // The UK form stores the whole case name plus free-text citation
    // details; the historical round-bracket Ch D pattern must parse.
    const runs = getFormattedPreview(
      makeCitation("foreign.uk", {
        foreignSubType: "case",
        title: "Smith v Land & House Property Corporation",
        citationDetails: "(1884) 28 Ch D 7",
      })
    );
    expect(toPlainText(runs)).toBe("Smith v Land & House Property Corporation (1884) 28 Ch D 7.");
    expect(italicText(runs)).toBe("Smith v Land & House Property Corporation");
  });
});

// ─── PARITY-121 — deferred-leftovers dispatch wiring ─────────────────────────

describe("PARITY-121: ordinal report series parse from citationDetails (rule 15.1.2)", () => {
  test("formats a Canadian DLR (4th) case per AGLC4 ch 15 ex 5 (rule 15.1.2)", () => {
    const runs = formatCitation(
      makeCitation("foreign.canada", {
        foreignSubType: "case",
        title: "Bangoura v Washington Post",
        citationDetails: "(2005) 258 DLR (4th) 341",
        court: "Ontario Court of Appeal",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Bangoura v Washington Post (2005) 258 DLR (4th) 341 (Ontario Court of Appeal)"
    );
    expect(italicText(runs)).toBe("Bangoura v Washington Post");
  });

  test("parses an ordinal US reporter ('985 F 2d 500 (1993)', rule 25.1.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "case",
        title: "Moore v Regents of the University of California",
        citationDetails: "985 F 2d 500 (1993)",
      })
    );
    const text = toPlainText(runs);
    expect(text).toContain("985 F 2d 500");
    expect(text).toContain("(1993)");
  });

  test("Canadian unreported neutral form keeps the rule 2.3 square-bracket year (rules 15.1.1-15.1.2)", () => {
    // Rule 15.1.2 note band (PDF p.236): 'Unreported decisions should be
    // cited in accordance with rule 2.3' — the rule 2.3.1 MNC form takes
    // a square-bracket year, so a bare Canadian neutral citation is
    // normalised to it (the bracket-less native form is not an AGLC4 form).
    const runs = formatCitation(
      makeCitation("foreign.canada", {
        foreignSubType: "case",
        title: "Garcia v Canada (Attorney General)",
        citationDetails: "2018 FCA 153",
      })
    );
    expect(toPlainText(runs)).toBe("Garcia v Canada (Attorney General) [2018] FCA 153");
  });
});

describe("PARITY-121: Federal Register title guard (rule 25.5.1)", () => {
  test("routes via the explicit fedRegVolume field without a foreignSubType", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "legislation",
        title: "Enhancing Airline Passenger Protections",
        fedRegVolume: 74,
        startingPage: 68983,
        date: "30 December 2009",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Enhancing Airline Passenger Protections, 74 Fed Reg 68983 (30 December 2009)"
    );
  });

  test("a title-less volume/page/date instrument still reaches the Fed Reg form", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "legislation",
        volume: 74,
        startingPage: 68983,
        date: "30 December 2009",
      })
    );
    expect(toPlainText(runs)).toBe("74 Fed Reg 68983 (30 December 2009)");
  });

  test("a titled instrument with generic volume/page/date but no Fed Reg signal does not misroute", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "legislation",
        title: "Some State Instrument",
        volume: 74,
        startingPage: 68983,
        date: "30 December 2009",
      })
    );
    expect(toPlainText(runs)).not.toContain("Fed Reg");
  });
});

describe("PARITY-121: un.charter source type (rule 9.1)", () => {
  test("formats the Charter with an article per AGLC4 ch 9 ex 1 (rule 9.1)", () => {
    const runs = formatCitation(makeCitation("un.charter", { article: "51" }));
    expect(toPlainText(runs)).toBe("Charter of the United Nations art 51");
    expect(italicText(runs)).toBe("Charter of the United Nations");
  });

  test("formats the Charter without a pinpoint (rule 9.1)", () => {
    const runs = formatCitation(makeCitation("un.charter", {}));
    expect(toPlainText(runs)).toBe("Charter of the United Nations");
  });

  test("legacy un.document isCharter path still renders the rule 9.1 form", () => {
    const runs = formatCitation(makeCitation("un.document", { isCharter: true, article: "2(4)" }));
    expect(toPlainText(runs)).toBe("Charter of the United Nations art 2(4)");
  });
});

describe("PARITY-121: Maori Land Court minute-book dataset lookup (rule 21.1.4)", () => {
  test("resolves a full minute-book name to its abbreviation per the rule 21.1.4 table", () => {
    const runs = formatCitation(
      makeCitation("foreign.new_zealand", {
        foreignSubType: "case",
        title: "Taipari v Hauraki Maori Trust Board",
        year: 2008,
        caseNumber: 114,
        registry: "Hauraki",
        startingPage: 34,
        minuteBook: "Appellate Court Minute Book",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Taipari v Hauraki Maori Trust Board (2008) 114 Hauraki ACMB 34"
    );
  });

  test("formats a minute-book decision per AGLC4 ch 21 ex 14 (rule 21.1.4, default MB)", () => {
    const runs = formatCitation(
      makeCitation("foreign.new_zealand", {
        foreignSubType: "case",
        title: "Taipari v Hauraki Maori Trust Board",
        year: 2008,
        caseNumber: 114,
        registry: "Hauraki",
        startingPage: 34,
      })
    );
    expect(toPlainText(runs)).toBe("Taipari v Hauraki Maori Trust Board (2008) 114 Hauraki MB 34");
    expect(italicText(runs)).toBe("Taipari v Hauraki Maori Trust Board");
  });

  test("an unrecognised minute-book value falls back to 'MB' rather than rendering verbatim", () => {
    const runs = formatCitation(
      makeCitation("foreign.new_zealand", {
        foreignSubType: "case",
        title: "Taipari v Hauraki Maori Trust Board",
        year: 2008,
        caseNumber: 114,
        registry: "Hauraki",
        startingPage: 34,
        minuteBook: "Some Unknown Book",
      })
    );
    expect(toPlainText(runs)).toBe("Taipari v Hauraki Maori Trust Board (2008) 114 Hauraki MB 34");
  });
});

// ─── RE-AUDIT closure: engine dispatch passthroughs (final mop-up) ──────────

describe("RE-AUDIT closure: dispatch passthroughs to the wave formatters", () => {
  test("dispatches a multi-organ UN document per AGLC4 ch 9 ex 37 (rule 9.2.14)", () => {
    const runs = formatCitation(
      makeCitation("un.document", {
        title:
          "Letter Dated 5 November 2001 from the Chargé d’affaires ai of the Permanent " +
          "Mission of the Syrian Arab Republic to the United Nations Addressed to the " +
          "Secretary-General",
        officialRecords: "UN GAOR",
        session: "56th sess",
        agendaItem: "42, 88 and 166",
        parallelOfficialRecords: "UN SCOR, 56th sess",
        documentNumber: "A/56/601 and S/2001/1045",
        date: "5 November 2001",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Letter Dated 5 November 2001 from the Chargé d’affaires ai of the Permanent " +
        "Mission of the Syrian Arab Republic to the United Nations Addressed to the " +
        "Secretary-General, UN GAOR, 56th sess, Agenda Items 42, 88 and 166; " +
        "UN SCOR, 56th sess, UN Docs A/56/601 and S/2001/1045 (5 November 2001)"
    );
  });

  test("dispatches a PCIJ ser C pleading per AGLC4 ch 10 ex 28 (rule 10.3)", () => {
    const runs = formatCitation(
      makeCitation("icj.pleading", {
        documentTitle: "Speech by Dr Budding",
        caseName: "Rights of Minorities in Upper Silesia",
        parties: "Germany v Poland",
        year: 1928,
        pcijSeriesNumber: "14",
        pcijPart: "II",
        page: 20,
        pinpoint: "25–7",
      })
    );
    expect(toPlainText(runs)).toBe(
      "'Speech by Dr Budding', Rights of Minorities in Upper Silesia (Germany v Poland) " +
        "[1928] PCIJ (ser C) No 14 pt II, 20, 25–7"
    );
    expect(italicText(runs)).toContain("Rights of Minorities in Upper Silesia");
  });

  test("dispatches ICC rules per AGLC4 ch 12 ex 6 (rule 12.1.2, adopted-date signal)", () => {
    const runs = formatCitation(
      makeCitation("icc_tribunal.case", {
        court: "International Criminal Court",
        title: "Rules of Procedure and Evidence",
        documentNumber: "ICC-ASP/1/3",
        adoptedDate: "9 September 2002",
        pinpoint: "r 74",
      })
    );
    expect(toPlainText(runs)).toBe(
      "International Criminal Court, Rules of Procedure and Evidence, " +
        "Doc No ICC-ASP/1/3 (adopted 9 September 2002) r 74"
    );
    expect(italicText(runs)).toBe("Rules of Procedure and Evidence");
  });

  test("dispatches ECCC internal rules per AGLC4 ch 12 ex 8 (rule 12.1.2, documentType signal)", () => {
    const runs = formatCitation(
      makeCitation("icc_tribunal.case", {
        court: "Extraordinary Chambers in the Courts of Cambodia",
        title: "Internal Rules",
        documentType: "rules",
        date: "16 January 2015",
        pinpoint: "r 6",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Extraordinary Chambers in the Courts of Cambodia, Internal Rules " +
        "(adopted 16 January 2015) r 6"
    );
  });

  test("dispatches supranational rules of procedure per AGLC4 ch 14 ex 41 (rule 14.4.3)", () => {
    const runs = formatCitation(
      makeCitation("supranational.decision", {
        court: "African Court on Human and Peoples' Rights",
        title: "Rules of Court",
        adoptedDate: "2 June 2010",
        pinpoint: "r 3(1)",
      })
    );
    expect(toPlainText(runs)).toBe(
      "African Court on Human and Peoples' Rights, Rules of Court (adopted 2 June 2010) r 3(1)"
    );
    expect(italicText(runs)).toBe("Rules of Court");
  });

  test("dispatches a supranational pleading per AGLC4 ch 14 ex 43 (rule 14.4.4, template comma per DECISION-012)", () => {
    const runs = formatCitation(
      makeCitation("supranational.decision", {
        documentTitle:
          "Preliminary Objection by the Government of the Republic of Trinidad and Tobago",
        caseName: "Constantine v Trinidad and Tobago",
        court: "Inter-American Court of Human Rights",
        caseNumber: "Series C No 82",
        date: "1 September 2001",
      })
    );
    expect(toPlainText(runs)).toBe(
      "'Preliminary Objection by the Government of the Republic of Trinidad and Tobago', " +
        "Constantine v Trinidad and Tobago " +
        "(Inter-American Court of Human Rights, Series C No 82, 1 September 2001)"
    );
    expect(italicText(runs)).toBe("Constantine v Trinidad and Tobago");
  });

  test("dispatches a UK parliamentary paper per AGLC4 ch 24 ex 50 (rule 24.4.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "secondary",
        author: "National Audit Office",
        title: "Regenerating the English Coalfields",
        paperNumber: "House of Commons Paper No 84",
        session: "2009–10",
        pinpoint: "11",
      })
    );
    expect(toPlainText(runs)).toBe(
      "National Audit Office, Regenerating the English Coalfields " +
        "(House of Commons Paper No 84, Session 2009–10) 11"
    );
    expect(italicText(runs)).toBe("Regenerating the English Coalfields");
  });

  test("dispatches a both-Houses parliamentary paper per AGLC4 ch 24 ex 51 (rule 24.4.3)", () => {
    const runs = formatCitation(
      makeCitation("foreign.uk", {
        foreignSubType: "secondary",
        author: "Joint Committee on Human Rights",
        title: "Prisoner Transfer Treaty with Libya",
        paperNumber: "House of Lords Paper No 71",
        paperNumber2: "House of Commons Paper No 398",
        session: "2008–09",
        pinpoint: "5",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Joint Committee on Human Rights, Prisoner Transfer Treaty with Libya " +
        "(House of Lords Paper No 71, House of Commons Paper No 398, Session 2008–09) 5"
    );
  });

  test("dispatches a reported US case with judge per AGLC4 ch 25 ex 29 (rule 25.1.8)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "case",
        caseTitle: "Re Gault",
        volume: "387",
        reportSeries: "US",
        startingPage: "1",
        year: "1967",
        yearType: "round",
        pinpoint: "13–14, 27–8",
        judge: "Fortas J",
      })
    );
    expect(toPlainText(runs)).toBe("Re Gault, 387 US 1, 13–14, 27–8 (Fortas J) (1967)");
    expect(italicText(runs)).toBe("Re Gault");
  });

  test("dispatches an unreported US case with judge per AGLC4 ch 25 ex 30 fields (rules 25.1.7-25.1.8)", () => {
    const runs = formatCitation(
      makeCitation("foreign.usa", {
        foreignSubType: "case",
        caseTitle: "City of Birmingham v Citigroup Inc",
        court: "ND Ala",
        docketNumber: "No CV-09-BE-467-S",
        date: "19 August 2009",
        slipOpPinpoint: "3",
        judge: "Bowdre J",
      })
    );
    // Ex 30 omits 'slip op', contradicting rule 25.1.7's template; the rule
    // text governs per DECISION-012 (matches the formatter-level test).
    expect(toPlainText(runs)).toBe(
      "City of Birmingham v Citigroup Inc (ND Ala, No CV-09-BE-467-S, 19 August 2009) " +
        "slip op 3 (Bowdre J)"
    );
  });

  test("dispatches foreign legislation with a published translation per AGLC4 ch 26 ex 4 (rule 26.1.2)", () => {
    const runs = formatCitation(
      makeCitation("foreign.other", {
        foreignSubType: "legislation",
        title: "Civil Code",
        jurisdiction: "France",
        publishedTranslation: "John H Crabb, The French Civil Code (Rothman, rev ed, 1995)",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Civil Code (France) [tr John H Crabb, The French Civil Code (Rothman, rev ed, 1995)]"
    );
  });

  test("dispatches a foreign decision with a published translation per AGLC4 ch 26 ex 7 (rule 26.1.2)", () => {
    const runs = formatCitation(
      makeCitation("foreign.other", {
        foreignSubType: "case",
        caseTitle: "Jand'heur I",
        court: "French Court of Cassation",
        date: "21 February 1927",
        publishedTranslation:
          "Edward A Tomlinson, 'Tort Liability in France for the Act of Things: " +
          "A Study of Judicial Lawmaking' (1988) 48 Louisiana Law Review 1299, 1366",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Jand'heur I, French Court of Cassation, 21 February 1927 " +
        "[tr Edward A Tomlinson, 'Tort Liability in France for the Act of Things: " +
        "A Study of Judicial Lawmaking' (1988) 48 Louisiana Law Review 1299, 1366]"
    );
  });
});

// ─── Rule 26.4 + PARITY-121 secondary dispatch wiring (final mop-up) ────────

describe("Rule 26.4 and PARITY-121: secondary dispatch wiring", () => {
  test("dispatches a non-English book with a title translation per AGLC4 ch 26 ex 21 (rule 26.4)", () => {
    const runs = formatCitation(
      makeCitation("book", {
        authors: [{ givenNames: "Jürgen", surname: "Schwarze" }],
        title: "Der Reformvertrag von Lissabon",
        translatedTitle: "The Reform Treaty of Lisbon",
        publisher: "Nomos",
        year: "2009",
        pinpoint: "181",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Jürgen Schwarze, Der Reformvertrag von Lissabon [The Reform Treaty of Lisbon] " +
        "(Nomos, 2009) 181"
    );
    expect(italicText(runs)).toBe("Der Reformvertrag von Lissabon");
  });

  test("dispatches a non-English blog post with element translations per AGLC4 ch 26 ex 22 (rule 26.4)", () => {
    // The guide's example ends ', archived at <perma link>'; the formatter
    // carries no archive element (matching the rule 7.15 ex 113 test), so
    // the assertion stops at the URL.
    const runs = formatCitation(
      makeCitation("internet_material", {
        title: "Quelques Vices de Procédure",
        translatedTitle: "Some Procedural Flaws",
        websiteName: "Le Blog du Droit Européen des Brevets",
        translatedWebsiteName: "Blog of European Patent Law",
        documentType: "Blog Post",
        date: "13 September 2009",
        url: "http://europeanpatentcaselaw.blogspot.com/2009/09/quelques-vices-de-procedure.html",
      })
    );
    expect(toPlainText(runs)).toBe(
      "‘Quelques Vices de Procédure’ [Some Procedural Flaws], " +
        "Le Blog du Droit Européen des Brevets [Blog of European Patent Law] " +
        "(Blog Post, 13 September 2009) " +
        "<http://europeanpatentcaselaw.blogspot.com/2009/09/quelques-vices-de-procedure.html>"
    );
  });

  test("dispatches a judicially-authored article per AGLC4 ch 4 ex 19 (rule 4.1.5)", () => {
    const runs = formatCitation(
      makeCitation("journal.article", {
        authors: [
          { givenNames: "Michael", surname: "Kirby", isJudge: true, judicialTitle: "Justice" },
        ],
        title: "Transnational Judicial Dialogue, Internationalisation of Law and Australian Judges",
        year: "2008",
        volume: "9",
        issue: "1",
        journal: "Melbourne Journal of International Law",
        startingPage: "171",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Justice Michael Kirby, " +
        "‘Transnational Judicial Dialogue, Internationalisation of Law and Australian Judges’ " +
        "(2008) 9(1) Melbourne Journal of International Law 171"
    );
    expect(italicText(runs)).toBe("Melbourne Journal of International Law");
  });

  test("dispatches an internet-material pinpoint before the URL (rule 7.15; PARITY-121, ex 113 fields)", () => {
    const runs = formatCitation(
      makeCitation("internet_material", {
        authors: [{ givenNames: "Martin", surname: "Clark" }],
        title: "Koani v The Queen",
        websiteName: "Opinions on High",
        documentType: "Blog Post",
        date: "18 October 2017",
        pinpoint: "[4]",
        url: "http://blogs.unimelb.edu.au/opinionsonhigh/2017/10/18/koani-case-page/",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Martin Clark, ‘Koani v The Queen’, Opinions on High (Blog Post, 18 October 2017) " +
        "[4] <http://blogs.unimelb.edu.au/opinionsonhigh/2017/10/18/koani-case-page/>"
    );
  });

  test("dispatches a parliamentary research paper pinpoint per the rule 7.2.1 template (PARITY-121, ex 33 fields)", () => {
    const runs = formatCitation(
      makeCitation("research_paper.parliamentary", {
        authors: [{ givenNames: "Amanda", surname: "Biggs" }],
        title: "Medicare: A Quick Guide",
        documentType: "Research Paper",
        body: "Parliamentary Library",
        legislature: "Parliament of Australia",
        date: "12 July 2016",
        pinpoint: "3",
      })
    );
    expect(toPlainText(runs)).toBe(
      "Amanda Biggs, ‘Medicare: A Quick Guide’ " +
        "(Research Paper, Parliamentary Library, Parliament of Australia, 12 July 2016) 3"
    );
  });
});
