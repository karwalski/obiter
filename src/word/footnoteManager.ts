/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FN-002: Footnote Manager (Parent-Child Content Control Model)
 *
 * Manages the insertion, update, and deletion of citations in Word footnotes
 * using a two-level content control (CC) structure:
 *
 *   [footnote reference mark]
 *   [PARENT CC tag="obiter-fn" appearance="Hidden"]
 *     [CHILD CC tag="citation-uuid-1" appearance="Hidden"]
 *       FormattedRun[] for citation 1 (no trailing punctuation)
 *     [/CHILD CC]
 *     "; "                    <-- plain text, managed by the refresher
 *     [CHILD CC tag="citation-uuid-2" appearance="Hidden"]
 *       FormattedRun[] for citation 2 (no trailing punctuation)
 *     [/CHILD CC]
 *     "."                     <-- plain text, managed by the refresher
 *   [/PARENT CC]
 *
 * Key invariants:
 *  - The footnote reference mark is OUTSIDE the parent CC.
 *  - Separators ("; ") and closing punctuation (".") are plain text inside the
 *    parent CC but outside child CCs -- the refresher owns these.
 *  - Child CCs contain only the citation's FormattedRun[] output.
 *  - Both parent and child CCs use RichText type and Hidden appearance.
 *  - All APIs stay within the WordApi 1.5 baseline.
 */

/* global Word */

import { FormattedRun } from "../types/formattedRun";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Tag used for the parent content control wrapping all citations in a footnote. */
export const PARENT_CC_TAG = "obiter-fn";

/** Title set on the parent CC of a normal (auto-formatted) footnote. */
export const PARENT_CC_TITLE = "Obiter Footnote";

/**
 * Title set on the parent CC of a LOCKED footnote.
 *
 * A locked footnote is frozen exactly as it reads in the document — the
 * refresher still scans it (for ibid resolution and numbering) but never
 * rebuilds it, so manual edits survive. The lock flag lives on the parent CC
 * *title* (the parent is located by tag, so its title is otherwise unused), so
 * it travels with the footnote as footnotes are inserted or removed. The
 * child-CC title encoding (`buildOccurrenceTitle`) is a separate channel and is
 * untouched.
 */
export const LOCKED_PARENT_CC_TITLE = "Obiter Footnote (locked)";

/** Whether a footnote's parent-CC title marks it as locked (frozen). */
export function isFootnoteLocked(parentTitle: string | undefined | null): boolean {
  return parentTitle === LOCKED_PARENT_CC_TITLE;
}

// ─── Public Interfaces ──────────────────────────────────────────────────────

/** Summary of a citation content control found in a footnote. */
export interface CitationFootnoteEntry {
  /** 1-based footnote index. */
  footnoteIndex: number;
  /** The citation UUID (child CC tag). */
  citationId: string;
  /** Human-readable label from the child CC title. */
  title: string;
  /** User format preference for this occurrence (auto/full/short/ibid). */
  formatPreference?: "auto" | "full" | "short" | "ibid";
  /** Per-occurrence pinpoint encoded in the CC title. */
  pinpoint?: string;
  /** Whether this footnote is locked (frozen — the refresher skips its rebuild). */
  isLocked?: boolean;
}

