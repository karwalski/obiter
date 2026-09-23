/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — Fixture library for the standards feature-matrix suites.
 *
 * Every fixture is a complete `Citation` in the field shape the ENGINE
 * dispatchers read today (`src/engine/engine.ts`: `SOURCE_DISPATCH`,
 * `OSCOLA_DISPATCH`, `dispatchNzlsg`). Where the Insert/Edit forms write a
 * different key for the same fact, the comment above the fixture says so;
 * STD-021 adds those aliases to `src/engine/fieldAliases.ts` and the forms.
 * Some fixtures therefore carry the same fact under two keys (for example
 * `mnc` for the form and `neutralCitationYear/Court/Number` for the OSCOLA
 * dispatcher) — that redundancy is deliberate and is what STD-021 retires.
 *
 * Fixture data is illustrative. Citation elements were taken from the
 * worked examples in the OSCOLA 5 PDF, the NZLSG 3 online chapters and the
 * repo's own examples so that the expectation tables can be checked against
 * the guides; where a real report page or number was not confirmed the
 * comment says "values as in the repo example".
 */

import type { Citation } from "../../../src/types/citation";

const STAMP = "2026-09-22T00:00:00Z";

function fixture(
  id: string,
  sourceType: Citation["sourceType"],
  data: Citation["data"],
  shortTitle: string
): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType,
    data,
    shortTitle,
    tags: [],
    createdAt: STAMP,
    modifiedAt: STAMP,
  };
}

// ─── Australian cases ────────────────────────────────────────────────────────

/**
 * Mabo v Queensland (No 2) (1992) 175 CLR 1 — reported, with the AustLII
 * MNC stored so court mode can emit the parallel citation. The sequel
 * designator is left out of `party2` because AGLC4 styles it `[No 2]` and
 * OSCOLA/NZLSG `(No 2)`; that styling is a separate rule point.
 * Form keys match the dispatcher (party1/party2/yearType/year/volume/
 * reportSeries/startingPage/courtId/mnc).
 */
export const maboReported = fixture(
  "fx-mabo-reported",
  "case.reported",
  {
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
  },
  "Mabo"
);

/**
 * Mabo by MNC only. Dispatcher reads `court` + `caseNumber` (aliases
 * `courtId`/`courtIdentifier`, `mnc`/`judgmentNumber` via fieldAliases).
 * OSCOLA's `case.unreported.mnc` dispatcher reads only
 * `neutralCitationYear/Court/Number`, which the form never writes (plan,
 * Defects: "case.unreported.mnc under OSCOLA renders the case name only").
 */
export const maboMnc = fixture(
  "fx-mabo-mnc",
  "case.unreported.mnc",
  {
    party1: "Mabo",
    party2: "Queensland",
    year: 1992,
    court: "HCA",
    caseNumber: 23,
    jurisdiction: "Cth",
  },
  "Mabo"
);

// ─── United Kingdom and Ireland cases ────────────────────────────────────────

/**
 * Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 (OSCOLA 5 §2.1.1
 * example; note the repo JSDoc in rules/oscola/cases.ts says UKHL 15 — the
 * guide says 13). The OSCOLA dispatcher reads the flat
 * `neutralCitationYear/Court/Number` keys; the form writes `mnc` and
 * `courtId` (STD-021 alias). The NZLSG dispatcher reads
 * `courtIdentifier`/`decisionNumber`/`parallelReport`, none of which is
 * present here, so NZLSG rows for this fixture carry "currently renders"
 * notes until STD-021.
 */
export const ukCorr = fixture(
  "fx-uk-corr",
  "case.reported",
  {
    party1: "Corr",
    party2: "IBC Vehicles Ltd",
    yearType: "square",
    year: 2008,
    volume: 1,
    reportSeries: "AC",
    startingPage: 884,
    jurisdiction: "UK",
    mnc: "[2008] UKHL 13",
    neutralCitationYear: 2008,
    neutralCitationCourt: "UKHL",
    neutralCitationNumber: 13,
  },
  "Corr"
);

/**
 * Scottish case with a medium neutral citation and a Session Cases report
 * (values as in the repo example: 2011 SC 158). Routed to the Scottish
 * formatter by `jurisdiction: "Scot"`. `yearType: "round"` is what the form
 * stores; Session Cases take no brackets at all (OSCOLA 5 §2.2.1), which
 * the formatter cannot express today.
 */
