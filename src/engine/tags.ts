/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-001: pure helpers for citation tags. A citation's `tags` array holds
 * two kinds of entry: system tags written by importers, dedupe and repair
 * paths (never editable, never exported, always preserved on save) and user
 * tags the author adds in the Edit view or through the import action.
 */

/** Maximum length of a normalised user tag. */
export const MAX_TAG_LENGTH = 40;

const SYSTEM_TAG_PREFIXES = ["import:", "imported-from-", "dedupe:"];
const SYSTEM_TAGS = new Set(["import", "waitangi_tribunal"]);

/** True for tags Obiter owns: provenance, dedupe and rule markers. */
export function isSystemTag(tag: string): boolean {
  if (SYSTEM_TAGS.has(tag)) return true;
  return SYSTEM_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix));
}

/** The user-editable tags, in their stored order. */
export function userTags(tags: readonly string[]): string[] {
  return tags.filter((tag) => !isSystemTag(tag));
}

/** The system tags, in their stored order. */
export function systemTags(tags: readonly string[]): string[] {
  return tags.filter(isSystemTag);
}

/**
 * Canonical form of a user-typed tag: trimmed, lower-cased, inner whitespace
 * collapsed to one space, capped at {@link MAX_TAG_LENGTH} characters.
 * Commas and semicolons are list separators in every interchange format
 * (and in the editor), so they become spaces. Returns undefined for an
 * empty result or a value that would collide with a system tag.
 */
export function normaliseTag(raw: string): string | undefined {
  const tag = raw
    .replace(/[,;]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, MAX_TAG_LENGTH)
    .trim();
  if (!tag || isSystemTag(tag)) return undefined;
  return tag;
}

/** Normalises a list of raw tags, dropping empties and duplicates. */
export function normaliseTags(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    const tag = normaliseTag(value);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

/**
 * Replaces the user tags on a stored tags array with `next` (normalised),
 * keeping every system tag in place ahead of them.
 */
export function withUserTags(tags: readonly string[], next: readonly string[]): string[] {
  return [...systemTags(tags), ...normaliseTags(next)];
}
