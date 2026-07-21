/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * SAFE-005: In-memory queue of the latest refresh issues.
 *
 * The refresher reports skipped user edits and failed rebuild chunks via
 * the `obiter:refresh-issues` CustomEvent (dispatched by the auto-refresh
 * path in CitationContext). The event is transient; this module keeps the
 * latest detail in a module-level store so the Recovery view can render
 * the user-edit review queue whenever it mounts, not only if it happened
 * to be listening when the event fired.
 *
 * The window listener that feeds this store lives in StatusProvider
 * (StatusContext.tsx), alongside the other cross-tree listeners — it both
 * records the detail here and announces a status line pointing at the
 * Recovery view.
 *
 * Each refresh re-detects surviving user edits, so replacing the previous
 * detail wholesale is correct: a footnote resolved via "keep" (locked) or
 * "use Obiter's version" (rebuilt) simply stops appearing.
 */

import type { RefreshIssuesDetail } from "../word/citationRefresher";

/** Event dispatched by the auto-refresh path when a refresh has issues. */
export const REFRESH_ISSUES_EVENT = "obiter:refresh-issues";

let latest: RefreshIssuesDetail = { failures: [], userEdits: [] };
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  for (const listener of Array.from(subscribers)) {
    listener();
  }
}

/** Record the detail of the most recent `obiter:refresh-issues` event. */
export function recordRefreshIssues(detail: RefreshIssuesDetail): void {
  latest = {
    failures: [...detail.failures],
    userEdits: [...detail.userEdits],
  };
  notifySubscribers();
}

/** The latest recorded refresh issues (empty lists when none). */
export function getRefreshIssues(): RefreshIssuesDetail {
  return { failures: [...latest.failures], userEdits: [...latest.userEdits] };
}

/**
 * Remove one footnote's entry from the user-edit queue after the user
 * resolved it (kept or discarded) in the Recovery view.
 */
export function resolveUserEdit(footnoteNumber: number): void {
  latest = {
    ...latest,
    userEdits: latest.userEdits.filter((edit) => edit.footnoteNumber !== footnoteNumber),
  };
  notifySubscribers();
}

/** Reset the queue (tests, and document switches). */
export function clearRefreshIssues(): void {
  latest = { failures: [], userEdits: [] };
  notifySubscribers();
}

/**
 * Subscribe to queue changes. Returns the unsubscribe function.
 * The Recovery view uses this to re-render when a refresh completes with
 * new issues while the view is open.
 */
export function subscribeRefreshIssues(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}
