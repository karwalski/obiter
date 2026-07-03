/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * BUG-004: Scan & Repair — Office.js layer.
 *
 * Two responsibilities, both driven by the pure plan logic in scanRepair.ts:
 *
 *  1. `captureDocumentSnapshot` — a READ-ONLY sweep of the body plus every
 *     footnote and endnote. All note bodies and content-control collections
 *     are loaded in batched syncs (two `context.sync()` calls total,
 *     regardless of note count), so a 100+ footnote document never syncs
 *     per footnote.
 *
 *  2. `applyScanPlan` — applies ONLY the user-selected items after the
 *     preview: store entries are added (rebuild/adopt/verbatim) and plain
 *     citation text is wrapped in content controls. Document writes are
 *     batched the same way (one search sync + one wrap sync).
 *
 * All APIs stay within the WordApi 1.5 baseline.
 */

/* global Word */

import { PARENT_CC_TAG, PARENT_CC_TITLE, buildOccurrenceTitle } from "./footnoteManager";
import type { DocumentScanSnapshot, ScannedControl, ScannedNote, ScanItem } from "./scanRepair";
import type { Citation } from "../types/citation";
import { createLogger } from "../debug/logger";

const log = createLogger("ScanRepair");

/** Word's Range.search() rejects search strings longer than 255 characters. */
const MAX_SEARCH_LENGTH = 250;

// ─── Minimal store contract ──────────────────────────────────────────────────

/**
 * The slice of CitationStore that apply needs. Structural, so tests can
 * substitute a plain fake without a Word-backed store.
 */
export interface ScanRepairStore {
  getById(id: string): { id: string } | undefined;
  add(citation: Citation): Promise<void>;
  getCcModel(): "flat" | "parent-child" | undefined;
  setCcModel(model: "flat" | "parent-child"): Promise<void>;
}

// ─── Snapshot capture (read-only) ───────────────────────────────────────────

/** Load a note collection's items, tolerating hosts without endnote support. */
function tryLoadNotes(collection: Word.NoteItemCollection | undefined): boolean {
  if (!collection || typeof collection.load !== "function") return false;
  collection.load("items");
  return true;
}

/**
 * Capture everything Scan & Repair inspects, without modifying the document.
 *
 * Sync batching: one sync for the top-level collections (body controls,
 * footnote and endnote lists), then ONE further sync covering every note's
 * body text + content-control collection together. Office.js queues `load`
 * calls, so the loops issue no round-trips of their own.
 */
export async function captureDocumentSnapshot(
  context: Word.RequestContext
): Promise<DocumentScanSnapshot> {
  const body = context.document.body;

  const bodyControls = body.contentControls;
  bodyControls.load("items/tag,items/title,items/text");

  const footnotes = body.footnotes;
  const footnotesLoaded = tryLoadNotes(footnotes);

  let endnotes: Word.NoteItemCollection | undefined;
  try {
    endnotes = body.endnotes;
  } catch {
    endnotes = undefined;
  }
  const endnotesLoaded = tryLoadNotes(endnotes);

  await context.sync();

  interface PendingNote {
    noteType: "footnote" | "endnote";
    index: number;
    body: Word.Body;
    controls: Word.ContentControlCollection;
  }

  const pending: PendingNote[] = [];

  const queueNotes = (
    collection: Word.NoteItemCollection | undefined,
    loaded: boolean,
    noteType: "footnote" | "endnote"
  ): void => {
    if (!loaded || !collection) return;
    const noteItems = collection.items ?? [];
    for (let i = 0; i < noteItems.length; i++) {
      const noteBody = noteItems[i].body;
      noteBody.load("text");
      const controls = noteBody.contentControls;
      controls.load("items/tag,items/title,items/text");
      pending.push({ noteType, index: i + 1, body: noteBody, controls });
    }
  };

  queueNotes(footnotes, footnotesLoaded, "footnote");
  queueNotes(endnotes, endnotesLoaded, "endnote");

  // ONE sync covers every note body and control collection queued above.
  if (pending.length > 0) {
    await context.sync();
  }

  const toScannedControls = (collection: Word.ContentControlCollection): ScannedControl[] =>
    (collection.items ?? []).map((cc) => ({
      tag: cc.tag ?? "",
      title: cc.title ?? "",
      text: cc.text ?? "",
    }));

  const notes: ScannedNote[] = pending.map((p) => ({
    noteType: p.noteType,
    index: p.index,
    text: p.body.text ?? "",
    controls: toScannedControls(p.controls),
  }));

  return {
    bodyControls: toScannedControls(bodyControls),
    notes,
  };
}