/** Result returned when cursor is next to a footnote. */
export interface AdjacentFootnoteResult {
  /** 1-based footnote index. */
  footnoteIndex: number;
  /** The NoteItem for the adjacent footnote. */
  noteItem: Word.NoteItem;
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

/**
 * Applies formatting from a FormattedRun to a Word Range.
 *
 * Each property maps directly to a Word.Font property. Omitted properties
 * are left unchanged (inherit from the content control default).
 */
export function applyRunFormatting(range: Word.Range, run: FormattedRun): void {
  // Set toggle attributes explicitly (default false) rather than only when
  // present. A FormattedRun fully specifies its own formatting, so an omitted
  // attribute means "off", not "inherit". Without this, a run with italic
  // unset inherited the previous run's italic — the case formatters mark only
  // the case name italic and leave the citation runs unset, so the whole
  // citation rendered italic (AGLC4 Rule 2 italicises the case name only).
  range.font.italic = run.italic ?? false;
  range.font.bold = run.bold ?? false;
  range.font.superscript = run.superscript ?? false;
  if (run.font !== undefined) {
    range.font.name = run.font;
  }
  if (run.size !== undefined) {
    range.font.size = run.size;
  }
  // smallCaps requires WordApiDesktop 1.3; on Word for Web this is silently
  // ignored rather than throwing.
  if (run.smallCaps !== undefined) {
    range.font.smallCaps = run.smallCaps;
  }
}

/**
 * Writes an array of FormattedRun objects into a content control, replacing
 * any existing content. Uses "Replace" insertion for the first run to avoid
 * cc.clear() which can destroy footnote reference marks if the CC
 * encompasses them.
 */
export function writeFormattedRunsToControl(
  cc: Word.ContentControl,
  runs: FormattedRun[],
): void {
  if (runs.length === 0) {
    cc.clear();
    return;
  }

  // Replace all existing content with the first run
  const firstRange = cc.insertText(
    runs[0].text,
    "Replace" as Word.InsertLocation.replace,
  );
  applyRunFormatting(firstRange, runs[0]);

  // Append remaining runs
  for (let i = 1; i < runs.length; i++) {
    const range = cc.insertText(runs[i].text, "End");
    applyRunFormatting(range, runs[i]);
  }
}

// ─── Child CC Insertion ─────────────────────────────────────────────────────

/**
 * Inserts formatted runs into a new child content control within a parent CC.
 * The child CC is tagged with the citation UUID and uses Hidden appearance.
 *
 * This is a synchronous proxy-queuing operation -- the caller must call
 * `context.sync()` afterwards to commit to the document.
 *
 * @param parentCC - The parent content control (`obiter-fn` tag).
 * @param citationId - Unique identifier for the citation (child CC tag).
 * @param title - Human-readable label for the child CC title.
 * @param formattedRuns - Citation text runs (WITHOUT closing punctuation).
 */
export function insertChildCitation(
  parentCC: Word.ContentControl,
  citationId: string,
  title: string,
  formattedRuns: FormattedRun[],
): void {
  const endRange = parentCC.getRange("End");
  const childCC = endRange.insertContentControl("RichText");
  childCC.tag = citationId;
  childCC.title = title;
  childCC.appearance = "Hidden" as Word.ContentControlAppearance;

  // Insert citation text inside the child content control
  for (const run of formattedRuns) {
    const range = childCC.insertText(run.text, "End");
    applyRunFormatting(range, run);
  }
}

// ─── CC Lookup Helpers ──────────────────────────────────────────────────────

/**
 * Finds the parent content control (`obiter-fn` tag) inside a footnote.
 * Returns null if the footnote does not contain a parent CC (e.g. a
 * non-Obiter footnote or a legacy footnote from before this model).
 *
 * @param noteItem - The footnote's NoteItem.
 * @param context - An active Word request context.
 * @returns The parent content control, or null.
 */
export async function findParentCC(
  noteItem: Word.NoteItem,
  context: Word.RequestContext,
): Promise<Word.ContentControl | null> {
  const contentControls = noteItem.body.contentControls;
  contentControls.load("items/tag");
  await context.sync();

  const ccItems = contentControls.items ?? [];
  for (const cc of ccItems) {
    if (cc.tag === PARENT_CC_TAG) {
      return cc;
    }
  }
  return null;
}

/**
 * Finds a specific child content control by citation ID inside a parent CC.
 * Returns null if no child CC with the given tag exists.
 *
 * @param parentCC - The parent content control (`obiter-fn` tag).
 * @param citationId - The citation UUID to search for.
 * @param context - An active Word request context.
 * @returns The child content control, or null.
 */
export async function findChildCC(
  parentCC: Word.ContentControl,
  citationId: string,
  context: Word.RequestContext,
): Promise<Word.ContentControl | null> {
  const childControls = parentCC.contentControls;
  childControls.load("items/tag");
  await context.sync();

  for (const cc of (childControls.items ?? [])) {
    if (cc.tag === citationId) {
      return cc;
    }
  }
  return null;
}

/**
 * Returns the ordered list of citation IDs (child CC tags) within a single
 * footnote's parent CC, in document order.
 *
 * Returns an empty array if the footnote has no parent CC or no child CCs.
 *
 * @param noteItem - The footnote's NoteItem.
 * @param context - An active Word request context.
 * @returns An array of citation IDs in document order.
 */
export async function getFootnoteCitations(
  noteItem: Word.NoteItem,
  context: Word.RequestContext,
): Promise<string[]> {
  const parentCC = await findParentCC(noteItem, context);
  if (!parentCC) {
    return [];
  }

  const childControls = parentCC.contentControls;
  childControls.load("items/tag");
  await context.sync();

  const citationIds: string[] = [];
  for (const cc of (childControls.items ?? [])) {
    // Only collect child CCs with citation UUID tags, not internal obiter tags.
    if (cc.tag && !cc.tag.startsWith("obiter-")) {
      citationIds.push(cc.tag);
    }
  }
  return citationIds;
}

// ─── Occurrence Title Encoding ──────────────────────────────────────────────

/**
 * Builds the CC title encoding the user's format preference and optional pinpoint.
 * Format: `Citation:<pref>[:<pinpoint>]`.
 */
export function buildOccurrenceTitle(
  formatPreference: "auto" | "full" | "short" | "ibid",
  pinpoint?: string,
): string {
  return pinpoint
    ? `Citation:${formatPreference}:${pinpoint}`
    : `Citation:${formatPreference}`;
}

/**
 * Parses a CC title into format preference and pinpoint.
 * Returns "auto" preference and undefined pinpoint for unrecognised titles.
 */
export function parseOccurrenceTitle(title: string | undefined): {
  formatPreference: "auto" | "full" | "short" | "ibid";
  pinpoint?: string;
} {
  if (!title) return { formatPreference: "auto" };
  const match = title.match(/^Citation:(auto|full|short|ibid)(?::(.*))?$/);
  if (!match) return { formatPreference: "auto" };
  const pref = match[1] as "auto" | "full" | "short" | "ibid";
  const pinpoint = match[2] && match[2].length > 0 ? match[2] : undefined;
  return { formatPreference: pref, pinpoint };
}

/**
 * Updates a single occurrence's format preference and/or pinpoint by
 * rewriting the child CC title. Does not touch the rendered text — the
 * caller should trigger a refresh afterwards to re-render with the new
 * preference.
 */
export async function updateOccurrenceMetadata(
  citationId: string,
  footnoteIndex: number,
  formatPreference: "auto" | "full" | "short" | "ibid",
  pinpoint?: string,
): Promise<void> {
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    const noteItem = (footnotes.items ?? [])[footnoteIndex - 1];
    if (!noteItem) return;

    const parentCC = await findParentCC(noteItem, context);
    if (!parentCC) return;

    const childCC = await findChildCC(parentCC, citationId, context);
    if (!childCC) return;

    childCC.title = buildOccurrenceTitle(formatPreference, pinpoint);
    await context.sync();
  });
}

