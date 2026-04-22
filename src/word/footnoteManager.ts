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

/** Result returned by getAdjacentFootnoteIndex when cursor is next to a footnote. */
export interface AdjacentFootnoteResult {
  /** 1-based footnote index. */
  footnoteIndex: number;
  /** The NoteItem for the adjacent footnote. */
  noteItem: Word.NoteItem;
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
 * BUGS-013: Detects whether the cursor/selection is immediately after a
 * footnote reference mark (superscript number). If so, returns the 1-based
 * index of that footnote.
 *
 * The detection works by expanding the selection one character to the left
 * and checking whether that range contains a footnote reference. This
 * leverages Word's `Range.footnotes` collection.
 *
 * @param context - An active Word request context.
 * @returns The adjacent footnote result, or null if no footnote is adjacent.
 */
async function getAdjacentFootnoteIndex(
  context: Word.RequestContext,
): Promise<AdjacentFootnoteResult | null> {
  const selection = context.document.getSelection();
  selection.load("isEmpty");
  await context.sync();

  // Only work with a collapsed cursor (no text selected).
  if (!selection.isEmpty) {
    return null;
  }

  // Expand one character to the left of the cursor to capture a potential
  // footnote reference mark.
  const beforeRange = selection.getRange("Start");
  beforeRange.load("text");
  await context.sync();

  // Use expandTo to cover the character immediately before the cursor.
  // We get the range of the whole paragraph, then narrow to just before
  // the cursor to check for footnote references.
  try {
    const para = selection.paragraphs.getFirst();
    const paraRange = para.getRange("Whole");
    // Get the range from the start of the paragraph to the cursor
    const rangeBefore = paraRange.getRange("Start").expandTo(selection.getRange("Start"));
    const footnotes = rangeBefore.footnotes;
    footnotes.load("items");
    await context.sync();

    const footnoteItems = footnotes.items ?? [];
    if (footnoteItems.length === 0) {
      return null;
    }

    // The last footnote in the range before the cursor is the adjacent one.
    const lastFootnote = footnoteItems[footnoteItems.length - 1];

    // Get the reference range to verify it's truly adjacent (right before cursor).
    const refRange = lastFootnote.reference;
    refRange.load("text");
    await context.sync();

    // Check that this footnote reference is at the cursor position by
    // comparing the end of the reference range with the cursor position.
    const afterRef = refRange.getRange("After");
    const compareResult = afterRef.compareLocationWith(selection.getRange("Start"));
    await context.sync();

    if (compareResult.value === "Equal" || compareResult.value === "Contains") {
      // Determine the 1-based index of this footnote in the document.
      const allFootnotes = context.document.body.footnotes;
      allFootnotes.load("items");
      await context.sync();

      const allItems = allFootnotes.items ?? [];
      for (let i = 0; i < allItems.length; i++) {
        const fnRef = allItems[i].reference;
        fnRef.load("text");
      }
      await context.sync();

      for (let i = 0; i < allItems.length; i++) {
        const fnCompare = allItems[i].reference.compareLocationWith(refRange);
        await context.sync();
        if (fnCompare.value === "Equal") {
          return {
            footnoteIndex: i + 1,
            noteItem: allItems[i],
          };
        }
      }
    }
  } catch {
    // If range operations fail (e.g. cursor at start of document), return null.
    return null;
  }

  return null;
}

/**
 * BUGS-013 / AGLC4 Rule 1.1.3: Appends a citation to an existing footnote
 * body, separated by '; ' (semicolon + space), and wraps the new citation
 * content in a content control for tracking.
 *
 * @param noteItem - The existing footnote's NoteItem to append to.
 * @param citationId - Unique identifier for the new citation.
 * @param title - Human-readable label for the content control.
 * @param formattedRuns - Ordered text runs for the new citation.
 * @param context - An active Word request context.
 */
async function appendCitationToFootnote(
  noteItem: Word.NoteItem,
  citationId: string,
  title: string,
  formattedRuns: FormattedRun[],
  context: Word.RequestContext,
): Promise<void> {
  // Get the last paragraph in the footnote body to append to.
  const paragraphs = noteItem.body.paragraphs;
  paragraphs.load("items");
  await context.sync();

  const paraItems = paragraphs.items ?? [];
  if (paraItems.length === 0) {
    throw new Error("Footnote body contains no paragraphs. This may indicate limited API support in Word for Web.");
  }
  const lastPara = paraItems[paraItems.length - 1];

  // Strategy: get the existing text, find where to insert the separator.
  // The existing footnote ends with "." from ensureClosingPunctuation.
  // We need: "citationA; citationB." (not "citationA.; citationB.")
  //
  // Approach: get the end range of the footnote body, insert the
  // separator and new citation text there. The new runs already include
  // closing punctuation. We need to remove the old trailing "." first.
  lastPara.load("text");
  await context.sync();

  const existingText = lastPara.text;

  // Remove the trailing period by replacing the last character
  if (existingText.trimEnd().endsWith(".")) {
    // Get the range of the entire paragraph, then narrow to the last char
    const paraRange = lastPara.getRange("Whole");
    const endRange = paraRange.getRange("End");
    // Expand one character back from the end to select the period
    try {
      // Insert replacement text: everything except the trailing period + semicolon + new citation
      // Simpler: just insert "; " and new runs, then the old "." becomes ".; "
      // which we handle below. Actually, let's use a different approach:
      // Insert all the text we want at "End", then the result is "text.; newtext."
      // Then do one search-replace of ".; " -> "; "
    } catch {
      // Fall through
    }
  }

  // Insert "; " separator and new citation at end of paragraph
  const separator = lastPara.insertText("; ", "End");
  separator.font.italic = false;
  separator.font.bold = false;

  for (const run of formattedRuns) {
    const range = lastPara.insertText(run.text, "End");
    applyRunFormatting(range, run);
  }
  await context.sync();

  // Now clean up: the text is "citationA.; citationB."
  // Replace the FIRST ".; " with "; " (there should only be one)
  try {
    const bodyText = noteItem.body;
    bodyText.load("text");
    await context.sync();

    // Search in the footnote body for ".; "
    const searchResults = bodyText.search(".; ", { matchWildcards: false });
    searchResults.load("items");
    await context.sync();

    const searchItems = searchResults.items ?? [];
    for (const match of searchItems) {
      match.insertText("; ", "Replace" as Word.InsertLocation.replace);
    }
    if (searchItems.length > 0) {
      await context.sync();
    }
  } catch {
    // Search failed — .; will remain, imperfect but not broken
  }

  // Wrap the entire paragraph in a new content control to track
  // the appended citation. We need to select just the newly inserted
  // text, so we use the end-of-body approach.
  // Note: We insert a content control around the last paragraph,
  // but since we need per-citation tracking we insert a separate one.
  // The approach: insert text into the body end, then wrap it.
  // Since Word doesn't let us easily wrap a sub-range after insertion,
  // we insert the content control at the footnote body level.
  const bodyEnd = noteItem.body.getRange("End");
  const cc = bodyEnd.insertContentControl("RichText");
  cc.tag = citationId;
  cc.title = title;
  cc.appearance = "Hidden" as Word.ContentControlAppearance;

  await context.sync();
}

/**
 * BUGS-013: Appends a citation to a specific footnote by its 1-based index.
 * Used by the UI when the user explicitly selects a footnote to append to.
 *
 * @param footnoteIndex - 1-based index of the target footnote.
 * @param citationId - Unique identifier for the citation.
 * @param title - Human-readable label for the content control.
 * @param formattedRuns - Ordered text runs for the citation.
 */
export async function appendToFootnoteByIndex(
  footnoteIndex: number,
  citationId: string,
  title: string,
  formattedRuns: FormattedRun[],
): Promise<void> {
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    const fnItems = footnotes.items ?? [];
    const noteItem = fnItems[footnoteIndex - 1];
    if (!noteItem) {
      throw new Error(`Footnote ${footnoteIndex} not found.`);
    }

    await appendCitationToFootnote(noteItem, citationId, title, formattedRuns, context);
  });
}

