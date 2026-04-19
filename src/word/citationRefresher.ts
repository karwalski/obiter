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
 */
function writeFormattedRunsToControl(
  cc: Word.ContentControl,
  runs: FormattedRun[],
): void {
  cc.clear();
  for (const run of runs) {
    const range = cc.insertText(run.text, "End");
    applyRunFormatting(range, run);
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
 * Refreshes all citation content controls in the document, ensuring each
 * one displays the correct format (full/short/ibid) based on its current
 * position within the footnote sequence.
 *
 * Steps:
 *  1. Scans all footnotes and collects citation content controls in order.
 *  2. Rebuilds the footnote-number map and updates `firstFootnoteNumber`
 *     on each citation in the store.
 *  3. For each content control, determines the correct format and re-renders.
 *  4. Returns a count of updated and unchanged controls.
 *
 * @param context - An active Word request context.
 * @param store - The citation store instance.
 * @returns A RefreshResult with counts of updated and unchanged citations.
 */
export async function refreshAllCitations(
  context: Word.RequestContext,
  store: CitationStore,
): Promise<RefreshResult> {
  // Step 1: Rebuild footnote map and update store
  const footnoteMap = await buildFootnoteMap(context);
  await updateFirstFootnoteNumbers(store, footnoteMap);

  // Step 2: Scan all footnotes and collect content controls in document order
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const entries: ControlEntry[] = [];

  for (let i = 0; i < footnotes.items.length; i++) {
    const noteItem = footnotes.items[i];
    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag,items/title");
    await context.sync();

    const footnoteNumber = i + 1;

    for (const cc of contentControls.items) {
      if (cc.tag) {
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
      // Citation not found in store; skip
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

    // Determine if same as preceding footnote's citation
    const isSameAsPreceding =
      prevFootnoteNumber === entry.footnoteNumber - 1 &&
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

    const runs = formatCitation(citation, citationContext);
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

  return { updated, unchanged };
}