// ─── Adjacent Footnote Detection ────────────────────────────────────────────

/**
 * Detects whether the cursor/selection is immediately after a footnote
 * reference mark (superscript number). If so, returns the NoteItem and
 * its 1-based index.
 *
 * Only works with a collapsed cursor (no text selected). Checks footnotes
 * from last to first for efficiency, since the most recent insertion is
 * the most likely adjacent candidate.
 *
 * @param context - An active Word request context.
 * @returns The adjacent footnote result, or null if no footnote is adjacent.
 */
export async function getAdjacentFootnote(
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

    // Check the last footnote first (most likely candidate after insertion)
    const cursorStart = selection.getRange("Start");
    for (let i = allItems.length - 1; i >= 0; i--) {
      const refRange = allItems[i].reference;
      const afterRef = refRange.getRange("After");
      const compareResult = afterRef.compareLocationWith(cursorStart);
      await context.sync();

      if (
        compareResult.value === "Equal" ||
        compareResult.value === "Contains"
      ) {
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

// ─── Append Citation to Existing Footnote ───────────────────────────────────

/**
 * Appends a citation to an existing footnote's parent CC by inserting a new
 * child CC at the end of the parent.
 *
 * The refresher will add `; ` separators between children and update the
 * closing `.` on its next cycle.
 *
 * @param noteItem - The existing footnote's NoteItem.
 * @param citationId - Unique identifier for the new citation.
 * @param title - Human-readable label for the content control.
 * @param formattedRuns - Ordered text runs for the new citation (no closing punctuation).
 * @param context - An active Word request context.
 */
async function appendCitationToParent(
  noteItem: Word.NoteItem,
  citationId: string,
  title: string,
  formattedRuns: FormattedRun[],
  context: Word.RequestContext,
): Promise<void> {
  const parentCC = await findParentCC(noteItem, context);
  if (!parentCC) {
    throw new Error(
      "Cannot append citation: footnote does not contain an obiter-fn parent content control.",
    );
  }

  // A new citation needs separators and closing punctuation that only the
  // refresher's rebuild adds — which it skips for a locked footnote. So if the
  // target footnote is locked, unlock it first; the post-insert refresh then
  // formats the whole footnote (the user can re-lock afterwards).
  parentCC.load("title");
  await context.sync();
  if (isFootnoteLocked(parentCC.title)) {
    parentCC.title = PARENT_CC_TITLE;
  }

  insertChildCitation(parentCC, citationId, title, formattedRuns);
  await context.sync();
}

/**
 * Appends a citation to a specific footnote by its 1-based index.
 * Used by the UI when the user explicitly selects a footnote to append to.
 *
 * @param footnoteIndex - 1-based index of the target footnote.
 * @param citationId - Unique identifier for the citation.
 * @param title - Human-readable label for the content control.
 * @param formattedRuns - Ordered text runs for the citation (no closing punctuation).
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

    await appendCitationToParent(
      noteItem,
      citationId,
      title,
      formattedRuns,
      context,
    );
  });
}

// ─── Insert Citation Footnote ───────────────────────────────────────────────

/**
 * Inserts a footnote at the current selection using the parent-child content
 * control model.
 *
 * Footnote structure created:
 * ```
 * [ref mark] [parent-CC tag="obiter-fn"]
 *   [child-CC tag="citation-uuid"] citation text (no trailing period) [/child-CC]
 * [/parent-CC]
 * ```
 *
 * AGLC4 Rule 1.1.3: If the cursor is immediately after an existing footnote
 * reference mark, the citation is appended as a new child CC inside that
 * footnote's parent CC instead of creating a new footnote.
 *
 * @param citationId - Unique identifier for the citation (child CC tag).
 * @param title - Human-readable label shown as the content control title.
 * @param formattedRuns - Ordered text runs (WITHOUT closing punctuation).
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
      // If caller explicitly specified a footnote to append to, use that directly.
      if (appendToFootnote !== undefined && appendToFootnote > 0) {
        const footnotes = context.document.body.footnotes;
        footnotes.load("items");
        await context.sync();

        const fnItems = footnotes.items ?? [];
        const noteItem = fnItems[appendToFootnote - 1];
        if (noteItem) {
          await appendCitationToParent(
            noteItem,
            citationId,
            title,
            formattedRuns,
            context,
          );
          return;
        }
        // Fall through to create a new footnote if the index is invalid.
      }

      // Try to detect an adjacent footnote reference at the cursor.
      const adjacent = await getAdjacentFootnote(context);
      if (adjacent) {
        await appendCitationToParent(
          adjacent.noteItem,
          citationId,
          title,
          formattedRuns,
          context,
        );
        return;
      }

      // No adjacent footnote -- create a new one with parent-child CC model.
      // Record footnote count before insertion for verification.
      const beforeFootnotes = context.document.body.footnotes;
      beforeFootnotes.load("items");
      await context.sync();
      const footnotesBeforeCount = (beforeFootnotes.items ?? []).length;

      const selection = context.document.getSelection();
      const noteItem = selection.insertFootnote("");

      // Get the first (auto-generated) paragraph in the footnote body.
      // Word creates a paragraph with the footnote reference mark -- we
      // insert our content after the reference mark.
      const paragraphs = noteItem.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      const firstParaItems = paragraphs.items ?? [];
      if (firstParaItems.length === 0) {
        throw new Error(
          "Could not access footnote content. Word for Web may have limited footnote support.",
        );
      }
      const firstPara = firstParaItems[0];

      // Insert parent CC at the end of the paragraph (after the ref mark).
      // This ensures the footnote reference mark stays OUTSIDE the parent CC,
      // so parentCC.clear() will never destroy it.
      const paraEndRange = firstPara.getRange("End");
      const parentCC = paraEndRange.insertContentControl("RichText");
      parentCC.tag = PARENT_CC_TAG;
      parentCC.title = PARENT_CC_TITLE;
      parentCC.appearance = "Hidden" as Word.ContentControlAppearance;

      // Insert child CC inside the parent CC with the citation content.
      insertChildCitation(parentCC, citationId, title, formattedRuns);

      // Closing punctuation is NOT inserted here -- the refresher adds "."
      // inside the parent CC after the last child on its first cycle.
      // This avoids duplicate periods.
      await context.sync();

      // Verify the footnote was actually created.
      const afterFootnotes = context.document.body.footnotes;
      afterFootnotes.load("items");
      await context.sync();
      const footnotesAfterCount = (afterFootnotes.items ?? []).length;

      if (footnotesAfterCount <= footnotesBeforeCount) {
        console.warn(
          "[footnoteManager] Footnote count did not increase after insertion. " +
            `Before: ${footnotesBeforeCount}, After: ${footnotesAfterCount}`,
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
    throw new Error(
      `Failed to insert citation footnote. ${describeOfficeError(err)}`,
    );
  }
}

/**
 * Builds a diagnostic string from a thrown error, unwrapping Office.js
 * OfficeExtension.Error properties (code, message, debugInfo.errorLocation)
 * so wrappers do not collapse the underlying cause to "GeneralException".
 */
function describeOfficeError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      code?: string;
      message?: string;
      debugInfo?: { errorLocation?: string; code?: string; message?: string };
    };
    const code = e.code ?? e.debugInfo?.code;
    const message = e.message ?? e.debugInfo?.message;
    const location = e.debugInfo?.errorLocation;
    const parts: string[] = [];
    if (code && code !== "GeneralException") parts.push(`code=${code}`);
    if (location) parts.push(`at=${location}`);
    if (message) parts.push(message);
    if (parts.length > 0) return `Details: ${parts.join(" | ")}`;
  }
  const fallback = err instanceof Error ? err.message : String(err);
  return `Details: ${fallback}`;
}

