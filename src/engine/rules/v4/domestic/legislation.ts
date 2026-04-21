/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatPinpoint } from "../general/pinpoints";

/** Type alias for pinpoint type keys used in legislation formatting. */
type PinpointType = Pinpoint["type"];

// ─── Legislation Pinpoint Abbreviations (Appendix C) ─────────────────────────

/**
 * Singular pinpoint abbreviations for legislation references (AGLC4 Appendix C).
 *
 * These override the general pinpoint prefixes for legislation-specific
 * formatting under Rules 3.1.4–3.1.5.
 */
const LEGISLATION_PINPOINT_SINGULAR: Partial<Record<Pinpoint["type"], string>> =
  {
    section: "s",
    part: "pt",
    clause: "cl",
    schedule: "sch",
    article: "art",
    regulation: "reg",
    rule: "r",
    chapter: "ch",
    column: "col",
    line: "line",
    footnote: "n",
    division: "div",
    appendix: "app",
    subdivision: "sub-div",
    subsection: "sub-s",
    subclause: "sub-cl",
    subparagraph: "sub-para",
    subregulation: "sub-reg",
    subrule: "sub-r",
    order: "ord",
    paragraph: "para",
    item: "item",
  };

/**
 * Plural pinpoint abbreviations for legislation references (AGLC4 Appendix C).
 *
 * Used when a pinpoint value contains an en-dash (–), comma, or other
 * indication of multiple subdivisions.
 */
const LEGISLATION_PINPOINT_PLURAL: Partial<Record<Pinpoint["type"], string>> = {
  section: "ss",
  part: "pts",
  clause: "cls",
  schedule: "schs",
  article: "arts",
  regulation: "regs",
  rule: "rr",
  chapter: "chs",
  column: "cols",
  line: "lines",
  footnote: "nn",
  division: "divs",
  appendix: "apps",
  subdivision: "sub-divs",
  subsection: "sub-ss",
  subclause: "sub-cls",
  subparagraph: "sub-paras",
  subregulation: "sub-regs",
  subrule: "sub-rr",
  order: "ords",
  paragraph: "paras",
  item: "item",
};

/**
 * Determines whether a pinpoint value refers to multiple subdivisions.
 *
 * A value is considered plural if it contains an en-dash (–), em-dash (—),
 * or a comma, indicating a range or list.
 */
function isPluralPinpoint(value: string): boolean {
  return /[–—,]/.test(value);
}

// ─── LEG-001: Statute Citation (Rules 3.1.1–3.1.3) ──────────────────────────

/**
 * Format a statute citation according to AGLC4 Rules 3.1.1–3.1.3.
 *
 * @remarks AGLC4 Rule 3.1.1: The title of a statute should appear in italics,
 * followed by the year in italics. The jurisdiction abbreviation appears in
 * parentheses in roman (non-italic) type.
 *
 * @remarks AGLC4 Rule 3.1.2: Where a statute has a number (e.g. `(No 2)`),
 * this is preserved as part of the title in italics.
 *
 * @remarks AGLC4 Rule 3.1.3: The jurisdiction abbreviation is placed in
 * parentheses after the year.
 *
 * @example
 * // Competition and Consumer Act 2010 (Cth)
 * formatStatute({ title: "Competition and Consumer Act", year: 2010, jurisdiction: "Cth" })
 *
 * @param data - Statute citation data
 * @returns An array of FormattedRun representing the formatted statute citation
 */