export const scotAxa = fixture(
  "fx-scot-axa",
  "case.reported",
  {
    party1: "AXA General Insurance Ltd",
    party2: "Lord Advocate",
    yearType: "round",
    year: 2011,
    reportSeries: "SC",
    startingPage: 158,
    jurisdiction: "Scot",
    mnc: "[2011] CSIH 31",
    neutralCitationYear: 2011,
    neutralCitationCourt: "CSIH",
    neutralCitationNumber: 31,
  },
  // OSCOLA 5 §2.1.2: a case short form is the first-named party as printed.
  "AXA General Insurance Ltd"
);

/**
 * Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48 (OSCOLA 5
 * §2.3.1 example). The MNC year (2009) differs from the report year (2010).
 */
export const niWilson = fixture(
  "fx-ni-wilson",
  "case.reported",
  {
    party1: "Wilson",
    party2: "Commissioner of Valuation",
    yearType: "square",
    year: 2010,
    reportSeries: "NI",
    startingPage: 48,
    jurisdiction: "NI",
    mnc: "[2009] NICA 30",
    neutralCitationYear: 2009,
    neutralCitationCourt: "NICA",
    neutralCitationNumber: 30,
  },
  "Wilson"
);

/**
 * Langan v Health Service Executive [2024] IESC 1 (repo OSC-014 example).
 * Stored as an MNC-only case so every dispatcher has a form: AGLC reads
 * `court`/`caseNumber`, OSCOLA reads `neutralCitation*`, NZLSG reads
 * `court`/`caseNumber`.
 */
export const ieLangan = fixture(
  "fx-ie-langan",
  "case.unreported.mnc",
  {
    party1: "Langan",
    party2: "Health Service Executive",
    year: 2024,
    court: "IESC",
    caseNumber: 1,
    jurisdiction: "IE",
    neutralCitationYear: 2024,
    neutralCitationCourt: "IESC",
    neutralCitationNumber: 1,
  },
  "Langan"
);

// ─── New Zealand cases and tribunals ─────────────────────────────────────────

/**
 * Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91 (repo reference-guide
 * example). Carries the NZLSG dispatcher keys (`court`, `decisionNumber`,
 * `parallelReport`) AND the form keys (`mnc`, `reportSeries`, `volume`,
 * `startingPage`, `yearType`) because today's form writes only the latter
 * (plan, Defects: "form writes courtId/mnc/reportSeries"). Report year and
 * MNC year coincide so one `year` serves both dispatchers.
 */
export const nzBrooker = fixture(
  "fx-nz-brooker",
  "case.reported",
  {
    party1: "Brooker",
    party2: "Police",
    yearType: "square",
    year: 2007,
    volume: 3,
    reportSeries: "NZLR",
    startingPage: 91,
    jurisdiction: "NZ",
    mnc: "[2007] NZSC 30",
    court: "NZSC",
    decisionNumber: 30,
    parallelReport: { year: 2007, volume: 3, reportSeries: "NZLR", startPage: 91 },
  },
  "Brooker"
);

/**
 * Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA) — pre-neutral
 * reported case (NZLSG 3 §3.2 example). No MNC; the court identifier is
 * required. Today's NZLSG dispatcher takes the neutral-citation branch for
 * every `case.reported` without `fileNumber`, so it renders `[1984]  0`.
 */
export const nzTaylor = fixture(
  "fx-nz-taylor",
  "case.reported",
  {
    party1: "Taylor",
    party2: "New Zealand Poultry Board",
    yearType: "square",
    year: 1984,
    volume: 1,
    reportSeries: "NZLR",
    startingPage: 394,
    courtId: "CA",
    jurisdiction: "NZ",
  },
  "Taylor"
);

/**
 * Māori Land Court decision (NZLSG 3 §3.5 example). Dispatcher reads the
 * minute-book keys; `blockNumber` is the minute-book volume in the repo's
 * data model. No form writes these keys (plan, Defects: no NZ fields in
 * editCitationFields.ts).
 */
