/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word, Office */

import { getHeadingPrefix } from "./styles";

/**
 * AGLC4 heading style names, indexed by level (1-based).
 * Matches the styles created by `applyAglc4Styles` in styles.ts.
 */
const HEADING_STYLE_NAMES: ReadonlyArray<string> = [
  "AGLC4 Level I",
  "AGLC4 Level II",
  "AGLC4 Level III",
  "AGLC4 Level IV",
  "AGLC4 Level V",
];

/**
 * Maps a paragraph style name to an AGLC4 heading level (1-5),
 * or returns 0 if the style is not a recognised heading style.
 */
function getHeadingLevel(styleName: string): 0 | 1 | 2 | 3 | 4 | 5 {
  const index = HEADING_STYLE_NAMES.indexOf(styleName);
  return index === -1 ? 0 : ((index + 1) as 1 | 2 | 3 | 4 | 5);
}

/**
 * Regular expression patterns for each heading level's numbering prefix.
 * Used to strip existing prefixes before re-numbering.
 *
 * - Level 1 (Upper Roman): I, II, III, IV, ... possibly followed by a space
 * - Level 2 (Upper Letter): A, B, C, ...
 * - Level 3 (Arabic): 1, 2, 3, ...
 * - Level 4 (Lower letter in parens): (a), (b), (c), ...
 * - Level 5 (Lower Roman in parens): (i), (ii), (iii), ...
 */
const PREFIX_PATTERNS: ReadonlyArray<RegExp> = [
  /^[IVXLCDM]+\s+/,       // Level 1: Upper Roman
  /^[A-Z]\s+/,            // Level 2: Upper Letter
  /^\d+\s+/,              // Level 3: Arabic
  /^\([a-z]\)\s+/,        // Level 4: Lower letter in parens
  /^\([ivxlcdm]+\)\s+/,   // Level 5: Lower Roman in parens
];

/**
 * Strips an existing numbering prefix from the heading text for a given level.
 */
function stripExistingPrefix(text: string, level: 1 | 2 | 3 | 4 | 5): string {
  const pattern = PREFIX_PATTERNS[level - 1];
  return text.replace(pattern, "");
}

/**
 * Renumbers all AGLC4 headings in the document (Levels I-V).
 *
 * Scans all paragraphs in document order, identifies those with AGLC4
 * heading styles, and updates the text-based numbering prefix per
 * Rule 1.12.2. When a parent heading level increments, all child-level
 * counters are reset to 1.
 *
 * This function uses text replacement rather than the Word list API, so
 * it works on all WordApi versions (1.3+). It handles the case where users
 * move paragraphs around and numbering gets out of sync.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @returns The count of headings that were renumbered.
 */
export async function renumberHeadings(
  context: Word.RequestContext,
): Promise<number> {
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load("items/style,items/text");
  await context.sync();

  // Counters for each heading level (1-indexed: counters[1] = Level I count).
  const counters: number[] = [0, 0, 0, 0, 0, 0];

  let renumbered = 0;

  // Check if the list API is available for potential use.
  const canUseListApi = Office.context.requirements.isSetSupported("WordApi", "1.3");

  // If the list API is available, check whether any heading paragraph is
  // already part of a list. If so, we skip text-based renumbering for those
  // paragraphs since Word's list engine manages their numbering.
  // For simplicity (and reliability across platforms), we always use the
  // text-prefix approach.
  void canUseListApi;

  for (const paragraph of (paragraphs.items ?? [])) {
    const level = getHeadingLevel(paragraph.style);
    if (level === 0) continue;

    // Increment counter for this level.
    counters[level]++;

    // Reset all child-level counters when a parent level increments.
    for (let child = level + 1; child <= 5; child++) {
      counters[child] = 0;
    }

    // Strip any existing prefix and compute the correct one.
    const bareText = stripExistingPrefix(paragraph.text, level);
    const prefix = getHeadingPrefix(level, counters[level]);
    const expectedText = bareText.length > 0 ? `${prefix} ${bareText}` : prefix;

    // Only update if the text actually changed.
    if (paragraph.text !== expectedText) {
      paragraph.insertText(expectedText, "Replace" as Word.InsertLocation.replace);
      renumbered++;
    }
  }

  if (renumbered > 0) {
    await context.sync();
  }

  return renumbered;
}
