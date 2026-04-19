/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-011: AGLC4 Rules 25.1–25.8 — United States of America
 *
 * Formatting functions for US cases (federal and state reporters),
 * legislation (USC, session laws), Constitution, regulations (CFR),
 * Congressional Record, and Restatements.
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
   * Federal appellate: 'F 2d', 'F 3d', 'F 4th'.
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
 * Reporters from which the US Supreme Court can be inferred (Rule 25.1).
 */
const US_SCOTUS_REPORTERS: ReadonlySet<string> = new Set([
  "US",
  "S Ct",
  "L Ed",
  "L Ed 2d",
]);

// ─── FRGN-011-CASE: US Cases (Rules 25.1–25.3) ──────────────────────────────

/**
 * Formats a United States case citation per AGLC4 Rules 25.1–25.3.
 *
 * AGLC4 Rule 25.1: US Supreme Court cases are cited to US Reports
 * (abbreviated 'US') or the Supreme Court Reporter ('S Ct'). The
 * court identifier is omitted as it is apparent from the reporter.
 *
 * AGLC4 Rule 25.2: Federal court of appeals cases use the Federal
 * Reporter ('F 2d', 'F 3d', 'F 4th'). The circuit is given in
 * parentheses with the year, e.g. '(9th Cir, 2020)'.
 *
 * AGLC4 Rule 25.3: Federal district court cases use the Federal
 * Supplement ('F Supp', 'F Supp 2d', 'F Supp 3d'). The district
 * is given in parentheses with the year. State court cases use
 * the relevant state reporter.
 *
 * @example
 *   // Brown v Board of Education, 347 US 483 (1954)
 *   formatCase({
 *     caseName: "Brown v Board of Education",
 *     volume: 347, reporter: "US", startingPage: 483, year: 1954,
 *   })
 *
 * @example
 *   // Chevron USA Inc v Natural Resources Defense Council Inc,
 *   // 467 US 837, 842 (1984)
 *   formatCase({
 *     caseName: "Chevron USA Inc v Natural Resources Defense Council Inc",
 *     volume: 467, reporter: "US", startingPage: 837,
 *     pinpoint: "842", year: 1984,
 *   })
 *
 * @example
 *   // Association for Molecular Pathology v Myriad Genetics Inc,
 *   // 689 F 3d 1303 (Fed Cir, 2012)
 *   formatCase({
 *     caseName: "Association for Molecular Pathology v Myriad Genetics Inc",
 *     volume: 689, reporter: "F 3d", startingPage: 1303,
 *     year: 2012, courtId: "Fed Cir",
 *   })
 */
export function formatCase(data: USCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics, followed by a comma
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
  /** Supplement year (e.g. 'Supp V 2011'). */
  supplement?: string;
}

// ─── FRGN-011-LEG: US Legislation — USC (Rule 25.4) ─────────────────────────

/**
 * Formats a US legislation citation per AGLC4 Rule 25.4.
 *
 * AGLC4 Rule 25.4: Federal statutes are cited to the United States
 * Code (USC). The format is: Title USC § Section. The title of the
 * Act may precede the code citation.
 *
 * @example
 *   // Civil Rights Act of 1964, 42 USC § 1983
 *   formatLegislation({
 *     title: "Civil Rights Act of 1964",
 *     uscTitle: 42, uscSection: "§ 1983",
 *   })
 *
 * @example
 *   // 28 USC § 1331
 *   formatLegislation({
 *     title: "",
 *     uscTitle: 28, uscSection: "§ 1331",
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
  /** Title of the Act. */
  title: string;
  /** Public law number (e.g. '111-148'). */
  pubLawNumber: string;
  /** Statutes at Large volume. */
  statVolume: number;
  /** Statutes at Large starting page. */
  statPage: number;
  /** Year of enactment. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-011-SESSION: Session Laws (Rule 25.5) ─────────────────────────────

/**
 * Formats a US session law citation per AGLC4 Rule 25.5.
 *
 * AGLC4 Rule 25.5: Session laws are cited with the title, Public
 * Law number, and Statutes at Large reference.
 *
 * @example
 *   // Patient Protection and Affordable Care Act,
 *   // Pub L No 111-148, 124 Stat 119 (2010)
 *   formatSessionLaw({
 *     title: "Patient Protection and Affordable Care Act",
 *     pubLawNumber: "111-148",
 *     statVolume: 124, statPage: 119, year: 2010,
 *   })
 */
