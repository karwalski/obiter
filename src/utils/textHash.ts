/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * SAFE-002: Rendered-text hashing for user-edit detection.
 *
 * The refresher stores a hash of the last text it rendered into each
 * footnote (in the parent content-control title). On the next refresh,
 * comparing the hash of the footnote's current text against the stored
 * hash distinguishes a *stale Obiter render* (hashes match — safe to
 * rebuild) from a *manual user edit* (hashes differ — must not clobber).
 *
 * Pure module: no Office.js, no DOM.
 */

/**
 * Normalizes footnote text before hashing to guard against host-specific
 * whitespace quirks (Word for Web and desktop occasionally disagree on
 * space characters and line endings when reading CC text).
 *
 * Deliberately conservative — only unambiguous whitespace variants are
 * folded. A false "user edit" (hash mismatch on unedited text) is the safe
 * failure direction: the refresher skips the rebuild and reports it,
 * rather than destroying a real edit.
 *
 * Normalization steps:
 *  - NBSP (U+00A0) and narrow NBSP (U+202F) → plain space
 *  - CRLF / CR → LF
 *  - trim leading/trailing whitespace
 */
export function normalizeRenderedText(text: string): string {
  return text
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * FNV-1a 32-bit hash of the normalized text, returned as a fixed-width
 * 8-character lowercase hex string (e.g. "811c9dc5").
 *
 * FNV-1a is used for its tiny footprint and stable, dependency-free
 * implementation — this is a change detector, not a cryptographic digest.
 */
export function hashRenderedText(text: string): string {
  const normalized = normalizeRenderedText(text);
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
