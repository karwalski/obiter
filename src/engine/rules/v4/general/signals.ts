/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Introductory Signals (Rule 1.2) ─────────────────────────────────────────

/**
 * Introductory signal identifiers per AGLC4 Rule 1.2.
 */
export type IntroductorySignal =
  | "see"
  | "see_also"
  | "see_eg"
  | "see_especially"
  | "see_generally"
  | "cf"
  | "but_see";

/** Maps signal identifiers to their display text. */
const SIGNAL_TEXT: Record<IntroductorySignal, string> = {
  see: "See",
  see_also: "See also",
  see_eg: "See, eg,",
  see_especially: "See especially",
  see_generally: "See generally",
  cf: "Cf",
  but_see: "But see",
};

/**
 * Formats an introductory signal as a run of plain (non-italicised) text
 * followed by a space.
 *
 * AGLC4 Rule 1.2: Introductory signals are not italicised.
 *
 * @param signal - The introductory signal to format.
 * @returns An array of formatted runs representing the signal text.
 */
export function formatSignal(signal: IntroductorySignal): FormattedRun[] {
  return [{ text: `${SIGNAL_TEXT[signal]} `, italic: false }];
}

/**
 * Determines whether the introductory signal has changed between two
 * consecutive sources in a multi-source footnote.
 *
 * AGLC4 Rule 1.2: A change in signal requires sentence-level separation
 * rather than semicolon separation.
 *
 * @param prev - The signal of the preceding source, or undefined if none.
 * @param current - The signal of the current source, or undefined if none.
 * @returns True if the signal changed.
 */
export function isSignalChange(
  prev: IntroductorySignal | undefined,
  current: IntroductorySignal | undefined
): boolean {
  return prev !== current;
}

// ─── Linking Phrases (Rule 1.3) ──────────────────────────────────────────────

/**
 * Linking phrase identifiers for sources referring to other sources,
 * per AGLC4 Rule 1.3.
 */
export type LinkingPhrase =
  | "quoting"
  | "quoted_in"
  | "citing"
  | "cited_in"
  | "discussing"
  | "discussed_in";

/** Maps linking phrase identifiers to their display text. */
const LINKING_PHRASE_TEXT: Record<LinkingPhrase, string> = {
  quoting: "quoting",
  quoted_in: "quoted in",
  citing: "citing",
  cited_in: "cited in",
  discussing: "discussing",
  discussed_in: "discussed in",
};

/**
 * Formats a linking phrase as a run of plain (non-italicised) text,
 * preceded by a comma and surrounded by spaces.
 *
 * AGLC4 Rule 1.3: Linking phrases are not italicised. The phrase is
 * preceded by a comma (e.g. `, quoting `).
 *
 * @param phrase - The linking phrase to format.
 * @returns An array of formatted runs representing the linking phrase.
 */
export function formatLinkingPhrase(phrase: LinkingPhrase): FormattedRun[] {
  return [{ text: `, ${LINKING_PHRASE_TEXT[phrase]} `, italic: false }];
}

/**
 * Joins a primary citation and a secondary citation with a linking phrase.
 *
 * AGLC4 Rule 1.3: When a source refers to another source, the primary
 * citation is followed by a linking phrase and then the secondary citation.
 *
 * @param primary - Formatted runs for the primary citation.
 * @param secondary - Formatted runs for the secondary citation.
 * @param phrase - The linking phrase connecting the two sources.
 * @returns Combined array of formatted runs: primary + linking phrase + secondary.
 */
export function joinLinkedSources(
  primary: FormattedRun[],
  secondary: FormattedRun[],
  phrase: LinkingPhrase
): FormattedRun[] {
  return [...primary, ...formatLinkingPhrase(phrase), ...secondary];
}