export const mlcPacey = fixture(
  "fx-mlc-pacey",
  "case.quasi_judicial",
  {
    caseName: "Pacey v Adlam – Matata Parish 39A 2B 2B 2A",
    year: 2017,
    blockNumber: 178,
    minuteBookDistrict: "Waiariki",
    minuteBookAbbrev: "MB",
    page: 32,
    shortBlockNumber: 178,
    shortCourtAbbrev: "WAR",
    shortPage: 32,
    jurisdiction: "NZ",
  },
  "Pacey v Adlam"
);

/**
 * Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011) (NZLSG 3 §3.6). The
 * `report.waitangi_tribunal` source type is not selectable in the forms
 * today (plan, Defects); `body` is what the AGLC report fallback reads.
 */
export const waiKoAotearoa = fixture(
  "fx-wai-262",
  "report.waitangi_tribunal",
  {
    body: "Waitangi Tribunal",
    title: "Ko Aotearoa Tēnei",
    waiNumber: 262,
    year: 2011,
    jurisdiction: "NZ",
  },
  "Ko Aotearoa Tēnei"
);

// ─── Legislation ─────────────────────────────────────────────────────────────

/**
 * Human Rights Act 1998 (UK). `ukLegislationType` is OSCOLA-only; the form
 * never writes it. The short title keeps the year because OSCOLA 4 §2.4.1
 * requires it in an abbreviated Act name (`HRA 1998`, never `HRA`).
 */
export const ukHra = fixture(
  "fx-uk-hra",
  "legislation.statute",
  { title: "Human Rights Act", year: 1998, jurisdiction: "UK", ukLegislationType: "uk" },
  "HRA 1998"
);

/**
 * Russia (Sanctions) (EU Exit) Regulations 2019, SI 2019/855 (OSCOLA 5
 * §2.5.1 example). `number` and `instrumentType` are read by the OSCOLA
 * delegated-legislation dispatcher; the form has no SI-number field.
 */
export const ukSiRussia = fixture(
  "fx-uk-si-russia",
  "legislation.delegated",
  {
    title: "Russia (Sanctions) (EU Exit) Regulations",
    year: 2019,
    jurisdiction: "UK",
    instrumentType: "si",
    number: 855,
  },
  "Russia Sanctions Regulations"
);

/** Privacy Act 2020 (NZ) — domestic under NZLSG, foreign under the others. */
export const nzPrivacyAct = fixture(
  "fx-nz-privacy-act",
  "legislation.statute",
  { title: "Privacy Act", year: 2020, jurisdiction: "NZ" },
  "Privacy Act"
);

/** Costs in Criminal Cases Regulations 1987 (NZ) (NZLSG 3 §4.3.1 example). */
export const nzCostsRegs = fixture(
  "fx-nz-costs-regs",
  "legislation.delegated",
  { title: "Costs in Criminal Cases Regulations", year: 1987, jurisdiction: "NZ" },
  "Costs Regulations"
);

/** Native Title Act 1993 (Cth). */
export const cthNativeTitleAct = fixture(
  "fx-cth-nta",
  "legislation.statute",
  { title: "Native Title Act", year: 1993, jurisdiction: "Cth" },
  "Native Title Act"
);

// ─── Secondary sources ───────────────────────────────────────────────────────

/**
 * Luntz, Assessment of Damages for Personal Injury and Death (4th ed, 2002).
 * `place` is read only by the NZLSG book formatter (NZLSG 3 §6.1.6); the
 * AGLC form has no place field.
 */
export const bookLuntz = fixture(
  "fx-book-luntz",
  "book",
  {
    authors: [{ givenNames: "Harold", surname: "Luntz" }],
    title: "Assessment of Damages for Personal Injury and Death",
    edition: 4,
    publisher: "LexisNexis Butterworths",
    place: "Sydney",
    year: 2002,
  },
  "Luntz"
);

/**
 * Gardner, 'The Purity and Priority of Private Law' in Robertson and Wu
 * (eds), The Goals of Private Law (Hart Publishing, 2009) 1 (repo
 * interchange fixture; also an OSCOLA reference-guide example). `place` is
 * for NZLSG §6.2.
 */
