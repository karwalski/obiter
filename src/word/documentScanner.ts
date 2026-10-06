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
 *
 * COURT-109: the capture also reads fields and bookmarks (WordApi 1.4,
 * behind runtime checks) in the same two syncs, so notes holding content
 * Obiter does not own are listed as preserved and never adopted.
 *
 * COURT-121: a managed adoption first saves each note's original text to the
 * footnote history in the backup part (the SAFE-004 snapshot), and aborts
 * that adoption if the save fails; Recovery can restore the original. The
 * search text is encoded for Word's search syntax so non-breaking spaces
 * and a literal caret match.
 */

/* global Word */

import { PARENT_CC_TAG, PARENT_CC_TITLE, buildOccurrenceTitle } from "./footnoteManager";
import type { DocumentScanSnapshot, ScannedControl, ScannedNote, ScanItem } from "./scanRepair";
import type { Citation } from "../types/citation";
import type { RebuildCandidate } from "./citationRefresher";
import { createLogger } from "../debug/logger";
import { snapshotFootnotesBeforeRebuild } from "./footnoteBackup";
import {
  anyProbeSupported,
  getForeignProbeSupport,
  queueForeignContentProbe,
  readForeignContentProbe,
} from "./foreignContent";
import type { ForeignContentProbe, ForeignProbeSupport } from "./foreignContent";

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

/**
 * COURT-121: encode text for `Range.search`. Word's search syntax treats `^`
 * as an escape, so a literal caret is `^^`; a non-breaking space is `^s`
 * and an optional (soft) hyphen `^-` (Word search special characters,
 * Microsoft Learn "Find and replace text" / Word search options). Other
 * characters pass through unchanged. Pure — exported for tests.
 */
export function toWordSearchText(text: string): string {
  return text
    .replace(/\^/g, "^^")
    .replace(/\u00a0/g, "^s")
    .replace(/\u00ad/g, "^-");
}

/**
 * Syncs `context`; if the batch fails while foreign-content probes are
 * queued, re-queues `requeue` without the probes and syncs again, so a host
 * that rejects field or bookmark reads still gets a scan (COURT-109).
 * Returns false when the probes had to be dropped.
 */
