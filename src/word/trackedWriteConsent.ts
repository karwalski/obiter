/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * COURT-108 follow-up (owner, 7 Oct 2026): ask before a managed refresh while
 * Track Changes is on.
 *
 * COURT-108 paused only the automatic (debounced) refresh. The owner decided
 * that Refresh All, the refresh after inserting or editing a citation, and a
 * refresh a Settings change starts must also ask first: with Track Changes
 * on, Word records every footnote the refresh rebuilds as a tracked
 * revision. The user chooses "Refresh anyway (as tracked changes)" or
 * "Skip for now".
 *
 * This module is the word-layer seam. It reads `Document.changeTrackingMode`
 * (WordApi 1.4, through the apiCompat layer) and, when tracking is on, hands
 * the question to the consent handler the task pane registers (an in-pane
 * prompt; `window.confirm` and `alert` block Office add-ins). Where the mode
 * cannot be read, or no pane is showing to ask (a ribbon command in the
 * shared runtime), the refresh runs as it did before. The read costs one
 * `context.sync()`, whatever the footnote count.
 */

import { isFeatureAvailable } from "./apiCompat";
import { isTrackingOn, readChangeTrackingMode, type TrackingMode } from "./trackChanges";
import { refreshAllCitationsNow, type RefreshResult } from "./citationRefresher";
import type { CitationStore } from "../store/citationStore";

/** What started the refresh; the prompt words its question to match. */
export type ManagedRefreshReason = "refresh-all" | "insert" | "edit" | "settings";

/** One question for the consent handler. */
export interface TrackedWriteConsentRequest {
  reason: ManagedRefreshReason;
  /** The Track Changes mode read just now ("TrackAll" or "TrackMineOnly"). */
  mode: TrackingMode;
}

/** Resolves true for "Refresh anyway (as tracked changes)", false for "Skip for now". */
export type TrackedWriteConsentHandler = (request: TrackedWriteConsentRequest) => Promise<boolean>;

let handler: TrackedWriteConsentHandler | null = null;

/**
 * Register the in-pane consent prompt. Returns the function that removes it
 * (only if it is still the registered handler).
 */
export function setTrackedWriteConsentHandler(next: TrackedWriteConsentHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/** True when a pane is showing that can ask the user. */
export function hasTrackedWriteConsentHandler(): boolean {
  return handler !== null;
}

/**
 * Ask the registered handler, for a caller that has already read the mode.
 * Without a handler there is no one to ask and the answer is "refresh",
 * the behaviour before this follow-up.
 */
export function requestTrackedWriteConsent(request: TrackedWriteConsentRequest): Promise<boolean> {
  return handler ? handler(request) : Promise.resolve(true);
}

/**
 * Whether a managed refresh may run now. True when Track Changes is off,
 * when the host cannot report it (below WordApi 1.4, or the read fails), or
 * when no pane is registered to ask. Otherwise the user decides.
 *
 * Costs one `Word.run` with one sync, and none at all without a handler.
 */
export async function confirmManagedRefresh(reason: ManagedRefreshReason): Promise<boolean> {
  if (!handler || !isFeatureAvailable("changeTrackingMode")) return true;
  let mode: TrackingMode;
  try {
    mode = await Word.run((context) => readChangeTrackingMode(context));
  } catch {
    return true;
  }
  if (!isTrackingOn(mode)) return true;
  return requestTrackedWriteConsent({ reason, mode });
}

/**
 * `refreshAllCitationsNow` behind {@link confirmManagedRefresh}. Returns
 * null when the user chose "Skip for now".
 */
export async function refreshAllCitationsWithConsent(
  store: CitationStore,
  reason: ManagedRefreshReason
): Promise<RefreshResult | null> {
  if (!(await confirmManagedRefresh(reason))) return null;
  return refreshAllCitationsNow(store);
}
