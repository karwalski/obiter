/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-010: AGLC4 Rules 24.1–24.4 — United Kingdom
 *
 * Formatting functions for UK cases (modern, nominate and Scottish),
 * judicial officers, legislation (including regnal years), delegated
 * legislation (SI / SR & O / SR), Hansard, and command papers.
 */

import { FormattedRun } from "../../../../types/formattedRun";
import { getJudicialTitle, isTitleBeforeName } from "../../../data/judicial-titles";

// ─── UK Case Data ────────────────────────────────────────────────────────────

interface UKCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Year of the report or decision. */
  year: number;
  /**
   * Year bracket style: 'square' for year-organised series, 'round' for
   * volume-organised series (rules 2.2.3–2.2.4), or 'none' for Scottish
   * series organised by year, whose year is not enclosed in brackets
   * (rule 24.1.4 — e.g. 'Logan v Harrower 2008 SLT 1049').
   */
  yearType: "round" | "square" | "none";
  /** Volume number (for volume-organised series). */
  volume?: number;
  /**
   * Report series abbreviation or medium neutral court identifier.
   * Law Reports: 'AC', 'QB', 'KB', 'Ch', 'Fam', 'P' and the 'LR'-prefixed
   * 1865–75 series (rule 24.1.2 — for these, the volume is placed inside
   * the abbreviation: 'LR 7 QB', not '7 LR QB').
   * Medium neutral: 'UKSC', 'UKHL', 'EWCA Civ', 'EWCA Crim', 'EWHC'.
   * Scottish: 'SC', 'SC (HL)', 'SLT'.
   */
  reportSeries: string;
  /** Starting page or judgment number. */
  startingPage: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /** Court identifier. Omitted when apparent from the series. */
  courtId?: string;
  /**
   * EWHC division (e.g. 'Admin', 'Ch', 'Comm', 'Fam', 'QB', 'Pat', 'TCC').
   * Placed in parentheses after the judgment number (rule 24.1.5).
   */
  ewhcDivision?: string;
  /**
   * Parallel citation to the English Reports ('ER') or Revised Reports
   * ('RR') — mandatory for nominate reports where available, the ER
   * preferred (rule 24.1.3). Follows the nominate citation after a
   * semicolon; pinpoints need only appear here.
   */
  parallel?: {
    volume: number;
    series: "ER" | "RR";
    page: number | string;
    pinpoint?: string;
  };
}

// ─── Series-implied courts ───────────────────────────────────────────────────

/**
 * Report series and identifiers from which the court is apparent, so no
 * court parenthetical is needed (rules 24.1.1 and 2.2.6).
 */
const UK_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set([
  "AC",
  "QB",
  "KB",
  "Ch",
  "Fam",
  "P",
  "UKSC",
  "UKHL",
  "UKPC",
  "EWCA Civ",
  "EWCA Crim",
  "EWHC",
  "HCJAC",
  "HCJT",
  "CSIH",
  "CSOH",
  "NICA",
  "NICh",
  "NIFam",
  "NIQB",
  "NICC",
  "SC",
  "SC (HL)",
  "SLT",
]);

// ─── FRGN-010-CASE: UK Cases (Rule 24.1) ────────────────────────────────────

