/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { getJudicialTitlePlural, isTitleBeforeName } from "../../../data/judicial-titles";
import { formatPinpoint } from "../general/pinpoints";

// ─── CASE-015: Identifying Judicial Officers (Rules 2.4.1–2.4.5) ────────────
//
// Plural abbreviations (Rule 2.4.5) and the asterisked before-the-name
// offices (Rule 2.4.1 — 'Commissioner Buss' ex 93, 'Judge Lacava' ex 117)
// come from the shared rule 2.4.1 table dataset in
// src/engine/data/judicial-titles.ts; where the table gives no plural the
// singular is repeated after each name.

/**
 * A judicial officer reference per AGLC4 Rules 2.4.1–2.4.5.
 */
export interface JudicialOfficerRef {
  /** Surname (with first name/initials only where needed, Rule 2.4.1). */
  name: string;
  /** Office abbreviation/title from the Rule 2.4.1 table (eg 'J', 'CJ', 'Commissioner'). */
  title: string;
  /**
   * - `majority` (default): part of the main listing.
   * - `agreeing` / `dissenting`: Rule 2.4.2, rendered inside the same
   *   parentheses after the main listing.
   * - `for_the_court`: Rule 2.4.3, 'for the Court' follows the name.
   * - `during_argument`: Rule 2.4.4, separate '(during argument)' parentheses.
   * - `concurring`: legacy alias retained for stored data; Rule 2.4.3
   *   directs separate concurring judgments to the 'agreeing' form.
   */
  role?:
    | "majority"
    | "concurring"
    | "dissenting"
    | "agreeing"
    | "during_argument"
    | "for_the_court";
  /**
   * Rule 2.4.2: pinpoint to a separate agreeing (or dissenting) judgment,
   * rendered as 'agreeing at «pinpoint»' (ex 96: 'Webb J agreeing at 591').
   */
  agreeingAt?: string;
  /**
   * Rule 2.4.5: officers share a plural title only when they shared a
   * *joint judgment*. Officers with the same title but different
   * `judgmentGroup` values wrote separate judgments and keep the
   * singular title each (fn 106: 'Heydon J, Kirby J and Crennan J').
   * When omitted, same-title officers are treated as a joint judgment.
   */
  judgmentGroup?: string;
  /**
   * Rule 2.4.3: the judicial officer(s) on whose behalf the judgment was
   * delivered, rendered as 'for «names»' (ex 101: 'Hudson J for
   * Gavan Duffy and Hudson JJ'). The deliverer's own name appears in
   * this list when the judgment is also on their behalf.
   */
  onBehalfOf?: Array<{ name: string; title: string }>;
}

/**
 * Render one group of officers who shared a joint judgment as "name
 * units" — the title attached per Rules 2.4.1/2.4.5:
 * - pre-name titles (asterisked in the 2.4.1 table) precede each name;
 * - a plural title attaches once, after the last name of the group;
 * - titles with no plural form repeat after each name (Rule 2.4.5).
 */
function groupNameUnits(names: string[], title: string): string[] {
  if (!title) {
    return [...names];
  }
  if (isTitleBeforeName(title)) {
    return names.map((n) => `${title} ${n}`);
  }
  if (names.length === 1) {
    return [`${names[0]} ${title}`];
  }
  const plural = getJudicialTitlePlural(title);
  if (plural) {
    return [...names.slice(0, -1), `${names[names.length - 1]} ${plural}`];
  }
  return names.map((n) => `${n} ${title}`);
}

/**
 * Join name units with commas and a single 'and' before the last unit
 * (ex 94: 'Maxwell P, Buchanan, Nettle, Neave and Redlich JJA').
 */
function joinUnits(units: string[]): string {
  if (units.length === 1) {
    return units[0];
  }
  return `${units.slice(0, -1).join(", ")} and ${units[units.length - 1]}`;
}

