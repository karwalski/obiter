/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";

/**
 * Pinpoint prefix labels for types that require them.
 *
 * Page and paragraph pinpoints have no prefix in AGLC4 (Rule 1.1.6).
 * Other pinpoint types use abbreviated labels.
 */
const PINPOINT_PREFIX: Partial<Record<Pinpoint["type"], string>> = {
  footnote: "n",
  section: "s",
  chapter: "ch",
  part: "pt",
  clause: "cl",
  schedule: "sch",
  article: "art",
  regulation: "reg",
  rule: "r",
  column: "col",
  line: "line",
  division: "div",
  appendix: "app",
  subdivision: "sub-div",
  subsection: "sub-s",
  subclause: "sub-cl",
  subparagraph: "sub-para",
  subregulation: "sub-reg",
  subrule: "sub-r",
  order: "ord",
  item: "item",
};

/**
 * Format a single pinpoint reference according to AGLC4 Rules 1.1.6–1.1.7.
 *
 * @remarks AGLC4 Rule 1.1.6: Pinpoint references direct the reader to a
 * specific page, paragraph, or other subdivision of a source. Page numbers
 * appear as plain numbers. Paragraph numbers appear in square brackets.
 * No abbreviations such as 'p', 'pg', or 'para' are used.
 *
 * @remarks AGLC4 Rule 1.1.7: Spans of pinpoints use an en-dash (–).
 *
 * @param pinpoint - The pinpoint to format
 * @returns An array of FormattedRun representing the pinpoint
 */
export function formatPinpoint(pinpoint: Pinpoint): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const prefix = PINPOINT_PREFIX[pinpoint.type];

  if (prefix) {
    runs.push({ text: `${prefix} ${pinpoint.value}` });
  } else {
    // Page and paragraph pinpoints render their value directly.
    // Paragraph values already include square brackets in the value field.
    runs.push({ text: pinpoint.value });
  }

  if (pinpoint.subPinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(pinpoint.subPinpoint));
  }

  return runs;
}

/**
 * Format multiple pinpoint references separated by commas.
 *
 * @remarks AGLC4 Rule 1.1.6: Multiple pinpoint references within a single
 * source are separated by commas.
 *
 * @param pinpoints - The pinpoints to format
 * @returns An array of FormattedRun representing all pinpoints
 */
export function formatPinpoints(pinpoints: Pinpoint[]): FormattedRun[] {
  const runs: FormattedRun[] = [];

  for (let i = 0; i < pinpoints.length; i++) {
    if (i > 0) {
      runs.push({ text: ", " });
    }
    runs.push(...formatPinpoint(pinpoints[i]));
  }

  return runs;
}