/**
 * Formats a United Kingdom case citation per AGLC4 Rule 24.1.
 *
 * AGLC4 Rule 24.1.1: UK cases follow chapter 2 ('plc' abbreviated;
 * post-2000 judicial review parties as 'R (Name)'). Rule 24.1.2: cite
 * the Law Reports where available; where an abbreviation contains 'LR',
 * the volume number is placed between 'LR' and the remainder ('LR 7
 * QB'). Rule 24.1.3: nominate reports carry a parallel ER (or RR)
 * citation. Rule 24.1.4: Scottish year-organised series take a bare
 * year (yearType 'none'). Rule 24.1.5: court-assigned medium neutral
 * citations use the identifiers of the 24.1.5 table, with EWHC division
 * parentheticals after the judgment number.
 *
 * @example
 *   // Donoghue v Stevenson [1932] AC 562
 *   formatCase({
 *     caseName: "Donoghue v Stevenson",
 *     year: 1932, yearType: "square",
 *     reportSeries: "AC", startingPage: 562,
 *   })
 *
 * @example
 *   // Russel v Lee (1661) 1 Lev 86; 83 ER 310  — AGLC4 ex 8 (rule 24.1.3)
 *   formatCase({
 *     caseName: "Russel v Lee",
 *     year: 1661, yearType: "round",
 *     volume: 1, reportSeries: "Lev", startingPage: 86,
 *     parallel: { volume: 83, series: "ER", page: 310 },
 *   })
 *
 * @example
 *   // West v Secretary of State for Scotland 1992 SC 385  — rule 24.1.4
 *   formatCase({
 *     caseName: "West v Secretary of State for Scotland",
 *     year: 1992, yearType: "none",
 *     reportSeries: "SC", startingPage: 385,
 *   })
 */
export function formatCase(data: UKCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year — bare for Scottish year-organised series (rule 24.1.4)
  let yearText: string;
  if (data.yearType === "none") {
    yearText = ` ${data.year}`;
  } else {
    const open = data.yearType === "round" ? "(" : "[";
    const close = data.yearType === "round" ? ")" : "]";
    yearText = ` ${open}${data.year}${close}`;
  }

  // Report series and starting page. For 'LR'-prefixed Law Reports
  // series the volume sits inside the abbreviation: 'LR 7 QB', not
  // '7 LR QB' (rule 24.1.2).
  let reportText: string;
  if (data.reportSeries.startsWith("LR ") && data.volume !== undefined) {
    reportText = ` LR ${data.volume} ${data.reportSeries.slice(3)} ${data.startingPage}`;
  } else {
    if (data.volume !== undefined) {
      yearText += ` ${data.volume}`;
    }
    reportText = ` ${data.reportSeries} ${data.startingPage}`;
  }
  runs.push({ text: yearText });

  // EWHC division appears after the judgment number: e.g. EWHC 61 (Admin)
  if (data.ewhcDivision) {
    reportText += ` (${data.ewhcDivision})`;
  }
  runs.push({ text: reportText });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Parallel ER/RR citation for nominate reports (rule 24.1.3)
  if (data.parallel) {
    let parallelText = `; ${data.parallel.volume} ${data.parallel.series} ${data.parallel.page}`;
    if (data.parallel.pinpoint) {
      parallelText += `, ${data.parallel.pinpoint}`;
    }
    runs.push({ text: parallelText });
  }

  // Court identifier (omitted when apparent from series)
  if (data.courtId && !data.ewhcDivision && !UK_SERIES_IMPLIED_COURT.has(data.reportSeries)) {
    runs.push({ text: ` (${data.courtId})` });
  }

  return runs;
}

// ─── FRGN-010-JUDGES: UK Judicial Officers (Rule 24.1.6) ────────────────────

/**
 * Formats UK judicial officers' names and titles per AGLC4 Rule 24.1.6.
 *
 * AGLC4 Rule 24.1.6: UK judicial title abbreviations (from the 24.1.6
 * table, via UK_JUDICIAL_TITLES in src/engine/data/judicial-titles.ts)
 * supplement or replace those of rule 2.4.1. Asterisked titles ('Lord',
 * 'Baroness', 'Judge', 'Master', …) always precede the judge's name;
 * all other abbreviations follow it. Where several officers share an
 * after-name title with a tabulated plural (LJ → LJJ), the names are
 * grouped before the plural abbreviation. The Deputy President of the
 * UK Supreme Court is 'DPSC' — the guide's example-band 'DP' is a
 * misprint (DECISION-012: the table governs).
 *
 * @example
 *   // 'James, Baggallay and Bramwell LJJ'  — rule 24.1.6 example band
 *   formatJudicialOfficers([
 *     { name: "James", title: "LJ" },
 *     { name: "Baggallay", title: "LJ" },
 *     { name: "Bramwell", title: "LJ" },
 *   ])
 *
 * @example
 *   // 'Baroness Hale' (title before the name)
 *   formatJudicialOfficers([{ name: "Hale", title: "Baroness" }])
 */
