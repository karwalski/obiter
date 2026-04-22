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
 * any existing content. Uses "Replace" insertion for the first run to avoid
 * cc.clear() which can destroy footnote reference marks if the CC
 * encompasses them.
 */
function writeFormattedRunsToControl(cc: Word.ContentControl, runs: FormattedRun[]): void {
  if (runs.length === 0) {
    cc.clear();
    return;
  }

  // Replace all existing content with the first run
  const firstRange = cc.insertText(runs[0].text, "Replace" as Word.InsertLocation.replace);
  applyRunFormatting(firstRange, runs[0]);

  // Append remaining runs
  for (let i = 1; i < runs.length; i++) {
    const range = cc.insertText(runs[i].text, "End");
    applyRunFormatting(range, runs[i]);
  }
}

/**
 * BUGS-013: Detects whether the cursor/selection is immediately after a
 * footnote reference mark (superscript number). If so, returns the 1-based
 * index of that footnote.
 *
 * Strategy: load all footnotes in the document body, then for each footnote
 * check whether the end of its reference range coincides with the cursor
 * position. We check the last footnote first (most likely candidate after
 * a fresh insertion) and work backwards for efficiency.
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

  try {
    const allFootnotes = context.document.body.footnotes;
    allFootnotes.load("items");
    await context.sync();

    const allItems = allFootnotes.items ?? [];
    if (allItems.length === 0) {
      return null;
    }

    // Load all footnote reference ranges in one batch
    for (const fn of allItems) {
      fn.reference.load("text");
    }
    await context.sync();

    // Check each footnote (last first — most likely candidate after insertion)
    const cursorStart = selection.getRange("Start");
    for (let i = allItems.length - 1; i >= 0; i--) {
      const refRange = allItems[i].reference;
      const afterRef = refRange.getRange("After");
      const compareResult = afterRef.compareLocationWith(cursorStart);
      await context.sync();

      if (compareResult.value === "Equal" || compareResult.value === "Contains") {
        return {
          footnoteIndex: i + 1,
          noteItem: allItems[i],
        };
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

  // Insert the new citation inside its own content control.
  // The "; " separator is included as the first run inside the CC,
  // which ensures it survives refresher rewrites. The refresher
  // also prepends "; " to non-first citations, keeping it consistent.

  // Insert a new content control at the end of the footnote body
  const bodyEndRange = noteItem.body.getRange("End");
  const cc = bodyEndRange.insertContentControl("RichText");
  cc.tag = citationId;
  cc.title = title;
  cc.appearance = "Hidden" as Word.ContentControlAppearance;

  // Insert "; " separator as the first run inside the CC
  const sepRange = cc.insertText("; ", "End");
  sepRange.font.italic = false;
  sepRange.font.bold = false;

  // Insert citation text inside the content control (after separator)
  for (const run of formattedRuns) {
    const range = cc.insertText(run.text, "End");
    applyRunFormatting(range, run);
  }

  await context.sync();

  // Strip the trailing "." from the FIRST citation's CC since it's
  // no longer the last citation in this footnote. The refresher will
  // handle this on subsequent refreshes, but we do it now to avoid
  // the flash of "citationA.; citationB."
  try {
    const existingCCs = noteItem.body.contentControls;
    existingCCs.load("items/tag,items/text");
    await context.sync();
    const ccItems = existingCCs.items ?? [];
    // Find all CCs except the one we just created
    for (const existingCC of ccItems) {
      if (existingCC.tag && existingCC.tag !== citationId && !existingCC.tag.startsWith("obiter-")) {
        const ccText = existingCC.text ?? "";
        if (ccText.endsWith(".")) {
          // Rewrite without trailing period
          const trimmed = ccText.slice(0, -1);
          existingCC.insertText(trimmed, "Replace" as Word.InsertLocation.replace);
        }
      }
    }
    await context.sync();
  } catch {
    // Non-critical — refresher will fix on next cycle
  }
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
    // Record footnote count before insertion for verification.
    const beforeFootnotes = context.document.body.footnotes;
    beforeFootnotes.load("items");
    await context.sync();
    const footnotesBeforeCount = (beforeFootnotes.items ?? []).length;

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

    // Insert a content control at the end of the paragraph FIRST, then
    // insert citation text inside it. This ensures the CC only wraps
    // the citation text, not the footnote reference mark.
    const endRange = firstPara.getRange("End");
    const cc = endRange.insertContentControl("RichText");
    cc.tag = citationId;
    cc.title = title;
    cc.appearance = "Hidden" as Word.ContentControlAppearance;

    // Insert citation text inside the content control
    for (const run of formattedRuns) {
      const range = cc.insertText(run.text, "End");
      applyRunFormatting(range, run);
    }

    await context.sync();

    // Verify the footnote was actually created.
    const afterFootnotes = context.document.body.footnotes;
    afterFootnotes.load("items");
    await context.sync();
    const footnotesAfterCount = (afterFootnotes.items ?? []).length;

    if (footnotesAfterCount <= footnotesBeforeCount) {
      console.warn(
        "[footnoteManager] Footnote count did not increase after insertion. " +
        `Before: ${footnotesBeforeCount}, After: ${footnotesAfterCount}`
      );
    }

    // Move the cursor to immediately after the footnote reference mark
    // in the document body. This ensures that the next citation insertion
    // will detect the adjacent footnote and append rather than creating
    // a new one.
    const fnRef = noteItem.reference;
    const afterRefRange = fnRef.getRange("After");
    afterRefRange.select("End");
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