export function formatStatute(data: {
  title: string;
  year: number;
  jurisdiction: string;
  number?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics, including any (No 2) numbering
  const titleText = data.number
    ? `${data.title} ${data.number}`
    : data.title;

  // Title and year in italics
  runs.push({ text: `${titleText} ${data.year}`, italic: true });

  // Jurisdiction in parentheses, not italicised
  runs.push({ text: ` (${data.jurisdiction})` });

  return runs;
}

// ─── LEG-002: Legislation Pinpoint References (Rules 3.1.4–3.1.5) ───────────

/**
 * Format a legislation pinpoint reference according to AGLC4 Rules 3.1.4–3.1.5.
 *
 * @remarks AGLC4 Rule 3.1.4: Pinpoint references to legislation use the
 * abbreviations from Appendix C (e.g. `s` for section, `pt` for part,
 * `div` for division, `sch` for schedule, `cl` for clause, `reg` for
 * regulation). Plural forms are used for ranges (e.g. `ss 5–6`).
 *
 * @remarks AGLC4 Rule 3.1.5: Multiple pinpoints may be combined
 * (e.g. `pt 3 div 2`). The pinpoint follows the jurisdiction parenthetical.
 *
 * @example
 * // "s 5"
 * formatLegislationPinpoint({ type: "section", value: "5" })
 *
 * @example
 * // "ss 5–6"
 * formatLegislationPinpoint({ type: "section", value: "5–6" })
 *
 * @example
 * // "pt 3 div 2" (using subPinpoint)
 *
 * @param pinpoint - The pinpoint to format
 * @returns An array of FormattedRun representing the formatted pinpoint
 */
export function formatLegislationPinpoint(pinpoint: Pinpoint): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const isPlural = isPluralPinpoint(pinpoint.value);
  const prefix = isPlural
    ? LEGISLATION_PINPOINT_PLURAL[pinpoint.type]
    : LEGISLATION_PINPOINT_SINGULAR[pinpoint.type];

  if (prefix) {
    runs.push({ text: `${prefix} ${pinpoint.value}` });
  } else {
    // Page and paragraph pinpoints have no prefix — delegate to general formatter
    runs.push(...formatPinpoint(pinpoint));
    // If there's a subPinpoint, it's already handled by formatPinpoint
    return runs;
  }

  if (pinpoint.subPinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint.subPinpoint));
  }

  return runs;
}

// ─── LEG-003: Legislative Definitions (Rule 3.1.6) ──────────────────────────

/**
 * Format a legislative definition reference according to AGLC4 Rule 3.1.6.
 *
 * @remarks AGLC4 Rule 3.1.6: When citing a defined term in legislation,
 * the format is: `[statute] [pinpoint] (definition of 'term')`. The defined
 * term appears in single quotation marks within the parenthetical.
 *
 * AGLC4 Example 24: `Property Law Act 1958 (Vic) s 3 (definition of 'legal practitioner')`
 * AGLC4 Example 25: `Evidence Act 2008 (Vic) Dictionary pt 1 (definition of 'civil proceeding')`
 *
 * The pinpoint prefix depends on the pinpoint type — not always `s` (section).
 * When no pinpoint type is provided, defaults to `s` for backward compatibility.
 *
 * @param statute - The pre-formatted statute runs (from formatStatute)
 * @param section - The pinpoint value (e.g. "3", "Dictionary pt 1")
 * @param term - The defined term
 * @param pinpointType - The pinpoint type (defaults to "section")
 * @returns An array of FormattedRun representing the formatted definition citation
 */
export function formatLegislativeDefinition(
  statute: FormattedRun[],
  section: string,
  term: string,
  pinpointType: PinpointType = "section",
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Statute citation (already formatted)
  runs.push(...statute);

  // Use the legislation-specific pinpoint prefix for the given type
  const isPlural = isPluralPinpoint(section);
  const prefix = isPlural
    ? LEGISLATION_PINPOINT_PLURAL[pinpointType]
    : LEGISLATION_PINPOINT_SINGULAR[pinpointType];

  if (prefix) {
    runs.push({ text: ` ${prefix} ${section} (definition of \u2018${term}\u2019)` });
  } else {
    // Fallback for page/paragraph or unknown types — no prefix
    runs.push({ text: ` ${section} (definition of \u2018${term}\u2019)` });
  }

  return runs;
}

// ─── LEG-004: Bills (Rule 3.2) ──────────────────────────────────────────────

/**
 * Format a Bill citation according to AGLC4 Rule 3.2.
 *
 * @remarks AGLC4 Rule 3.2: Bills should be cited in the same manner as Acts,
 * except that the title and year of the Bill should not be italicised.
 * 'Clause' and 'sub-clause' are typically the appropriate pinpoint designations.
 *
 * @example
 * // Treasury Laws Amendment (Consumer Data Right) Bill 2019 (Cth)
 * formatBill({ title: "Treasury Laws Amendment (Consumer Data Right) Bill", year: 2019, jurisdiction: "Cth" })
 *
 * @param data - Bill citation data
 * @returns An array of FormattedRun representing the formatted bill citation
 */
export function formatBill(data: {
  title: string;
  year: number;
  jurisdiction: string;
  number?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title including any (No 2) numbering
  const titleText = data.number
    ? `${data.title} ${data.number}`
    : data.title;

  // Title and year NOT italicised (per AGLC4 Rule 3.2)
  runs.push({ text: `${titleText} ${data.year}` });

  // Jurisdiction in parentheses, not italicised
  runs.push({ text: ` (${data.jurisdiction})` });

  return runs;
}