interface OfficerGroup {
  names: string[];
  title: string;
  role: "majority" | "concurring" | "dissenting" | "agreeing" | "for_the_court";
  agreeingAt?: string;
  judgmentGroup?: string;
  onBehalfOf?: Array<{ name: string; title: string }>;
}

/**
 * Format judicial officer references in a parenthetical according to
 * AGLC4 Rules 2.4.1–2.4.5.
 *
 * @remarks AGLC4 Rule 2.4.1: judicial officers are identified in
 * parentheses after the pinpoint; the abbreviated office follows the
 * surname, except asterisked offices (Commissioner, Judge, Magistrate,
 * Master) which appear in full before the name. 'Per' is not used.
 *
 * @remarks AGLC4 Rule 2.4.2: agreement (and, where important, dissent)
 * is recorded inside the same parentheses, comma-separated, each
 * agreeing officer separately with an optional 'at' pinpoint
 * (ex 96: '(Kitto J, Webb J agreeing at 591)').
 *
 * @remarks AGLC4 Rule 2.4.3: a judgment of the Court takes 'for the
 * Court' after the deliverer's name (ex 100); a judgment delivered on
 * behalf of other officers takes 'for' plus their names (ex 101).
 *
 * @remarks AGLC4 Rule 2.4.4: statements made during argument take
 * '(during argument)' as a separate parenthetical; 'Arguendo' is not used.
 *
 * @remarks AGLC4 Rule 2.4.5: the plural abbreviation is used only for a
 * joint judgment; officers who wrote separate judgments keep the
 * singular title each, even when they agree.
 *
 * @param officers - Array of judicial officers
 * @returns FormattedRun[] representing the parenthetical(s)
 */