export const chapterGardner = fixture(
  "fx-chapter-gardner",
  "book.chapter",
  {
    chapterAuthors: [{ givenNames: "John", surname: "Gardner" }],
    chapterTitle: "The Purity and Priority of Private Law",
    editors: [
      { givenNames: "Andrew", surname: "Robertson" },
      { givenNames: "Tang Hang", surname: "Wu" },
    ],
    bookTitle: "The Goals of Private Law",
    publisher: "Hart Publishing",
    place: "Oxford",
    year: 2009,
    startingPage: 1,
  },
  "Gardner"
);

/** Alison L Young, 'In Defence of Due Deference' (2009) 72 MLR 554 (OSCOLA 5 §3.3 example). */
export const articleYoung = fixture(
  "fx-article-young",
  "journal.article",
  {
    authors: [{ givenNames: "Alison L", surname: "Young" }],
    title: "In Defence of Due Deference",
    year: 2009,
    volume: 72,
    journal: "MLR",
    startingPage: 554,
  },
  "Young"
);

/**
 * Herberg, Injunctive Relief for Wrongful Termination of Employment (DPhil
 * thesis, University of Oxford 1989) (OSCOLA 5 §3.7.6 example). AGLC reads
 * `thesisType` (alias `degree`); the NZLSG formatter reads `degree` and
 * appends " Thesis" itself.
 */
export const thesisHerberg = fixture(
  "fx-thesis-herberg",
  "thesis",
  {
    authors: [{ givenNames: "Javan", surname: "Herberg" }],
    title: "Injunctive Relief for Wrongful Termination of Employment",
    thesisType: "DPhil thesis",
    degree: "DPhil",
    university: "University of Oxford",
    year: 1989,
  },
  "Herberg"
);

/**
 * Blog post with a persistent (perma.cc) link (OSCOLA 5 §3.7.1 example), so
 * no access date is expected under any standard. AGLC reads `websiteName`
 * (aliases `website`/`siteName`) and `documentType`.
 */
export const webCyclefree = fixture(
  "fx-web-cyclefree",
  "internet_material",
  {
    author: "Cyclefree",
    title: "Is This Really Necessary, Minister?",
    websiteName: "Legal Feminist",
    documentType: "Blog Post",
    date: "27 April 2023",
    url: "https://perma.cc/3THK-P4AX",
  },
  "Cyclefree"
);

// ─── Parliamentary materials ─────────────────────────────────────────────────

/**
 * HC Deb 3 February 1977, vol 389, col 973 (single column taken from the
 * OSCOLA 5 §3.7.8 example, whose range 973–76 the numeric `column` field
 * cannot hold). AGLC reads `jurisdiction`/`chamber`/`date`/`page`.
 */
export const hansardUkCommons = fixture(
  "fx-hansard-uk-hc",
  "hansard",
  {
    jurisdiction: "UK",
    chamber: "HC",
    date: "3 February 1977",
    volume: 389,
    column: 973,
    page: "973",
  },
  "HC Deb 3 February 1977"
);

/** (6 April 2005) 624 NZPD 19676 (NZLSG 3 §5.1.1 example). `nzpd: true` selects the NZPD formatter. */
export const hansardNz = fixture(
  "fx-hansard-nz",
  "hansard",
  {
    jurisdiction: "NZ",
    nzpd: true,
    chamber: "House of Representatives",
    date: "6 April 2005",
    volume: 624,
    page: 19676,
  },
  "NZPD 6 April 2005"
);

/** Commonwealth Hansard (repo interchange fixture). */
export const hansardCth = fixture(
  "fx-hansard-cth",
  "hansard",
  {
    jurisdiction: "Commonwealth",
    chamber: "House of Representatives",
    date: "12 March 2020",
    page: "2345",
    speaker: "Anthony Albanese",
  },
  "Hansard 12 March 2020"
);

// ─── International materials ─────────────────────────────────────────────────

/** Rome Statute of the International Criminal Court, 2187 UNTS 3 (repo interchange fixture). */
export const treatyRomeStatute = fixture(
  "fx-treaty-rome",
  "treaty",
  {
    title: "Rome Statute of the International Criminal Court",
    openedDate: "17 July 1998",
    treatySeries: "UNTS",
    seriesVolume: 2187,
    startingPage: 3,
    entryIntoForceDate: "1 July 2002",
  },
  "Rome Statute"
);