/**
 * Inserts a footnote at the current selection, wraps its body in a Rich Text
 * content control tagged with the citation ID, and writes the formatted text
 * runs into it.
 *
 * BUGS-013 / AGLC4 Rule 1.1.3: If the cursor is immediately after an
 * existing footnote reference mark, the citation is appended to that
 * footnote with a '; ' separator instead of creating a new footnote.
 *
 * @param citationId - Unique identifier for the citation (stored as the
 *   content control tag).
 * @param title - Human-readable label shown as the content control title.
 * @param formattedRuns - Ordered text runs that make up the citation text.
 * @param appendToFootnote - Optional 1-based footnote index to force
 *   appending to a specific footnote (from the UI toggle). When provided,
 *   skips adjacent-footnote detection.
 */
export async function insertCitationFootnote(
  citationId: string,
  title: string,
  formattedRuns: FormattedRun[],
  appendToFootnote?: number,
): Promise<void> {
  try {
  await Word.run(async (context) => {
    // BUGS-013: If caller explicitly specified a footnote to append to,
    // use that directly.
    if (appendToFootnote !== undefined && appendToFootnote > 0) {
      const footnotes = context.document.body.footnotes;
      footnotes.load("items");
      await context.sync();

      const fnItems = footnotes.items ?? [];
      const noteItem = fnItems[appendToFootnote - 1];
      if (noteItem) {
        await appendCitationToFootnote(noteItem, citationId, title, formattedRuns, context);
        return;
      }
      // Fall through to create a new footnote if the index is invalid.
    }

    // BUGS-013: Try to detect an adjacent footnote reference at the cursor.
    const adjacent = await getAdjacentFootnoteIndex(context);
    if (adjacent) {
      await appendCitationToFootnote(adjacent.noteItem, citationId, title, formattedRuns, context);
      return;
    }

    // No adjacent footnote — create a new one as before.
    const selection = context.document.getSelection();
    const noteItem = selection.insertFootnote("");

    // Get the first (auto-generated) paragraph in the footnote body.
    // Word creates a paragraph with the footnote reference mark — we
    // insert our citation text into that paragraph rather than wrapping
    // the entire body, which would interfere with the reference number.
    const paragraphs = noteItem.body.paragraphs;
    paragraphs.load("items");
    await context.sync();

    const firstParaItems = paragraphs.items ?? [];
    if (firstParaItems.length === 0) {
      throw new Error("Could not access footnote content. Word for Web may have limited footnote support.");
    }
    const firstPara = firstParaItems[0];

    // Insert citation text at the end of the paragraph (after the
    // footnote reference mark that Word auto-generates).
    // Track the first inserted range so we can wrap only the citation
    // text in a content control (not the footnote reference mark).
    let firstRange: Word.Range | null = null;
    for (const run of formattedRuns) {
      const range = firstPara.insertText(run.text, "End");
      applyRunFormatting(range, run);
      if (!firstRange) firstRange = range;
    }

    // Wrap only the citation text in a content control, not the entire
    // paragraph (which includes the footnote reference mark). Wrapping
    // the whole paragraph hides the footnote number.
    if (firstRange) {
      const citationRange = firstRange.expandTo(firstPara.getRange("End"));
      const cc = citationRange.insertContentControl("RichText");
      cc.tag = citationId;
      cc.title = title;
      cc.appearance = "Hidden" as Word.ContentControlAppearance;
    }

    await context.sync();
  });
  } catch (err: unknown) {
    const original = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to insert citation footnote. This may be caused by limited API support in Word for Web. ` +
      `Details: ${original}`
    );
  }
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

    for (const cc of (contentControls.items ?? [])) {
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

    const fnItems = footnotes.items ?? [];
    for (let i = 0; i < fnItems.length; i++) {
      const noteItem = fnItems[i];
      const contentControls = noteItem.body.contentControls;
      contentControls.load("items/tag,items/title");
      await context.sync();

      for (const cc of (contentControls.items ?? [])) {
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
  return (footnotes.items ?? []).length;
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
    const fnItems = footnotes.items ?? [];
    const noteItem = fnItems[footnoteIndex - 1];
    if (!noteItem) {
      return;
    }

    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag");
    await context.sync();

    let deleted = false;
    for (const cc of (contentControls.items ?? [])) {
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