export function formatJudicialOfficers(officers: JudicialOfficerRef[]): FormattedRun[] {
  if (officers.length === 0) {
    return [];
  }

  // "During argument" officers render in separate parentheses (Rule 2.4.4).
  const duringArgument = officers.filter((o) => o.role === "during_argument");
  const regular = officers.filter((o) => o.role !== "during_argument");

  // Group officers who shared a joint judgment: same role, same title,
  // same judgmentGroup and (for agreeing officers) the same 'at'
  // pinpoint (ex 97: 'Brennan, Deane and Gaudron JJ agreeing at 570').
  // Officers carrying 'for the Court'/'for …' render individually.
  const groups: OfficerGroup[] = [];
  for (const officer of regular) {
    const role = (officer.role ?? "majority") as OfficerGroup["role"];
    const mergeable = !officer.onBehalfOf && role !== "for_the_court";
    const existing = mergeable
      ? groups.find(
          (g) =>
            g.role === role &&
            g.title === officer.title &&
            g.judgmentGroup === officer.judgmentGroup &&
            g.agreeingAt === officer.agreeingAt &&
            !g.onBehalfOf
        )
      : undefined;
    if (existing) {
      existing.names.push(officer.name);
    } else {
      groups.push({
        names: [officer.name],
        title: officer.title,
        role,
        agreeingAt: officer.agreeingAt,
        judgmentGroup: officer.judgmentGroup,
        onBehalfOf: officer.onBehalfOf,
      });
    }
  }

  // Main listing (majority + for-the-court groups): all name units are
  // joined with commas and a single 'and' before the final unit of the
  // whole listing (ex 94, ex 95).
  const mainGroups = groups.filter((g) => g.role === "majority" || g.role === "for_the_court");
  const suffixGroups = groups.filter((g) => g.role !== "majority" && g.role !== "for_the_court");

  const segments: string[] = [];

  if (mainGroups.length > 0) {
    const units: string[] = [];
    for (const group of mainGroups) {
      const groupUnits = groupNameUnits(group.names, group.title);
      if (group.role === "for_the_court") {
        groupUnits[groupUnits.length - 1] += " for the Court";
      } else if (group.onBehalfOf && group.onBehalfOf.length > 0) {
        // Rule 2.4.3: 'for' followed by the officers on whose behalf the
        // judgment is delivered, grouped/pluralised per Rule 2.4.5.
        const behalfGroups: Array<{ names: string[]; title: string }> = [];
        for (const b of group.onBehalfOf) {
          const bg = behalfGroups.find((g) => g.title === b.title);
          if (bg) {
            bg.names.push(b.name);
          } else {
            behalfGroups.push({ names: [b.name], title: b.title });
          }
        }
        const behalfUnits = behalfGroups.flatMap((g) => groupNameUnits(g.names, g.title));
        groupUnits[groupUnits.length - 1] += ` for ${joinUnits(behalfUnits)}`;
      }
      units.push(...groupUnits);
    }
    segments.push(joinUnits(units));
  }

  // Agreement/dissent segments follow inside the same parentheses,
  // comma-separated (Rule 2.4.2).
  for (const group of suffixGroups) {
    const units = groupNameUnits(group.names, group.title);
    let segment = joinUnits(units);
    if (group.role === "dissenting") {
      segment += " dissenting";
    } else if (group.role === "concurring") {
      segment += " concurring";
    } else {
      segment += " agreeing";
    }
    if (group.agreeingAt) {
      segment += ` at ${group.agreeingAt}`;
    }
    segments.push(segment);
  }

  const runs: FormattedRun[] = [];
  if (segments.length > 0) {
    runs.push({ text: `(${segments.join(", ")})` });
  }

  // "During argument" officers in separate parentheses per Rule 2.4.4.
  for (const officer of duringArgument) {
    const unit = groupNameUnits([officer.name], officer.title)[0];
    const prefix = runs.length > 0 ? " " : "";
    runs.push({ text: `${prefix}(${unit}) (during argument)` });
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
  entries: Array<{ phrase: string; citation: FormattedRun[] }>
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
 * @remarks AGLC4 Rule 2.6.1: Administrative decisions and determinations
 * are cited in the same way as reported and unreported cases, except:
 * party names are often separated by 'and' rather than 'v' (rendered as
 * it appears on the decision); the title may be a number or code rather
 * than party names (ex 109: 'AAT Case 7422' — no 'Re'); and
 * decision-makers may bear the titles 'Member', 'Deputy Member' or
 * 'Senior Member', which precede the name.
 *
 * A 'Re' prefix is added only for the two-party 'Re X and Y' form
 * (ex 110); single-title decisions (number/code titles, 'Application by
 * …') are emitted as given.
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
  /** Pinpoint after the starting page, comma-separated (ex 109: ', 3456 [28]'). */
  pinpoint?: Pinpoint;
  /** Separator between the parties as it appears on the decision. Defaults to 'and'. */
  separator?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const party = (data.party ?? "").trim();
  const department = (data.department ?? "").trim();
  // 'Re' applies to the two-party 'Re X and Y' form only; number/code
  // titles (ex 109) and 'Application by …' titles (ex 111) take no
  // prefix. Avoid "Re Re ..." when the user already typed the prefix.
  const hasRePrefix = /^re\s/i.test(party);
  if (department && !hasRePrefix) {
    runs.push({ text: "Re ", italic: true });
  }
  runs.push({ text: party, italic: true });
  // Only emit " and Department" when there actually IS a department —
  // otherwise we render the broken "X and  (0)  0" trail for matters
  // with no opposing party. The separator renders as it appears on the
  // decision itself (Rule 2.6.1) — usually 'and', occasionally 'v'.
  if (department) {
    runs.push({ text: ` ${(data.separator ?? "and").trim()} `, italic: true });
    runs.push({ text: department, italic: true });
  }

  // The (Year) Volume Series Page tail is only meaningful when at least
  // one of those values is populated. Skip entirely otherwise so the
  // citation does not render "(0) 0".
  const hasYear = data.year > 0;
  const hasVolume = data.volume !== undefined && data.volume > 0;
  const hasSeries = (data.reportSeries ?? "").trim().length > 0;
  const hasPage = data.startingPage > 0;
  if (hasYear || hasVolume || hasSeries || hasPage) {
    const segments: string[] = [];
    if (hasYear) segments.push(`(${data.year})`);
    if (hasVolume) segments.push(String(data.volume));
    if (hasSeries) segments.push(data.reportSeries.trim());
    if (hasPage) segments.push(String(data.startingPage));
    runs.push({ text: ` ${segments.join(" ")}` });
  }

  // Pinpoint, comma-separated as for reported cases (ex 109:
  // '(1991) 22 ATR 3450, 3456 [28]').
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

/**
 * Format an arbitration citation according to AGLC4 Rule 2.6.2.
 *
 * @remarks AGLC4 Rule 2.6.2: Arbitral decisions are cited as:
 * `«Case Name» («Award Description», «Forum», «Case/Award No #», «Full Date») «Pinpoint»`.
 * Only information appearing on the decision is included. If the
 * parties' names are omitted from the decision, the other elements are
 * included without parentheses, and a comma separates the full date from
 * any pinpoint (with party names, no punctuation intervenes between the
 * closing parenthesis and the pinpoint). Where there is no forum, the
 * arbitrator's name may be substituted (ex 112). A reproduction in a
 * report series, book or periodical is appended after 'reported in'.
 *
 * The deprecated `arbitrationType`/`awardDetails` fields preserve the
 * legacy output for stored data that predates the template fields.
 *
 * @param data - Arbitration metadata
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatArbitration(data: {
  parties?: string;
  /** Award description as it appears (eg 'Award', 'Final Award'). */
  awardDescription?: string;
  /** The arbitral forum; the arbitrator's name(s) where there is none. */
  forum?: string;
  /** Case/award number with the forum's own designation (eg 'Case No 1930'). */
  caseNumber?: string;
  /** Full date of the decision. */
  date?: string;
  /** Page/paragraph pinpoint (Rules 1.1.6–1.1.7), eg '[10.2]'. */
  pinpoint?: string;
  /** Citation of the reproduction, appended after 'reported in'. */
  reportedIn?: FormattedRun[];
  /** @deprecated Legacy field; use awardDescription/forum/caseNumber/date. */
  arbitrationType?: string;
  /** @deprecated Legacy field; use awardDescription/forum/caseNumber/date. */
  awardDetails?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const detailParts = [data.awardDescription, data.forum, data.caseNumber, data.date].filter(
    (p): p is string => Boolean(p && p.trim())
  );

  // Legacy path: no template fields supplied.
  if (detailParts.length === 0 && (data.arbitrationType || data.awardDetails)) {
    runs.push({ text: data.parties ?? "", italic: true });
    runs.push({ text: ` (${data.arbitrationType ?? ""}) ${data.awardDetails ?? ""}` });
    return runs;
  }

  const details = detailParts.join(", ");

  if (data.parties && data.parties.trim()) {
    runs.push({ text: data.parties.trim(), italic: true });
    runs.push({ text: ` (${details})` });
    // With party names: no punctuation between ')' and the pinpoint.
    if (data.pinpoint) {
      runs.push({ text: ` ${data.pinpoint}` });
    }
  } else {
    // Without party names: elements without parentheses; a comma
    // separates the full date from any pinpoint (ex 115).
    runs.push({ text: details });
    if (data.pinpoint) {
      runs.push({ text: `, ${data.pinpoint}` });
    }
  }

  if (data.reportedIn && data.reportedIn.length > 0) {
    runs.push({ text: " reported in " });
    runs.push(...data.reportedIn);
  }

  return runs;
}

// ─── CASE-018: Transcripts of Proceedings (Rules 2.7.1–2.7.2) ──────────────

/**
 * A transcript pinpoint (page or line numbers) with an optional speaker.
 * Rules 2.7.1–2.7.2: after a pinpoint, a speaker's name may be included
 * (formatted per Rule 2.4) but '(during argument)' must not be added.
 */
export interface TranscriptPinpoint {
  /** Page or line number(s), eg '31' or '2499–517'. */
  value: string;
  /** Speaker name as formatted per Rule 2.4, eg 'PJ Bick QC'. */
  speaker?: string;
}

/**
 * Render transcript pinpoint/speaker pairs, eg '31 (PJ Bick QC)' or
 * '2499–517 (Callinan J and JBR Beach QC), 2589–93 (McHugh J)'.
 */
function renderTranscriptPinpoints(pinpoints: TranscriptPinpoint[]): string {
  return pinpoints.map((p) => (p.speaker ? `${p.value} (${p.speaker})` : p.value)).join(", ");
}

/**
 * Format a general transcript of proceedings according to AGLC4 Rule 2.7.1.
 *
 * @remarks AGLC4 Rule 2.7.1: Transcripts of proceedings are cited as:
 * `Transcript of Proceedings, «Case Name» («Court», «Proceeding Number», «Judicial Officer(s)», «Full Date of Proceedings») «Pinpoint»`.
 * The proceeding number is included only if it appears on the transcript.
 * The names of ALL judicial officers hearing the matter follow the
 * proceeding number. Pinpoints are to page or line numbers; a speaker's
 * name may follow a pinpoint but '(during argument)' must not.
 *
 * @example `Transcript of Proceedings, Celano v Swan (County Court of Victoria, 09/0867, Judge Lacava, 27 August 2009) 11 (SM Petrovich)`
 *
 * @param data - Transcript metadata including the pre-formatted case name
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatTranscript(data: {
  caseName: FormattedRun[];
  court: string;
  /** Included only if it appears on the transcript (Rule 2.7.1). */
  proceedingNumber?: string;
  /**
   * All judicial officers hearing the matter, formatted per Rule 2.4
   * (eg 'Croft J', 'Judge Lacava').
   */
  judicialOfficers?: string;
  date: string;
  /** Pinpoint(s) after the closing parenthesis, no comma (ex 116). */
  pinpoints?: TranscriptPinpoint[];
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: "Transcript of Proceedings, " });
  runs.push(...data.caseName);

  const parts: string[] = [data.court];
  if (data.proceedingNumber && data.proceedingNumber.trim()) {
    parts.push(data.proceedingNumber.trim());
  }
  if (data.judicialOfficers && data.judicialOfficers.trim()) {
    parts.push(data.judicialOfficers.trim());
  }
  parts.push(data.date);
  runs.push({ text: ` (${parts.join(", ")})` });

  if (data.pinpoints && data.pinpoints.length > 0) {
    runs.push({ text: ` ${renderTranscriptPinpoints(data.pinpoints)}` });
  }

  return runs;
}