export function formatJudicialOfficers(
  officers: ReadonlyArray<{ name: string; title: string }>
): string {
  if (officers.length === 0) {
    return "";
  }

  /** Joins names as 'A', 'A and B' or 'A, B and C'. */
  const joinNames = (names: string[]): string => {
    if (names.length === 1) {
      return names[0];
    }
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  };

  // Officers with asterisked titles take the title in full before the name
  const rendered = officers.map((officer) =>
    isTitleBeforeName(officer.title, "UK")
      ? { text: `${officer.title} ${officer.name}`, title: undefined as string | undefined }
      : { text: officer.name, title: officer.title }
  );

  // Group a run of officers sharing an after-name title with a plural
  const sharedTitle = rendered[0].title;
  const allShareTitle =
    sharedTitle !== undefined && rendered.every((entry) => entry.title === sharedTitle);
  if (allShareTitle) {
    const entry = getJudicialTitle(sharedTitle, "UK");
    const abbreviation =
      officers.length > 1 && entry?.abbreviationPlural ? entry.abbreviationPlural : sharedTitle;
    if (officers.length === 1 || entry?.abbreviationPlural) {
      return `${joinNames(rendered.map((r) => r.text))} ${abbreviation}`;
    }
  }

  // Mixed titles (or no tabulated plural): title after each name
  return joinNames(
    rendered.map((entry) => (entry.title ? `${entry.text} ${entry.title}` : entry.text))
  );
}

// ─── FRGN-010-REGNAL: Regnal Years (Rule 24.2.3) ────────────────────────────

/**
 * Monarch-name abbreviations from the rule 24.2.3 table (PDF pp 283–4).
 */
export const UK_MONARCH_ABBREVIATIONS: Readonly<Record<string, string>> = {
  Anne: "Anne",
  Edward: "Edw",
  George: "Geo",
  James: "Jac",
  Mary: "Mary",
  Richard: "Ric",
  William: "Wm",
  Charles: "Car",
  Elizabeth: "Eliz",
  Henry: "Hen",
  John: "John",
  "Philip and Mary": "Ph & M",
  Victoria: "Vict",
  "William and Mary": "Wm & M",
};

/**
 * Formats a regnal year per AGLC4 Rule 24.2.3.
 *
 * AGLC4 Rule 24.2.3: the regnal year comprises the year(s) of reign,
 * the monarch's abbreviated name (per the 24.2.3 table — William is
 * 'Wm', not 'Will') and the monarch's regnal number in Arabic numerals
 * ('2 & 3 Wm 4', never '2 & 3 Wm IV'). Where a year of reign contained
 * multiple parliamentary sessions, 'sess' and the session number follow
 * ('24 Geo 3 sess 2').
 *
 * @example
 *   formatRegnalYear({ yearsOfReign: "2 & 3", monarch: "William", regnalNumber: 4 })
 *   // → '2 & 3 Wm 4'
 *
 * @example
 *   formatRegnalYear({ yearsOfReign: "24", monarch: "George", regnalNumber: 3, session: 2 })
 *   // → '24 Geo 3 sess 2'
 */
export function formatRegnalYear(data: {
  /** Year(s) of the monarch's reign (e.g. '2 & 3', '24'). */
  yearsOfReign: string;
  /** Monarch's full name (e.g. 'William') or table abbreviation (e.g. 'Wm'). */
  monarch: string;
  /** Sequential number of monarchs of the same name, in Arabic numerals. */
  regnalNumber?: number;
  /** Parliamentary session number, for subsequent sessions in a regnal year. */
  session?: number;
}): string {
  const abbreviation = UK_MONARCH_ABBREVIATIONS[data.monarch] ?? data.monarch;
  let text = `${data.yearsOfReign} ${abbreviation}`;
  if (data.regnalNumber !== undefined) {
    text += ` ${data.regnalNumber}`;
  }
  if (data.session !== undefined) {
    text += ` sess ${data.session}`;
  }
  return text;
}

// ─── UK Legislation Data ─────────────────────────────────────────────────────