export function formatSessionLaw(data: USSessionLawData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });
  runs.push({ text: ", " });

  // Pub L No and Stat reference
  runs.push({
    text: `Pub L No ${data.pubLawNumber}, ${data.statVolume} Stat ${data.statPage} (${data.year})`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── US Constitution Data ────────────────────────────────────────────────────

interface USConstitutionData {
  /** Amendment number (e.g. 'XIV'). Omit for article-level references. */
  amendment?: string;
  /** Article number (e.g. 'I'). */
  article?: string;
  /** Section number (e.g. '1'). */
  section?: string;
  /** Clause number. */
  clause?: string;
}

// ─── FRGN-011-CONST: US Constitution (Rule 25.6) ────────────────────────────

/**
 * Formats a US Constitution citation per AGLC4 Rule 25.6.
 *
 * AGLC4 Rule 25.4: The United States Constitution is cited as
 * 'United States Constitution' (italicised) followed by the relevant
 * subdivision. Amendments use Roman numerals.
 *
 * @example
 *   // United States Constitution amend XIV § 1
 *   formatConstitution({ amendment: "XIV", section: "1" })
 *
 * @example
 *   // United States Constitution art I § 8 cl 3
 *   formatConstitution({ article: "I", section: "8", clause: "3" })
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
    parts.push(`\u00A7 ${data.section}`);
  }
  if (data.clause) {
    parts.push(`cl ${data.clause}`);
  }

  runs.push({ text: "United States Constitution", italic: true });
  if (parts.length > 0) {
    runs.push({ text: ` ${parts.join(" ")}` });
  }

  return runs;
}

// ─── US Regulation Data ──────────────────────────────────────────────────────

interface USRegulationData {
  /** CFR title number. */
  cfrTitle: number;
  /** CFR section or part number. */
  cfrSection: string;
  /** Year of the CFR edition. */
  year?: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-011-REG: Regulations — CFR (Rule 25.7) ────────────────────────────

/**
 * Formats a US regulation citation per AGLC4 Rule 25.7.
 *
 * AGLC4 Rule 25.7: Federal regulations are cited to the Code of
 * Federal Regulations (CFR). The format is: title CFR § section (year).
 *
 * @example
 *   // 40 CFR § 122.2 (2020)
 *   formatRegulation({ cfrTitle: 40, cfrSection: "122.2", year: 2020 })
 */
export function formatRegulation(data: USRegulationData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  let text = `${data.cfrTitle} CFR \u00A7 ${data.cfrSection}`;
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

// ─── Congressional Record Data ───────────────────────────────────────────────

interface USCongressionalRecordData {
  /** Volume number. */
  volume: number;
  /** Page or section number. */
  page: string;
  /** Year. */
  year: number;
  /** Speaker (optional). */
  speaker?: string;
  /** Daily or bound edition ('daily' or 'bound'). */
  edition?: "daily" | "bound";
}

// ─── FRGN-011-CONGREC: Congressional Record (Rule 25.7) ─────────────────────

/**
 * Formats a Congressional Record citation per AGLC4 Rule 25.7.
 *
 * AGLC4 Rule 25.7: Congressional Record citations use the format:
 * volume Cong Rec page (year) (Speaker).
 *
 * @example
 *   // 158 Cong Rec S6299 (2012) (Harry Reid)
 *   formatCongressionalRecord({
 *     volume: 158, page: "S6299", year: 2012, speaker: "Harry Reid",
 *   })
 */
export function formatCongressionalRecord(
  data: USCongressionalRecordData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  let text = `${data.volume} Cong Rec ${data.page} (${data.year})`;
  if (data.speaker) {
    text += ` (${data.speaker})`;
  }
  runs.push({ text });

  return runs;
}

// ─── Restatement Data ────────────────────────────────────────────────────────

interface USRestatementData {
  /** Subject of the restatement (e.g. 'Torts'). */
  subject: string;
  /** Edition (e.g. 'Second', 'Third'). */
  edition: string;
  /** Section number. */
  section: string;
  /** Year. */
  year: number;
  /** Specific topic within the restatement (optional). */
  topic?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-011-REST: Restatements (Rule 25.8) ────────────────────────────────

/**
 * Formats a US Restatement citation per AGLC4 Rule 25.8.
 *
 * AGLC4 Rule 25.8: Restatements are cited with the title in italics,
 * followed by the section number and year in parentheses.
 *
 * @example
 *   // Restatement (Second) of Torts § 402A (1965)
 *   formatRestatement({
 *     subject: "Torts", edition: "Second",
 *     section: "402A", year: 1965,
 *   })
 *
 * @example
 *   // Restatement (Third) of Torts: Liability for Physical and Emotional
 *   // Harm § 7 (2010)
 *   formatRestatement({
 *     subject: "Torts", edition: "Third",
 *     topic: "Liability for Physical and Emotional Harm",
 *     section: "7", year: 2010,
 *   })
 */
export function formatRestatement(data: USRestatementData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  let titleText = `Restatement (${data.edition}) of ${data.subject}`;
  if (data.topic) {
    titleText += `: ${data.topic}`;
  }
  runs.push({ text: titleText, italic: true });

  // Section and year
  runs.push({ text: ` \u00A7 ${data.section} (${data.year})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
