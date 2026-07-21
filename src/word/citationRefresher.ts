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
import { formatCitation, applyLinkingPhrase, getFormattedPreview } from "../engine/engine";
import type { CitationContext } from "../engine/engine";
import { resolveSubsequentReference } from "../engine/resolver";
import type { SubsequentReferenceContext } from "../engine/resolver";
import { buildFootnoteMap, updateFirstFootnoteNumbers } from "./footnoteTracker";
import { escapeHtml, runsToHtml } from "./formattedRunsHtml";
import type { FormattedRun } from "../types/formattedRun";
import type { Pinpoint, IntroductorySignal } from "../types/citation";
import { getStandardConfig, buildCourtConfig } from "../engine/standards";
import type { CitationConfig } from "../engine/standards/types";
import { getDevicePref } from "../store/devicePreferences";
import {
  parseOccurrenceTitle,
  buildOccurrenceTitle,
  isFootnoteLocked,
  parseParentTitle,
  buildParentTitle,
} from "./footnoteManager";
import { hashRenderedText } from "../utils/textHash";
import { snapshotFootnotesBeforeRebuild } from "./footnoteBackup";

/** Tag used for the parent content control wrapping all citations in a footnote. */
const PARENT_CC_TAG = "obiter-fn";

/** Punctuation marks that validly close a footnote (Rule 1.1.4). */
const CLOSING_PUNCTUATION = [".", "!", "?"];

/**
 * Number of footnotes rebuilt per pipelined batch (SAFE-003). Each chunk
 * costs exactly 3 syncs (insertHtml → search → wrap) regardless of size,
 * so larger chunks mean fewer round trips on Word for Web; 8 keeps each
 * batch small enough that a mid-chunk failure has a bounded blast radius.
 */
export const REBUILD_CHUNK_SIZE = 8;

/** A footnote the refresher skipped because the user manually edited it (SAFE-002). */
export interface UserEditReport {
  /** 1-based footnote number. */
  footnoteNumber: number;
  /** The footnote's current (user-edited) text, as read from the document. */
  currentText: string;
  /** The text Obiter would have rendered. */
  expectedText: string;
}

/** A rebuild chunk that failed part-way through a refresh (SAFE-003). */
export interface RefreshFailure {
  /** 1-based footnote numbers in the failed chunk. */
  footnoteNumbers: number[];
  /** The error message. */
  error: string;
}

/** Result of a full citation refresh pass. */
export interface RefreshResult {
  /** Citations rebuilt with fresh content. */
  updated: number;
  /** Citations whose rendered text already matched the document. */
  unchanged: number;
  /** Citations inside locked (frozen) footnotes, left untouched. */
  lockedSkipped: number;
  /** Footnotes skipped because the user manually edited them. */
  userEdits: UserEditReport[];
  /** Rebuild chunks that failed; the rest of the refresh still completed. */
  failures: RefreshFailure[];
}

/** Detail payload of the `obiter:refresh-issues` CustomEvent. */
export interface RefreshIssuesDetail {
  failures: RefreshFailure[];
  userEdits: UserEditReport[];
}

/** An empty {@link RefreshResult} (also the manual-mode early return). */
export function emptyRefreshResult(): RefreshResult {
  return { updated: 0, unchanged: 0, lockedSkipped: 0, userEdits: [], failures: [] };
}

/**
 * A footnote queued for rebuild, as passed to the {@link OnBeforeRebuild}
 * hook (SAFE-004 seam): the pre-rebuild document text about to be replaced.
 */
export interface RebuildCandidate {
  /** 1-based footnote number. */
  footnoteNumber: number;
  /** The footnote's current document text (about to be overwritten). */
  existingText: string;
}