// ─── Update Citation Content ────────────────────────────────────────────────

/**
 * Finds every content control whose tag matches the given citation ID
 * (child CCs inside parent CCs) and replaces its content with the supplied
 * formatted runs.
 *
 * Uses `document.contentControls.getByTag()` to find ALL occurrences across
 * every footnote in one call, then writes the new runs into each.
 *
 * @param citationId - The citation ID to search for.
 * @param formattedRuns - New formatted text runs to write (no closing punctuation).
 */
export async function updateCitationContent(
  citationId: string,
  formattedRuns: FormattedRun[],
): Promise<void> {
  await Word.run(async (context) => {
    const contentControls =
      context.document.contentControls.getByTag(citationId);
    contentControls.load("items");
    await context.sync();

    for (const cc of contentControls.items ?? []) {
      writeFormattedRunsToControl(cc, formattedRuns);
    }

    await context.sync();
  });
}

// ─── Scan All Footnotes ─────────────────────────────────────────────────────

/**
 * Scans all footnotes and returns child CC info from parent CCs.
 *
 * Only returns citation content controls that are children of an `obiter-fn`
 * parent CC. Skips any CCs with tags starting with `obiter-` (internal tags).
 *
 * @returns An array of {@link CitationFootnoteEntry} objects, one per child
 *   content control found, in document order.
 */
