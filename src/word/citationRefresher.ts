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
 *     "; "  (separator — plain text between child CCs)
 *     [child-CC tag="citation-uuid-2"] pure citation text [/child-CC]
 *     "."   (closing punctuation — plain text after last child CC)
 *   [/parent-CC]
 *
 * Separators and closing punctuation are managed by the refresher, not
 * stored inside child CCs.
 *
 * Separator logic (Rule 1.1.3):
 *   - Default separator between citations: "; "
 *   - When a citation's introductory signal differs from the preceding
 *     citation's signal, a new sentence begins: ". " instead of "; "
 *
 * Closing punctuation (Rule 1.1.4):
 *   - Append "." after the last child CC unless the citation text
 *     already ends with ".", "!", or "?"
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
import type { Pinpoint, IntroductorySignal } from "../types/citation";
import { getStandardConfig, buildCourtConfig } from "../engine/standards";
import type { CitationConfig } from "../engine/standards/types";
import { getDevicePref } from "../store/devicePreferences";

/** Tag used for the parent content control wrapping all citations in a footnote. */
const PARENT_CC_TAG = "obiter-fn";

/** Punctuation marks that validly close a footnote (Rule 1.1.4). */
const CLOSING_PUNCTUATION = [".", "!", "?"];

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
 * Rendered output for a single citation within a footnote, including
 * its formatted runs and metadata needed for separator decisions.
 */
interface RenderedCitation {
  /** Formatted runs for this citation (no closing punctuation). */
  runs: FormattedRun[];
  /** The citation ID (child CC tag). */
  citationId: string;
  /** The citation's introductory signal, if any (for separator logic). */
  signal: IntroductorySignal | undefined;
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
 * Determines the separator to insert between two consecutive citations
 * in the same footnote per AGLC4 Rule 1.1.3.
 *
 * When the current citation's introductory signal differs from the
 * preceding citation's signal, a new sentence begins (`. `) instead
 * of the default semicolon separator (`; `).
 *
 * @param prevSignal - The preceding citation's introductory signal.
 * @param currSignal - The current citation's introductory signal.
 * @returns The separator string to insert between the two citations.
 */
function getSeparator(
  prevSignal: IntroductorySignal | undefined,
  currSignal: IntroductorySignal | undefined,
): string {
  // Rule 1.1.3: Different introductory signals → new sentence
  if (currSignal !== undefined && currSignal !== prevSignal) {
    return ". ";
  }
  return "; ";
}

/**
 * Determines the closing punctuation to append after the last citation
 * in a footnote per AGLC4 Rule 1.1.4.
 *
 * If the citation text already ends with `.`, `!`, or `?`, no additional
 * punctuation is needed. Otherwise, a full stop is appended.
 *
 * @param lastCitationText - The plain text of the last citation's runs.
 * @returns The closing punctuation string, or empty string if none needed.
 */
function getClosingPunctuation(lastCitationText: string): string {
  const trimmed = lastCitationText.trimEnd();
  if (trimmed.length === 0) {
    return ".";
  }
  const lastChar = trimmed[trimmed.length - 1];
  if (CLOSING_PUNCTUATION.includes(lastChar)) {
    return "";
  }
  return ".";
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
 *     renders each child citation, inserts separators between them
 *     (`;` or `.` per Rule 1.1.3), and appends closing punctuation
 *     after the last (per Rule 1.1.4).
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
  // Build config from the store's standard and writing mode, with court toggles
  const standardId = store.getStandardId();
  const baseConfig = getStandardConfig(standardId);
  const writingMode = store.getWritingMode();
  const courtToggles = getDevicePref("courtToggles") as Record<string, string> | undefined;
  const config: CitationConfig = buildCourtConfig({ ...baseConfig, writingMode }, courtToggles);

  // Step 1: Rebuild footnote map and update store
  const footnoteMap = await buildFootnoteMap(context);
  await updateFirstFootnoteNumbers(store, footnoteMap);

  // Step 2: Scan all footnotes for parent-child CC structure
  const footnoteEntries = await scanFootnotes(context);

  // Step 3: Render citations and rebuild parent CC content
  const result = await renderAndRebuild(context, store, config, footnoteMap, footnoteEntries);

  await context.sync();

  return result;
}

/**
 * Scans all footnotes in the document and collects parent-child CC
 * structures into an ordered list of FootnoteEntry objects.
 *
 * Footnotes without a parent CC (non-Obiter or legacy) are skipped.
 * Parent CCs with no valid child CCs are also skipped.
 *
 * @param context - An active Word request context.
 * @returns An ordered array of FootnoteEntry objects.
 */
async function scanFootnotes(
  context: Word.RequestContext,
): Promise<FootnoteEntry[]> {
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
      if (cc.tag === PARENT_CC_TAG) {
        parentCC = cc;
        break;
      }
    }