/** Run the read-only capture in its own Word context (UI entry point). */
export async function scanDocument(): Promise<DocumentScanSnapshot> {
  return Word.run((context) => captureDocumentSnapshot(context));
}

// ─── Apply ───────────────────────────────────────────────────────────────────

/** Outcome summary shown after apply and written to the obiter-debug log. */
export interface ApplyOutcome {
  /** Store entries rebuilt from orphaned content controls (Pass A). */
  rebuiltFromControls: number;
  /** Plain-text citations adopted as managed (structured) citations. */
  adoptedManaged: number;
  /** Plain-text notes adopted as verbatim manual citations. */
  adoptedVerbatim: number;
  /** Notes whose text was wrapped in content controls. */
  wrappedNotes: number;
  /** Items that could not be fully applied, with reasons. */
  failures: { key: string; reason: string }[];
}

/**
 * Apply the user-selected scan items.
 *
 * Store side: missing entries are added (`store.add`). Document side: plain
 * citation text is located with `body.search` and wrapped —
 * - "managed": the plain text is removed and re-inserted inside the standard
 *   parent/child content-control structure; the subsequent refresh renders
 *   it with full engine formatting;
 * - "flat": the text is wrapped in place by a single tagged control,
 *   preserving its existing character formatting (verbatim adoptions and
 *   endnotes — the refresher leaves both untouched).
 *
 * A failed wrap never loses data: the note text is only removed after its
 * range was found, and a store entry always survives even if the wrap fails
 * (reported in `failures`).
 */
