/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-108: in-memory state of the Track Changes pause on automatic refresh.
 *
 * When Word's Track Changes is on, every write Obiter makes is recorded as a
 * revision, so the automatic (debounced) refresh pauses instead of
 * rebuilding footnotes behind the user's back. The auto-refresh path in
 * CitationContext records the pause here; the banner in Layout reads it and
 * offers "Refresh now" (one refresh, recorded as revisions) or "Keep paused".
 *
 * Explicit user actions are not paused: Refresh All, the refresh that
 * follows inserting or editing a citation, and a refresh a Settings change
 * starts ask first instead (COURT-108 follow-up, owner, 7 Oct 2026; see
 * TrackedRefreshConfirm). The pause clears itself the next time an
 * automatic refresh finds Track Changes off.
 *
 * Same module-store pattern as recoveryQueue.ts: plain state plus subscribers,
 * so the banner re-renders whenever the auto-refresh path changes it.
 */

import type { TrackingMode } from "../word/trackChanges";

/** The current pause state. */
export interface TrackChangesGateState {
  /** True while automatic refresh is paused because Track Changes is on. */
  paused: boolean;
  /** The Track Changes mode last read. */
  mode: TrackingMode;
  /** True once the user chose "Keep paused" or "Refresh now" for this pause. */
  acknowledged: boolean;
  /** Pending revisions in managed footnotes (WordApi 1.6), when known. */
  pendingRevisions?: number;
}

const INITIAL: TrackChangesGateState = { paused: false, mode: "unknown", acknowledged: false };

let state: TrackChangesGateState = { ...INITIAL };
const subscribers = new Set<() => void>();

function notify(): void {
  for (const listener of Array.from(subscribers)) listener();
}

/** The current pause state. */
export function getTrackChangesGate(): TrackChangesGateState {
  return { ...state };
}

/**
 * Records the mode read before an automatic refresh. Returns true when the
 * refresh must pause (Track Changes is on). A mode of "unknown" never
 * pauses: a host that cannot report the setting keeps its old behaviour.
 */
export function recordTrackingMode(mode: TrackingMode, pendingRevisions?: number): boolean {
  const on = mode === "TrackAll" || mode === "TrackMineOnly";
  if (!on) {
    if (state.paused || state.mode !== mode) {
      state = { ...INITIAL, mode };
      notify();
    }
    return false;
  }
  const next: TrackChangesGateState = {
    paused: true,
    mode,
    // A pause that is already acknowledged stays acknowledged until Track
    // Changes is turned off, so the banner does not reappear on every edit.
    acknowledged: state.paused ? state.acknowledged : false,
    ...(pendingRevisions !== undefined
      ? { pendingRevisions }
      : state.pendingRevisions !== undefined
        ? { pendingRevisions: state.pendingRevisions }
        : {}),
  };
  const changed =
    !state.paused ||
    state.mode !== next.mode ||
    state.acknowledged !== next.acknowledged ||
    state.pendingRevisions !== next.pendingRevisions;
  state = next;
  if (changed) notify();
  return true;
}

/** The user chose "Keep paused" or "Refresh now": hide the banner for this pause. */
export function acknowledgeTrackChangesPause(): void {
  if (!state.paused || state.acknowledged) return;
  state = { ...state, acknowledged: true };
  notify();
}

/**
 * COURT-108 follow-up: the user has just answered the in-pane "refresh with
 * Track Changes on?" question. The automatic refresh that usually follows
 * an insert or a Settings change then pauses without showing the banner
 * again, until Track Changes is turned off.
 */
export function noteTrackedWriteDecision(mode: TrackingMode): void {
  if (mode !== "TrackAll" && mode !== "TrackMineOnly") return;
  if (state.paused && state.acknowledged && state.mode === mode) return;
  state = {
    paused: true,
    mode,
    acknowledged: true,
    ...(state.pendingRevisions !== undefined ? { pendingRevisions: state.pendingRevisions } : {}),
  };
  notify();
}

/** Subscribe to changes. Returns the unsubscribe function. */
export function subscribeTrackChangesGate(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/** Reset (tests, and document switches). */
export function resetTrackChangesGate(): void {
  state = { ...INITIAL };
  notify();
}