/**
 * Pre-rebuild hook (SAFE-004 seam). Called once per refresh, after
 * classification and before any document mutation, with every footnote in
 * the rebuild set. If the hook throws, the rebuilds are ABORTED (recorded in
 * `RefreshResult.failures`, not thrown) — never clobber without a snapshot.
 *
 * When no hook is passed, `refreshAllCitations` defaults to the SAFE-004
 * snapshot hook (`snapshotFootnotesBeforeRebuild`), closed over the same
 * request context the refresh runs in, so the texts about to be replaced
 * are written to the backup part in the same batch. Passing an explicit
 * hook replaces the default (tests / callers that manage their own backup).
 */
export type OnBeforeRebuild = (entries: RebuildCandidate[]) => Promise<void>;

/**
 * Information about a single child citation content control within a
 * parent `obiter-fn` CC, in document order.
 */
interface ChildEntry {
  /** The citation ID (child content control tag — a UUID). */
  citationId: string;
  /** 1-based footnote number. */
  footnoteNumber: number;
  /** Per-occurrence pinpoint encoded in the CC title (e.g. "4-5"). */
  pinpoint?: string;
  /** Per-occurrence format preference encoded in the CC title. */
  formatPreference: "auto" | "full" | "short" | "ibid";
  /** The CC title string (e.g. "Citation:short:4-5"). */
  ccTitle?: string;
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
  /** Whether this footnote is locked (frozen) — rebuild is skipped. */
  isLocked: boolean;
}

/** The rendered format of a citation within a footnote. */
export type RenderedFormat = "full" | "short" | "ibid";

/**
 * Rendered output for a single citation within a footnote, including
 * its formatted runs and metadata needed for separator decisions.
 *
 * Exported for tests (executeRebuilds takes these in its work items).
 */
export interface RenderedCitation {
  /** Formatted runs for this citation (no closing punctuation). */
  runs: FormattedRun[];
  /** The citation ID (child CC tag). */
  citationId: string;
  /** The citation's introductory signal, if any (for separator logic). */
  signal: IntroductorySignal | undefined;
  /** The rendered format of this citation (full/short/ibid). */
  renderedFormat: RenderedFormat;
  /** Per-occurrence pinpoint to preserve across rebuild cycles. */
  pinpoint?: string;
  /** User format preference to preserve across rebuild cycles. */
  formatPreference: "auto" | "full" | "short" | "ibid";
  /** Whether this is an explanatory note (uses sentence separator). */
  isNote?: boolean;
}

/**
 * Applies formatting from a FormattedRun to a Word Range.
 */
/**
 * Strips trailing closing punctuation (., !, ?) from the last run.
 * Used when embedding a linked citation — the parent CC handles closing punctuation.
 */