/**
 * Format an HCA transcript citation according to AGLC4 Rule 2.7.2.
 *
 * @remarks AGLC4 Rule 2.7.2: High Court transcripts bearing an
 * 'HCATrans' number on the transcript itself (from July 2003) are cited as:
 * `Transcript of Proceedings, «Case Name» [«Year»] HCATrans «Number», «Pinpoint»`.
 * Pinpoints are to line numbers; a speaker's name may follow a pinpoint
 * (per Rule 2.4) but '(during argument)' must not be included. Other
 * High Court transcripts are cited under Rule 2.7.1.
 *
 * @example `Transcript of Proceedings, Mulholland v Australian Electoral Commission [2004] HCATrans 8, 2499–517 (Callinan J and JBR Beach QC), 2589–93 (McHugh J)`
 *
 * @param data - HCA transcript metadata including the pre-formatted case name
 * @returns FormattedRun[] representing the formatted citation
 */
export function formatHcaTranscript(data: {
  caseName: FormattedRun[];
  year: number;
  number: number;
  /** Line-number pinpoint(s), comma-separated after the number (ex 119). */
  pinpoints?: TranscriptPinpoint[];
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: "Transcript of Proceedings, " });
  runs.push(...data.caseName);
  runs.push({ text: ` [${data.year}] HCATrans ${data.number}` });

  if (data.pinpoints && data.pinpoints.length > 0) {
    runs.push({ text: `, ${renderTranscriptPinpoints(data.pinpoints)}` });
  }

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
