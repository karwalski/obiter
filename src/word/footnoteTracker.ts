/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { CitationStore } from "../store/citationStore";

/**
 * Scans all footnotes in the document, finds citation content controls by tag,
 * and returns a map of citationId to first footnote number. If a citation
 * appears in multiple footnotes, the lowest number is recorded.
 *
 * @param context - An active Word request context.
 * @returns A map of citation ID to its first (lowest) footnote number.
 */
export async function buildFootnoteMap(
  context: Word.RequestContext,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const fnItems = footnotes.items ?? [];
  for (let i = 0; i < fnItems.length; i++) {
    const noteItem = fnItems[i];
    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag");
    await context.sync();

    const footnoteNumber = i + 1; // 1-based footnote numbering

    for (const cc of (contentControls.items ?? [])) {
      if (cc.tag && !cc.tag.startsWith("obiter-")) {
        const existing = map.get(cc.tag);
        if (existing === undefined || footnoteNumber < existing) {
          map.set(cc.tag, footnoteNumber);
        }
      }
    }
  }

  return map;
}

/**
 * Returns the total number of footnotes in the document.
 *
 * @param context - An active Word request context.
 * @returns The total footnote count.
 */
export async function getFootnoteCount(
  context: Word.RequestContext,
): Promise<number> {
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  return (footnotes.items ?? []).length;
}

/**
 * Returns the citation IDs found in the footnote immediately before the
 * specified footnote index.
 *
 * @param context - An active Word request context.
 * @param currentFootnoteIndex - 1-based index of the current footnote.
 * @returns An array of citation IDs from the preceding footnote, or an empty
 *   array if there is no preceding footnote.
 */
export async function getPrecedingFootnoteCitations(
  context: Word.RequestContext,
  currentFootnoteIndex: number,
): Promise<string[]> {
  if (currentFootnoteIndex <= 1) {
    return [];
  }

  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const precedingIndex = currentFootnoteIndex - 2; // Convert 1-based to 0-based, then go back one
  const fnItems = footnotes.items ?? [];
  if (precedingIndex < 0 || precedingIndex >= fnItems.length) {
    return [];
  }

  const noteItem = fnItems[precedingIndex];
  const contentControls = noteItem.body.contentControls;
  contentControls.load("items/tag");
  await context.sync();

  const citationIds: string[] = [];
  for (const cc of (contentControls.items ?? [])) {
    if (cc.tag) {
      citationIds.push(cc.tag);
    }
  }

  return citationIds;
}

/**
 * Updates each citation's `firstFootnoteNumber` field in the store based on
 * the scanned footnote map.
 *
 * @param store - The citation store instance.
 * @param footnoteMap - A map of citation ID to first footnote number.
 */
export async function updateFirstFootnoteNumbers(
  store: CitationStore,
  footnoteMap: Map<string, number>,
): Promise<void> {
  const citations = store.getAll();

  for (const citation of citations) {
    const footnoteNumber = footnoteMap.get(citation.id);
    const newValue = footnoteNumber ?? undefined;

    if (citation.firstFootnoteNumber !== newValue) {
      const updated = { ...citation, firstFootnoteNumber: newValue };
      await store.update(updated);
    }
  }
}

/**
 * Full rebuild of footnote tracking: scans the document, builds a map of
 * citation IDs to their first footnote numbers, and updates the store.
 *
 * Should be called after any footnote insert, delete, or reorder operation.
 *
 * @param context - An active Word request context.
 * @param store - The citation store instance.
 */
export async function rebuildAllFootnoteTracking(
  context: Word.RequestContext,
  store: CitationStore,
): Promise<void> {
  const footnoteMap = await buildFootnoteMap(context);
  await updateFirstFootnoteNumbers(store, footnoteMap);
}
