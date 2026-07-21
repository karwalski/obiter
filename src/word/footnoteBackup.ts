/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * SAFE-004: Pre-refresh footnote text snapshot and restore.
 *
 * Before the refresher rebuilds any footnotes, it snapshots the texts about
 * to be replaced into the backup Custom XML Part (SAFE-001), so a bad
 * rebuild is always recoverable. This module provides:
 *
 *  - `snapshotFootnotesBeforeRebuild` — the DEFAULT `OnBeforeRebuild` hook
 *    wired into `refreshAllCitations` (SAFE-003 seam). It runs inside the
 *    refresher's own Word.run batch; the entries come from the refresher's
 *    already-batched read, so the snapshot adds no read syncs to the
 *    footnotes and at most one write batch to the backup part. A no-op
 *    refresh (empty rebuild set) writes nothing. Per the seam semantics, if
 *    this hook throws the refresher ABORTS all rebuilds — the document is
 *    never clobbered without a snapshot.
 *
 *  - `restoreFootnoteText` — the recovery path (SAFE-005 Recovery panel):
 *    writes a snapshotted text back into the footnote's parent CC via the
 *    verbatim-replace-and-lock primitive in footnoteManager.ts. Restored
 *    footnotes end up LOCKED, so a subsequent refresh never re-clobbers the
 *    restored text.
 *
 *  - `acceptObiterVersion` — the "Use Obiter's version" resolution for a
 *    flagged user edit (SAFE-005 Recovery panel): rewrites the SAFE-002
 *    stored hash so the next refresh classifies exactly that footnote as a
 *    stale render and rebuilds it, then refreshes.
 *
 * Layering: imports backupStore (Custom XML Part IO), textHash (pure), and
 * footnoteManager (Office.js primitives). The import from citationRefresher
 * is type-only and erased at compile time, so citationRefresher's runtime
 * import of this module creates no cycle.
 */

import { addFootnoteGeneration } from "../store/backupStore";
import type { FootnoteSnapshot } from "../store/backupSerializer";
import type { CitationStore } from "../store/citationStore";
import { hashRenderedText } from "../utils/textHash";
import { buildParentTitle, findParentCC, replaceFootnoteContentAndLock } from "./footnoteManager";
import type { RebuildCandidate, RefreshResult } from "./citationRefresher";

/**
 * Default pre-rebuild snapshot hook (SAFE-004).
 *
 * Writes one footnote-text generation — `{n, hash, text}` for every footnote
 * in the rebuild set — to the backup part, IN THE SAME request context the
 * refresh runs in. The backup store keeps the newest two generations within
 * the shared SAFE-001 size cap.
 *
 * Skips entirely when `entries` is empty: a refresh that rebuilds nothing
 * writes nothing (no backup-part reads, no syncs).
 *
 * @param context - The refresher's active Word request context.
 * @param entries - The rebuild set from the refresher's batched read.
 */
export async function snapshotFootnotesBeforeRebuild(
  context: Word.RequestContext,
  entries: readonly RebuildCandidate[]
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const generation: FootnoteSnapshot = {
    timestamp: new Date().toISOString(),
    footnotes: entries.map((entry) => ({
      n: entry.footnoteNumber,
      hash: hashRenderedText(entry.existingText),
      text: entry.existingText,
    })),
  };

  await addFootnoteGeneration(context, generation);
}

/**
 * Restores a previously snapshotted text into a footnote (SAFE-004 restore
 * path; called by the SAFE-005 Recovery panel alongside
 * `listFootnoteGenerations`).
 *
 * The text is written verbatim into the footnote's parent CC via
 * `replaceFootnoteContentAndLock`, so the restored footnote ends up LOCKED —
 * the refresher never rebuilds a locked footnote, so the restored text can
 * never be re-clobbered. If the footnote still contains a child citation CC,
 * its citation id is preserved on the rewritten child so the occurrence
 * stays discoverable (and can be unlocked back to structured formatting).
 *
 * @param footnoteNumber - 1-based footnote number, as recorded in the
 *   snapshot entry (`FootnoteBackupEntry.n`).
 * @param previousText - The snapshotted text to write back.
 * @throws When the footnote no longer exists at that position, or has no
 *   Obiter content control to restore into.
 */