interface UKLegislationData {
  /** Short title of the Act. */
  title: string;
  /** Year of the Act. */
  year: number;
  /**
   * Jurisdiction per the rule 24.2.2 table: '(UK)' for UK Parliament
   * statutes from 1 January 1963 (the default); omitted for earlier UK
   * statutes (pass a regnal year instead); '(Imp)' optionally for
   * Imperial Parliament statutes; '(NI)', '(Scot)', '(Wales)' for the
   * devolved legislatures.
   */
  jurisdiction?: string;
  /** Pinpoint reference (e.g. 's 6'). */
  pinpoint?: string;
  /**
   * Regnal year for pre-1963 statutes (rule 24.2.3), e.g. '6 Edw 7',
   * '2 & 3 Wm 4' — Arabic regnal numerals and the monarch abbreviations
   * of the 24.2.3 table (use {@link formatRegnalYear}). When provided,
   * it follows the title (and any jurisdiction).
   */
  regnalYear?: string;
  /** Chapter number for historical statutes (e.g. 'c 67'). */
  chapter?: string;
}

// ─── FRGN-010-LEG: UK Legislation (Rule 24.2) ───────────────────────────────

/**
 * Formats a United Kingdom legislation citation per AGLC4 Rule 24.2.
 *
 * AGLC4 Rule 24.2.1: title and year per rules 3.1.1–3.1.2 (the year of
 * passage always forms part of the italicised title). Rule 24.2.2:
 * '(UK)' for UK Parliament statutes from 1963; earlier statutes omit
 * the jurisdiction and take a non-italic comma after the title ('(Imp)'
 * may be included for Imperial statutes). Rule 24.2.3: pre-1963
 * statutes carry a regnal year and chapter number ('c'). Rule 24.2.4:
 * a pinpoint following a regnal year and chapter is preceded by a
 * comma.
 *
 * @example
 *   // Human Rights Act 1998 (UK) s 6  — cf AGLC4 ex 26
 *   formatLegislation({ title: "Human Rights Act", year: 1998, pinpoint: "s 6" })
 *
 * @example
 *   // Workmen's Compensation Act 1906, 6 Edw 7, c 58  — AGLC4 ex 36
 *   formatLegislation({
 *     title: "Workmen's Compensation Act",
 *     year: 1906,
 *     regnalYear: "6 Edw 7",
 *     chapter: "c 58",
 *   })
 */
export function formatLegislation(data: UKLegislationData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const jurisdiction = data.jurisdiction ?? "UK";

  if (data.regnalYear) {
    // Historical statute with regnal year (Rules 24.2.2–24.2.3)
    // Pre-1963 UK Parliament statutes omit jurisdiction; (Imp) is optional
    runs.push({ text: `${data.title} ${data.year}`, italic: true });
    // Jurisdiction appears after title+year only if explicitly provided (e.g. 'Imp')
    if (data.jurisdiction) {
      runs.push({ text: ` (${data.jurisdiction})` });
    } else {
      runs.push({ text: "," });
    }
    runs.push({ text: ` ${data.regnalYear}` });
    if (data.chapter) {
      runs.push({ text: `, ${data.chapter}` });
    }
  } else {
    // Modern statute
    runs.push({ text: `${data.title} ${data.year}`, italic: true });
    runs.push({ text: ` (${jurisdiction})` });
  }

  // Pinpoint (Rule 24.2.4: preceded by comma when regnal year/chapter given)
  if (data.pinpoint) {
    if (data.regnalYear) {
      runs.push({ text: `, ${data.pinpoint}` });
    } else {
      runs.push({ text: ` ${data.pinpoint}` });
    }
  }

  return runs;
}

// ─── Statutory Instrument Data ───────────────────────────────────────────────

interface UKStatutoryInstrumentData {
  /** Title of the instrument (without the year). */
  title: string;
  /** Year of the instrument. */
  year: number;
  /** Instrument number (e.g. '1234'). */
  siNumber: string;
  /** Jurisdiction per rule 24.2.2 — defaults to 'UK'. */
  jurisdiction?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * Instrument-type abbreviation per the rule 24.3 table:
   * 'SR & O' (UK 1890–1947), 'SI' (UK 1947– and Scottish Parliament),
   * 'SR' (Northern Ireland). Defaults from the jurisdiction and year.
   */
  instrumentType?: "SI" | "SR" | "SR & O";
}