    if (!parentCC) {
      // No parent CC — skip this footnote (non-Obiter or legacy format)
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

  return footnoteEntries;
}

/**
 * Renders all citations across footnotes and rebuilds parent CC content
 * where the expected text differs from the existing text.
 *
 * Tracks citation context across footnotes for ibid/subsequent reference
 * resolution:
 * - `seenCitationIds`: tracks first-vs-subsequent references
 * - `prevFootnote*`: tracks preceding footnote state for ibid detection
 *
 * @param context - An active Word request context.
 * @param store - The citation store instance.
 * @param config - The active citation standard configuration.
 * @param footnoteMap - Map of citation ID to first footnote number.
 * @param footnoteEntries - Ordered list of footnote entries to process.
 * @returns A RefreshResult with counts of updated and unchanged citations.
 */
async function renderAndRebuild(
  context: Word.RequestContext,
  store: CitationStore,
  config: CitationConfig,
  footnoteMap: Map<string, number>,
  footnoteEntries: FootnoteEntry[],
): Promise<RefreshResult> {
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

    // Render all citations in this footnote
    const rendered = renderFootnoteCitations(
      fnEntry,
      store,
      config,
      footnoteMap,
      seenCitationIds,
      currentFootnoteCitationIds,
      prevFootnoteNumber,
      prevFootnoteCitationIds,
      prevFootnotePinpoint,
    );

    // If no valid citations were rendered for this footnote, skip rebuild
    if (rendered.length === 0) {
      prevFootnoteNumber = fnEntry.footnoteNumber;
      prevFootnoteCitationIds = [...currentFootnoteCitationIds];
      continue;
    }

    // Build the expected text for comparison
    const expectedText = buildExpectedText(rendered);

    // Load current parent CC text for comparison
    fnEntry.parentCC.load("text");
    await context.sync();

    const existingText = fnEntry.parentCC.text ?? "";

    if (expectedText === existingText) {
      unchanged += rendered.length;
    } else {
      // Rebuild the parent CC content from scratch
      await rebuildParentCC(context, fnEntry.parentCC, rendered);
      updated += rendered.length;
    }

    // Update preceding footnote tracking for ibid resolution
    prevFootnoteNumber = fnEntry.footnoteNumber;
    prevFootnoteCitationIds = [...currentFootnoteCitationIds];

    // Track the pinpoint of the last citation in this footnote for ibid
    if (rendered.length > 0) {
      const lastCitationId = rendered[rendered.length - 1].citationId;
      const lastCitation = store.getById(lastCitationId);
      prevFootnotePinpoint = lastCitation?.data.pinpoint as Pinpoint | undefined;
    }
  }

  return { updated, unchanged };
}

/**
 * Renders all citations within a single footnote, building CitationContext
 * for each and applying signal/commentary.
 *
 * Updates `seenCitationIds` and `currentFootnoteCitationIds` as side effects.
 *
 * @returns An array of RenderedCitation objects in document order.
 */
