/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Corporate Abbreviation Map ─────────────────────────────────────────────

/**
 * AGLC4 Rule 2.1.2 word abbreviations. The rule's table mandates exactly:
 * and→&, Company→Co, Limited→Ltd, Proprietary→Pty, Incorporated→Inc (plus
 * the corporate-status phrases handled separately below). Words such as
 * 'Corporation', 'Department' and 'Commission' are NOT abbreviated — the
 * guide's own examples keep 'Kuwait Airlines Corporation' (ex 39),
 * 'Seiko Epson Corporation' (ex 88) and 'Department of Industrial
 * Relations …' (ex 22) in full.
 *
 * 'and'→'&' is handled conditionally in {@link abbreviateCorporateNames}
 * because it applies only where the party is a business corporation or
 * firm (eg 'Re Judiciary and Navigation Acts' must keep its 'and').
 */
const CORPORATE_ABBREVIATIONS: ReadonlyMap<string, string> = new Map([
  ["Company", "Co"],
  ["Limited", "Ltd"],
  ["Proprietary", "Pty"],
  ["Incorporated", "Inc"],
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strips given names and initials from an individual party name,
 * leaving only the surname (AGLC4 Rule 2.1.1: individuals are cited by
 * surname only).
 *
 * The heuristic is deliberately conservative: a name is treated as an
 * individual only when it carries a strong signal — it contains
 * initials (eg 'R J Lewarne') or at least three capitalised name-like
 * words (eg 'Richard John Lewarne'). Two-word names are left intact
 * because a string like 'Hot Holdings' is indistinguishable from a
 * personal name and must not be corrupted (PARITY 2.1.1).
 */
function stripGivenNames(party: string): string {
  const trimmed = party.trim();

  // If the name contains corporate indicators, treat as non-individual
  const corporateIndicators = [
    "Pty",
    "Ltd",
    "Co",
    "Inc",
    "Corp",
    "Assn",
    "Dept",
    "Auth",
    "Cmmn",
    "Univ",
    "Company",
    "Limited",
    "Proprietary",
    "Incorporated",
    "Corporation",
    "Association",
    "Department",
    "Authority",
    "Commission",
    "University",
    "Council",
    "Committee",
    "Board",
    "Trust",
    "Minister",
    "State",
    "Commonwealth",
    "Government",
    // Australian states and territories (Rule 2.1.3)
    "New South Wales",
    "Queensland",
    "Victoria",
    "Tasmania",
    "South Australia",
    "Western Australia",
    "Northern Territory",
    "Australian Capital Territory",
    // Other common non-individual parties
    "Shire",
    "City",
    "County",
    "Police",
    "Director",
    "Commissioner",
    "Tribunal",
    "Treasurer",
    "Attorney-General",
    "DPP",
  ];

  for (const indicator of corporateIndicators) {
    if (trimmed.includes(indicator)) {
      return trimmed;
    }
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return trimmed;
  }

  // Check if any part is an initial (single letter optionally followed by a full stop)
  const hasInitials = parts.some((p) => /^[A-Z]\.?$/.test(p));

  // All parts look like name components (capitalised words or initials)
  const allNameLike = parts.every((p) => /^[A-Z][a-z]+$/.test(p) || /^[A-Z]\.?$/.test(p));

  // Strip only on a strong individual signal: initials, or three or more
  // name-like words. Two capitalised words alone (eg 'Hot Holdings') are
  // ambiguous and must be left as typed.
  if (hasInitials || (allNameLike && parts.length >= 3)) {
    // Return surname only (last part)
    return parts[parts.length - 1];
  }

  return trimmed;
}

/**
 * Strips "& Anor", "& Ors", and similar from a party string.
 */
function stripAnorOrs(name: string): string {
  return name.replace(/\s*&\s*(Anor|Ors)\b/gi, "").trim();
}

/**
 * Extracts only the first action from a multi-action party string.
 *
 * AGLC4 Rule 2.1.1: where the case involves more than one action, cite
 * only the first action (ex 3: 'Tame v New South Wales', not 'Tame v New
 * South Wales; Annetts v Australian Stations Pty Ltd'). The guide
 * separates actions with a semicolon, so that is the ONLY boundary this
 * helper splits on. A single party's own name may legitimately contain
 * 'and' or '&' ('Herald & Weekly Times Ltd', ex 66; 'Minister for
 * Immigration and Ethnic Affairs', ex 110) and must never be truncated
 * by string heuristics (PARITY 2.1.1).
 */
function firstPartyOnly(name: string): string {
  const segments = name.split(";");
  if (segments.length === 1) {
    return name.trim();
  }
  // Extended case names such as 'Re McBain; Ex parte Australian Catholic
  // Bishops Conference' (ex 27) or 'R v Kirby; Ex parte Boilermakers'
  // Society of Australia' (ex 29) are a SINGLE case name — keep the
  // 'Ex parte'/'Re' continuation rather than treating it as a second
  // action. (Ex 26-style 'Re Palmer; George v McIntyre' compounds cannot
  // be distinguished from multi-action strings and require the user to
  // supply the full name.)
  if (/^\s*(Ex parte|Re)\b/.test(segments[1])) {
    return name.trim();
  }
  return segments[0].trim();
}

// ─── CASE-001 (Rule 2.1.1) ─────────────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.1 — Party Name Formatting (General)**
 *
 * Returns the formatted case name as an array of `FormattedRun` elements.
 * The case name is italicised. Given names and initials are stripped from
 * individual party names. `& Anor` and `& Ors` are removed. Only the
 * first plaintiff and first defendant are included, and only the first
 * action where several actions are given.
 *
 * AGLC4 Rule 2.1.11: the separator 'v' "should not be followed by a full
 * stop and should be italicised" — it is part of the italicised case
 * name, so the separator run is emitted italic.
 *
 * @param party1 - Plaintiff / applicant party name(s).
 * @param party2 - Defendant / respondent party name(s).
 * @param separator - Separator between parties; defaults to `'v'`.
 * @returns Array of `FormattedRun` elements representing the formatted case name.
 */
export function formatCaseName(
  party1: string,
  party2: string,
  separator: string = "v"
): FormattedRun[] {
  let p1 = stripAnorOrs(party1);
  let p2 = stripAnorOrs(party2);

  p1 = firstPartyOnly(p1);
  p2 = firstPartyOnly(p2);

  p1 = stripGivenNames(p1);
  p2 = stripGivenNames(p2);

  p1 = abbreviateCorporateNames(p1);
  p2 = abbreviateCorporateNames(p2);

  // Single-party cases (e.g. "Re Microsoft Corporation", ex parte
  // applications, statutory references). When only one party is
  // populated, render it alone — do not emit a stray " v " or " and ".
  if (!p2.trim() && p1.trim()) {
    return [{ text: p1, italic: true }];
  }
  if (!p1.trim() && p2.trim()) {
    return [{ text: p2, italic: true }];
  }

  return [
    { text: p1, italic: true },
    // Rule 2.1.11: the 'v' is italicised as part of the case name.
    { text: ` ${separator} `, italic: true },
    { text: p2, italic: true },
  ];
}

// ─── CASE-002 (Rule 2.1.2) ─────────────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.2 — Business Corporations and Firms**
 *
 * Applies the rule's mandatory word abbreviations to corporate party
 * names: Company→Co, Limited→Ltd, Proprietary→Pty, Incorporated→Inc, and
 * and→& (the last only where the name shows corporate/firm indicators,
 * since 'and' in non-corporate names — 'Minister for Immigration and
 * Ethnic Affairs' — must be preserved). Corporate-status phrases are
 * abbreviated per the rule's table: (in liq), (in prov liq),
 * (admin apptd), (mgr apptd), (rec apptd).
 *
 * Removes full stops from abbreviations (Rule 1.6.1). Strips trading
 * names (`t/as …`) and former names. Strips ACN unless no other
 * identifying name remains (Rule 1.10.1). Preserves `The` when it is
 * part of the company name.
 *
 * @param name - The corporate party name to abbreviate.
 * @returns The abbreviated corporate name.
 */
export function abbreviateCorporateNames(name: string): string {
  let result = name;

  // Strip trading names: "t/as ..." or "trading as ..."
  result = result.replace(/\s+t\/as\s+.*/i, "");
  result = result.replace(/\s+trading\s+as\s+.*/i, "");

  // Strip ACN (Australian Company Number) unless it is the only identifier
  // ACN is typically "ACN 123 456 789"
  const withoutAcn = result.replace(/\s*\bACN\s+\d[\d\s]*/g, "").trim();
  if (withoutAcn.length > 0) {
    result = withoutAcn;
  }

  // Apply corporate abbreviations (whole words only)
  for (const [full, abbrev] of CORPORATE_ABBREVIATIONS) {
    result = result.replace(new RegExp(`\\b${full}\\b`, "g"), abbrev);
  }

  // Rule 2.1.2 table: 'and' → '&' where the party is a business
  // corporation or firm. Only applied when the name carries a corporate
  // indicator so that non-corporate 'and's survive intact.
  if (/\b(Pty|Ltd|Co|Inc)\b|&|\(in (?:prov )?liq\)/.test(result)) {
    result = result.replace(/\band\b/g, "&");
  }

  // Abbreviate corporate status phrases per Rule 2.1.2
  const STATUS_ABBREVIATIONS: [RegExp, string][] = [
    [/\(in provisional liquidation\)/gi, "(in prov liq)"],
    [/\(in liquidation\)/gi, "(in liq)"],
    [/\(administrator appointed\)/gi, "(admin apptd)"],
    [/\(manager appointed\)/gi, "(mgr apptd)"],
    [/\(receiver appointed\)/gi, "(rec apptd)"],
  ];
  for (const [pattern, abbrev] of STATUS_ABBREVIATIONS) {
    result = result.replace(pattern, abbrev);
  }

  // Remove full stops from abbreviations (e.g. "Pty." → "Pty")
  result = result.replace(/\b([A-Z][a-z]{1,4})\./g, "$1");

  return result.trim();
}

// ─── CASE-003 (Rules 2.1.4–2.1.7) ──────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.4 — The Crown**
 *
 * The Crown is abbreviated to `'R'` only where it is the *first-named*
 * party (ex 11: 'R v Reid'). Where the Crown is the respondent it is
 * written in full as `'The King'` or `'The Queen'` as appropriate
 * (ex 12: 'Honeysett v The Queen').
 *
 * @param position - `'first'` (default) when the Crown is the first-named
 *   party; `'respondent'` when the Crown responds.
 * @param monarch - `'Queen'` (default) or `'King'`, per the reigning
 *   monarch at the time of the decision. Only used for respondents.
 * @returns The Crown party name.
 */
export function formatCrownParty(
  position: "first" | "respondent" = "first",
  monarch: "Queen" | "King" = "Queen"
): string {
  if (position === "respondent") {
    return `The ${monarch}`;
  }
  return "R";
}

/**
 * **AGLC4 Rule 2.1.6 — Ministers, Officers and Government Departments**
 *
 * Formats a minister/officer/department party name, appending the
 * jurisdiction in abbreviated form in parentheses where it is part of
 * the title but not evident (ex 21: 'Treasurer (NSW)'). Department
 * names are NOT abbreviated — ex 22 keeps 'Department of Industrial
 * Relations and Technology (NSW)' in full; only Rule 2.1.2 corporate
 * words would be abbreviated, and departments contain none.
 *
 * @param department - The minister/officer/department title.
 * @param jurisdiction - Optional jurisdiction abbreviation (e.g. `'Cth'`, `'NSW'`).
 * @returns The formatted government party name.
 */
export function formatGovernmentParty(department: string, jurisdiction?: string): string {
  const abbreviated = abbreviateCorporateNames(department);
  if (jurisdiction) {
    return `${abbreviated} (${jurisdiction})`;
  }
  return abbreviated;
}

/**
 * **AGLC4 Rule 2.1.7 — Attorneys-General**
 *
 * Returns the footnote-citation form `A-G (Jurisdiction)`. The
 * jurisdiction always follows in abbreviated parentheses, even if not
 * included in the report; 'The' does not precede 'A-G'.
 *
 * @param jurisdiction - The jurisdiction abbreviation (e.g. `'Cth'`, `'NSW'`).
 * @returns The formatted Attorney-General citation.
 */
export function formatAttorneyGeneral(jurisdiction: string): string {
  return `A-G (${jurisdiction})`;
}

/**
 * **AGLC4 Rule 2.1.7 — Directors of Public Prosecutions**
 *
 * Returns `'DPP'` alone, or `'DPP (Jurisdiction)'` when a jurisdiction
 * is specified (the rule requires the abbreviated jurisdiction in
 * parentheses, ex 23: 'DPP (Vic) v Finn').
 *
 * @param jurisdiction - Optional jurisdiction abbreviation.
 * @returns The formatted DPP citation.
 */
export function formatDPP(jurisdiction?: string): string {
  if (jurisdiction) {
    return `DPP (${jurisdiction})`;
  }
  return "DPP";
}

// ─── CASE-004 (Rules 2.1.8–2.1.12) ─────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.9 — Ex parte Case Names**
 *
 * Formats an *ex parte* case name. Both `Ex parte` and the party name
 * are italicised.
 *
 * @param party - The party name in the ex parte proceeding.
 * @returns Array of `FormattedRun` elements.
 */
export function formatExParte(party: string): FormattedRun[] {
  const abbreviated = abbreviateCorporateNames(stripGivenNames(party));
  return [{ text: `Ex parte ${abbreviated}`, italic: true }];
}

/**
 * **AGLC4 Rule 2.1.8 — Re (In the matter of) Case Names**
 *
 * Formats a case name beginning with `Re`. Both `Re` and the party
 * name are italicised.
 *
 * @param party - The subject of the `Re` proceeding.
 * @returns Array of `FormattedRun` elements.
 */
export function formatRe(party: string): FormattedRun[] {
  const abbreviated = abbreviateCorporateNames(party);
  return [{ text: `Re ${abbreviated}`, italic: true }];
}

/**
 * **AGLC4 Rule 2.1.12 — Admiralty Cases**
 *
 * Formats an in rem admiralty case name: the case name is the vessel's
 * name only, italicised. The rule states 'The' *should be included* in
 * names of vessels (ex 33: 'The Maria Luisa [No 2]'), so callers should
 * pass the vessel name with its 'The'; it is emitted as given.
 *
 * @param shipName - The name of the ship, including `The`.
 * @returns Array of `FormattedRun` elements.
 */
export function formatAdmiraltyCase(shipName: string): FormattedRun[] {
  return [{ text: shipName, italic: true }];
}

// ─── CASE-005 (Rule 2.1.14) ────────────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.14 — Shortened and Popular Case Names**
 *
 * Suggests a short title for the case. The short title is the
 * first-named party. If the first party is the Crown (`R`), the
 * second party is used instead. Suffixes such as `[No 2]` are preserved.
 *
 * @param party1 - The first party (plaintiff/applicant).
 * @param party2 - The second party (defendant/respondent).
 * @param separator - The separator used (e.g. `'v'`).
 * @returns The suggested short title string.
 */
export function suggestShortTitle(party1: string, party2: string, separator: string): string {
  void separator;

  let cleanP1 = stripAnorOrs(party1);
  cleanP1 = firstPartyOnly(cleanP1);
  cleanP1 = stripGivenNames(cleanP1);
  cleanP1 = abbreviateCorporateNames(cleanP1);

  // Extract [No 2], [No 3], etc. from the original party names
  const noSuffix = party1.match(/\[No\s+\d+\]/i) || party2.match(/\[No\s+\d+\]/i);

  // If first party is the Crown, use second party
  if (cleanP1 === "R") {
    let cleanP2 = stripAnorOrs(party2);
    cleanP2 = firstPartyOnly(cleanP2);
    cleanP2 = stripGivenNames(cleanP2);
    cleanP2 = abbreviateCorporateNames(cleanP2);
    return noSuffix ? `${cleanP2} ${noSuffix[0]}` : cleanP2;
  }

  return noSuffix ? `${cleanP1} ${noSuffix[0]}` : cleanP1;
}

// ─── CASE-006 (Rule 2.1.15) ────────────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.15 — Omitting Case Name When in Body Text**
 *
 * Returns the citation without the case name, starting from the year,
 * for use when the case name already appears in body text. The format is:
 * `(year) volume reportSeries startingPage` or `[year] volume reportSeries startingPage`.
 *
 * @param yearType - `'round'` for `(year)` or `'square'` for `[year]`.
 * @param year - The year of the report.
 * @param volume - The volume number, if any.
 * @param reportSeries - The report series abbreviation.
 * @param startingPage - The starting page number.
 * @returns Array of `FormattedRun` elements representing the citation without the case name.
 */
export function formatCaseWithoutName(
  yearType: string,
  year: number,
  volume: number | undefined,
  reportSeries: string,
  startingPage: number
): FormattedRun[] {
  // Only emit elements that are actually present. An empty/zero year or page
  // must not render as the literal `(0)`/`0`, and a missing report series must
  // not leave a double space (BUG-005): an incomplete reported case (eg a bare
  // party name pasted with no year) yields no trailing citation rather than
  // placeholder zeros.
  const parts: string[] = [];
  if (year) {
    parts.push(yearType === "square" ? `[${year}]` : `(${year})`);
  }
  if (volume !== undefined && volume > 0) {
    parts.push(String(volume));
  }
  if (reportSeries && reportSeries.trim()) {
    parts.push(reportSeries.trim());
  }
  if (startingPage) {
    parts.push(String(startingPage));
  }

  return parts.length > 0 ? [{ text: parts.join(" ") }] : [];
}
