/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { FormattedRun } from "../types/formattedRun";

/** Escapes text for use inside an HTML fragment passed to Range.insertHtml. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Conservative allowlist for document-derived font names (TRUST-003).
 *
 * Font names are interpolated into the style attribute of an `insertHtml`
 * fragment, so a name containing `'`, `"`, or `;` could break out of the
 * `font-family` declaration (CSS injection via document-derived data).
 * Legitimate families — "Times New Roman", "Calibri Light", hyphenated names —
 * use only letters, digits, spaces, dots, and hyphens: allow exactly that,
 * starting with a letter or digit, at most 64 characters.
 */
const SAFE_FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 .-]{0,63}$/;

/** True when a document-derived font name is safe to emit in a style attribute. */
export function isSafeFontName(font: string): boolean {
  return SAFE_FONT_NAME.test(font);
}

/**
 * Converts an array of FormattedRun objects to an inline HTML fragment for
 * `insertHtml`.
 *
 * Word on the web does not reliably honour font property assignments made on
 * the range proxies returned by `insertText` — the assignment silently
 * no-ops and the inserted text inherits the preceding run's formatting, so a
 * citation with one italic element rendered everything after it italic
 * (WEB-002). Word's HTML importer applies inline formatting atomically and
 * identically on desktop and web, so formatted content is written as HTML.
 *
 * Only inline elements are emitted (no block elements), so the surrounding
 * paragraph and its style are never disturbed.
 */
export function runsToHtml(runs: FormattedRun[]): string {
  return runs.map(runToHtml).join("");
}

function runToHtml(run: FormattedRun): string {
  let html = escapeHtml(run.text);
  if (run.italic) html = `<i>${html}</i>`;
  if (run.bold) html = `<b>${html}</b>`;
  if (run.superscript) html = `<sup>${html}</sup>`;
  // Unformatted runs stay BARE text nodes: Word on the web imports bare text
  // as roman, but a `font-style: normal` span next to an <i> poisons the
  // whole fragment — every run imports italic (verified empirically).
  const styles: string[] = [];
  if (run.smallCaps) styles.push("font-variant: small-caps");
  // Font name and size are document-derived: only values that cannot break
  // out of the style declaration are emitted. Invalid values are dropped,
  // never thrown — citation insertion must not fail on an unusual font.
  if (run.font && isSafeFontName(run.font)) styles.push(`font-family: '${run.font}'`);
  if (typeof run.size === "number" && Number.isFinite(run.size) && run.size > 0) {
    styles.push(`font-size: ${run.size}pt`);
  }
  if (styles.length > 0) html = `<span style="${styles.join("; ")};">${html}</span>`;
  return html;
}