export async function applyScanPlan(
  store: ScanRepairStore,
  items: readonly ScanItem[]
): Promise<ApplyOutcome> {
  const outcome: ApplyOutcome = {
    rebuiltFromControls: 0,
    adoptedManaged: 0,
    adoptedVerbatim: 0,
    wrappedNotes: 0,
    failures: [],
  };

  // ── Store phase ───────────────────────────────────────────────────────────
  const wrapItems: ScanItem[] = [];
  for (const item of items) {
    if (item.kind === "linked" || !item.proposedCitation) continue;
    try {
      if (!store.getById(item.citationId)) {
        await store.add(item.proposedCitation);
      }
      if (item.kind === "rebuild") outcome.rebuiltFromControls++;
      if (item.kind === "adopt") outcome.adoptedManaged++;
      if (item.kind === "verbatim") outcome.adoptedVerbatim++;
      if (item.wrap !== "none") wrapItems.push(item);
    } catch (err: unknown) {
      outcome.failures.push({
        key: item.key,
        reason: `Could not add to the library: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // ── Document phase (batched) ──────────────────────────────────────────────
  if (wrapItems.length > 0) {
    await Word.run(async (context) => {
      const body = context.document.body;
      const footnotes = body.footnotes;
      const footnotesLoaded = tryLoadNotes(footnotes);
      let endnotes: Word.NoteItemCollection | undefined;
      try {
        endnotes = body.endnotes;
      } catch {
        endnotes = undefined;
      }
      const needEndnotes = wrapItems.some((i) => i.location === "endnote");
      const endnotesLoaded = needEndnotes ? tryLoadNotes(endnotes) : false;
      await context.sync();

      interface PendingWrap {
        item: ScanItem;
        note: Word.NoteItem;
        searchText: string;
        results: Word.RangeCollection;
        paragraphs: Word.ParagraphCollection;
      }

      // Search phase: queue every search + paragraph load, one sync.
      const pendingWraps: PendingWrap[] = [];
      for (const item of wrapItems) {
        const collection =
          item.location === "endnote"
            ? endnotesLoaded
              ? endnotes
              : undefined
            : footnotesLoaded
              ? footnotes
              : undefined;
        const note = collection?.items?.[(item.noteIndex ?? 0) - 1];
        if (!note) {
          outcome.failures.push({
            key: item.key,
            reason: "Added to the library, but the note could not be found to link.",
          });
          continue;
        }

        // "managed" removes the text (closing stop included) and rebuilds it
        // inside controls; "flat" wraps the citation only, leaving the
        // closing stop outside the control.
        const searchText = item.wrap === "managed" ? item.rawText : item.rawText.replace(/\.$/, "");
        if (searchText.length === 0 || searchText.length > MAX_SEARCH_LENGTH) {
          outcome.failures.push({
            key: item.key,
            reason: "Added to the library, but the note text is too long to link automatically.",
          });
          continue;
        }

        const results = note.body.search(searchText, { matchCase: true });
        results.load("items");
        const paragraphs = note.body.paragraphs;
        paragraphs.load("items");
        pendingWraps.push({ item, note, searchText, results, paragraphs });
      }

      if (pendingWraps.length === 0) return;
      await context.sync();

      // Wrap phase: queue every mutation, one sync.
      let wrapped = 0;
      for (const wrap of pendingWraps) {
        const range = (wrap.results.items ?? [])[0];
        if (!range) {
          outcome.failures.push({
            key: wrap.item.key,
            reason:
              "Added to the library, but the citation text was not found in the note to link.",
          });
          continue;
        }

        if (wrap.item.wrap === "flat") {
          // In-place wrap: preserves the existing character formatting.
          const cc = range.insertContentControl("RichText");
          cc.tag = wrap.item.citationId;
          cc.title = buildOccurrenceTitle("auto", wrap.item.pinpoint);
          cc.appearance = "Hidden" as Word.ContentControlAppearance;
          wrapped++;
          continue;
        }

        // Managed conversion (footnotes): remove the plain text, then build
        // the standard structure after the reference mark — the same shape
        // insertCitationFootnote and the FN-005 migration create. The
        // refresher re-renders the child on the post-repair refresh.
        const firstPara = (wrap.paragraphs.items ?? [])[0];
        if (!firstPara) {
          outcome.failures.push({
            key: wrap.item.key,
            reason: "Added to the library, but the note has no paragraph to rebuild.",
          });
          continue;
        }

        range.delete();
        const parentCC = firstPara.getRange("End").insertContentControl("RichText");
        parentCC.tag = PARENT_CC_TAG;
        parentCC.title = PARENT_CC_TITLE;
        parentCC.appearance = "Hidden" as Word.ContentControlAppearance;

        const childCC = parentCC.getRange("End").insertContentControl("RichText");
        childCC.tag = wrap.item.citationId;
        childCC.title = buildOccurrenceTitle("auto", wrap.item.pinpoint);
        childCC.appearance = "Hidden" as Word.ContentControlAppearance;
        childCC.insertText(wrap.item.text, "End");
        wrapped++;
      }

      await context.sync();
      outcome.wrappedNotes = wrapped;
    });

    // A never-Obiter document has no ccModel metadata; the controls created
    // here already follow the current models (parent-child for managed,
    // intentionally flat for verbatim/endnotes), so record parent-child to
    // stop the FN-005 auto-migration from rebuilding the flat wraps as
    // plain text (which would discard their preserved formatting).
    if (outcome.wrappedNotes > 0 && store.getCcModel() === undefined) {
      try {
        await store.setCcModel("parent-child");
      } catch {
        // Metadata write failed (e.g. unreadable-store quarantine) — the
        // wraps themselves are already in the document.
      }
    }
  }

  // Extends the BUG-003 store diagnostics line with scan results so field
  // reports show what Scan & Repair found and changed.
  log.info("scanRepair: applied", {
    selected: items.length,
    rebuiltFromControls: outcome.rebuiltFromControls,
    adoptedManaged: outcome.adoptedManaged,
    adoptedVerbatim: outcome.adoptedVerbatim,
    wrappedNotes: outcome.wrappedNotes,
    failures: outcome.failures.length,
  });

  return outcome;
}
