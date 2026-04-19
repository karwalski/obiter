/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Post-nominals that must be stripped from author names (Rule 4.1.1).
 * Matched case-insensitively against trailing tokens.
 */
const POST_NOMINALS: ReadonlySet<string> = new Set([
  "AM",
  "AO",
  "AC",
  "AD",
  "AK",
  "CVO",
  "GC",
  "MG",
  "OAM",
  "OBE",
  "MBE",
  "CBE",
  "KBE",
  "DBE",
  "KCMG",
  "GCMG",
  "CH",
  "OM",
  "QC",
  "KC",
  "SC",
  "PhD",
  "DPhil",
  "SJD",
  "JSD",
  "LLB",
  "LLM",
  "LLD",
  "BA",
  "MA",
  "BSc",
  "MSc",
  "BCL",
  "BEc",
  "BComm",
  "MCL",
  "JD",
  "MD",
  "FAAL",
  "FASSA",
  "FBA",
  "FRSA",
  "PSM",
  "RFD",
  "ED",
]);

/**
 * Honorific titles that are retained in author names (Rule 4.1.1).
 * All other honorifics (eg "Professor", "Dr", "The Hon") are stripped.
 */
const RETAINED_TITLES: ReadonlySet<string> = new Set([
  "Sir",
  "Dame",
  "Lord",
  "Lady",
  "Viscount",
  "Baron",
  "Baroness",
]);

/**
 * Honorific prefixes to strip when they appear at the start of givenNames.
 */
const STRIPPED_TITLE_PREFIXES: ReadonlyArray<string> = [
  "The Honourable",
  "The Hon",
  "Honourable",
  "Hon",
  "Professor",
  "Prof",
  "Doctor",
  "Dr",
  "The Right Honourable",
  "The Rt Hon",
  "Rt Hon",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strips post-nominal letters from a name string.
 */
function stripPostNominals(name: string): string {
  const tokens = name.split(/\s+/);
  // Walk backwards, removing any trailing post-nominals (with or without commas)
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1].replace(/,/g, "");
    if (POST_NOMINALS.has(last)) {
      tokens.pop();
    } else {
      break;
    }
  }
  return tokens.join(" ");
}

/**
 * Strips non-retained honorific titles from the start of a given-names string.
 * Retained titles (Sir, Dame, Lord, Lady, Viscount, Baron, Baroness) are kept.
 */
function stripHonorifics(givenNames: string): string {
  let result = givenNames.trim();

  // Try stripping known non-retained prefixes (longest first for greedy match)
  const sorted = [...STRIPPED_TITLE_PREFIXES].sort(
    (a, b) => b.length - a.length,
  );
  for (const prefix of sorted) {
    const re = new RegExp(`^${prefix}\\b\\s*`, "i");
    if (re.test(result)) {
      result = result.replace(re, "").trim();
      // Only strip one prefix layer, then re-check
      break;
    }
  }

  return result;
}

/**
 * Collapses initials so they have no spaces or full stops between them.
 * E.g. "H. L. A." -> "HLA", "H L A" -> "HLA", "H.L.A." -> "HLA".
 * Mixed initials and words are handled: "H.L.A. Herbert" -> "HLA Herbert".
 */
function collapseInitials(name: string): string {
  // Split into tokens and rebuild, collapsing consecutive single-letter
  // initials (with or without dots) into a single block.
  const tokens = name.split(/\s+/);
  const result: string[] = [];
  let initialBlock = "";

  for (const token of tokens) {
    // Check if token is a dotted-initial sequence: "A.", "H.L.A.", "R.J."
    if (/^([A-Z]\.)+$/.test(token)) {
      // Extract all letters and add to initial block
      initialBlock += token.replace(/\./g, "");
      continue;
    }

    // Check if token is a single uppercase letter: "A", "H"
    if (/^[A-Z]$/.test(token)) {
      initialBlock += token;
      continue;
    }

    // Not an initial — flush any accumulated initials first
    if (initialBlock) {
      result.push(initialBlock);
      initialBlock = "";
    }
    result.push(token);
  }

  // Flush remaining initials
  if (initialBlock) {
    result.push(initialBlock);
  }

  return result.join(" ").trim();
}

/**
 * Processes given names: strips honorifics, post-nominals, collapses initials.
 */
function processGivenNames(givenNames: string): string {
  let result = stripHonorifics(givenNames);
  result = stripPostNominals(result);
  result = collapseInitials(result);
  return result.trim();
}

/**
 * Extracts a retained title from the start of given names, if present.
 * Returns [title | null, remainingGivenNames].
 */
