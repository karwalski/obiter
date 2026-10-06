/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * COURT-108 (OBI-205): respect Track Changes during managed writes.
 *
 * Office.js cannot write "around" Track Changes: when the user has it on,
 * every write the add-in makes is recorded as a revision. A refresh rebuilds
 * whole footnotes (delete the old children, write the new text), so with
 * tracking on a routine refresh would scatter delete/insert revisions through
 * every changed footnote without the user asking for it (R01 §2.9, O-K12).
 *
 * This module gives the refresh path what it needs to avoid that silently:
 *
 *  - `readChangeTrackingMode` reads `Document.changeTrackingMode`
 *    (WordApi 1.4, all platforms; R08 §3.6, MS-1). Automatic refresh pauses
 *    while it is on, and the user chooses whether to refresh now.
 *  - `queueRevisionProbe` / `readRevisionProbe` find managed controls that
 *    sit inside pending tracked insertions or deletions with
 *    `ContentControlCollection.getByChangeTrackingStates` (WordApi 1.5, all
 *    platforms; R08 §3.6). The refresher skips and lists those footnotes;
 *    it never rebuilds them.
 *  - `countPendingRevisionsInManagedFootnotes` counts pending revisions in
 *    managed footnotes, read-only, with `Range.getTrackedChanges` (WordApi
 *    1.6, all platforms; R08 §3.6). Obiter never accepts or rejects a
 *    revision.
 *
 * Every call is behind an `isFeatureAvailable` check and a try/catch, so a
 * host without the set behaves exactly as before. Each helper costs a
 * constant number of `context.sync()` calls, never one per footnote.
 */

import { isFeatureAvailable } from "./apiCompat";

/** Word's Track Changes setting, or "unknown" when the host cannot say. */
export type TrackingMode = "Off" | "TrackAll" | "TrackMineOnly" | "unknown";

/** Normalise the raw `changeTrackingMode` value Word returns. */
export function normaliseTrackingMode(raw: unknown): TrackingMode {
  if (typeof raw !== "string") return "unknown";
  switch (raw.toLowerCase()) {
    case "off":
      return "Off";
    case "trackall":
      return "TrackAll";
    case "trackmineonly":
      return "TrackMineOnly";
    default:
      return "unknown";
  }
}

/** True when Word is recording the user's edits as revisions. */
export function isTrackingOn(mode: TrackingMode): boolean {
  return mode === "TrackAll" || mode === "TrackMineOnly";
}

/**
 * Reads `Document.changeTrackingMode` (WordApi 1.4). One sync. Returns
 * "unknown" on a host without the set or when the read fails, so callers
 * fall back to their existing behaviour.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 */
export async function readChangeTrackingMode(context: Word.RequestContext): Promise<TrackingMode> {
  if (!isFeatureAvailable("changeTrackingMode")) return "unknown";
  try {
    const doc = context.document;
    doc.load("changeTrackingMode");
    await context.sync();
    return normaliseTrackingMode(doc.changeTrackingMode);
  } catch {
    return "unknown";
  }
}

/** Change-tracking states that mark a control as part of a pending revision. */
const PENDING_REVISION_STATES = ["Added", "Deleted"];

/**
 * Queues a read of the controls in `collection` that sit inside a pending
 * tracked insertion or deletion (WordApi 1.5). Nothing is read until the
 * caller's next `context.sync()`. Returns undefined when the host lacks the
 * set or the method, in which case the caller treats the footnote as
 * revision-free (the behaviour before COURT-108).
 */
export function queueRevisionProbe(
  collection: Word.ContentControlCollection
): Word.ContentControlCollection | undefined {
  if (!isFeatureAvailable("changeTrackingStates")) return undefined;
  const probe = collection as Word.ContentControlCollection & {
    getByChangeTrackingStates?: (states: string[]) => Word.ContentControlCollection;
  };
  if (typeof probe.getByChangeTrackingStates !== "function") return undefined;
  try {
    const hits = probe.getByChangeTrackingStates(PENDING_REVISION_STATES);
    hits.load("items/tag");
    return hits;
  } catch {
    return undefined;
  }
}

/**
 * True when a queued revision probe (after its sync) found an Obiter control
 * (the `obiter-fn` parent or a citation child) inside a pending revision.
 *
 * @param hits - The collection `queueRevisionProbe` returned, after sync.
 * @param isManagedTag - Whether a tag belongs to a control Obiter manages.
 */
export function readRevisionProbe(
  hits: Word.ContentControlCollection | undefined,
  isManagedTag: (tag: string) => boolean
): boolean {
  if (!hits) return false;
  try {
    return (hits.items ?? []).some((cc) => typeof cc.tag === "string" && isManagedTag(cc.tag));
  } catch {
    return false;
  }
}

/**
 * Counts pending tracked changes inside managed footnotes, read-only
 * (WordApi 1.6 `Range.getTrackedChanges`). Two syncs regardless of the
 * footnote count. Returns undefined below WordApi 1.6 or if the read fails;
 * the caller then shows no count.
 *
 * Obiter never accepts or rejects a revision (COURT-108).
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param parentTag - The tag of the managed parent control (`obiter-fn`).
 */
export async function countPendingRevisionsInManagedFootnotes(
  context: Word.RequestContext,
  parentTag: string
): Promise<number | undefined> {
  if (!isFeatureAvailable("trackedChanges")) return undefined;
  try {
    const parents = context.document.contentControls.getByTag(parentTag);
    parents.load("items");
    await context.sync();
    const collections = (parents.items ?? []).map((cc) => {
      const changes = cc.getRange("Whole").getTrackedChanges();
      changes.load("items/type");
      return changes;
    });
    if (collections.length === 0) return 0;
    await context.sync();
    return collections.reduce((n, changes) => n + (changes.items ?? []).length, 0);
  } catch {
    return undefined;
  }
}