/**
 * Resolves the rule 24.3 instrument-type abbreviation from the
 * jurisdiction and year: Northern Ireland → 'SR'; United Kingdom
 * 1890–1947 → 'SR & O'; otherwise (UK 1947–, Scottish Parliament) →
 * 'SI'.
 */
function defaultInstrumentType(jurisdiction: string, year: number): "SI" | "SR" | "SR & O" {
  if (jurisdiction === "NI") {
    return "SR";
  }
  if (jurisdiction === "UK" && year >= 1890 && year < 1948) {
    return "SR & O";
  }
  return "SI";
}

// ─── FRGN-010-SI: Delegated Legislation (Rule 24.3) ─────────────────────────

/**
 * Formats UK delegated legislation per AGLC4 Rule 24.3.
 *
 * AGLC4 Rule 24.3: title and year per rule 24.2.1, jurisdiction per
 * rule 24.2.2, then the instrument number in the form
 * '«Type» «Year»/«Number»' with the type abbreviation from the 24.3
 * table (SR & O for UK 1890–1947, SI for UK 1947– and the Scottish
 * Parliament, SR for Northern Ireland). A pinpoint follows the
 * instrument number after a comma.
 *
 * @example
 *   // Fertilisers (Amendment) Regulations 1998 (UK) SI 1998/2024  — AGLC4 ex 39
 *   formatStatutoryInstrument({
 *     title: "Fertilisers (Amendment) Regulations",
 *     year: 1998, siNumber: "2024",
 *   })
 *
 * @example
 *   // Work at Height Regulations (Northern Ireland) 2005 (NI) SR 2005/279  — AGLC4 ex 42
 *   formatStatutoryInstrument({
 *     title: "Work at Height Regulations (Northern Ireland)",
 *     year: 2005, siNumber: "279", jurisdiction: "NI",
 *   })
 */
