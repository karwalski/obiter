/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatPinpoint } from "../general/pinpoints";

// ─── CASE-015: Identifying Judicial Officers (Rules 2.4.1–2.4.5) ────────────

/**
 * Pluralise a judicial title abbreviation when shared by multiple officers.
 *
 * AGLC4 Rule 2.4.2: Where two or more judicial officers share the same title,
 * the plural abbreviation is used after the last name (e.g. 'JJ' instead of 'J').
 */
function pluraliseTitle(title: string): string {
  const plurals: Record<string, string> = {
    J: "JJ",
    JA: "JJA",
    AJA: "AJJA",
  };
  return plurals[title] ?? title;
}

/**
 * Join a list of names with commas and 'and' before the last element.
 */
function joinNames(names: string[]): string {
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Format judicial officer references in a parenthetical according to
 * AGLC4 Rules 2.4.1–2.4.5.
 *
 * @remarks AGLC4 Rule 2.4.1: The names of judicial officers may be included in
 * a parenthetical after the citation. The abbreviated judicial title follows the
 * officer's surname.
 *
 * @remarks AGLC4 Rule 2.4.2: Where two or more judicial officers share the same
 * title, only the last officer listed carries the title, which is pluralised.
 * E.g. 'Gummow, Hayne and Heydon JJ'.
 *
 * @remarks AGLC4 Rule 2.4.3: Dissenting and concurring judgments are indicated
 * after the judicial title. E.g. 'Kirby J dissenting'.
 *
 * @remarks AGLC4 Rule 2.4.4: Where a judge agrees with the majority but writes
 * a separate judgment, 'agreeing' is used.
 *
 * @remarks AGLC4 Rule 2.4.4: When citing a statement made during argument,
 * the words 'during argument' should be included in separate parentheses
 * after the judicial officer's or counsel's name. 'Arguendo' should not
 * be used.
 *
 * @param officers - Array of judicial officers with name, title, and optional role
 * @returns FormattedRun[] representing the parenthetical
 */
export function formatJudicialOfficers(
  officers: Array<{
    name: string;
    title: string;
    role?: "majority" | "concurring" | "dissenting" | "agreeing" | "during_argument";
  }>,
): FormattedRun[] {
  if (officers.length === 0) {
    return [];
  }

  // Separate "during argument" officers — they render in separate parentheses
  // per Rule 2.4.4.
  const duringArgument = officers.filter((o) => o.role === "during_argument");
  const regular = officers.filter((o) => o.role !== "during_argument");

  // Group regular officers by title and role for shared-title collapsing.
  // Officers with dissenting/concurring/agreeing roles are rendered separately
  // since they need a role suffix.
  const groups: Array<{
    names: string[];
    title: string;
    role?: "majority" | "concurring" | "dissenting" | "agreeing";
  }> = [];

  for (const officer of regular) {
    const effectiveRole = (officer.role ?? "majority") as "majority" | "concurring" | "dissenting" | "agreeing";

    // Only group majority officers together by title; others render individually.
    if (effectiveRole === "majority") {
      const existing = groups.find(
        (g) => g.title === officer.title && (g.role === "majority" || g.role === undefined),
      );
      if (existing) {
        existing.names.push(officer.name);
      } else {
        groups.push({ names: [officer.name], title: officer.title, role: effectiveRole });
      }
    } else {
      groups.push({ names: [officer.name], title: officer.title, role: effectiveRole });
    }
  }

  const runs: FormattedRun[] = [];

  // Build the parenthetical content for regular officers.
  if (groups.length > 0) {
    const segments: string[] = [];

    for (const group of groups) {
      const titleStr = group.names.length > 1 ? pluraliseTitle(group.title) : group.title;
      const namesStr = joinNames(group.names);
      let segment = `${namesStr} ${titleStr}`;

      if (group.role === "dissenting") {
        segment += " dissenting";
      } else if (group.role === "concurring") {
        segment += " concurring";
      } else if (group.role === "agreeing") {
        segment += " agreeing";
      }

      segments.push(segment);
    }

    const inner = segments.join("; ");
    runs.push({ text: `(${inner})` });
  }

  // Append "during argument" officers in separate parentheses per Rule 2.4.4.
  for (const officer of duringArgument) {
    runs.push({ text: ` (${officer.name} ${officer.title}) (during argument)` });
  }

  return runs;
}

// ─── CASE-016: Case History (Rule 2.5) ──────────────────────────────────────

/**
 * Append case history entries after a citation according to AGLC4 Rule 2.5.
 *
 * @remarks AGLC4 Rule 2.5: Where the subsequent history of a case is relevant,
 * it should be appended after the citation, preceded by a comma and a linking
 * term. Standard linking terms include 'affd' (affirmed), 'revd' (reversed),
 * 'special leave to appeal granted', and 'special leave to appeal refused'.
 *
 * @param entries - Array of case history entries, each with a linking phrase and
 *   a pre-formatted citation
 * @returns FormattedRun[] representing the case history appendage
 */
export function formatCaseHistory(
  entries: Array<{ phrase: string; citation: FormattedRun[] }>,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  for (const entry of entries) {
    runs.push({ text: `, ${entry.phrase} ` });
    runs.push(...entry.citation);
  }

  return runs;
}

// ─── CASE-017: Administrative Decisions and Arbitration (Rules 2.6.1–2.6.2) ─

/**
 * Format an administrative decision citation according to AGLC4 Rule 2.6.1.
 *
 * @remarks AGLC4 Rule 2.6.1: Administrative decisions are cited in the form:
 * 'Re [Party] and [Department] (Year) Volume Report Series Starting Page'.
 * 'Re' is italicised.
 *
 * @param data - Administrative decision metadata
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatAdministrativeDecision(data: {
  party: string;
  department: string;
  year: number;
  volume?: number;
  reportSeries: string;
  startingPage: number;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: "Re ", italic: true });
  runs.push({ text: data.party, italic: true });
  runs.push({ text: " and ", italic: true });
  runs.push({ text: data.department, italic: true });

  const volumePart = data.volume !== undefined ? ` ${data.volume}` : "";
  runs.push({
    text: ` (${data.year})${volumePart} ${data.reportSeries} ${data.startingPage}`,
  });

  return runs;
}

/**
 * Format an arbitration citation according to AGLC4 Rule 2.6.2.
 *
 * @remarks AGLC4 Rule 2.6.2: Arbitration citations include the parties,
 * the type of arbitration, and the award details.
 *
 * @param data - Arbitration metadata
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatArbitration(data: {
  parties: string;
  arbitrationType: string;
  awardDetails: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: data.parties, italic: true });
  runs.push({ text: ` (${data.arbitrationType}) ${data.awardDetails}` });

  return runs;
}

// ─── CASE-018: Transcripts of Proceedings (Rules 2.7.1–2.7.2) ──────────────

/**
 * Format a general transcript of proceedings according to AGLC4 Rule 2.7.1.
 *
 * @remarks AGLC4 Rule 2.7.1: Transcripts of proceedings are cited in the form:
 * 'Transcript of Proceedings, Case Name (Court, Proceeding Number, Full Date)'.
 *
 * @param data - Transcript metadata including the pre-formatted case name
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatTranscript(data: {
  caseName: FormattedRun[];
  court: string;
  proceedingNumber: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: "Transcript of Proceedings, " });
  runs.push(...data.caseName);
  runs.push({ text: ` (${data.court}, ${data.proceedingNumber}, ${data.date})` });

  return runs;
}

/**
 * Format an HCA transcript citation according to AGLC4 Rule 2.7.2.
 *
 * @remarks AGLC4 Rule 2.7.2: From July 2003, High Court of Australia transcripts
 * are cited in the form:
 * 'Transcript of Proceedings, Case Name [Year] HCATrans Number'.
 *
 * @param data - HCA transcript metadata including the pre-formatted case name
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatHcaTranscript(data: {
  caseName: FormattedRun[];
  year: number;
  number: number;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: "Transcript of Proceedings, " });
  runs.push(...data.caseName);
  runs.push({ text: ` [${data.year}] HCATrans ${data.number}` });

  return runs;
}

// ─── CASE-019: Submissions in Cases (Rule 2.8) ─────────────────────────────

/**
 * Format a submission in a case according to AGLC4 Rule 2.8.
 *
 * @remarks AGLC4 Rule 2.8: Submissions in cases are cited in the form:
 * 'Party Name, 'Title of Submission', Submission in Case Name, Proceeding Number,
 * Full Date, [Pinpoint]'. The title of the submission is enclosed in single
 * quotation marks. The case name is italicised (provided via pre-formatted runs).
 *
 * @param data - Submission metadata
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatSubmission(data: {
  partyName: string;
  submissionTitle: string;
  caseName: FormattedRun[];
  proceedingNumber: string;
  date: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: `${data.partyName}, \u2018${data.submissionTitle}\u2019, Submission in ` });
  runs.push(...data.caseName);
  runs.push({ text: `, ${data.proceedingNumber}, ${data.date}` });

  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}
