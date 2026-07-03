/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Supranational Materials (Rules 14.2–14.5)
 *
 * INTL-010: EU materials — Official Journal, treaties, CJEU cases
 *           (Rules 14.2.1–14.2.3).
 * INTL-011: European Court of Human Rights cases (Rules 14.3.1–14.3.3).
 * INTL-012: Other supranational decisions and documents (Rules 14.4–14.5).
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-010a: EU Official Journal (Rule 14.2.1) ───────────────────────────

/**
 * Formats a citation to the Official Journal of the European Union.
 *
 * AGLC4 Rule 14.2.1: EU documents published in the Official Journal are
 * cited as:
 *   *Document Title* [Year] OJ Series Issue/StartingPage, Pinpoint.
 *
 * The instrument designation (e.g. 'Regulation (EEC) No 2005/70 of the
 * Commission …') forms part of the italicised title — there is no separate
 * leading instrument-type element. Pinpoints are preceded by a comma
 * (rules 1.1.6–1.1.7).
 *
 * @example
 *   Commission Decision of 18 December 2002 Relating to National
 *   Provisions on Limiting the Importation … [2003] OJ L 1/72, 79
 */
export function formatEuOfficialJournal(data: {
  /** @deprecated The instrument designation belongs in the italic title
   * (Rule 14.2.1); this field is ignored. */
  instrumentType?: string;
  title: string;
  year: number;
  ojSeries: string;
  page: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised, includes any instrument designation (Rule 14.2.1)
  runs.push({ text: data.title, italic: true });

  // Year, OJ series, and issue/page
  runs.push({ text: ` [${data.year}] OJ ${data.ojSeries} ${data.page}` });

  // Pinpoint — comma-preceded (Rule 14.2.1)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-010b: EU Treaties (Rule 14.2.2) ───────────────────────────────────

/**
 * Formats a citation to an EU or EC treaty.
 *
 * AGLC4 Rule 14.2.2: EU treaties are cited with the full title
 * (italicised) and the pinpoint (if any). Subsequent references
 * may use a short title.
 *
 * Format:
 *   *Title* art/pinpoint
 *
 * @example
 *   Treaty on European Union, opened for signature 7 February 1992,
 *   [1992] OJ C 191/1 (entered into force 1 November 1993) art 6
 */
export function formatEuTreaty(data: {
  title: string;
  signatureInfo?: string;
  ojReference?: string;
  entryIntoForce?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised per AGLC4 Rule 14.2.2
  runs.push({ text: data.title, italic: true });

  // Optional signature information
  if (data.signatureInfo) {
    runs.push({ text: `, ${data.signatureInfo}` });
  }

  // Optional OJ reference
  if (data.ojReference) {
    runs.push({ text: `, ${data.ojReference}` });
  }

  // Optional entry into force
  if (data.entryIntoForce) {
    runs.push({ text: ` (entered into force ${data.entryIntoForce})` });
  }

  // Optional pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-010c: CJEU Cases (Rule 14.2.3) ───────────────────────────────────

/**
 * Formats a reported Court of Justice of the European Union (CJEU) case
 * citation.
 *
 * AGLC4 Rule 14.2.3: Reported EU court decisions are cited as:
 *   *Parties' Names* (Case Number) [Year] Report Series StartingPage,
 *   Pinpoint.
 *
 * The case number keeps its prefix ('C-' Court of Justice, 'T-' General
 * Court, 'F-' Civil Service Tribunal). Rule 14.2.3 defines no trailing
 * court element for reported decisions, so none is emitted.
 *
 * @example
 *   Grad v Finanzamt Traunstein (C-9/70) [1970] 2 ECR 825, 833
 */
export function formatCjeuCase(data: {
  caseName: string;
  caseNumber: string;
  year: number;
  reportSeries: string;
  page: string;
  /** @deprecated Rule 14.2.3 has no court element in the reported form;
   * this field is ignored. Use formatCjeuUnreportedCase for the unreported
   * form, which names the court. */
  court?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rule 14.2.3
  runs.push({ text: data.caseName, italic: true });

  // Case number in parentheses
  runs.push({ text: ` (${data.caseNumber})` });

  // Report series reference
  runs.push({ text: ` [${data.year}] ${data.reportSeries} ${data.page}` });

  return runs;
}

/**
 * Formats an unreported EU court decision per AGLC4 Rule 14.2.3.
 *
 * AGLC4 Rule 14.2.3: Decisions not reported in the ECR/ECR-SC are cited as:
 *   *Parties' Names* (Name of Court/Tribunal, Case Number, ECLI, Full Date)
 *   Pinpoint.
 *
 * The court's name appears as on the decision; the ECLI (if available)
 * follows the case number, preceded and followed by a comma; pinpoints
 * should be to paragraphs.
 *
 * @example
 *   Huawei Technologies Co Ltd v ZTE Corporation (Court of Justice of the
 *   European Union, C-170/13, ECLI:EU:C:2015:477, 16 July 2015) [9]
 */
export function formatCjeuUnreportedCase(data: {
  caseName: string;
  court: string;
  caseNumber: string;
  ecli?: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rule 14.2.3
  runs.push({ text: data.caseName, italic: true });

  // Court, case number, ECLI and full date in parentheses
  const parts: string[] = [data.court, data.caseNumber];
  if (data.ecli) {
    parts.push(data.ecli);
  }
  parts.push(data.date);
  runs.push({ text: ` (${parts.join(", ")})` });

  // Pinpoint — to paragraphs, space-separated
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-011: European Court of Human Rights (Rules 14.3.1–14.3.3) ─────────

/**
 * Formats a European Court of Human Rights (ECtHR) case citation.
 *
 * AGLC4 Rules 14.3.1–14.3.3: ECtHR cases are cited with the case name
 * (italicised), the application number, the chamber designation (if
 * not the Grand Chamber), the report series (ECHR or unreported), and
 * the date.
 *
 * Format:
 *   *Case Name* (European Court of Human Rights, Chamber,
 *   Application No, Date)
 *   *Case Name* (European Court of Human Rights, Application No,
 *   Report Series, Date)
 *
 * @example
 *   Othman (Abu Qatada) v United Kingdom (European Court of Human
 *   Rights, Fourth Section, Application No 8139/09, 17 January 2012)
 *
 * @example
 *   Al-Adsani v United Kingdom (European Court of Human Rights,
 *   Grand Chamber, Application No 35763/97, ECHR 2001-XI)
 */
/**
 * Formats a reported ECtHR or European Commission of Human Rights case
 * citation per AGLC4 Rules 14.3.2–14.3.3.
 *
 * AGLC4 Rule 14.3.2:
 *   Decisions to end 1995: *Parties* (Year) Volume Eur Court HR (ser A)
 *   Pinpoint — round-bracket year (volume-organised), no starting page;
 *   the pinpoint follows with no punctuation.
 *   Decisions from 1996: *Parties* [Year] Volume Eur Court HR StartingPage,
 *   Pinpoint — square-bracket year (year-organised), Roman-numeral volume.
 *
 * AGLC4 Rule 14.3.3 (European Commission of Human Rights):
 *   *Parties* (Year) Volume Eur Comm HR StartingPage, Pinpoint — round
 *   brackets (volume-organised); volume and starting page always included.
 *
 * @param data - The ECtHR/Eur Comm HR reported case data.
 * @returns An array of FormattedRun objects.
 *
 * @see AGLC4, Rules 14.3.2–14.3.3.
 */
export function formatEchrReportedCase(data: {
  caseName: string;
  year: number;
  volume?: string;
  reportSeries: string;
  startingPage?: number;
  pinpoint?: string;
  judge?: string;
  /** Overrides the bracket style inferred from the report series. */
  yearBrackets?: "round" | "square";
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised (Rule 14.3.2)
  runs.push({ text: data.caseName, italic: true });

  // Year — round brackets for volume-organised series (ser A to 1995,
  // Eur Comm HR); square brackets for the year-organised Eur Court HR
  // reports from 1996 (Rules 14.3.2–14.3.3)
  const isSerA = data.reportSeries.includes("(ser A)");
  const isVolumeOrganised = isSerA || /\bEur Comm HR\b/.test(data.reportSeries);
  const round = data.yearBrackets ? data.yearBrackets === "round" : isVolumeOrganised;
  runs.push({ text: round ? ` (${data.year})` : ` [${data.year}]` });

  // Volume (Roman numeral for post-1996)
  if (data.volume) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series
  runs.push({ text: ` ${data.reportSeries}` });

  // Starting page (not used for ser A citations)
  if (data.startingPage !== undefined) {
    runs.push({ text: ` ${data.startingPage}` });
  }

  // Pinpoint — ser A citations have no starting page, so the pinpoint
  // follows the series with a space and no comma (Rule 14.3.2 ex 32);
  // otherwise the pinpoint follows the starting page after a comma.
  if (data.pinpoint) {
    runs.push({
      text: isSerA && data.startingPage === undefined ? ` ${data.pinpoint}` : `, ${data.pinpoint}`,
    });
  }

  // Judge — after pinpoints (Rule 10.2.8)
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  return runs;
}

/**
 * Formats an unreported ECtHR case citation per AGLC4 Rule 14.3.2.
 *
 * Format: *Parties* (European Court of Human Rights, Chamber,
 *         Application No Number, Full Date) Pinpoint.
 *
 * The chamber element is the Court's configuration for the case — the rule
 * recognises only 'Grand Chamber' or 'Chamber'. 'Application Nos' (plural)
 * is used where multiple application numbers are joined with 'and'
 * (ex 33). Pinpoints are to paragraphs.
 *
 * @param data - The ECtHR unreported case data.
 * @returns An array of FormattedRun objects.
 *
 * @see AGLC4, Rule 14.3.2.
 */
export function formatEchrCase(data: {
  caseName: string;
  applicationNumber: string;
  /** 'Grand Chamber' or 'Chamber' (Rule 14.3.2). */
  chamber?: string;
  reportSeries?: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rules 14.3.1–14.3.3
  runs.push({ text: data.caseName, italic: true });

  // Build the parenthetical details
  const parts: string[] = ["European Court of Human Rights"];

  if (data.chamber) {
    parts.push(data.chamber);
  }

  const appLabel = /\band\b/.test(data.applicationNumber) ? "Application Nos" : "Application No";
  parts.push(`${appLabel} ${data.applicationNumber}`);

  if (data.reportSeries) {
    parts.push(data.reportSeries);
  }

  parts.push(data.date);

  runs.push({ text: ` (${parts.join(", ")})` });

  // Pinpoint — outside parentheses (Rule 14.3.2)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-012a: Other Supranational Decisions (Rule 14.4) ────────────────────

/**
 * Formats a decision of a supranational body not covered by specific rules.
 *
 * AGLC4 Rule 14.4: Decisions of other supranational courts and tribunals
 * are cited with the case name (italicised), the case or application
 * number, the court or tribunal name, and the date.
 *
 * Format:
 *   *Case Name* (Court/Tribunal, Case Number, Date)
 *
 * @example
 *   Velásquez Rodríguez v Honduras (Inter-American Court of Human
 *   Rights, Series C, No 4, 29 July 1988)
 */
export function formatSupranationalDecision(data: {
  caseName: string;
  court: string;
  caseNumber: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rule 14.4
  runs.push({ text: data.caseName, italic: true });

  // Court, case number, and date in parentheses
  runs.push({
    text: ` (${data.court}, ${data.caseNumber}, ${data.date})`,
  });

  return runs;
}

// ─── INTL-012b: Other Supranational Documents (Rule 14.5) ────────────────────

/**
 * Formats a document of a supranational parliament, council or other body
 * not covered by specific rules.
 *
 * AGLC4 Rule 14.5: All elements are comma-separated — the date is not
 * parenthesised:
 *   Body, *Title*, Doc No Number, Session, Full Date, Pinpoint.
 *
 * The document number is labelled 'Doc No' (added here where the supplied
 * value does not already carry it). The session element carries any
 * parliament/session/meeting information (e.g. '25th ord sess'). The title
 * may be omitted where the document has none.
 *
 * @example
 *   Assembly of the African Union, Decision on the Scale of Assessment and
 *   Alternative Sources of Financing the African Union,
 *   Doc No Assembly/AU/Dec.578(XXV), 25th ord sess, 14–15 June 2015
 */
export function formatSupranationalDocument(data: {
  body: string;
  title?: string;
  documentNumber: string;
  session?: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Body name (organisation omitted where already in the body's name)
  runs.push({ text: `${data.body}, ` });

  // Title — italicised, omitted where the document has none (Rule 14.5)
  if (data.title) {
    runs.push({ text: data.title, italic: true });
    runs.push({ text: ", " });
  }

  // Document number — 'Doc No' label
  const docNo = /^Doc No\b/i.test(data.documentNumber)
    ? data.documentNumber
    : `Doc No ${data.documentNumber}`;
  runs.push({ text: docNo });

  // Parliament, council, session, meeting, etc
  if (data.session) {
    runs.push({ text: `, ${data.session}` });
  }

  // Full date — comma-separated, not parenthesised (Rule 14.5)
  runs.push({ text: `, ${data.date}` });

  // Pinpoint — comma-separated (Rule 14.5)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── PARITY: Rules of Procedure of Supranational Courts (Rule 14.4.3) ────────

/**
 * Formats the rules of court or rules of procedure of a supranational
 * court or tribunal other than those of the European Union per AGLC4
 * Rule 14.4.3.
 *
 * AGLC4 Rule 14.4.3: the form is
 *   «Court», *Rules of Court/Procedure* (adopted «Full Date») «Pinpoint».
 * Pinpoints follow rule 8.7 and are generally to rules or sub-rules.
 *
 * @example
 *   // African Court on Human and Peoples' Rights, Rules of Court
 *   //   (adopted 2 June 2010) r 3(1)  — AGLC4 ex 41
 *   formatSupranationalRules({
 *     court: "African Court on Human and Peoples’ Rights",
 *     title: "Rules of Court",
 *     adoptedDate: "2 June 2010",
 *     pinpoint: "r 3(1)",
 *   })
 *
 * @param data - The rules citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 14.4.3.
 */
export function formatSupranationalRules(data: {
  court: string;
  /** Title of the rules (eg 'Rules of Court', 'Rules of Procedure'). */
  title: string;
  adoptedDate: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Court (roman), then the rules' title in italics
  runs.push({ text: `${data.court}, ` });
  runs.push({ text: data.title, italic: true });

  // Adoption date
  runs.push({ text: ` (adopted ${data.adoptedDate})` });

  // Pinpoint — generally rules or sub-rules (Rule 8.7)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── PARITY: Pleadings before Supranational Courts (Rule 14.4.4) ────────────

/**
 * Formats a pleading or other party/court document in proceedings before
 * a supranational court or tribunal (other than in the EU) per AGLC4
 * Rule 14.4.4.
 *
 * AGLC4 Rule 14.4.4: the form is
 *   '«Document Title»', «Parties' Names or Title» («Court», «Case
 *   Number», «Full Date») «Pinpoint».
 * The parties' names or proceeding title and the case number follow rules
 * 14.4.1–14.4.2; the date is the document's own; a speaker's name may
 * follow a pinpoint. (The guide's ex 43 omits the comma between case
 * number and date that the rule's template requires; the template governs
 * per DECISION-012.)
 *
 * @param data - The pleading citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 14.4.4.
 */
export function formatSupranationalPleading(data: {
  documentTitle: string;
  /** Parties' names or title of the proceeding (italicised). */
  caseName: string;
  court: string;
  /** Case number, labelled as the institution labels it (eg 'Series C No 82'). */
  caseNumber?: string;
  date: string;
  pinpoint?: string;
  /** Speaker's name, where not otherwise apparent (rules 10.2.8/2.4.4). */
  speaker?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Document title in single quotes (roman)
  runs.push({ text: `'${data.documentTitle}', ` });

  // Parties' names or proceeding title — italicised (Rules 14.4.1–14.4.2)
  runs.push({ text: data.caseName, italic: true });

  // Court, case number and full date parenthetical
  const parenParts = [data.court];
  if (data.caseNumber) {
    parenParts.push(data.caseNumber);
  }
  parenParts.push(data.date);
  runs.push({ text: ` (${parenParts.join(", ")})` });

  // Pinpoint, optionally followed by a speaker's name
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }
  if (data.speaker) {
    runs.push({ text: ` (${data.speaker})` });
  }

  return runs;
}
