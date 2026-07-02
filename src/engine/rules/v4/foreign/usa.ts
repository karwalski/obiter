/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-011: AGLC4 Rules 25.1–25.7 — United States of America
 *
 * Formatting functions for US cases (reported and unreported),
 * legislation (code and session laws), constitutions, delegated
 * legislation (CFR and Federal Register), Congressional Record
 * debates, and Restatements.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── US Case Data ────────────────────────────────────────────────────────────

interface USCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Volume number. */
  volume: number;
  /**
   * Reporter abbreviation.
   * Supreme Court: 'US', 'S Ct'.
   * Federal appellate: 'F', 'F 2d', 'F 3d', 'F 4th'.
   * Federal district: 'F Supp', 'F Supp 2d', 'F Supp 3d'.
   * State reporters as per jurisdiction.
   */
  reporter: string;
  /** Starting page. */
  startingPage: number;
  /** Pinpoint reference. */
  pinpoint?: string;
  /** Year of decision. */
  year: number;
  /**
   * Court identifier. Omitted for US Supreme Court (apparent from
   * 'US' or 'S Ct' reporter). Required for circuit and district courts.
   */
  courtId?: string;
}

// ─── Reporter-implied courts ─────────────────────────────────────────────────

/**
 * Reporters from which the US Supreme Court can be inferred (Rule 25.1.5).
 */
const US_SCOTUS_REPORTERS: ReadonlySet<string> = new Set(["US", "S Ct", "L Ed", "L Ed 2d"]);

// ─── FRGN-011-CASE: US Cases (Rule 25.1) ────────────────────────────────────

/**
 * Formats a reported United States case citation per AGLC4 Rule 25.1.
 *
 * AGLC4 Rule 25.1 template: Parties' Names, Volume Report Series
 * Starting Page, Pinpoint (Jurisdiction and Court Name, Year). The
 * party names take a trailing non-italic comma (rule 25.1.1); US
 * Supreme Court decisions carry no court name (rule 25.1.5.1); a
 * state's highest court is identified by the state abbreviation alone
 * (rule 25.1.5.2).
 *
 * @example
 *   // Roper v Simmons, 543 US 551, 567 (2005)  — AGLC4 ex 1
 *   formatCase({
 *     caseName: "Roper v Simmons",
 *     volume: 543, reporter: "US", startingPage: 551,
 *     pinpoint: "567", year: 2005,
 *   })
 *
 * @example
 *   // Loveladies Harbor Inc v United States, 28 F 3d 1171 (Fed Cir, 1994)  — AGLC4 ex 5
 *   formatCase({
 *     caseName: "Loveladies Harbor Inc v United States",
 *     volume: 28, reporter: "F 3d", startingPage: 1171,
 *     year: 1994, courtId: "Fed Cir",
 *   })
 */