function renderFootnoteCitations(
  fnEntry: FootnoteEntry,
  store: CitationStore,
  config: CitationConfig,
  footnoteMap: Map<string, number>,
  seenCitationIds: Set<string>,
  currentFootnoteCitationIds: string[],
  prevFootnoteNumber: number,
  prevFootnoteCitationIds: string[],
  prevFootnotePinpoint: Pinpoint | undefined,
): RenderedCitation[] {
  const rendered: RenderedCitation[] = [];

  for (const child of fnEntry.children) {
    const citation = store.getById(child.citationId);

    if (!citation) {
      // Citation not found in store — skip this child gracefully
      continue;
    }

    // Skip citations with empty/missing data
    if (!citation.data || Object.keys(citation.data).length === 0) {
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
    // Normalise pinpoint — UI stores as string, resolver expects Pinpoint object
    const rawPinpoint = citation.data.pinpoint;
    const currentPinpoint: Pinpoint | undefined = rawPinpoint
      ? typeof rawPinpoint === "string"
        ? { type: "page" as const, value: rawPinpoint }
        : (rawPinpoint as Pinpoint)
      : undefined;

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

    rendered.push({
      runs,
      citationId: child.citationId,
      signal: citation.signal,
    });

    // Update tracking state
    seenCitationIds.add(child.citationId);
    currentFootnoteCitationIds.push(child.citationId);
  }

  return rendered;
}

/**
 * Assembles the expected plain text content for a parent CC from its
 * rendered citations.
 *
 * The text is built as:
 *   [citation1 text][separator][citation2 text][closing punctuation]
 *
 * Separator logic (Rule 1.1.3):
 *   - "; " between citations with the same or no introductory signal
 *   - ". " between citations with different introductory signals
 *
 * Closing punctuation (Rule 1.1.4):
 *   - "." unless the last citation already ends with ".", "!", or "?"
 *
 * @param rendered - The rendered citation entries for this footnote.
 * @returns The expected plain text string.
 */
function buildExpectedText(rendered: RenderedCitation[]): string {
  const parts: string[] = [];

  for (let j = 0; j < rendered.length; j++) {
    if (j > 0) {
      const separator = getSeparator(rendered[j - 1].signal, rendered[j].signal);
      parts.push(separator);
    }
    parts.push(runsToPlainText(rendered[j].runs));
  }

  // Closing punctuation after the last citation
  const lastCitationText = runsToPlainText(rendered[rendered.length - 1].runs);
  const closingPunct = getClosingPunctuation(lastCitationText);
  if (closingPunct) {
    parts.push(closingPunct);
  }

  return parts.join("");
}

/**
 * Clears the parent CC and rebuilds its content from scratch with fresh
 * child CCs, separators, and closing punctuation.
 *
 * Structure after rebuild:
 *   [parent CC]
 *     [child CC tag=uuid-1] citation 1 runs [/child CC]
 *     "; "   (or ". " per Rule 1.1.3)
 *     [child CC tag=uuid-2] citation 2 runs [/child CC]
 *     "."    (or empty per Rule 1.1.4)
 *   [/parent CC]
 *
 * @param context - An active Word request context.
 * @param parentCC - The parent content control to rebuild.
 * @param rendered - The rendered citation entries to write.
 */
async function rebuildParentCC(
  context: Word.RequestContext,
  parentCC: Word.ContentControl,
  rendered: RenderedCitation[],
): Promise<void> {
  // Clear parent CC — removes all content including old child CCs
  parentCC.clear();
  await context.sync();

  for (let j = 0; j < rendered.length; j++) {
    const { runs, citationId, signal } = rendered[j];

    // Create a child CC at the end of the parent CC
    const endRange = parentCC.getRange("End");
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
    if (j < rendered.length - 1) {
      const separator = getSeparator(signal, rendered[j + 1].signal);
      parentCC.insertText(separator, "End");
    }
  }

  // Append closing punctuation after the last child CC (Rule 1.1.4)
  const lastCitationText = runsToPlainText(rendered[rendered.length - 1].runs);
  const closingPunct = getClosingPunctuation(lastCitationText);
  if (closingPunct) {
    parentCC.insertText(closingPunct, "End");
  }

  await context.sync();
}