export async function restoreFootnoteText(
  footnoteNumber: number,
  previousText: string
): Promise<void> {
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    const noteItem = (footnotes.items ?? [])[footnoteNumber - 1];
    if (!noteItem) {
      throw new Error(
        `Cannot restore footnote ${footnoteNumber}: the document no longer has a footnote at that position.`
      );
    }

    const parentCC = await findParentCC(noteItem, context);
    if (!parentCC) {
      throw new Error(
        `Cannot restore footnote ${footnoteNumber}: it has no Obiter content control to restore into.`
      );
    }

    // Keep the occurrence discoverable: reuse the first child citation id
    // still present in the footnote, if any. (Child CCs carry citation UUID
    // tags; internal Obiter controls are prefixed "obiter-".)
    const childControls = parentCC.contentControls;
    childControls.load("items/tag");
    await context.sync();
    const citationId = (childControls.items ?? [])
      .map((cc) => cc.tag)
      .find((tag) => !!tag && !tag.startsWith("obiter-"));

    await replaceFootnoteContentAndLock(context, parentCC, citationId, previousText);
  });
}

/**
 * The parent-CC title that makes the NEXT refresh rebuild a user-edited
 * footnote ("Use Obiter's version", SAFE-005).
 *
 * The user-edit protection is the SAFE-002 hash in the parent-CC title:
 * refresh skips a footnote when hash(currentText) differs from the stored
 * hash. Writing an unlocked title whose stored hash IS hash(currentText)
 * removes that protection for this one footnote — the decision matrix then
 * reads "current ≠ expected, hash(current) == stored" and classifies it as
 * a stale Obiter render, which rebuilds (and records the new hash).
 *
 * Pure — exported for unit tests.
 *
 * @param currentText - The footnote's current (user-edited) document text.
 */
export function acceptedVersionTitle(currentText: string): string {
  return buildParentTitle({ locked: false, renderedHash: hashRenderedText(currentText) });
}

/**
 * Resolve a flagged user edit by discarding it in favour of Obiter's
 * rendered citation ("Use Obiter's version", SAFE-005 Recovery panel).
 *
 * Per-footnote precise: only the named footnote's parent-CC title is
 * rewritten (see {@link acceptedVersionTitle} — this also unlocks a locked
 * footnote, since the rewritten title is the unlocked hashed form). Other
 * user-edited footnotes keep their protection and survive the follow-up
 * refresh untouched. The refresh itself snapshots the texts it replaces
 * (SAFE-004), so even this discarded edit remains recoverable from the
 * Footnote history section.
 *
 * @param footnoteNumber - 1-based footnote number, as reported in
 *   `RefreshResult.userEdits`.
 * @param store - The shared citation store (drives the follow-up refresh).
 * @returns The result of the follow-up full refresh.
 * @throws When the footnote no longer exists at that position, or has no
 *   Obiter content control.
 */
export async function acceptObiterVersion(
  footnoteNumber: number,
  store: CitationStore
): Promise<RefreshResult> {
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    const noteItem = (footnotes.items ?? [])[footnoteNumber - 1];
    if (!noteItem) {
      throw new Error(
        `Cannot rebuild footnote ${footnoteNumber}: the document no longer has a footnote at that position.`
      );
    }

    const parentCC = await findParentCC(noteItem, context);
    if (!parentCC) {
      throw new Error(
        `Cannot rebuild footnote ${footnoteNumber}: it has no Obiter content control.`
      );
    }

    parentCC.load("text");
    await context.sync();

    parentCC.title = acceptedVersionTitle(parentCC.text ?? "");
    await context.sync();
  });

  // Runtime import keeps the static module graph acyclic: citationRefresher
  // imports this module at load time (for the default SAFE-004 snapshot
  // hook), so a static import back would form a cycle.
  const { refreshAllCitationsNow } = await import("./citationRefresher");
  return refreshAllCitationsNow(store);
}