export function formatStatutoryInstrument(data: UKStatutoryInstrumentData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const jurisdiction = data.jurisdiction ?? "UK";
  const instrumentType = data.instrumentType ?? defaultInstrumentType(jurisdiction, data.year);

  // Title and year in italics
  runs.push({ text: `${data.title} ${data.year}`, italic: true });

  // Jurisdiction and instrument number (rule 24.3 table)
  runs.push({ text: ` (${jurisdiction}) ${instrumentType} ${data.year}/${data.siNumber}` });

  // Pinpoint — follows the instrument number after a comma (rule 24.3)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── Hansard Data ────────────────────────────────────────────────────────────

interface UKHansardData {
  /** Chamber: House of Lords or House of Commons. */
  chamber: "HL" | "HC";
  /** Date of the debate (e.g. '3 March 2020'). */
  date: string;
  /** Volume number. */
  volume: number;
  /** Column number. */
  column: number | string;
  /** Speaker name (optional, per rule 7.5.1). */
  speaker?: string;
  /** Series number (e.g. 5 for 5th series). */
  series?: number;
}

// ─── FRGN-010-HANSARD: UK Hansard (Rule 24.4.1) ─────────────────────────────

/**
 * Formats a UK parliamentary debate citation per AGLC4 Rule 24.4.1.
 *
 * AGLC4 Rule 24.4.1 (modern debates): United Kingdom, *Parliamentary
 * Debates*, Chamber, Full Date, vol Volume, col Column, with the
 * speaker's name optionally appended in parentheses per rule 7.5.1.
 * (Historical debates in Cobbett's Parliamentary History of England use
 * a separate year-based form not produced by this function.)
 *
 * @example
 *   // United Kingdom, Parliamentary Debates, House of Commons,
 *   //   16 February 1998, vol 306, col 778 (Jack Straw)  — AGLC4 ex 45
 *   formatHansard({
 *     chamber: "HC", date: "16 February 1998",
 *     volume: 306, column: 778, speaker: "Jack Straw",
 *   })
 */
export function formatHansard(data: UKHansardData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const chamberFull = data.chamber === "HL" ? "House of Lords" : "House of Commons";

  runs.push({ text: "United Kingdom, " });
  runs.push({ text: "Parliamentary Debates", italic: true });
  runs.push({ text: ", " });
  runs.push({ text: chamberFull });

  let details = `, ${data.date}, vol ${data.volume}, col ${data.column}`;
  if (data.speaker) {
    details += ` (${data.speaker})`;
  }
  runs.push({ text: details });

  return runs;
}

// ─── Command Paper Data ─────────────────────────────────────────────────────

interface UKCommandPaperData {
  /** Author or body. */
  author: string;
  /** Title of the paper (will be italicised). */
  title: string;
  /**
   * Command paper series prefix per the rule 24.4.2 table ('No'
   * 1833–69, 'C' 1870–99, 'Cd' 1900–18, 'Cmd' 1918–56, 'Cmnd' 1956–86,
   * 'Cm' 1986–).
   */
  seriesPrefix: string;
  /** Paper number. */
  paperNumber: string;
  /** Year of publication. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-010-CMD: Command Papers (Rule 24.4.2) ─────────────────────────────

/**
 * Formats a UK Command Paper citation per AGLC4 Rule 24.4.2.
 *
 * AGLC4 Rule 24.4.2 template: Author, *Title* (Command Paper Series
 * Number, Year) Pinpoint — with the series abbreviation determined by
 * the date of publication.
 *
 * @example
 *   // Department for Transport (UK), Low Carbon Transport: A Greener
 *   //   Future — A Carbon Reduction Strategy for Transport
 *   //   (Cm 7682, 2009) 18  — AGLC4 ex 49
 *   formatCommandPaper({
 *     author: "Department for Transport (UK)",
 *     title: "Low Carbon Transport: A Greener Future — A Carbon Reduction Strategy for Transport",
 *     seriesPrefix: "Cm", paperNumber: "7682", year: 2009,
 *     pinpoint: "18",
 *   })
 */
export function formatCommandPaper(data: UKCommandPaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author}, ` });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Command paper number and year
  runs.push({
    text: ` (${data.seriesPrefix} ${data.paperNumber}, ${data.year})`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── PARITY: Parliamentary Papers (Rule 24.4.3) ─────────────────────────────

/** Data for a UK parliamentary paper citation (Rule 24.4.3). */
export interface UKParliamentaryPaperData {
  /** Author (individual or body). */
  author: string;
  /** Title of the paper (italicised). */
  title: string;
  /**
   * Paper number element(s), each including the House, eg
   * 'House of Commons Paper No 84'. Where the paper was presented to both
   * Houses, both entries appear, comma-separated (Rule 24.4.3).
   */
  paperNumbers: string[];
  /** Year(s) of the session, eg '2009–10'. */
  session: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

/**
 * Formats a UK parliamentary paper citation per AGLC4 Rule 24.4.3.
 *
 * AGLC4 Rule 24.4.3 template: «Author», *Title* («House» Paper No
 * «Number», Session «Year(s) of Session») «Pinpoint». Where a paper was
 * presented to both Houses, both paper numbers appear, separated by a
 * comma.
 *
 * @example
 *   // National Audit Office, Regenerating the English Coalfields
 *   //   (House of Commons Paper No 84, Session 2009–10) 11  — AGLC4 ex 50
 *   formatParliamentaryPaper({
 *     author: "National Audit Office",
 *     title: "Regenerating the English Coalfields",
 *     paperNumbers: ["House of Commons Paper No 84"],
 *     session: "2009–10",
 *     pinpoint: "11",
 *   })
 *
 * @param data - The parliamentary paper citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 24.4.3.
 */
export function formatParliamentaryPaper(data: UKParliamentaryPaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author}, ` });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Paper number(s) and session parenthetical
  const numbers = data.paperNumbers.join(", ");
  runs.push({ text: ` (${numbers}, Session ${data.session})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