export async function getAllCitationFootnotes(): Promise<
  CitationFootnoteEntry[]
> {
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

      const ccs = contentControls.items ?? [];
      // Lock state lives on the parent CC title and applies to the whole footnote.
      const parentCC = ccs.find((cc) => cc.tag === PARENT_CC_TAG);
      const locked = isFootnoteLocked(parentCC?.title);

      for (const cc of ccs) {
        // Skip parent CCs and other internal obiter tags; only collect
        // child CCs which have citation UUIDs as tags.
        if (cc.tag && !cc.tag.startsWith("obiter-")) {
          // Parse format preference and pinpoint from the CC title.
          // Title format: "Citation:<pref>[:<pinpoint>]" where <pref> is
          // auto/full/short/ibid. Legacy titles with rendered formats
          // (e.g. "Citation:short:42") are treated as explicit preferences.
          const parsed = parseOccurrenceTitle(cc.title);
          results.push({
            footnoteIndex: i + 1, // 1-based footnote numbering
            citationId: cc.tag,
            title: cc.title,
            formatPreference: parsed.formatPreference,
            pinpoint: parsed.pinpoint,
            isLocked: locked,
          });
        }
      }
    }
  });

  return results;
}

// ─── Footnote Lock (freeze / unfreeze) ──────────────────────────────────────

