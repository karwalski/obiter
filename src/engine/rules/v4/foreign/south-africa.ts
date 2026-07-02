/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-009: AGLC4 Rules 23.1–23.3 — South Africa
 *
 * Formatting functions for South African cases and legislation.
 * Covers Constitutional Court (ZACC), Supreme Court of Appeal (ZASCA),
 * traditional SA reports, and Truth and Reconciliation Commission materials.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── South African Case Data ─────────────────────────────────────────────────

interface SouthAfricaCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Year of the report or decision. */
  year: number;
  /** Whether the year is in round or square brackets. */
  yearType: "round" | "square";
  /** Volume number (for volume-organised series). */
  volume?: number;
  /**
   * Report series abbreviation.
   * Medium neutral: 'ZACC', 'ZASCA', 'ZAGPJHC'.
   * Traditional: 'SA', 'BCLR', 'SACR'.
   */
  reportSeries: string;
  /** Starting page or paragraph number. */
  startingPage: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * Court name per the rule 23.1.1 table, written out — e.g.
   * 'Constitutional Court', 'Supreme Court of Appeal', 'Appellate
   * Division', 'High Court', 'Local Division', 'Provincial Division'.
   * Geographic locations must be omitted from division names
   * (rule 23.1.1: 'Local Division', not 'Witwatersrand Local
   * Division'). For medium neutral citations the court is apparent
   * from the identifier.
   */
  courtId?: string;
  /**
   * @deprecated Rule 23.1.1 bans SA-native geographic division codes
   * (e.g. '(A)', '(T)', '(CC)') — use `courtId` with a court name from
   * the rule 23.1.1 table instead. This field is ignored.
   */
  division?: string;
  /**
   * @deprecated Rule 23.3 cites TRC reports as chapter 6 books — use
   * {@link formatTRCReport} instead.
   */
  isTRC?: boolean;
  /** @deprecated See `isTRC`. */
  trcDetails?: string;
}

// ─── Medium neutral series ───────────────────────────────────────────────────

/**
 * Medium neutral citation prefixes from which the court can be inferred
 * (Rule 23.1). Court identifier is omitted for these.
 */
const SA_MEDIUM_NEUTRAL_PREFIXES: ReadonlyArray<string> = [
  "ZACC",
  "ZASCA",
  "ZAGPJHC",
  "ZAGPPHC",
  "ZAKZDHC",
  "ZAKZPHC",
  "ZAWCHC",
  "ZAECGHC",
  "ZAECMHC",
  "ZAFSHC",
  "ZANCHC",
  "ZALBHC",
];

function isMediumNeutral(series: string): boolean {
  return SA_MEDIUM_NEUTRAL_PREFIXES.some(
    (prefix) => series === prefix || series.startsWith(prefix)
  );
}

// ─── FRGN-009-CASE: South African Cases (Rule 23.1) ─────────────────────────

/**
 * Formats a South African case citation per AGLC4 Rule 23.1.
 *
 * AGLC4 Rule 23.1.1: South African cases follow chapter 2. Under rule
 * 2.2.6 the court's name (e.g. 'Constitutional Court') or a division
 * name from the 23.1.1 table may be included — with geographic
 * locations omitted ('Local Division', not 'Witwatersrand Local
 * Division'). 'S' is the customary abbreviation for the State in
 * criminal cases; 'Judge President' is abbreviated 'JP' after the
 * judge's name. Rule 23.1.2: no authorised series exists — prefer the
 * South African Law Reports ('SA').
 *
 * @example
 *   // S v Manamela [2000] 3 SA 1 (Constitutional Court)  — AGLC4 ex 6
 *   formatCase({
 *     caseName: "S v Manamela",
 *     year: 2000, yearType: "square",
 *     volume: 3, reportSeries: "SA",
 *     startingPage: 1, courtId: "Constitutional Court",
 *   })
 *
 * @example
 *   // Minister of Home Affairs v Fourie [2005] ZACC 19
 *   formatCase({
 *     caseName: "Minister of Home Affairs v Fourie",
 *     year: 2005, yearType: "square",
 *     reportSeries: "ZACC", startingPage: 19,
 *   })
 */