function stripClosingPunctuation(runs: FormattedRun[]): FormattedRun[] {
  if (runs.length === 0) return runs;
  const last = runs[runs.length - 1];
  const trimmed = last.text.replace(/[.!?]\s*$/, "");
  if (trimmed === last.text) return runs;
  return [...runs.slice(0, -1), { ...last, text: trimmed }];
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
  prevIsNote?: boolean,
  currIsNote?: boolean
): string {
  // Explanatory notes are separate sentences, not citation-list items
  if (prevIsNote || currIsNote) {
    return ". ";
  }
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
 * @param onBeforeRebuild - Optional pre-rebuild hook (SAFE-004 seam); see
 *   {@link OnBeforeRebuild}.
 * @returns A RefreshResult with counts of updated and unchanged citations.
 */
export async function refreshAllCitations(
  context: Word.RequestContext,
  store: CitationStore,
  onBeforeRebuild?: OnBeforeRebuild
): Promise<RefreshResult> {
  // Gate: Manual Citations Mode disables all auto-refresh
  if (getDevicePref("manualCitationMode") === true) {
    return emptyRefreshResult();
  }

  // Build config from the store's standard and writing mode, with court toggles
  const standardId = store.getStandardId();
  const baseConfig = getStandardConfig(standardId);
  const writingMode = store.getWritingMode();
  // Court toggle overrides are DOCUMENT metadata (cross-device correctness).
  // Legacy documents customised before the migration have them only in the
  // device prefs, so fall back to that for one release of reads; Settings
  // adopts the device value into the store on its next court-mode save.
  const courtToggles =
    store.getCourtToggles() ??
    (getDevicePref("courtToggles") as Record<string, string> | undefined);
  const config: CitationConfig = buildCourtConfig({ ...baseConfig, writingMode }, courtToggles);

  // Step 1: Rebuild footnote map and update store
  const footnoteMap = await buildFootnoteMap(context);
  await updateFirstFootnoteNumbers(store, footnoteMap);

  // Step 2: Scan all footnotes for parent-child CC structure
  const footnoteEntries = await scanFootnotes(context);

  // SAFE-004: unless the caller supplies its own hook, snapshot the texts
  // about to be replaced into the backup part — in THIS request context, so
  // the write shares the refresh batch. The seam semantics protect the
  // document: if the snapshot fails, the rebuilds are aborted.
  const beforeRebuild: OnBeforeRebuild =
    onBeforeRebuild ?? ((entries) => snapshotFootnotesBeforeRebuild(context, entries));

  // Step 3: Render citations and rebuild parent CC content
  const result = await renderAndRebuild(
    context,
    store,
    config,
    footnoteMap,
    footnoteEntries,
    beforeRebuild
  );

  await context.sync();

  return result;
}

/**
 * Runs a full citation refresh in its own Word context, synchronously.
 *
 * Use this immediately after an insert or append. The append path defers `; `
 * separators and the closing `.` to the refresher (see footnoteManager), so a
 * second citation added to a footnote is raw-concatenated until a refresh runs.
 * The debounced auto-refresh (triggerRefresh) can be delayed by its timer or
 * skipped while another refresh is in flight, which left a stale full stop
 * between two citations in the same footnote (e.g. "A.B"). Calling this after
 * the insert makes the normalisation deterministic. No-op in Manual Citations
 * Mode, which `refreshAllCitations` gates on.
 */
export async function refreshAllCitationsNow(
  store: CitationStore,
  onBeforeRebuild?: OnBeforeRebuild
): Promise<RefreshResult> {
  return Word.run((context) => refreshAllCitations(context, store, onBeforeRebuild));
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
async function scanFootnotes(context: Word.RequestContext): Promise<FootnoteEntry[]> {
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
    for (const cc of contentControls.items ?? []) {
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
    childCCs.load("items/tag,items/text,items/title");
    await context.sync();

    const children: ChildEntry[] = [];
    for (const childCC of childCCs.items ?? []) {
      if (childCC.tag && !childCC.tag.startsWith("obiter-")) {
        const ccTitle = childCC.title ?? "";
        const parsed = parseOccurrenceTitle(ccTitle);
        children.push({
          citationId: childCC.tag,
          footnoteNumber,
          pinpoint: parsed.pinpoint,
          formatPreference: parsed.formatPreference,
          ccTitle,
        });
      }
    }

    if (children.length > 0) {
      footnoteEntries.push({
        parentCC,
        footnoteNumber,
        children,
        // Lock state lives on the parent CC title (loaded above via
        // items/tag,items/title). A locked footnote is frozen — see below.
        isLocked: isFootnoteLocked(parentCC.title),
      });
    }
  }

  return footnoteEntries;
}

/**
 * How the refresher should treat a footnote whose text has been compared
 * against the expected render (SAFE-002 decision matrix).
 */
export type FootnoteClassification = "unchanged" | "rebuild" | "user-edited";

/**
 * SAFE-002 decision matrix: classifies a footnote by comparing its current
 * document text against the expected render and the stored rendered-text
 * hash from the parent-CC title.
 *
 *   current == expected                     → "unchanged"
 *   current != expected, no stored hash     → "rebuild" (legacy, status quo;
 *                                             the rebuild starts recording)
 *   current != expected, hash(current) ==
 *     stored hash                           → "rebuild" (stale Obiter render)
 *   current != expected, hash(current) !=
 *     stored hash                           → "user-edited" (never clobber)
 *
 * Pure — exported for unit tests. Lock state is checked by the caller
 * before classification (lock always wins).
 */
export function classifyFootnote(
  currentText: string,
  expectedText: string,
  storedHash: string | undefined
): FootnoteClassification {
  if (currentText === expectedText) {
    return "unchanged";
  }
  if (storedHash === undefined) {
    return "rebuild";
  }
  return hashRenderedText(currentText) === storedHash ? "rebuild" : "user-edited";
}

/** Splits `items` into consecutive chunks of at most `size`. Pure — exported for tests. */
export function chunkItems<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * A footnote queued for rebuild after classification.
 * Exported for tests (see {@link executeRebuilds}).
 */
export interface RebuildWorkItem {
  /** 1-based footnote number. */
  footnoteNumber: number;
  /** The parent content control to rebuild. */
  parentCC: Word.ContentControl;
  /** The rendered citation entries to write. */
  rendered: RenderedCitation[];
  /** The expected plain text (hashed into the new parent-CC title). */
  expectedText: string;
  /** The footnote's current document text (pre-rebuild, for the SAFE-004 hook). */
  existingText: string;
}

/**
 * Renders all citations across footnotes and rebuilds parent CC content
 * where the expected text differs from the existing text.
 *
 * SAFE-003 phases:
 *  1. Batch-read: queue `parentCC.load("text")` for every non-locked entry,
 *     then ONE sync (no per-footnote read syncs).
 *  2. Pure render of all footnotes in document order, threading the
 *     ibid/short-form context (`seenCitationIds`, `prevFootnote*`) through
 *     every footnote regardless of how it is later classified.
 *  3. Classify each footnote per the SAFE-002 matrix (lock wins first).
 *  4. SAFE-004 seam: `onBeforeRebuild` runs with the rebuild set before any
 *     document mutation.
 *  5. Rebuild in chunks of {@link REBUILD_CHUNK_SIZE}, 3 syncs per chunk;
 *     a failing chunk is recorded in `failures` and processing continues.
 *
 * @param context - An active Word request context.
 * @param store - The citation store instance.
 * @param config - The active citation standard configuration.
 * @param footnoteMap - Map of citation ID to first footnote number.
 * @param footnoteEntries - Ordered list of footnote entries to process.
 * @param onBeforeRebuild - Optional pre-rebuild hook (SAFE-004 seam).
 * @returns A RefreshResult with counts and per-footnote issue reports.
 */
async function renderAndRebuild(
  context: Word.RequestContext,
  store: CitationStore,
  config: CitationConfig,
  footnoteMap: Map<string, number>,
  footnoteEntries: FootnoteEntry[],
  onBeforeRebuild?: OnBeforeRebuild
): Promise<RefreshResult> {
  const result = emptyRefreshResult();

  // Phase 1: batch-read the current text of every non-locked parent CC in
  // ONE round trip. (Locked footnotes are never rebuilt, so their text is
  // not needed.) Rebuilding one footnote never changes another footnote's
  // text, so reading everything up-front is equivalent to reading lazily.
  const unlockedEntries = footnoteEntries.filter((fnEntry) => !fnEntry.isLocked);
  if (unlockedEntries.length > 0) {
    for (const fnEntry of unlockedEntries) {
      fnEntry.parentCC.load("text");
    }
    await context.sync();
  }

  // Phase 2 + 3: pure render in document order, then classify.
  //
  // The ibid/short-form context (seenCitationIds, prevFootnote*) must be
  // threaded through EVERY footnote in order — locked, unchanged,
  // user-edited, and rebuilt footnotes all advance it identically, because
  // classification never changes what the footnote is *supposed* to cite.
  const seenCitationIds = new Set<string>();
  let prevFootnoteNumber = 0;
  let prevFootnoteCitationIds: string[] = [];
  let prevFootnotePinpoint: Pinpoint | undefined;

  const rebuildItems: RebuildWorkItem[] = [];

  for (const fnEntry of footnoteEntries) {
    const currentFootnoteCitationIds: string[] = [];

    // Render all citations in this footnote (pure — no Word writes)
    const rendered = renderFootnoteCitations(
      fnEntry,
      store,
      config,
      footnoteMap,
      seenCitationIds,
      currentFootnoteCitationIds,
      prevFootnoteNumber,
      prevFootnoteCitationIds,
      prevFootnotePinpoint
    );

    // Update preceding footnote tracking for ibid resolution
    prevFootnoteNumber = fnEntry.footnoteNumber;
    prevFootnoteCitationIds = [...currentFootnoteCitationIds];

    // If no valid citations were rendered for this footnote, skip rebuild
    if (rendered.length === 0) {
      continue;
    }

    // Track the pinpoint of the last citation in this footnote for ibid
    const lastCitationId = rendered[rendered.length - 1].citationId;
    prevFootnotePinpoint = store.getById(lastCitationId)?.data.pinpoint as Pinpoint | undefined;

    // Locked (frozen) footnote: keep ibid/numbering tracking current (rendered
    // above, pure — no Word writes) but do NOT touch the parent CC, so its text
    // — including any manual edits — is preserved exactly. Lock wins over the
    // hash logic — a locked footnote is never classified.
    if (fnEntry.isLocked) {
      result.lockedSkipped += rendered.length;
      continue;
    }

    // Classify per the SAFE-002 decision matrix
    const expectedText = buildExpectedText(rendered);
    const existingText = fnEntry.parentCC.text ?? "";
    const storedHash = parseParentTitle(fnEntry.parentCC.title).renderedHash;

    switch (classifyFootnote(existingText, expectedText, storedHash)) {
      case "unchanged":
        result.unchanged += rendered.length;
        break;
      case "user-edited":
        // The user manually edited this footnote — never clobber it.
        result.userEdits.push({
          footnoteNumber: fnEntry.footnoteNumber,
          currentText: existingText,
          expectedText,
        });
        break;
      case "rebuild":
        rebuildItems.push({
          footnoteNumber: fnEntry.footnoteNumber,
          parentCC: fnEntry.parentCC,
          rendered,
          expectedText,
          existingText,
        });
        break;
    }
  }

  if (rebuildItems.length === 0) {
    return result;
  }

  // Phase 4: SAFE-004 seam — snapshot hook before any document mutation.
  // If the hook fails, abort the rebuilds (never clobber without a
  // snapshot) but return normally with the failure recorded.
  if (onBeforeRebuild) {
    try {
      await onBeforeRebuild(
        rebuildItems.map((item) => ({
          footnoteNumber: item.footnoteNumber,
          existingText: item.existingText,
        }))
      );
    } catch (err) {
      result.failures.push({
        footnoteNumbers: rebuildItems.map((item) => item.footnoteNumber),
        error: `Pre-rebuild hook failed; rebuilds aborted. ${err instanceof Error ? err.message : String(err)}`,
      });
      return result;
    }
  }

  // Phase 5: rebuild in pipelined chunks (3 syncs per chunk).
  const rebuildOutcome = await executeRebuilds(context, rebuildItems, REBUILD_CHUNK_SIZE);
  result.updated += rebuildOutcome.updated;
  result.failures.push(...rebuildOutcome.failures);

  return result;
}

/**
 * Executes the queued rebuilds in chunks, pipelining the three Word stages
 * across each chunk: all insertHtml (+ new hashed titles) → sync; all
 * searches → sync; all child-CC wraps → sync. Exactly 3 syncs per chunk
 * instead of 3 per footnote (SAFE-003 — batching matters on Word for Web).
 *
 * Each chunk is independently wrapped in try/catch: a failing chunk is
 * recorded as a {@link RefreshFailure} and processing continues with the
 * next chunk, so one bad footnote cannot silently abort the whole refresh.
 *
 * Exported for tests (sync counting and failure isolation with mock CCs).
 *
 * @param context - An active Word request context.
 * @param items - The rebuild work items, in document order.
 * @param chunkSize - Footnotes per chunk (default {@link REBUILD_CHUNK_SIZE}).
 * @returns The number of citations rebuilt and any per-chunk failures.
 */
export async function executeRebuilds(
  context: Word.RequestContext,
  items: readonly RebuildWorkItem[],
  chunkSize: number = REBUILD_CHUNK_SIZE
): Promise<{ updated: number; failures: RefreshFailure[] }> {
  let updated = 0;
  const failures: RefreshFailure[] = [];

  for (const chunk of chunkItems(items, chunkSize)) {
    try {
      await executeRebuildChunk(context, chunk);
      for (const item of chunk) {
        updated += item.rendered.length;
      }
    } catch (err) {
      failures.push({
        footnoteNumbers: chunk.map((item) => item.footnoteNumber),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { updated, failures };
}

/**
 * Rebuilds one chunk of footnotes with the three pipelined stages.
 *
 * Stage 1 also writes the new parent-CC title carrying the hash of the
 * expected text (SAFE-002), in the same batch as the insertHtml — so even
 * if a later stage fails, the recorded hash matches the text that was
 * actually written and the next refresh classifies it as a stale render
 * and retries the rebuild.
 */
async function executeRebuildChunk(
  context: Word.RequestContext,
  chunk: readonly RebuildWorkItem[]
): Promise<void> {
  // Stage 1: compose and insert every footnote's HTML, and stamp the new
  // rendered-text hash into the parent title. One sync for the whole chunk.
  const childTextsPerItem = chunk.map((item) => {
    const { html, childTexts } = buildRebuildHtml(item.rendered);
    item.parentCC.insertHtml(html, "Replace" as Word.InsertLocation.replace);
    item.parentCC.title = buildParentTitle({
      locked: false,
      renderedHash: hashRenderedText(item.expectedText),
    });
    return childTexts;
  });
  await context.sync();

  // Stage 2: queue every footnote's child-text searches. One sync.
  const searchesPerItem = chunk.map((item, i) =>
    queueChildSearches(item.parentCC, childTextsPerItem[i])
  );
  await context.sync();

  // Stage 3: wrap every citation's text in its child CC. One sync.
  for (let i = 0; i < chunk.length; i++) {
    wrapChildControls(chunk[i].rendered, childTextsPerItem[i], searchesPerItem[i]);
  }
  await context.sync();
}

/**
 * Returns true when the immediately preceding citation in the current
 * footnote refers to the same source, making the `at «pinpoint»` form
 * available for this occurrence.
 *
 * AGLC4 Rule 1.4.6 (PARITY-102c): within a footnote, 'at' may only refer to
 * the immediately preceding source. A later pinpoint to an earlier,
 * non-adjacent source in the footnote must not use 'at' — it is cited via
 * the Rule 1.4.1 `(n X)` short form instead (the guide's own example
 * cross-references the footnote's own number: 'Brennan Jr (n 94) 430').
 *
 * @param citationId - The citation ID of the occurrence being rendered.
 * @param currentFootnoteCitationIds - Citation IDs already rendered in this
 *   footnote, in document order.
 */
export function isImmediatelyPrecedingInFootnote(
  citationId: string,
  currentFootnoteCitationIds: readonly string[]
): boolean {
  return (
    currentFootnoteCitationIds.length > 0 &&
    currentFootnoteCitationIds[currentFootnoteCitationIds.length - 1] === citationId
  );
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
  prevFootnotePinpoint: Pinpoint | undefined
): RenderedCitation[] {
  const rendered: RenderedCitation[] = [];

  for (const child of fnEntry.children) {
    const citation = store.getById(child.citationId);

    if (!citation) {
      // Citation not found in store — skip this child gracefully
      continue;
    }

    // Skip citations with empty/missing data
    // eslint-disable-next-line office-addins/call-sync-before-read, office-addins/load-object-before-read -- plain store Citation object, not an Office proxy
    if (!citation.data || Object.keys(citation.data).length === 0) {
      continue;
    }

    const isFirstCitation = !seenCitationIds.has(child.citationId);
    const isWithinSameFootnote = isImmediatelyPrecedingInFootnote(
      child.citationId,
      currentFootnoteCitationIds
    );

    // Ibid eligibility: citation must appear in the preceding footnote
    const isSameAsPreceding =
      prevFootnoteNumber === fnEntry.footnoteNumber - 1 &&
      prevFootnoteCitationIds.length > 0 &&
      prevFootnoteCitationIds.includes(child.citationId);

    const firstFootnoteNumber = footnoteMap.get(child.citationId) ?? fnEntry.footnoteNumber;
    // Per-occurrence pinpoint from the CC title takes priority over
    // the citation's stored pinpoint (different footnotes can cite
    // different pages of the same source).
    // eslint-disable-next-line office-addins/call-sync-before-read, office-addins/load-object-before-read -- plain store Citation object, not an Office proxy
    const rawPinpoint = child.pinpoint ?? citation.data.pinpoint;
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
      formatPreference: child.formatPreference,
    };

    // Determine the rendered format by checking what the resolver returns.
    // null → full citation; non-null → check for ibid vs short.
    let renderedFormat: RenderedFormat = "full";
    if (!isFirstCitation) {
      const resolverCtx: SubsequentReferenceContext = {
        isFirstCitation,
        isSameAsPreceding,
        precedingFootnoteCitationCount: prevFootnoteCitationIds.length,
        precedingPinpoint: prevFootnotePinpoint,
        currentPinpoint,
        firstFootnoteNumber,
        isWithinSameFootnote,
        formatPreference: child.formatPreference,
        config,
      };
      const subRuns = resolveSubsequentReference(citation, resolverCtx);
      if (subRuns !== null) {
        // Check if the text starts with "Ibid" to distinguish ibid from short
        const subText = subRuns.map((r) => r.text).join("");
        renderedFormat = subText.startsWith("Ibid") ? "ibid" : "short";
      }
    }

    // formatCitation returns runs WITHOUT closing punctuation
    let runs = formatCitation(citation, citationContext, config);

    // Signal and commentary are already applied by formatCitation() — do not re-apply

    // LINK-001: Apply linking phrase and linked citation (Rule 1.3)
    // eslint-disable-next-line office-addins/call-sync-before-read, office-addins/load-object-before-read -- plain store Citation object, not an Office proxy
    if (citation.linkingPhrase && citation.linkedCitationId) {
      // eslint-disable-next-line office-addins/call-sync-before-read, office-addins/load-object-before-read -- plain store Citation object, not an Office proxy
      const linkedCitation = store.getById(citation.linkedCitationId);
      if (linkedCitation) {
        const linkedRuns = getFormattedPreview(linkedCitation, config);
        const strippedLinkedRuns = stripClosingPunctuation(linkedRuns);
        // eslint-disable-next-line office-addins/call-sync-before-read -- plain store Citation object, not an Office proxy
        runs = applyLinkingPhrase(runs, citation.linkingPhrase, strippedLinkedRuns);
      }
    }

    rendered.push({
      runs,
      citationId: child.citationId,
      // eslint-disable-next-line office-addins/call-sync-before-read, office-addins/load-object-before-read -- plain store Citation object, not an Office proxy
      signal: citation.signal,
      renderedFormat,
      pinpoint: child.pinpoint,
      formatPreference: child.formatPreference,
      // eslint-disable-next-line office-addins/call-sync-before-read, office-addins/load-object-before-read -- plain store Citation object, not an Office proxy
      isNote: citation.sourceType === "explanatory_note",
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
      const separator = getSeparator(
        rendered[j - 1].signal,
        rendered[j].signal,
        rendered[j - 1].isNote,
        rendered[j].isNote
      );
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
 * Composes a parent CC's entire content as ONE HTML fragment (stage 1 of a
 * rebuild), plus the plain child texts needed to wrap child CCs later.
 *
 * Structure after the full rebuild:
 *   [parent CC]
 *     [child CC tag=uuid-1] citation 1 runs [/child CC]
 *     "; "   (or ". " per Rule 1.1.3)
 *     [child CC tag=uuid-2] citation 2 runs [/child CC]
 *     "."    (or empty per Rule 1.1.4)
 *   [/parent CC]
 *
 * The content — citations, separators, and closing punctuation — is written
 * in a single insertHtml call, then the child CCs are wrapped around each
 * citation's text afterwards. The piecewise APIs are broken on Word on the
 * web: `getRange("End").insertContentControl()` lands children outside the
 * parent (WEB-001), font assignments on ranges returned by insertText
 * silently no-op (WEB-002), per-piece insertHtml/insertText calls inject
 * smart-paste join spaces at fragment boundaries, and insertOoxml throws
 * `unsupportedSelection` inside footnotes on the web. A single HTML
 * fragment imports with exact text and per-run formatting on both hosts
 * (verified empirically); "Replace" also clears the placeholder state.
 *
 * @param rendered - The rendered citation entries to write.
 * @returns The composed HTML fragment and each citation's plain text.
 */
function buildRebuildHtml(rendered: RenderedCitation[]): { html: string; childTexts: string[] } {
  const htmlPieces: string[] = [];
  const childTexts: string[] = [];
  for (let j = 0; j < rendered.length; j++) {
    childTexts.push(runsToPlainText(rendered[j].runs));
    htmlPieces.push(runsToHtml(rendered[j].runs));

    // Separator after this child (if not the last) — plain text in the
    // fragment, outside the child CCs (Rules 1.1.3, 1.1.4).
    if (j < rendered.length - 1) {
      const separator = getSeparator(
        rendered[j].signal,
        rendered[j + 1].signal,
        rendered[j].isNote,
        rendered[j + 1].isNote
      );
      htmlPieces.push(escapeHtml(separator));
    }
  }

  // Closing punctuation after the last child CC (Rule 1.1.4).
  const lastCitationText = runsToPlainText(rendered[rendered.length - 1].runs);
  const closingPunct = getClosingPunctuation(lastCitationText);
  if (closingPunct) {
    htmlPieces.push(escapeHtml(closingPunct));
  }

  return { html: htmlPieces.join(""), childTexts };
}

/**
 * Queues a search for each citation's text within the parent CC (stage 2 of
 * a rebuild). The caller syncs once for the whole chunk.
 *
 * Word's Range.search caps the query at 255 characters, so very long
 * citations search by prefix.
 */
function queueChildSearches(
  parentCC: Word.ContentControl,
  childTexts: string[]
): Word.RangeCollection[] {
  const parentRange = parentCC.getRange("Whole" as Word.RangeLocation.whole);
  return childTexts.map((text) => {
    const query = text.length > 250 ? text.slice(0, 250) : text;
    const found = parentRange.search(query, { matchCase: true });
    found.load("items");
    return found;
  });
}

/**
 * Wraps each citation's text in its child CC (stage 3 of a rebuild). The
 * caller syncs once for the whole chunk.
 *
 * When the same text occurs more than once in the footnote (e.g. two "Ibid"
 * children), occurrences are assigned to children in document order.
 */
function wrapChildControls(
  rendered: RenderedCitation[],
  childTexts: string[],
  searches: Word.RangeCollection[]
): void {
  const occurrenceCursor = new Map<string, number>();
  for (let j = 0; j < rendered.length; j++) {
    const text = childTexts[j];
    const matches = searches[j].items ?? [];
    const k = occurrenceCursor.get(text) ?? 0;
    occurrenceCursor.set(text, k + 1);
    const target = matches[k] ?? matches[0];
    if (!target) {
      // Leave this citation unwrapped rather than corrupting a neighbour —
      // the next refresh pass rebuilds the footnote and retries.
      continue;
    }
    const childCC = target.insertContentControl("RichText");
    childCC.tag = rendered[j].citationId;
    // Preserve the user's format preference (and any pinpoint) in the title.
    // The rendered format is recomputed from preference + context each refresh.
    childCC.title = buildOccurrenceTitle(rendered[j].formatPreference, rendered[j].pinpoint);
    childCC.appearance = "Hidden" as Word.ContentControlAppearance;
  }
}