/**
 * Lock or unlock a single footnote by its 1-based index.
 *
 * Locking sets the parent CC title to the locked marker; the refresher then
 * skips rebuilding that footnote, so its current text (including any manual
 * edits) is preserved. Locking changes no content — no refresh is required.
 * Unlocking should be followed by a refresh to restore structured formatting.
 */
export async function setFootnoteLock(
  footnoteIndex: number,
  locked: boolean,
): Promise<void> {
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    const noteItem = (footnotes.items ?? [])[footnoteIndex - 1];
    if (!noteItem) {
      throw new Error(`Footnote ${footnoteIndex} not found.`);
    }
    const parentCC = await findParentCC(noteItem, context);
    if (!parentCC) {
      throw new Error(
        `Footnote ${footnoteIndex} has no Obiter content control to lock.`,
      );
    }
    parentCC.title = locked ? LOCKED_PARENT_CC_TITLE : PARENT_CC_TITLE;
    await context.sync();
  });
}

/**
 * Lock every Obiter footnote in the document, freezing each as it currently
 * reads. Used when leaving Manual Citations Mode with "keep my edits" so the
 * resumed auto-refresh does not overwrite manual corrections.
 *
 * @returns The number of footnotes locked.
 */
export async function lockAllObiterFootnotes(): Promise<number> {
  let count = 0;
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    for (const noteItem of footnotes.items ?? []) {
      const parentCC = await findParentCC(noteItem, context);
      if (parentCC) {
        parentCC.title = LOCKED_PARENT_CC_TITLE;
        count++;
      }
    }
    await context.sync();
  });
  return count;
}

// ─── Footnote Index ─────────────────────────────────────────────────────────

/**
 * Returns the total number of footnotes in the document.
 *
 * This is used after insertion to determine the index of the most recently
 * created footnote.
 *
 * @param context - An active Word request context.
 * @returns The total footnote count (also equals the 1-based index of the
 *   last footnote).
 */
export async function getFootnoteIndex(
  context: Word.RequestContext,
): Promise<number> {
  const footnotes = context.document.body.footnotes;
  footnotes.load("items");
  await context.sync();

  return (footnotes.items ?? []).length;
}

// ─── Delete Citation from Footnote ──────────────────────────────────────────

