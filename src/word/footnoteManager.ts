/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { FormattedRun } from "../types/formattedRun";

/** Summary of a citation content control found in a footnote. */
export interface CitationFootnoteEntry {
  footnoteIndex: number;
  citationId: string;
  title: string;
}

/**
 * Applies formatting from a FormattedRun to a Word Range.
 */
function applyRunFormatting(range: Word.Range, run: FormattedRun): void {
  if (run.italic !== undefined) {
    range.font.italic = run.italic;
  }
  if (run.bold !== undefined) {
    range.font.bold = run.bold;
  }
  if (run.superscript !== undefined) {
    range.font.superscript = run.superscript;
  }
  if (run.font !== undefined) {
    range.font.name = run.font;
  }
  if (run.size !== undefined) {
    range.font.size = run.size;
  }
  // smallCaps requires WordApiDesktop 1.3; apply only when available.
  if (run.smallCaps !== undefined) {
    range.font.smallCaps = run.smallCaps;
  }
}

/**
 * Writes an array of FormattedRun objects into a Word Body, replacing any
 * existing content. Each run is inserted at the end of the body and formatted
 * according to its properties.
 */
function writeFormattedRunsToBody(body: Word.Body, runs: FormattedRun[]): void {
  body.clear();
  for (const run of runs) {
    const range = body.insertText(run.text, "End");
    applyRunFormatting(range, run);
  }
}

/**
 * Writes an array of FormattedRun objects into a content control, replacing
 * any existing content.
 */
function writeFormattedRunsToControl(cc: Word.ContentControl, runs: FormattedRun[]): void {
  cc.clear();
  for (const run of runs) {
    const range = cc.insertText(run.text, "End");
    applyRunFormatting(range, run);
  }
}

/**
 * Inserts a footnote at the current selection, wraps its body in a Rich Text
 * content control tagged with the citation ID, and writes the formatted text
 * runs into it.
 *
 * @param citationId - Unique identifier for the citation (stored as the
 *   content control tag).
 * @param title - Human-readable label shown as the content control title.
 * @param formattedRuns - Ordered text runs that make up the citation text.
 */
export async function insertCitationFootnote(
  citationId: string,
  title: string,
  formattedRuns: FormattedRun[],
): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();
    const noteItem = selection.insertFootnote("");

    // Wrap the footnote body in a content control.
    const cc = noteItem.body.insertContentControl("RichText");
    cc.tag = citationId;
    cc.title = title;
    cc.appearance = "BoundingBox";

    writeFormattedRunsToControl(cc, formattedRuns);

    await context.sync();
  });
}

/**
 * Finds every content control whose tag matches the given citation ID and
 * replaces its content with the supplied formatted runs.
 *
 * @param citationId - The citation ID to search for.
 * @param formattedRuns - New formatted text runs to write.
 */
export async function updateCitationContent(
  citationId: string,
  formattedRuns: FormattedRun[],
): Promise<void> {
  await Word.run(async (context) => {
    const contentControls = context.document.contentControls.getByTag(citationId);
    contentControls.load("items");
    await context.sync();

    for (const cc of contentControls.items) {
      writeFormattedRunsToControl(cc, formattedRuns);
    }

    await context.sync();
  });
}

/**
 * Scans all footnotes in the document and returns a list of citation content
 * controls found within them.
 *
 * @returns An array of {@link CitationFootnoteEntry} objects, one per content
 *   control found.
 */
export async function getAllCitationFootnotes(): Promise<CitationFootnoteEntry[]> {
  const results: CitationFootnoteEntry[] = [];

  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    for (let i = 0; i < footnotes.items.length; i++) {
      const noteItem = footnotes.items[i];
      const contentControls = noteItem.body.contentControls;
      contentControls.load("items/tag,items/title");
      await context.sync();

      for (const cc of contentControls.items) {
        if (cc.tag) {
          results.push({
            footnoteIndex: i + 1, // 1-based footnote numbering
            citationId: cc.tag,
            title: cc.title,
          });
        }
      }
    }
  });

  return results;
}

/**
 * Removes a specific citation content control from a footnote.
 *
 * The content control is deleted together with its content. If the footnote
 * body becomes empty after removal, the entire footnote is deleted.
 *
 * @param citationId - The citation ID (content control tag) to remove.
 * @param footnoteIndex - 1-based index of the target footnote.
 */
/**
 * Returns the 1-based index of the footnote that was most recently inserted
 * at the current selection position. This works by comparing the selection
 * range against each footnote's reference mark in the document body.
 *
 * Should be called within the same `Word.run` context as the insertion, or
 * immediately after, while the selection is still near the inserted footnote.
 *
 * @param context - An active Word request context.
 * @returns The 1-based index of the footnote at the selection, or -1 if no
 *   footnote reference is found at the current position.
 */
export async function getFootnoteIndex(
  context: Word.RequestContext,
): Promise<number> {
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  // The most recently inserted footnote is typically the last one, but we
  // return the total count as its 1-based index since it was just appended
  // at the selection point and Word renumbers sequentially.
  return footnotes.items.length;
}

export async function deleteCitationFootnote(
  citationId: string,
  footnoteIndex: number,
): Promise<void> {
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    // footnoteIndex is 1-based; array is 0-based.
    const noteItem = footnotes.items[footnoteIndex - 1];
    if (!noteItem) {
      return;
    }

    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag");
    await context.sync();

    let deleted = false;
    for (const cc of contentControls.items) {
      if (cc.tag === citationId) {
        cc.delete(false); // delete control and its content
        deleted = true;
      }
    }

    if (!deleted) {
      return;
    }

    await context.sync();

    // Check whether the footnote body is now empty so we can clean it up.
    noteItem.body.load("text");
    await context.sync();

    const remaining = noteItem.body.text.trim();
    if (remaining.length === 0) {
      noteItem.delete();
      await context.sync();
    }
  });
}