function extractRetainedTitle(givenNames: string): [string | null, string] {
  const trimmed = givenNames.trim();
  for (const title of RETAINED_TITLES) {
    if (
      trimmed === title ||
      trimmed.startsWith(title + " ")
    ) {
      return [title, trimmed.slice(title.length).trim()];
    }
  }
  return [null, trimmed];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Formats an author name as it appears on the title page (Rule 4.1.1).
 *
 * AGLC4 Rule 4.1.1: Authors should be cited as their name appears on the
 * title page of the source. Post-nominals should not be included. Titles
 * should not be included except for Sir, Dame, Lord, Lady, Viscount, Baron
 * and Baroness. Initials should be written without spaces or full stops.
 *
 * @returns Formatted name as `Given Names Surname` (e.g. `HLA Hart`, `Sir Anthony Mason`)
 */
export function formatAuthorName(author: Author): string {
  const [retainedTitle, restOfGiven] = extractRetainedTitle(author.givenNames);
  const processedGiven = processGivenNames(restOfGiven);
  const surname = stripPostNominals(author.surname.trim());

  const parts: string[] = [];
  if (retainedTitle) {
    parts.push(retainedTitle);
  }
  if (processedGiven) {
    parts.push(processedGiven);
  }
  parts.push(surname);

  return parts.join(" ");
}

/**
 * Inverts an author name for bibliography entries: `Surname, Given Names`.
 *
 * AGLC4 Rule 4.1.1: In bibliographies, the first-listed author's name
 * is inverted (surname first) for alphabetical ordering.
 *
 * @returns Inverted name (e.g. `Hart, HLA`)
 */
export function invertAuthorName(author: Author): string {
  const [retainedTitle, restOfGiven] = extractRetainedTitle(author.givenNames);
  const processedGiven = processGivenNames(restOfGiven);
  const surname = stripPostNominals(author.surname.trim());

  const givenParts: string[] = [];
  if (retainedTitle) {
    givenParts.push(retainedTitle);
  }
  if (processedGiven) {
    givenParts.push(processedGiven);
  }

  const givenStr = givenParts.join(" ");
  if (givenStr) {
    return `${surname}, ${givenStr}`;
  }
  return surname;
}

/**
 * Formats a list of authors, handling multiple-author rules and editor
 * suffixes (Rules 4.1.2, 4.1.3).
 *
 * AGLC4 Rule 4.1.2: Where a source has two or three authors, all should
 * be listed with 'and' before the last author.
 *
 * AGLC4 Rule 4.1.3: Where a source has four or more authors, cite the
 * first-listed author followed by 'et al'.
 *
 * If the authors are editors, append '(ed)' for a single editor or
 * '(eds)' for multiple editors.
 *
 * @returns FormattedRun[] — plain text (no italic, no bold)
 */
export function formatAuthors(
  authors: Author[],
  isEditor?: boolean,
): FormattedRun[] {
  if (authors.length === 0) {
    return [];
  }

  let nameStr: string;

  if (authors.length === 1) {
    nameStr = formatAuthorName(authors[0]);
  } else if (authors.length <= 3) {
    const names = authors.map(formatAuthorName);
    const allButLast = names.slice(0, -1);
    nameStr = allButLast.join(", ") + " and " + names[names.length - 1];
  } else {
    // 4+ authors: first author + et al
    nameStr = formatAuthorName(authors[0]) + " et al";
  }

  if (isEditor) {
    const suffix = authors.length === 1 ? " (ed)" : " (eds)";
    nameStr += suffix;
  }

  return [{ text: nameStr }];
}

/**
 * Formats a body-authored publication (Rule 4.1.4).
 *
 * AGLC4 Rule 4.1.4: Where a source is authored by an organisation or
 * government body, the body name is used as the author. If the body's
 * jurisdiction may be ambiguous, the jurisdiction abbreviation should
 * follow in parentheses. If a subdivision of the body is relevant, it
 * should be listed before the body name, separated by a comma.
 *
 * @returns FormattedRun[] — plain text
 */
export function formatBodyAuthor(data: {
  body: string;
  jurisdiction?: string;
  subdivision?: string;
}): FormattedRun[] {
  const parts: string[] = [];

  if (data.subdivision) {
    parts.push(data.subdivision);
  }
  parts.push(data.body);

  let text = parts.join(", ");

  if (data.jurisdiction) {
    text += ` (${data.jurisdiction})`;
  }

  return [{ text }];
}

/**
 * Formats a judicial author (Rule 4.1.5).
 *
 * AGLC4 Rule 4.1.5: Where a judge is cited as the author of a secondary
 * source, the judicial title should be included before the name. The title
 * is retained in subsequent references.
 *
 * @returns FormattedRun[] — plain text
 */
export function formatJudicialAuthor(author: Author): FormattedRun[] {
  const [retainedTitle, restOfGiven] = extractRetainedTitle(author.givenNames);
  const processedGiven = processGivenNames(restOfGiven);
  const surname = stripPostNominals(author.surname.trim());

  const parts: string[] = [];

  if (author.judicialTitle) {
    parts.push(author.judicialTitle);
  }

  if (retainedTitle) {
    parts.push(retainedTitle);
  }
  if (processedGiven) {
    parts.push(processedGiven);
  }
  parts.push(surname);

  return [{ text: parts.join(" ") }];
}
