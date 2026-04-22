/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * FN-003: Citation Refresher (Parent-Child Footnote Model)
 *
 * Scans all footnotes in the document for the parent-child content control
 * structure, rebuilds the footnote-number map, and re-renders each citation
 * with the correct format (full/short/ibid) based on document position.
 *
 * Footnote structure:
 *   [ref mark] [parent-CC tag="obiter-fn"]
 *     [child-CC tag="citation-uuid-1"] pure citation text [/child-CC]
 *     [child-CC tag="citation-uuid-2"] pure citation text [/child-CC]
 *   [/parent-CC] .
 *
 * Separators (`; `) between citations and closing punctuation (`.`) are
 * managed by the refresher, not stored inside child CCs.
 */

import { CitationStore } from "../store/citationStore";
import {
  formatCitation,
  applySignalAndCommentary,
} from "../engine/engine";
import type { CitationContext } from "../engine/engine";
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
 * Information about a single child citation content control within a
 * parent `obiter-fn` CC, in document order.
 */
interface ChildEntry {
  /** The citation ID (child content control tag — a UUID). */
  citationId: string;
  /** 1-based footnote number. */
  footnoteNumber: number;
}

/**
 * Information about a single footnote's parent content control and its
 * child citation entries.
 */
interface FootnoteEntry {
  /** The parent content control proxy object (tag = "obiter-fn"). */
  parentCC: Word.ContentControl;
  /** 1-based footnote number. */
  footnoteNumber: number;
  /** Ordered list of child citation IDs within this footnote. */
  children: ChildEntry[];
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
 * Concatenates FormattedRun text for comparison with existing CC content.
 */
function runsToPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/**
 * Refreshes all citation content controls in the document using the
 * parent-child footnote model.
 *
 * Steps:
 *  1. Rebuilds the footnote-number map and updates `firstFootnoteNumber`
 *     on each citation in the store.
 *  2. Scans all footnotes for parent CCs (`obiter-fn` tag) and collects
 *     child CCs (UUID tags) in document order.
 *  3. For each footnote's parent CC, rebuilds its content from scratch:
 *     renders each child citation, inserts `; ` separators between them,
 *     and appends `.` after the last.
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
  // Build config from the store's standard and writing mode
  const standardId = store.getStandardId();
  const baseConfig = getStandardConfig(standardId);
  const writingMode = store.getWritingMode();
  const config: CitationConfig = { ...baseConfig, writingMode };

  // Step 1: Rebuild footnote map and update store
  const footnoteMap = await buildFootnoteMap(context);
  await updateFirstFootnoteNumbers(store, footnoteMap);

  // Step 2: Scan all footnotes for parent-child CC structure
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  const footnoteEntries: FootnoteEntry[] = [];
  const fnItems = footnotes.items ?? [];

  for (let i = 0; i < fnItems.length; i++) {
    const noteItem = fnItems[i];
    const contentControls = noteItem.body.contentControls;
    contentControls.load("items/tag,items/title");
    await context.sync();

    const footnoteNumber = i + 1;

    // Find the parent CC with tag "obiter-fn"
    let parentCC: Word.ContentControl | undefined;
    for (const cc of (contentControls.items ?? [])) {
      if (cc.tag === "obiter-fn") {
        parentCC = cc;
        break;
      }
    }

    if (!parentCC) {
      // No parent CC — skip this footnote. This handles legacy documents
      // or footnotes without Obiter citations gracefully.
      continue;
    }

    // Find child CCs inside the parent (UUID tags)
    const childCCs = parentCC.contentControls;
    childCCs.load("items/tag,items/text");
    await context.sync();

    const children: ChildEntry[] = [];
    for (const childCC of (childCCs.items ?? [])) {
      if (childCC.tag && !childCC.tag.startsWith("obiter-")) {
        children.push({
          citationId: childCC.tag,
          footnoteNumber,
        });
      }
    }

    if (children.length > 0) {
      footnoteEntries.push({
        parentCC,
        footnoteNumber,
        children,
      });
    }
  }

  // Step 3: Render citations and rebuild parent CC content
  // Track which citation IDs have been seen for first vs subsequent
  const seenCitationIds = new Set<string>();
  // Track preceding footnote state for ibid resolution
  let prevFootnoteNumber = 0;
  let prevFootnoteCitationIds: string[] = [];
  let prevFootnotePinpoint: Pinpoint | undefined;

  let updated = 0;
  let unchanged = 0;

  for (const fnEntry of footnoteEntries) {
    const currentFootnoteCitationIds: string[] = [];

    // Build the complete set of runs for the entire parent CC content:
    // [child1 runs][; ][child2 runs][.]
    const parentRuns: Array<{ runs: FormattedRun[]; citationId: string }> = [];

    for (let childIdx = 0; childIdx < fnEntry.children.length; childIdx++) {
      const child = fnEntry.children[childIdx];
      const citation = store.getById(child.citationId);

      if (!citation) {
        // Citation not found in store — skip this child
        unchanged++;
        continue;
      }

      // Skip citations with empty/missing data
      if (!citation.data || Object.keys(citation.data).length === 0) {
        unchanged++;
        continue;
      }

      const isFirstCitation = !seenCitationIds.has(child.citationId);
      const isWithinSameFootnote = currentFootnoteCitationIds.includes(
        child.citationId,
      );

      // Ibid eligibility: citation must appear in the preceding footnote
      const isSameAsPreceding =
        prevFootnoteNumber === fnEntry.footnoteNumber - 1 &&
        prevFootnoteCitationIds.length > 0 &&
        prevFootnoteCitationIds.includes(child.citationId);

      const firstFootnoteNumber =
        footnoteMap.get(child.citationId) ?? fnEntry.footnoteNumber;
      const currentPinpoint = citation.data.pinpoint as Pinpoint | undefined;

      const citationContext: CitationContext = {
        footnoteNumber: fnEntry.footnoteNumber,
        isFirstCitation,
        isSameAsPreceding,
        precedingFootnoteCitationCount: prevFootnoteCitationIds.length,
        precedingPinpoint: prevFootnotePinpoint,
        currentPinpoint,
        firstFootnoteNumber,
        isWithinSameFootnote,
        formatPreference: "auto",
      };

      // formatCitation returns runs WITHOUT closing punctuation
      let runs = formatCitation(citation, citationContext, config);

      // Apply signal and commentary if present
      runs = applySignalAndCommentary(runs, citation);

      parentRuns.push({ runs, citationId: child.citationId });

      // Update tracking state
      seenCitationIds.add(child.citationId);
      currentFootnoteCitationIds.push(child.citationId);
    }

    // If no valid citations were rendered for this footnote, skip rebuild
    if (parentRuns.length === 0) {
      // Update preceding footnote tracking even if empty
      prevFootnoteNumber = fnEntry.footnoteNumber;
      prevFootnoteCitationIds = [...currentFootnoteCitationIds];
      continue;
    }

    // Build the full content that should be in the parent CC:
    // [citation1][; ][citation2][.]
    // Assemble the expected text for comparison
    const expectedParts: string[] = [];
    for (let j = 0; j < parentRuns.length; j++) {
      expectedParts.push(runsToPlainText(parentRuns[j].runs));
      if (j < parentRuns.length - 1) {
        expectedParts.push("; ");
      }
    }
    expectedParts.push(".");
    const expectedText = expectedParts.join("");

    // Load current parent CC text for comparison
    fnEntry.parentCC.load("text");
    await context.sync();

    const existingText = fnEntry.parentCC.text ?? "";

    if (expectedText === existingText) {
      unchanged += parentRuns.length;
    } else {
      // Rebuild the parent CC content from scratch.
      // Clear parent CC and re-insert child CCs with separators and punctuation.
      fnEntry.parentCC.clear();
      await context.sync();

      for (let j = 0; j < parentRuns.length; j++) {
        const { runs, citationId } = parentRuns[j];

        // Create a child CC at the end of the parent CC
        const endRange = fnEntry.parentCC.getRange("End");
        const childCC = endRange.insertContentControl("RichText");
        childCC.tag = citationId;
        childCC.title = "Citation";
        childCC.appearance = "Hidden" as Word.ContentControlAppearance;

        // Write the citation runs into the child CC
        for (const run of runs) {
          const range = childCC.insertText(run.text, "End");
          applyRunFormatting(range, run);
        }

        // Insert separator after this child (if not the last)
        if (j < parentRuns.length - 1) {
          fnEntry.parentCC.insertText("; ", "End");
        }
      }

      // Append closing punctuation after the last child
      fnEntry.parentCC.insertText(".", "End");
      await context.sync();

      updated += parentRuns.length;
    }

    // Update preceding footnote tracking for ibid resolution
    prevFootnoteNumber = fnEntry.footnoteNumber;
    prevFootnoteCitationIds = [...currentFootnoteCitationIds];

    // Track the pinpoint of the last citation in this footnote for ibid
    if (parentRuns.length > 0) {
      const lastCitationId = parentRuns[parentRuns.length - 1].citationId;
      const lastCitation = store.getById(lastCitationId);
      prevFootnotePinpoint = lastCitation?.data.pinpoint as Pinpoint | undefined;
    }
  }

  await context.sync();

  return { updated, unchanged };
}