/**
 * Balogh v Hungary, App no 47940/99 (ECtHR, 20 July 2004) (OSCOLA 4 §2.7.1
 * example). `decisionType` is what OSCOLA 5 §4.4.4 needs ("(Judgment)");
 * no dispatcher reads it today. `respondentState` is OSCOLA-only.
 */
export const echrBalogh = fixture(
  "fx-echr-balogh",
  "echr.decision",
  {
    caseName: "Balogh v Hungary",
    respondentState: "Hungary",
    applicationNumber: "47940/99",
    date: "20 July 2004",
    decisionType: "Judgment",
    jurisdiction: "ECHR",
  },
  "Balogh"
);

/**
 * Case C-363/16 European Commission v Hellenic Republic ECLI:EU:C:2018:12
 * (NZLSG 3 §10.5.1 example; post-2012 so every standard can use the ECLI).
 * No ECR report is stored.
 */
export const cjeuHellenic = fixture(
  "fx-cjeu-hellenic",
  "eu.court",
  {
    caseNumber: "C-363/16",
    caseName: "European Commission v Hellenic Republic",
    ecli: "ECLI:EU:C:2018:12",
    date: "17 January 2018",
    year: 2018,
    jurisdiction: "EU",
  },
  "Commission v Hellenic Republic"
);

/** UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373 (OSCOLA 5 §4.2.2 example). */
export const unRes1373 = fixture(
  "fx-un-res-1373",
  "un.document",
  {
    body: "UNSC",
    resolutionNumber: "1373",
    date: "28 September 2001",
    documentSymbol: "S/RES/1373",
    documentNumber: "S/RES/1373",
  },
  "SC Res 1373"
);

// ─── Law reform reports ──────────────────────────────────────────────────────

/** ALRC, Genes and Ingenuity (Report No 99, 2004) (repo interchange fixture). */
export const alrcGenes = fixture(
  "fx-alrc-99",
  "report.law_reform",
  {
    commissionName: "Australian Law Reform Commission",
    title: "Genes and Ingenuity: Gene Patenting and Human Health",
    documentType: "Report",
    number: "99",
    date: "2004",
    jurisdiction: "Cth",
  },
  "Genes and Ingenuity"
);

/**
 * Law Commission Review of the Privacy Act 1993 (NZLC R123, 2011) (repo
 * NZLSG example). `reportType`/`reportNumber` select the NZLSG formatter;
 * the OSCOLA dispatcher also keys on `reportNumber` and routes it to the
 * UK Law Commission form.
 */
export const nzlcPrivacy = fixture(
  "fx-nzlc-r123",
  "report.law_reform",
  {
    commissionName: "Law Commission",
    title: "Review of the Privacy Act 1993",
    reportType: "R",
    reportNumber: 123,
    year: 2011,
    jurisdiction: "NZ",
  },
  "Review of the Privacy Act"
);

// ─── Registry ────────────────────────────────────────────────────────────────

export const STANDARD_FIXTURES: readonly Citation[] = [
  maboReported,
  maboMnc,
  ukCorr,
  scotAxa,
  niWilson,
  ieLangan,
  nzBrooker,
  nzTaylor,
  mlcPacey,
  waiKoAotearoa,
  ukHra,
  ukSiRussia,
  nzPrivacyAct,
  nzCostsRegs,
  cthNativeTitleAct,
  bookLuntz,
  chapterGardner,
  articleYoung,
  thesisHerberg,
  webCyclefree,
  hansardUkCommons,
  hansardNz,
  hansardCth,
  treatyRomeStatute,
  echrBalogh,
  cjeuHellenic,
  unRes1373,
  alrcGenes,
  nzlcPrivacy,
];

/** Look a fixture up by id; throws so a typo in a table fails loudly. */
export function getFixture(id: string): Citation {
  const found = STANDARD_FIXTURES.find((c) => c.id === id);
  if (!found) {
    throw new Error(`Unknown standards fixture: ${id}`);
  }
  return found;
}

/** Every fixture id, for structural tests. */
export const STANDARD_FIXTURE_IDS: readonly string[] = STANDARD_FIXTURES.map((c) => c.id);