export function formatCase(data: SouthAfricaCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Legacy TRC path — rule 23.3 cites TRC reports as chapter 6 books
  // (author in roman type). Use formatTRCReport instead.
  if (data.isTRC && data.trcDetails) {
    runs.push({ text: data.caseName });
    runs.push({ text: `, ${data.trcDetails}` });
    return runs;
  }

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year
  const open = data.yearType === "round" ? "(" : "[";
  const close = data.yearType === "round" ? ")" : "]";
  let yearText = ` ${open}${data.year}${close}`;
  if (data.volume !== undefined) {
    yearText += ` ${data.volume}`;
  }
  runs.push({ text: yearText });

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Court name per the rule 23.1.1 table (omitted for medium neutral
  // citations, where the court is apparent from the identifier).
  // Geographic division codes ('A', 'T', 'CC') are never emitted —
  // rule 23.1.1 prescribes written-out court names without locations.
  if (data.courtId && !isMediumNeutral(data.reportSeries)) {
    runs.push({ text: ` (${data.courtId})` });
  }

  return runs;
}

// ─── FRGN-009-TRC: Truth and Reconciliation Commission (Rule 23.3) ──────────

/**
 * Formats a South African Truth and Reconciliation Commission report
 * per AGLC4 Rule 23.3.
 *
 * AGLC4 Rule 23.3: TRC reports are cited as books under chapter 6 —
 * author in roman type, title italicised, year(s) in parentheses,
 * then volume and pinpoint.
 *
 * @example
 *   // Truth and Reconciliation Commission of South Africa, Report
 *   //   (1998–2003) vol 3, 155  — AGLC4 ex 11
 *   formatTRCReport({
 *     title: "Report", years: "1998–2003",
 *     volume: 3, pinpoint: "155",
 *   })
 */
export function formatTRCReport(data: {
  /** Title of the report (italicised). Defaults to 'Report'. */
  title?: string;
  /** Publication year or span (e.g. '1998–2003'). */
  years: string;
  /** Volume number. */
  volume?: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author in roman type (chapter 6 book format)
  runs.push({ text: "Truth and Reconciliation Commission of South Africa, " });

  // Title in italics
  runs.push({ text: data.title ?? "Report", italic: true });

  // Year(s) in parentheses
  runs.push({ text: ` (${data.years})` });

  // Volume and pinpoint
  if (data.volume !== undefined) {
    runs.push({ text: ` vol ${data.volume}` });
    if (data.pinpoint) {
      runs.push({ text: `, ${data.pinpoint}` });
    }
  } else if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── South African Legislation Data ──────────────────────────────────────────

interface SouthAfricaLegislationData {
  /** Short title of the Act. */
  title: string;
  /**
   * @deprecated The SA-native 'Act «No» of «Year»' style is not an
   * AGLC4 form — rule 23.2.1 applies the chapter 3 title-and-year
   * format (*Local Government Transition Act 1993* (South Africa)).
   * This field is ignored.
   */
  actNumber?: string;
  /** Year of the Act (forms part of the italicised title, per rule 3.1). */
  year: number;
  /**
   * Jurisdiction per the rule 23.2.1 table — 'South Africa' (default)
   * or a provincial abbreviation (e.g. 'KZN', 'EC', 'WC'). Provincial
   * jurisdiction words are moved out of the title into this element.
   */
  jurisdiction?: string;
  /** Pinpoint reference (e.g. 's 9'). */
  pinpoint?: string;
  /**
   * Set to true when citing a constitution. Rule 23.2.2: national and
   * provincial constitutions are cited as ordinary legislation under
   * rule 23.2.1, so this flag does not change the output.
   */
  isConstitution?: boolean;
}

// ─── FRGN-009-LEG: South African Legislation (Rules 23.2.1–23.2.2) ──────────

/**
 * Formats a South African legislation citation per AGLC4 Rules
 * 23.2.1–23.2.2.
 *
 * AGLC4 Rule 23.2.1: South African legislation and delegated
 * legislation follow chapter 3 — italicised title and year, then the
 * jurisdiction in parentheses ('South Africa' or a provincial
 * abbreviation from the 23.2.1 table). Provincial jurisdiction names
 * at the start of an Act's title move into the jurisdiction element.
 *
 * AGLC4 Rule 23.2.2: constitutions are cited as ordinary legislation
 * under rule 23.2.1.
 *
 * @example
 *   // Local Government Transition Act 1993 (South Africa)  — AGLC4 ex 7
 *   formatLegislation({
 *     title: "Local Government Transition Act",
 *     year: 1993,
 *   })
 *
 * @example
 *   // Constitution of the Republic of South Africa Act 1996
 *   //   (South Africa) ch 8  — AGLC4 ex 10
 *   formatLegislation({
 *     title: "Constitution of the Republic of South Africa Act",
 *     year: 1996,
 *     isConstitution: true,
 *     pinpoint: "ch 8",
 *   })
 */
export function formatLegislation(data: SouthAfricaLegislationData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title and year in italics (chapter 3 form — the SA-native
  // 'Act «No» of «Year»' style is never emitted)
  runs.push({ text: `${data.title} ${data.year}`, italic: true });

  // Jurisdiction (rule 23.2.2: constitutions cited as regular legislation)
  const jurisdiction = data.jurisdiction ?? "South Africa";
  runs.push({ text: ` (${jurisdiction})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
