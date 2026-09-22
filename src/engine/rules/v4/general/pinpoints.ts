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
 * MULTI-008: When `prefix` is provided (e.g. `"at "`), it is prepended
 * before the pinpoint value. NZLSG uses `"at "` for all pinpoints.
 *
 * @param pinpoint - The pinpoint to format
 * @param prefix - Optional prefix to prepend before the pinpoint value
 *   (e.g. `"at "` for NZLSG). Defaults to `""` (no prefix, AGLC4 style).
 * @returns An array of FormattedRun representing the pinpoint
 */
export function formatPinpoint(pinpoint: Pinpoint, prefix?: string): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const configPrefix = prefix ?? "";

  let typePrefix = PINPOINT_PREFIX[pinpoint.type];

  // Rule 1.1.7: spans or lists of footnote pinpoints take the plural
  // abbreviation 'nn' (AGLC4 ex 39: '348 nn 22–4').
  if (pinpoint.type === "footnote" && /[–,-]/.test(pinpoint.value)) {
    typePrefix = "nn";
  }

  if (typePrefix) {
    runs.push({ text: `${configPrefix}${typePrefix} ${pinpoint.value}` });
  } else {
    // Page and paragraph pinpoints render their value directly.
    // Paragraph values already include square brackets in the value field.
    runs.push({ text: `${configPrefix}${pinpoint.value}` });
  }

  if (pinpoint.subPinpoint) {
    runs.push({ text: " " });
    // Sub-pinpoints do not repeat the config prefix
    runs.push(...formatPinpoint(pinpoint.subPinpoint));
  }

  return runs;
}

/**
 * Serialises a pinpoint to the compact text form `formatPinpoint` renders
 * (`42`, `[42]`, `s 5`, `nn 22–4`, `6 [23]`). This is the ONE encoding used
 * for the per-occurrence pinpoint stored in a footnote content-control title
 * (see `buildOccurrenceTitle` in src/word/footnoteManager.ts); it is the
 * inverse of `pinpointFromTitleString`.
 */
export function pinpointToTitleString(pinpoint: Pinpoint): string {
  return formatPinpoint(pinpoint)
    .map((run) => run.text)
    .join("");
}

/**
 * Reverse lookup for `pinpointFromTitleString`: the abbreviated label that
 * `formatPinpoint` emits for each labelled type, plus the plural forms that
 * the formatter emits for footnote spans (`nn`, Rule 1.1.7) and that authors
 * type for several sections (`ss`).
 */
const LABEL_TO_TYPE: ReadonlyMap<string, Pinpoint["type"]> = new Map<string, Pinpoint["type"]>([
  ...(Object.entries(PINPOINT_PREFIX) as Array<[Pinpoint["type"], string]>).map(
    ([type, label]): [string, Pinpoint["type"]] => [label, type]
  ),
  ["ss", "section"],
  ["nn", "footnote"],
]);

/** A bare paragraph pinpoint: `[42]`, `[42]–[45]`, `[42]-[45]` (Rule 1.1.6). */
const PARAGRAPH_VALUE = /^\[[^\]]+\](?:\s*[–-]\s*\[[^\]]+\])?$/;

/**
 * Parses the compact text form of a pinpoint back into a typed `Pinpoint`.
 *
 * Inverse of `pinpointToTitleString`, and tolerant of the bare strings that
 * older documents stored in occurrence titles:
 *
 * - `[n]` or `[n]–[m]` → paragraph (Rule 1.1.6: paragraphs in square brackets)
 * - `s n` / `ss n` → section; likewise every other label `formatPinpoint`
 *   emits (`ch`, `pt`, `cl`, `sch`, `art`, `reg`, `r`, `n`/`nn`, `col`, …)
 * - `n [m]` → page `n` with a paragraph sub-pinpoint `[m]` (Rule 1.1.6 ex
 *   `6 [23]`)
 * - anything else → page
 *
 * @returns The typed pinpoint, or `undefined` for a blank string.
 */
export function pinpointFromTitleString(s: string): Pinpoint | undefined {
  const text = s.trim();
  if (text === "") return undefined;

  if (PARAGRAPH_VALUE.test(text)) {
    return { type: "paragraph", value: text };
  }

  const labelled = text.match(/^([a-z-]+)\s+(\S.*)$/);
  if (labelled) {
    const type = LABEL_TO_TYPE.get(labelled[1]);
    if (type) {
      return { type, value: labelled[2].trim() };
    }
  }

  const pageWithParagraph = text.match(/^(\S+)\s+(\[.+\])$/);
  if (pageWithParagraph && PARAGRAPH_VALUE.test(pageWithParagraph[2])) {
    return {
      type: "page",
      value: pageWithParagraph[1],
      subPinpoint: { type: "paragraph", value: pageWithParagraph[2] },
    };
  }

  return { type: "page", value: text };
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
