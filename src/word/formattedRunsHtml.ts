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
  if (run.font) styles.push(`font-family: '${run.font}'`);
  if (run.size) styles.push(`font-size: ${run.size}pt`);
  if (styles.length > 0) html = `<span style="${styles.join("; ")};">${html}</span>`;
  return html;
}
