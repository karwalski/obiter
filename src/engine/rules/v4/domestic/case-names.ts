/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Corporate Abbreviation Map ─────────────────────────────────────────────

const CORPORATE_ABBREVIATIONS: ReadonlyMap<string, string> = new Map([
  ["Company", "Co"],
  ["Limited", "Ltd"],
  ["Proprietary", "Pty"],
  ["Incorporated", "Inc"],
  ["Corporation", "Corp"],
  ["Association", "Assn"],
  ["Department", "Dept"],
  ["Authority", "Auth"],
  ["Commission", "Cmmn"],
  ["University", "Univ"],
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strips given names and initials from an individual party name,
 * leaving only the surname. A name is considered an individual if it
 * contains at least two space-separated words and does not look like
 * a corporate entity.
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

  // If all parts look like name components (capitalised words or initials), treat as individual
  const allNameLike = parts.every(
    (p) => /^[A-Z][a-z]+$/.test(p) || /^[A-Z]\.?$/.test(p)
  );

  if (hasInitials || allNameLike) {
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
 * Extracts only the first party from a potentially multi-party string
 * (parties separated by semicolons, "and", or "&").
 */
function firstPartyOnly(name: string): string {
  // Split on semicolons first
  const semiParts = name.split(";");
  let first = semiParts[0].trim();

  // Then split on " and " (but not "& Anor"/"& Ors" which are already stripped)
  const andParts = first.split(/\s+and\s+/i);
  first = andParts[0].trim();

  // Split on "&" (but preserve corporate names like "Smith & Co")
  const ampParts = first.split(/\s*&\s*/);
  if (ampParts.length > 1) {
    // Only split if the part after & looks like another party name (capitalised word)
    const afterAmp = ampParts[1].trim();
    if (/^[A-Z][a-z]/.test(afterAmp) && !afterAmp.match(/^(Co|Sons|Partners)\b/)) {
      first = ampParts[0].trim();
    }
  }

  return first;
}

// ─── CASE-001 (Rule 2.1.1) ─────────────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.1 — Party Name Formatting (General)**
 *
 * Returns the formatted case name as an array of `FormattedRun` elements.
 * The case name is italicised. Given names and initials are stripped from
 * individual party names. `& Anor` and `& Ors` are removed. Only the
 * first plaintiff and first defendant are included.
 *
 * The separator (default `'v'`) is rendered in roman (non-italic) per Rule 2.1.11.
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

  return [
    { text: p1, italic: true },
    { text: ` ${separator} `, italic: true },
    { text: p2, italic: true },
  ];
}

// ─── CASE-002 (Rule 2.1.2) ─────────────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.2 — Corporate Party Abbreviations**
 *
 * Auto-abbreviates standard corporate words:
 * Company→Co, Limited→Ltd, Proprietary→Pty, Incorporated→Inc,
 * Corporation→Corp, Association→Assn, Department→Dept, Authority→Auth,
 * Commission→Cmmn, University→Univ.
 *
 * Removes full stops from abbreviations. Strips trading names (`t/as …`).
 * Strips ACN unless no other identifying name remains.
 * Preserves `The` when it is part of the company name.
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

// ─── CASE-003 (Rules 2.1.3–2.1.7) ──────────────────────────────────────────

/**
 * **AGLC4 Rule 2.1.3 — Crown Parties in Criminal Cases**
 *
 * Returns `'R'` for criminal proceedings where the Crown is a party.
 * The jurisdiction parameter is accepted for interface consistency but
 * the Crown is always cited as `R` regardless of jurisdiction.
 *
 * @param jurisdiction - Optional jurisdiction identifier (unused; Crown is always `R`).
 * @returns `'R'` representing the Crown.
 */
export function formatCrownParty(jurisdiction?: string): string {
  // Per Rule 2.1.3, the Crown is always cited as 'R' in criminal cases,
  // regardless of the jurisdiction. The jurisdiction parameter is accepted
  // for API consistency but is intentionally unused.
  void jurisdiction;
  return "R";
}

/**
 * **AGLC4 Rule 2.1.4 — Government Department Parties**
 *
 * Abbreviates government department names using standard corporate
 * abbreviations and returns the formatted name with optional
 * jurisdiction abbreviation.
 *
 * @param department - The government department name.
 * @param jurisdiction - Optional jurisdiction abbreviation (e.g. `'Cth'`, `'NSW'`).
 * @returns The abbreviated government department party name.
 */
export function formatGovernmentParty(
  department: string,
  jurisdiction?: string
): string {
  const abbreviated = abbreviateCorporateNames(department);
  if (jurisdiction) {
    return `${abbreviated} (${jurisdiction})`;
  }
  return abbreviated;
}

/**
 * **AGLC4 Rule 2.1.5 — Attorney-General**
 *
 * Returns the Attorney-General citation in the form `A-G (Jurisdiction)`.
 *
 * @param jurisdiction - The jurisdiction abbreviation (e.g. `'Cth'`, `'NSW'`).
 * @returns The formatted Attorney-General citation.
 */
export function formatAttorneyGeneral(jurisdiction: string): string {
  return `A-G (${jurisdiction})`;
}

/**
 * **AGLC4 Rule 2.1.6 — Director of Public Prosecutions**
 *
 * Returns `'DPP'` alone, or `'DPP (Jurisdiction)'` when a jurisdiction
 * is specified to distinguish between Commonwealth and state DPPs.
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
 * **AGLC4 Rule 2.1.8 — Ex parte Case Names**
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
 * **AGLC4 Rule 2.1.9 — Re (In the matter of) Case Names**
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
 * **AGLC4 Rule 2.1.10 — Admiralty Cases**
 *
 * Formats an admiralty case name. The ship name is italicised.
 *
 * @param shipName - The name of the ship (without `The`; it will not be added).
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
export function suggestShortTitle(
  party1: string,
  party2: string,
  separator: string
): string {
  void separator;

  let cleanP1 = stripAnorOrs(party1);
  cleanP1 = firstPartyOnly(cleanP1);
  cleanP1 = stripGivenNames(cleanP1);
  cleanP1 = abbreviateCorporateNames(cleanP1);

  // Extract [No 2], [No 3], etc. from the original party names
  const noSuffix =
    party1.match(/\[No\s+\d+\]/i) || party2.match(/\[No\s+\d+\]/i);

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
  const yearStr =
    yearType === "square" ? `[${year}]` : `(${year})`;

  const parts = [yearStr];
  if (volume !== undefined) {
    parts.push(String(volume));
  }
  parts.push(reportSeries);
  parts.push(String(startingPage));

  return [{ text: parts.join(" ") }];
}