export function formatCase(data: USCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics, followed by a non-italic comma (rule 25.1.1)
  runs.push({ text: data.caseName, italic: true });
  runs.push({ text: ", " });

  // Volume, reporter, starting page
  runs.push({ text: `${data.volume} ${data.reporter} ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Year and court parenthetical
  if (data.courtId && !US_SCOTUS_REPORTERS.has(data.reporter)) {
    runs.push({ text: ` (${data.courtId}, ${data.year})` });
  } else {
    runs.push({ text: ` (${data.year})` });
  }

  return runs;
}

// ─── FRGN-011-UNREP: Unreported US Cases (Rule 25.1.7) ──────────────────────

/**
 * Formats an unreported United States case per AGLC4 Rule 25.1.7.
 *
 * AGLC4 Rule 25.1.7 template: Parties' Names (Jurisdiction and
 * Court/District, Docket or Reference No, Full Date) slip op Pinpoint.
 * The docket number is reproduced complete (letters and internal
 * punctuation included, full stops dropped per rule 1.6.1); 'slip op'
 * precedes any pinpoint; where the slip opinion is paginated
 * continuously, a starting page precedes the pinpoint, separated by a
 * comma.
 *
 * @example
 *   // Red Hat Inc v The SCO Group Inc (D Del, Civ No 03-772-SLR,
 *   //   6 April 2004)  — AGLC4 ex 26
 *   formatUnreportedCase({
 *     caseName: "Red Hat Inc v The SCO Group Inc",
 *     court: "D Del", docketNumber: "Civ No 03-772-SLR",
 *     date: "6 April 2004",
 *   })
 *
 * @example
 *   // Charlesworth v Mack (1st Cir, No 90-567, 19 January 1991)
 *   //   slip op 3458, 3464  — AGLC4 ex 28
 *   formatUnreportedCase({
 *     caseName: "Charlesworth v Mack",
 *     court: "1st Cir", docketNumber: "No 90-567",
 *     date: "19 January 1991",
 *     slipOpStartingPage: 3458, slipOpPinpoint: "3464",
 *   })
 */
export function formatUnreportedCase(data: {
  /** Case name (will be italicised). */
  caseName: string;
  /**
   * Abbreviated jurisdiction and court: circuit or district for federal
   * courts (rule 25.1.5.1), state plus court name for state courts
   * (rule 25.1.5.2) — e.g. 'D Del', '1st Cir', 'Okla Ct Crim App'.
   */
  court: string;
  /** Complete docket or reference number as printed on the decision. */
  docketNumber: string;
  /** Full date of the decision (e.g. '6 April 2004'). */
  date: string;
  /**
   * Starting page of the judgment, where the court paginates slip
   * opinions continuously over a period.
   */
  slipOpStartingPage?: number | string;
  /** Pinpoint reference within the slip opinion. */
  slipOpPinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics (no trailing comma — the parenthetical follows)
  runs.push({ text: data.caseName, italic: true });

  // Jurisdiction/court, docket number and full date
  runs.push({ text: ` (${data.court}, ${data.docketNumber}, ${data.date})` });

  // 'slip op' marker precedes any starting page and pinpoint
  if (data.slipOpStartingPage !== undefined || data.slipOpPinpoint) {
    const pages: string[] = [];
    if (data.slipOpStartingPage !== undefined) {
      pages.push(String(data.slipOpStartingPage));
    }
    if (data.slipOpPinpoint) {
      pages.push(data.slipOpPinpoint);
    }
    runs.push({ text: ` slip op ${pages.join(", ")}` });
  }

  return runs;
}

// ─── US Legislation Data ─────────────────────────────────────────────────────

interface USLegislationData {
  /** Title of the Act. */
  title: string;
  /** Title number of the USC. */
  uscTitle: number;
  /** USC section number (e.g. '§ 1983'). */
  uscSection: string;
  /** Pinpoint reference within the section. */
  pinpoint?: string;
  /**
   * Year of the code version cited, with any supplement information
   * (rule 25.2.6) — e.g. '2012', 'Supp 2009', '2006 & Supp 2009'.
   */
  supplement?: string;
}

// ─── FRGN-011-LEG: US Legislation — Code (Rule 25.2) ────────────────────────

/**
 * Formats a US code citation per AGLC4 Rule 25.2.
 *
 * AGLC4 Rule 25.2 template: Statute Title, Title Number Abbreviated
 * Code Name Pinpoint (Publisher Year of Code and Supplement). The
 * statute title is normally omitted (rule 25.2.1); where included it is
 * italicised and followed by a non-italic comma. The USC title number
 * precedes the abbreviated code name (rule 25.2.2); the parenthesised
 * year is that of the code version cited (rule 25.2.6).
 *
 * @example
 *   // 35 USC § 102 (2012)  — AGLC4 ex 32
 *   formatLegislation({
 *     title: "",
 *     uscTitle: 35, uscSection: "§ 102", supplement: "2012",
 *   })
 *
 * @example
 *   // Federal Deposit Insurance Act, 12 USC §§ 1811–35a (2006)  — AGLC4 ex 33
 *   formatLegislation({
 *     title: "Federal Deposit Insurance Act",
 *     uscTitle: 12, uscSection: "§§ 1811–35a", supplement: "2006",
 *   })
 */
export function formatLegislation(data: USLegislationData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Act title in italics (if provided)
  if (data.title) {
    runs.push({ text: data.title, italic: true });
    runs.push({ text: ", " });
  }

  // USC citation
  let uscText = `${data.uscTitle} USC ${data.uscSection}`;
  if (data.supplement) {
    uscText += ` (${data.supplement})`;
  }
  runs.push({ text: uscText });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── US Session Law Data ─────────────────────────────────────────────────────

interface USSessionLawData {
  /** Title of the Act, or 'Act of «Full Date»' where no short title exists. */
  title: string;
  /**
   * Public law, private law or chapter number — the bare number
   * (e.g. '111-148', '108-2', '4'); the prefix is determined by
   * `numberType`.
   */
  pubLawNumber: string;
  /**
   * Which rule 25.3.2 designation `pubLawNumber` carries:
   * 'public' → 'Pub L No' (default), 'private' → 'Priv L No',
   * 'chapter' → 'ch' (statutes before the 60th Congress).
   */
  numberType?: "public" | "private" | "chapter";
  /**
   * Pinpoint to the original statute (rule 25.3.3), following the law
   * number (e.g. '§ 2', '§§ 4–5', 'arts 2–5').
   */
  originalPinpoint?: string;
  /** Session laws volume number — or the volume's year for unnumbered
   * state session laws (rule 25.3.4; set `volumeIsYear`). */
  statVolume: number;
  /**
   * Abbreviated session laws name per the rule 25.3.5 table. Defaults
   * to 'Stat' (federal). State names per the table — e.g. 'NJ Laws',
   * 'Ind Acts', 'Cal Stat' (New York is 'NY Laws', not 'NY Stat').
   */
  sessionLawsName?: string;
  /**
   * True when `statVolume` is the year of a state session laws volume
   * (rule 25.3.4); the closing year is then omitted (rule 25.3.7).
   */
  volumeIsYear?: boolean;
  /** Statutes at Large (or state session laws) starting page. */
  statPage: number;
  /**
   * Session-laws page(s) on which the pinpointed material appears
   * (rule 25.3.6), following the starting page (e.g. '573', '96–7').
   */
  statPinpoint?: number | string;
  /** Year of enactment. */
  year: number;
  /** @deprecated Use `originalPinpoint` (rule 25.3.3) or `statPinpoint`
   * (rule 25.3.6); retained for backwards compatibility (appended after
   * the citation). */
  pinpoint?: string;
}

// ─── FRGN-011-SESSION: Session Laws (Rule 25.3) ─────────────────────────────

/**
 * Formats a US session law citation per AGLC4 Rule 25.3.
 *
 * AGLC4 Rule 25.3 template: Statute Title, Public Law, Private Law or
 * Chapter Number, Original Pinpoint, Volume or Year Abbreviated Session
 * Laws Name Starting Page and Pinpoint (Year). Titles in the 'Act of
 * «Date»' form are not italicised (rule 25.3.1). The closing year is
 * omitted where the same year already forms part of the statute's
 * title, or where a state session laws year-volume is included
 * (rule 25.3.7).
 *
 * @example
 *   // Detainee Treatment Act of 2005, Pub L No 109-148,
 *   //   119 Stat 2739  — AGLC4 ex 56 (year in title: closing year omitted)
 *   formatSessionLaw({
 *     title: "Detainee Treatment Act of 2005",
 *     pubLawNumber: "109-148",
 *     statVolume: 119, statPage: 2739, year: 2005,
 *   })
 *
 * @example
 *   // School Bus Enhanced Safety Inspection Act, ch 5,
 *   //   1999 NJ Laws 1  — AGLC4 ex 64 (state session laws)
 *   formatSessionLaw({
 *     title: "School Bus Enhanced Safety Inspection Act",
 *     pubLawNumber: "5", numberType: "chapter",
 *     statVolume: 1999, volumeIsYear: true,
 *     sessionLawsName: "NJ Laws", statPage: 1, year: 1999,
 *   })
 */
export function formatSessionLaw(data: USSessionLawData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised unless in the 'Act of «Date»' form (rule 25.3.1)
  const isDateTitle = /^Act of /.test(data.title);
  runs.push({ text: data.title, italic: !isDateTitle });
  runs.push({ text: ", " });

  // Public law, private law or chapter number (rule 25.3.2)
  const numberPrefix =
    data.numberType === "private" ? "Priv L No" : data.numberType === "chapter" ? "ch" : "Pub L No";
  let text = `${numberPrefix} ${data.pubLawNumber}`;

  // Original pinpoint (rule 25.3.3)
  if (data.originalPinpoint) {
    text += `, ${data.originalPinpoint}`;
  }

  // Volume or year, session laws name, starting page (rules 25.3.4–25.3.6)
  const sessionLawsName = data.sessionLawsName ?? "Stat";
  text += `, ${data.statVolume} ${sessionLawsName} ${data.statPage}`;
  if (data.statPinpoint !== undefined) {
    text += `, ${data.statPinpoint}`;
  }

  // Year — omitted when it forms part of the title or a state
  // year-volume is included (rule 25.3.7)
  const yearInTitle = data.title.includes(String(data.year));
  if (!yearInTitle && !data.volumeIsYear) {
    text += ` (${data.year})`;
  }
  runs.push({ text });

  // Legacy free-form pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── US Constitution Data ────────────────────────────────────────────────────

interface USConstitutionData {
  /**
   * Italicised constitution title — 'United States Constitution'
   * (default) or a state constitution (e.g. 'Texas Constitution').
   */
  title?: string;
  /** Amendment number (e.g. 'XXI'). */
  amendment?: string;
  /** Article number (e.g. 'IV'). */
  article?: string;
  /** Section number (e.g. '3'). */
  section?: string;
  /** Clause number. */
  clause?: string;
}

// ─── FRGN-011-CONST: US Constitutions (Rule 25.4) ───────────────────────────

/**
 * Formats a US constitution citation per AGLC4 Rule 25.4.
 *
 * AGLC4 Rule 25.4: the titles of US federal and state constitutions are
 * italicised; pinpoint references adhere to rule 25.2.4 ('amend', '§',
 * plus 'art' and 'cl').
 *
 * @example
 *   // United States Constitution art IV § 3  — AGLC4 ex 75
 *   formatConstitution({ article: "IV", section: "3" })
 *
 * @example
 *   // Texas Constitution art 1 § 8  — AGLC4 ex 77
 *   formatConstitution({ title: "Texas Constitution", article: "1", section: "8" })
 */
export function formatConstitution(data: USConstitutionData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const parts: string[] = [];

  if (data.amendment) {
    parts.push(`amend ${data.amendment}`);
  }
  if (data.article) {
    parts.push(`art ${data.article}`);
  }
  if (data.section) {
    parts.push(`§ ${data.section}`);
  }
  if (data.clause) {
    parts.push(`cl ${data.clause}`);
  }

  runs.push({ text: data.title ?? "United States Constitution", italic: true });
  if (parts.length > 0) {
    runs.push({ text: ` ${parts.join(" ")}` });
  }

  return runs;
}

// ─── US Regulation Data ──────────────────────────────────────────────────────

interface USRegulationData {
  /** Optional title of the regulation (italicised, with a roman comma). */
  title?: string;
  /** CFR title number. */
  cfrTitle: number;
  /** CFR section or part number. */
  cfrSection: string;
  /** Year of the CFR version consulted. */
  year?: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-011-REG: Delegated Legislation — CFR (Rule 25.5.1) ────────────────

/**
 * Formats a US federal regulation cited to the CFR per AGLC4
 * Rule 25.5.1.
 *
 * AGLC4 Rule 25.5.1 (CFR form): Title of Regulation, Title CFR Pinpoint
 * (Year). The regulation's title is optional; a CFR part is designated
 * '§'; the year is that of the CFR version consulted. For instruments
 * not in the CFR (or cited as gazetted), use
 * {@link formatFederalRegister}.
 *
 * @example
 *   // Whaling Provisions, 50 CFR § 230 (2009)  — AGLC4 ex 79
 *   formatRegulation({ title: "Whaling Provisions", cfrTitle: 50, cfrSection: "230", year: 2009 })
 *
 * @example
 *   // 8 CFR § 101.1 (1986)  — AGLC4 ex 78
 *   formatRegulation({ cfrTitle: 8, cfrSection: "101.1", year: 1986 })
 */
export function formatRegulation(data: USRegulationData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Optional regulation title in italics, with a non-italic comma
  if (data.title) {
    runs.push({ text: data.title, italic: true });
    runs.push({ text: ", " });
  }

  let text = `${data.cfrTitle} CFR § ${data.cfrSection}`;
  if (data.year) {
    text += ` (${data.year})`;
  }
  runs.push({ text });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-011-FEDREG: Federal Register (Rule 25.5.1) ────────────────────────

/**
 * Formats US federal delegated legislation cited to the Federal
 * Register per AGLC4 Rule 25.5.1.
 *
 * AGLC4 Rule 25.5.1 (Federal Register form): Title of Regulation,
 * Volume Fed Reg Starting Page, Pinpoint (Full Date). Used where the
 * instrument does not appear in the CFR, or where there is good reason
 * to cite it as gazetted.
 *
 * @example
 *   // Enhancing Airline Passenger Protections, 74 Fed Reg 68983, 68985
 *   //   (30 December 2009)  — AGLC4 ex 80
 *   formatFederalRegister({
 *     title: "Enhancing Airline Passenger Protections",
 *     volume: 74, startingPage: 68983, pinpoint: "68985",
 *     date: "30 December 2009",
 *   })
 */
export function formatFederalRegister(data: {
  /** Optional title of the regulation (italicised, with a roman comma). */
  title?: string;
  /** Federal Register volume number. */
  volume: number;
  /** Starting page. */
  startingPage: number;
  /** Pinpoint reference (follows the starting page after a comma). */
  pinpoint?: string;
  /** Full date (e.g. '30 December 2009'). */
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.title) {
    runs.push({ text: data.title, italic: true });
    runs.push({ text: ", " });
  }

  let text = `${data.volume} Fed Reg ${data.startingPage}`;
  if (data.pinpoint) {
    text += `, ${data.pinpoint}`;
  }
  text += ` (${data.date})`;
  runs.push({ text });

  return runs;
}

// ─── Congressional Record Data ───────────────────────────────────────────────

interface USCongressionalRecordData {
  /** Volume number. */
  volume: number;
  /**
   * Pinpoint. Daily Edition pinpoints prefix the page number with 'H'
   * (House of Representatives) or 'S' (Senate) — e.g. 'H148'.
   */
  page: string;
  /** Year (bound edition). */
  year: number;
  /** Speaker (optional), per rule 7.5.1 — first and last names. */
  speaker?: string;
  /** Daily or bound edition ('bound' is the default). */
  edition?: "daily" | "bound";
  /** Full date (e.g. '19 January 2010') — required for the Daily Edition form. */
  date?: string;
  /**
   * Chamber ('Senate' or 'House of Representatives'), added after the
   * year where not otherwise apparent (bound form).
   */
  chamber?: string;
}

// ─── FRGN-011-CONGREC: Congressional Record (Rule 25.6.1) ───────────────────

/**
 * Formats a Congressional Record citation per AGLC4 Rule 25.6.1.
 *
 * AGLC4 Rule 25.6.1 templates — bound: Volume *Congressional Record*
 * Pinpoint (Year); Daily Edition: Volume *Congressional Record*
 * Pinpoint (daily ed, Full Date). The series title appears in full and
 * italicised; the speaker's name sits in its own parentheses between
 * the pinpoint and the year/date; the chamber may follow the year,
 * preceded by a comma.
 *
 * @example
 *   // 156 Congressional Record H148 (Ann Kirkpatrick)
 *   //   (daily ed, 19 January 2010)  — AGLC4 ex 84
 *   formatCongressionalRecord({
 *     volume: 156, page: "H148", year: 2010,
 *     speaker: "Ann Kirkpatrick",
 *     edition: "daily", date: "19 January 2010",
 *   })
 *
 * @example
 *   // 1 Congressional Record 10 (James Garfield)
 *   //   (1874, House of Representatives)  — AGLC4 ex 83
 *   formatCongressionalRecord({
 *     volume: 1, page: "10", year: 1874,
 *     speaker: "James Garfield",
 *     chamber: "House of Representatives",
 *   })
 */
export function formatCongressionalRecord(data: USCongressionalRecordData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Volume, then the series title in full and italicised
  runs.push({ text: `${data.volume} ` });
  runs.push({ text: "Congressional Record", italic: true });
  runs.push({ text: ` ${data.page}` });

  // Speaker in its own parentheses, before the year/date (rule 25.6.1)
  if (data.speaker) {
    runs.push({ text: ` (${data.speaker})` });
  }

  // Year (bound) or 'daily ed' and full date (Daily Edition)
  if (data.edition === "daily" && data.date) {
    runs.push({ text: ` (daily ed, ${data.date})` });
  } else {
    const chamber = data.chamber ? `, ${data.chamber}` : "";
    runs.push({ text: ` (${data.year}${chamber})` });
  }

  return runs;
}

// ─── Restatement Data ────────────────────────────────────────────────────────

interface USRestatementData {
  /** Subject of the restatement (e.g. 'Torts', 'Contracts'). */
  subject: string;
  /** Ordinal of the restatement, in words (e.g. 'Second', 'Third'). */
  edition: string;
  /** Section number (pinpoints must always include one). */
  section: string;
  /** Year of publication. */
  year: number;
  /** Specific topic within the restatement (optional). */
  topic?: string;
  /**
   * Subdivision reference following the section number — comments as
   * 'cmt'/'cmts', reporter's notes, etc (e.g. 'cmt (a)').
   */
  pinpoint?: string;
}

// ─── FRGN-011-REST: Restatements (Rule 25.7) ────────────────────────────────

/**
 * Formats a US Restatement citation per AGLC4 Rule 25.7.
 *
 * AGLC4 Rule 25.7: restatements are cited as books authored by the
 * American Law Institute (chapter 6): American Law Institute,
 * *Restatement (Ordinal) of Subject* (Year) § Section, with comment
 * and other subdivision references after the section number
 * ('comment' abbreviated 'cmt').
 *
 * @example
 *   // American Law Institute, Restatement (Second) of Contracts (1981)
 *   //   § 176  — AGLC4 ex 90
 *   formatRestatement({
 *     subject: "Contracts", edition: "Second",
 *     section: "176", year: 1981,
 *   })
 *
 * @example
 *   // American Law Institute, Restatement (Third) of the Foreign
 *   //   Relations Law of the United States (1987) § 465 cmt (a)  — AGLC4 ex 91
 *   formatRestatement({
 *     subject: "the Foreign Relations Law of the United States",
 *     edition: "Third", section: "465", year: 1987,
 *     pinpoint: "cmt (a)",
 *   })
 */
export function formatRestatement(data: USRestatementData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author — the American Law Institute, in roman type (chapter 6)
  runs.push({ text: "American Law Institute, " });

  // Title in italics
  let titleText = `Restatement (${data.edition}) of ${data.subject}`;
  if (data.topic) {
    titleText += `: ${data.topic}`;
  }
  runs.push({ text: titleText, italic: true });

  // Year, then the mandatory section-number pinpoint
  runs.push({ text: ` (${data.year}) § ${data.section}` });

  // Comment or other subdivision reference
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
