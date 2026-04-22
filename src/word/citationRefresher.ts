/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * DYN-001: Live Citation Refresh
 *
 * Scans all footnotes in the document, rebuilds the footnote-number map,
 * and re-renders each citation content control with the correct format
 * (full/short/ibid) based on its current document position.
 */

import { CitationStore } from "../store/citationStore";
import { formatCitation, CitationContext } from "../engine/engine";
import {
  buildFootnoteMap,
  updateFirstFootnoteNumbers,
} from "./footnoteTracker";
import type { FormattedRun } from "../types/formattedRun";
import type { Pinpoint } from "../types/citation";
import { getStandardConfig } from "../engine/standards";
import type { CitationConfig } from "../engine/standards/types";

/** Result of a full citation refresh pass. */
export interface RefreshResult {
  updated: number;
  unchanged: number;
}

/**
 * Information about a single citation content control encountered during
 * the document scan, in document (footnote) order.
 */
interface ControlEntry {
  /** The content control proxy object. */
  cc: Word.ContentControl;
  /** The citation ID (content control tag). */
  citationId: string;
  /** 1-based footnote number. */
  footnoteNumber: number;
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
  if (run.smallCaps !== undefined) {
    range.font.smallCaps = run.smallCaps;
  }
}

/**
 * Writes an array of FormattedRun objects into a content control, replacing
 * any existing content.
 *
 * Safety: Before clearing, we check whether this content control is inside
 * a footnote body. If it is the top-level body CC (wrapping all content
 * including the reference mark), we delete only the text content and
 * re-insert, rather than using cc.clear() which can destroy the footnote
 * reference mark.
 */