async function syncWithProbeFallback(
  context: Word.RequestContext,
  hadProbes: boolean,
  requeue: () => void
): Promise<boolean> {
  try {
    await context.sync();
    return true;
  } catch (err) {
    if (!hadProbes) throw err;
    log.warn("scanRepair: field and bookmark read failed; scanning without it", {
      error: err instanceof Error ? err.message : String(err),
    });
    requeue();
    await context.sync();
    return false;
  }
}

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
  const support: ForeignProbeSupport = getForeignProbeSupport();

  const bodyControls = body.contentControls;
  bodyControls.load("items/tag,items/title,items/text");

  // COURT-109: fields in the main body (TA, TOA, REF…), listed as preserved.
  let bodyProbe: ForeignContentProbe | undefined = support.fields
    ? queueForeignContentProbe(body, { fields: true, bookmarks: false })
    : undefined;

  const footnotes = body.footnotes;
  let footnotesLoaded = tryLoadNotes(footnotes);

  let endnotes: Word.NoteItemCollection | undefined;
  try {
    endnotes = body.endnotes;
  } catch {
    endnotes = undefined;
  }
  let endnotesLoaded = tryLoadNotes(endnotes);

  const bodyProbeKept = await syncWithProbeFallback(context, bodyProbe !== undefined, () => {
    bodyControls.load("items/tag,items/title,items/text");
    footnotesLoaded = tryLoadNotes(footnotes);
    endnotesLoaded = tryLoadNotes(endnotes);
  });
  if (!bodyProbeKept) bodyProbe = undefined;

  interface PendingNote {
    noteType: "footnote" | "endnote";
    index: number;
    body: Word.Body;
    controls: Word.ContentControlCollection;
    probe?: ForeignContentProbe;
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
      const probe = anyProbeSupported(support)
        ? queueForeignContentProbe(noteBody, support)
        : undefined;
      pending.push({ noteType, index: i + 1, body: noteBody, controls, probe });
    }
  };

  queueNotes(footnotes, footnotesLoaded, "footnote");
  queueNotes(endnotes, endnotesLoaded, "endnote");

  // ONE sync covers every note body and control collection queued above
  // (plus the COURT-109 field and bookmark reads, when supported).
  if (pending.length > 0) {
    const kept = await syncWithProbeFallback(
      context,
      pending.some((p) => p.probe !== undefined),
      () => {
        for (const p of pending) {
          p.body.load("text");
          p.controls.load("items/tag,items/title,items/text");
        }
      }
    );
    if (!kept) {
      for (const p of pending) p.probe = undefined;
    }
  }

  const toScannedControls = (collection: Word.ContentControlCollection): ScannedControl[] =>
    (collection.items ?? []).map((cc) => ({
      tag: cc.tag ?? "",
      title: cc.title ?? "",
      text: cc.text ?? "",
    }));

  const notes: ScannedNote[] = pending.map((p) => {
    const found = p.probe ? readForeignContentProbe(p.probe) : undefined;
    return {
      noteType: p.noteType,
      index: p.index,
      text: p.body.text ?? "",
      controls: toScannedControls(p.controls),
      ...(found && found.fieldTypes.length > 0 ? { fields: found.fieldTypes } : {}),
      ...(found && found.bookmarks.length > 0 ? { bookmarks: found.bookmarks } : {}),
    };
  });

  const bodyFields = bodyProbe ? readForeignContentProbe(bodyProbe).fieldTypes : [];

  return {
    bodyControls: toScannedControls(bodyControls),
    notes,
    ...(bodyFields.length > 0 ? { bodyFields } : {}),
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

/** Options for {@link applyScanPlan}. */
export interface ApplyScanOptions {
  /**
   * COURT-121: saves the original text of the footnotes a managed adoption
   * is about to replace. Defaults to the SAFE-004 footnote-history snapshot
   * in the backup part (`snapshotFootnotesBeforeRebuild`), so the Recovery
   * view can restore it. If it throws, the managed adoptions are not made.
   */
  snapshotNotes?: (entries: RebuildCandidate[]) => Promise<void>;
}

/** The default COURT-121 snapshot: one footnote-history generation. */
async function defaultSnapshotNotes(entries: RebuildCandidate[]): Promise<void> {
  await Word.run((context) => snapshotFootnotesBeforeRebuild(context, entries));
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
 *
 * COURT-121: before any managed adoption, the original note texts are saved
 * as one footnote-history generation. If that save fails, no managed item
 * is applied (neither library entry nor document change) and each is
 * reported; the other selected items still apply.
 */
export async function applyScanPlan(
  store: ScanRepairStore,
  items: readonly ScanItem[],
  options: ApplyScanOptions = {}
): Promise<ApplyOutcome> {
  const outcome: ApplyOutcome = {
    rebuiltFromControls: 0,
    adoptedManaged: 0,
    adoptedVerbatim: 0,
    wrappedNotes: 0,
    failures: [],
  };

  // ── Snapshot phase (COURT-121) ────────────────────────────────────────────
  const managed = items.filter(
    (item) =>
      item.wrap === "managed" &&
      item.kind !== "linked" &&
      item.proposedCitation !== undefined &&
      item.location === "footnote" &&
      item.noteIndex !== undefined
  );
  let applicable: readonly ScanItem[] = items;
  if (managed.length > 0) {
    const snapshot = options.snapshotNotes ?? defaultSnapshotNotes;
    try {
      await snapshot(
        managed.map((item) => ({
          footnoteNumber: item.noteIndex as number,
          existingText: item.rawText,
        }))
      );
    } catch (err: unknown) {
      log.warn("scanRepair: snapshot before adoption failed; managed adoptions skipped", {
        error: err instanceof Error ? err.message : String(err),
      });
      const skipped = new Set(managed);
      applicable = items.filter((item) => !skipped.has(item));
      for (const item of managed) {
        outcome.failures.push({
          key: item.key,
          reason:
            "Not changed: the original footnote text could not be saved to Recovery first, " +
            "so this footnote was left as it was.",
        });
      }
    }
  }

  // ── Store phase ───────────────────────────────────────────────────────────
  const wrapItems: ScanItem[] = [];
  for (const item of applicable) {
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
        // COURT-121: encoded for Word's search syntax (NBSP → ^s, ^ → ^^).
        const searchText = toWordSearchText(
          item.wrap === "managed" ? item.rawText : item.rawText.replace(/\.$/, "")
        );
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
    snapshotFailed: applicable.length !== items.length,
    rebuiltFromControls: outcome.rebuiltFromControls,
    adoptedManaged: outcome.adoptedManaged,
    adoptedVerbatim: outcome.adoptedVerbatim,
    wrappedNotes: outcome.wrappedNotes,
    failures: outcome.failures.length,
  });

  return outcome;
}