/**
 * Removes a specific citation (child CC) from a footnote.
 *
 * Finds the child CC with the matching tag inside the footnote's parent CC
 * and deletes it (both the control wrapper and its content). If the parent CC
 * has no remaining children after removal, the entire footnote is deleted.
 *
 * Orphaned separator text (e.g. extra "; " between remaining children) is
 * left in place -- the refresher will detect the text mismatch and rebuild
 * the parent CC content cleanly on its next cycle.
 *
 * Includes a legacy fallback for documents created before the parent-child
 * model: if no parent CC is found, it searches for a flat CC with the
 * matching tag and deletes it directly.
 *
 * @param citationId - The citation ID (child CC tag) to remove.
 * @param footnoteIndex - 1-based index of the target footnote.
 */
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

    // Find the parent CC
    const parentCC = await findParentCC(noteItem, context);
    if (!parentCC) {
      // Legacy footnote without parent CC -- fall back to deleting any CC
      // with the matching tag directly from the footnote body.
      await deleteLegacyCitation(noteItem, citationId, context);
      return;
    }

    // Find and delete the child CC with the matching tag inside the parent CC.
    const childCC = await findChildCC(parentCC, citationId, context);
    if (!childCC) {
      return;
    }

    childCC.delete(false); // delete control and its content
    await context.sync();

    // Check if the parent CC still has any child CCs. If not, delete
    // the entire footnote.
    const remainingChildren = parentCC.contentControls;
    remainingChildren.load("items");
    await context.sync();

    const remainingItems = remainingChildren.items ?? [];
    if (remainingItems.length === 0) {
      noteItem.delete();
      await context.sync();
    }
    // Note: after deleting a child CC, orphaned separator text ("; ") may
    // remain in the parent. The caller should trigger a Refresh All to
    // rebuild the footnote with correct separators and closing punctuation.
  });
}

/**
 * Delete ALL occurrences of a citation from the document in a single Word.run().
 * Much faster than calling deleteCitationFootnote() in a loop, which creates
 * a separate Word.run() per occurrence.
 */
export async function deleteAllOccurrences(
  citationId: string,
  footnoteIndices: number[],
): Promise<void> {
  if (footnoteIndices.length === 0) return;

  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    const fnItems = footnotes.items ?? [];

    // Process in reverse order so that deleting a footnote doesn't shift
    // the indices of footnotes we haven't processed yet.
    const sorted = [...footnoteIndices].sort((a, b) => b - a);

    for (const footnoteIndex of sorted) {
      const noteItem = fnItems[footnoteIndex - 1];
      if (!noteItem) continue;

      const parentCC = await findParentCC(noteItem, context);
      if (!parentCC) {
        await deleteLegacyCitation(noteItem, citationId, context);
        continue;
      }

      const childCC = await findChildCC(parentCC, citationId, context);
      if (!childCC) continue;

      childCC.delete(false);
      await context.sync();

      const remainingChildren = parentCC.contentControls;
      remainingChildren.load("items");
      await context.sync();

      if ((remainingChildren.items ?? []).length === 0) {
        noteItem.delete();
        await context.sync();
      }
    }
  });
}

/**
 * Legacy deletion fallback for documents without the parent-child CC model.
 * Searches for content controls with the matching tag directly in the
 * footnote body (flat structure) and deletes them.
 *
 * If the footnote body is empty after deletion, the entire footnote is removed.
 */
async function deleteLegacyCitation(
  noteItem: Word.NoteItem,
  citationId: string,
  context: Word.RequestContext,
): Promise<void> {
  const contentControls = noteItem.body.contentControls;
  contentControls.load("items/tag");
  await context.sync();

  let deleted = false;
  for (const cc of contentControls.items ?? []) {
    if (cc.tag === citationId) {
      cc.delete(false);
      deleted = true;
    }
  }

  if (!deleted) return;
  await context.sync();

  noteItem.body.load("text");
  await context.sync();
  const remaining = noteItem.body.text.trim();
  if (remaining.length === 0) {
    noteItem.delete();
    await context.sync();
  }
}