function writeFormattedRunsToControl(
  cc: Word.ContentControl,
  runs: FormattedRun[],
): void {
  // Use insertText with "Replace" for the first run to replace all content
  // within the CC without destroying its structure, then append the rest.
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
 * Reads the current plain text from a content control for comparison
 * with newly rendered output.
 */
function runsToPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/**
 * Scans all footnotes and ensures no content control wraps the footnote
 * reference mark. If a content control encompasses the reference mark
 * (which would cause Word to hide the footnote number), it is unwrapped
 * and re-created around only the citation text.
 *
 * Called as a self-healing mechanism at the start of each refresh cycle.
 *
 * @param context - An active Word request context.
 */
async function repairFootnoteContentControls(
  context: Word.RequestContext,
): Promise<void> {
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const fnItems = footnotes.items ?? [];
  for (let i = 0; i < fnItems.length; i++) {
    const noteItem = fnItems[i];
    const paragraphs = noteItem.body.paragraphs;
    paragraphs.load("items");
    await context.sync();

    const paraItems = paragraphs.items ?? [];
    if (paraItems.length === 0) continue;

    const firstPara = paraItems[0];
    const contentControls = firstPara.contentControls;
    contentControls.load("items/tag,items/title,items/text");
    await context.sync();

    const ccItems = contentControls.items ?? [];
    for (const cc of ccItems) {
      if (!cc.tag || cc.tag.startsWith("obiter-")) continue;

      // Check if this content control is on the paragraph level
      // (which would include the reference mark). We detect this by
      // checking if the CC's range starts at the same position as the
      // paragraph — if so, it wraps the ref mark.
      const ccRange = cc.getRange("Whole");
      const paraStart = firstPara.getRange("Start");
      const comparison = ccRange.getRange("Start").compareLocationWith(paraStart);
      await context.sync();

      if (comparison.value === "Equal") {
        // This CC wraps the paragraph start (including ref mark).
        // Save its properties, unwrap it, and re-wrap using body-level CC.
        const tag = cc.tag;
        const title = cc.title;
        const ccText = cc.text;

        // Delete the content control but keep the content
        cc.delete(true);
        await context.sync();

        // Re-wrap using the body-level approach which avoids the ref mark
        const bodyCC = noteItem.body.insertContentControl("RichText");
        bodyCC.tag = tag;
        bodyCC.title = title;
        bodyCC.appearance = "Hidden" as Word.ContentControlAppearance;
        await context.sync();

        console.warn(
          `[citationRefresher] Repaired content control in footnote ${i + 1} ` +
          `(tag: ${tag}) — was wrapping reference mark. Text: "${ccText}"`
        );
        // Only repair one CC per paragraph to avoid cascading issues
        break;
      }
    }
  }
}

/**
 * Refreshes all citation content controls in the document, ensuring each
 * one displays the correct format (full/short/ibid) based on its current
 * position within the footnote sequence.
 *
 * Steps:
 *  0. Repairs any content controls that wrap footnote reference marks.
 *  1. Scans all footnotes and collects citation content controls in order.
 *  2. Rebuilds the footnote-number map and updates `firstFootnoteNumber`
 *     on each citation in the store.
 *  3. For each content control, determines the correct format and re-renders.
 *  4. Verifies footnote numbers are still intact after updates.
 *  5. Returns a count of updated and unchanged controls.
 *
 * @param context - An active Word request context.
 * @param store - The citation store instance.
 * @returns A RefreshResult with counts of updated and unchanged citations.
 */
export async function refreshAllCitations(
  context: Word.RequestContext,
  store: CitationStore,
): Promise<RefreshResult> {
  // Build config from the store's standard and writing mode (MULTI-014)
  const standardId = store.getStandardId();
  const baseConfig = getStandardConfig(standardId);
  const writingMode = store.getWritingMode();
  const config: CitationConfig = { ...baseConfig, writingMode };

  // Step 0: Self-healing — repair any content controls wrapping ref marks
  await repairFootnoteContentControls(context);

  // Step 1: Rebuild footnote map and update store
  const footnoteMap = await buildFootnoteMap(context);
  await updateFirstFootnoteNumbers(store, footnoteMap);

  // Step 2: Scan all footnotes and collect content controls in document order
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const entries: ControlEntry[] = [];

  const fnItems = footnotes.items ?? [];
  for (let i = 0; i < fnItems.length; i++) {
    const noteItem = fnItems[i];
    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag,items/title");
    await context.sync();

    const footnoteNumber = i + 1;

    for (const cc of (contentControls.items ?? [])) {
      if (cc.tag && !cc.tag.startsWith("obiter-")) {
        // Only process citation content controls (UUIDs), not internal
        // Obiter tags (obiter-heading-*, obiter-attribution)
        entries.push({
          cc,
          citationId: cc.tag,
          footnoteNumber,
        });
      }
    }
  }

  // Step 3: Load current text of each content control for comparison
  for (const entry of entries) {
    entry.cc.load("text");
  }
  await context.sync();

  // Step 4: Determine correct format and re-render each citation
  // Track which citation IDs have been seen so far to determine first vs subsequent
  const seenCitationIds = new Set<string>();
  // Track the citations in the previous footnote for ibid resolution
  let prevFootnoteNumber = 0;
  let prevFootnoteCitationIds: string[] = [];
  let prevFootnotePinpoint: Pinpoint | undefined;
  // Track citations within the current footnote for within-footnote references
  let currentFootnoteNumber = 0;
  let currentFootnoteCitationIds: string[] = [];

  let updated = 0;
  let unchanged = 0;

  for (const entry of entries) {
    const citation = store.getById(entry.citationId);
    if (!citation) {
      // Citation not found in store — leave content control untouched.
      // This happens when citations are deleted from the store but
      // footnotes still contain the content controls.
      unchanged++;
      continue;
    }

    // Skip citations with empty/missing data to avoid rendering
    // garbage like " v  (0)  0." from default fallback values
    if (!citation.data || Object.keys(citation.data).length === 0) {
      unchanged++;
      continue;
    }

    // Track footnote transitions
    if (entry.footnoteNumber !== currentFootnoteNumber) {
      // Moving to a new footnote — previous footnote becomes the one we just left
      if (currentFootnoteNumber > 0) {
        prevFootnoteNumber = currentFootnoteNumber;
        prevFootnoteCitationIds = [...currentFootnoteCitationIds];
      }
      currentFootnoteNumber = entry.footnoteNumber;
      currentFootnoteCitationIds = [];
    }

    const isFirstCitation = !seenCitationIds.has(entry.citationId);
    const isWithinSameFootnote = currentFootnoteCitationIds.includes(
      entry.citationId,
    );

    // Determine if same as preceding footnote's citation.
    // For ibid: the preceding footnote must contain exactly this citation
    // (the count check is done in the resolver, but isSameAsPreceding must
    // be true only if the citation actually appears in the preceding footnote)
    const isSameAsPreceding =
      prevFootnoteNumber === entry.footnoteNumber - 1 &&
      prevFootnoteCitationIds.length > 0 &&
      prevFootnoteCitationIds.includes(entry.citationId);

    const firstFootnoteNumber = footnoteMap.get(entry.citationId) ?? entry.footnoteNumber;
    const currentPinpoint = citation.data.pinpoint as Pinpoint | undefined;

    const citationContext: CitationContext = {
      footnoteNumber: entry.footnoteNumber,
      isFirstCitation,
      isSameAsPreceding,
      precedingFootnoteCitationCount: prevFootnoteCitationIds.length,
      precedingPinpoint: prevFootnotePinpoint,
      currentPinpoint,
      firstFootnoteNumber,
      isWithinSameFootnote,
      formatPreference: "auto",
    };

    let runs = formatCitation(citation, citationContext, config);

    // Determine position within the footnote for multi-citation handling
    const isFirstInFootnote = !currentFootnoteCitationIds.some(
      (id) => id !== entry.citationId
    ) && currentFootnoteCitationIds.length === 0;
    const isLastInFootnote = !entries.some(
      (e) => e.footnoteNumber === entry.footnoteNumber &&
             entries.indexOf(e) > entries.indexOf(entry)
    );

    // Multi-citation footnote formatting (AGLC4 Rule 1.1.3):
    // - Non-first citations: prepend "; " separator into the CC's runs
    //   (putting it inside the CC ensures it survives refreshes)
    // - Non-last citations: strip closing "."
    if (!isFirstInFootnote) {
      runs = [{ text: "; " }, ...runs];
    }
    if (!isLastInFootnote && runs.length > 0) {
      const lastRun = runs[runs.length - 1];
      if (lastRun.text.endsWith(".")) {
        runs = [...runs.slice(0, -1), { ...lastRun, text: lastRun.text.slice(0, -1) }];
      }
    }

    const newText = runsToPlainText(runs);
    const existingText = entry.cc.text ?? "";

    if (newText !== existingText) {
      writeFormattedRunsToControl(entry.cc, runs);
      updated++;
    } else {
      unchanged++;
    }

    // Update tracking state
    seenCitationIds.add(entry.citationId);
    currentFootnoteCitationIds.push(entry.citationId);

    // Update preceding pinpoint for ibid resolution when moving footnotes
    if (entry.footnoteNumber !== prevFootnoteNumber) {
      prevFootnotePinpoint = currentPinpoint;
    }
  }

  await context.sync();

  // Step 5: Verify footnote numbers still exist after updating content
  // controls. If any disappeared, log a warning. Word manages footnote
  // numbering automatically — if numbers are missing, a content control
  // likely wrapped the reference mark (which repairFootnoteContentControls
  // should have caught above).
  const verifyFootnotes = context.document.body.footnotes;
  verifyFootnotes.load("items");
  await context.sync();

  const verifyItems = verifyFootnotes.items ?? [];
  for (let i = 0; i < verifyItems.length; i++) {
    const noteItem = verifyItems[i];
    const bodyParagraphs = noteItem.body.paragraphs;
    bodyParagraphs.load("items");
    await context.sync();

    const bodyParaItems = bodyParagraphs.items ?? [];
    if (bodyParaItems.length > 0) {
      bodyParaItems[0].load("text");
      await context.sync();

      // The footnote reference mark is an auto-generated character at the
      // start of the first paragraph. If the paragraph text is empty or
      // starts with our citation content directly (no ref mark), something
      // went wrong.
      const paraText = bodyParaItems[0].text;
      if (paraText.length === 0) {
        console.warn(
          `[citationRefresher] Footnote ${i + 1} has empty first paragraph — ` +
          `reference mark may have been destroyed.`
        );
      }
    }
  }

  return { updated, unchanged };
}
