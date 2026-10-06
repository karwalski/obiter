/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-108 follow-up (owner, 7 Oct 2026): in-memory state of the in-pane
 * "refresh with Track Changes on?" question.
 *
 * `askTrackedRefresh` is the consent handler the word layer calls
 * (`setTrackedWriteConsentHandler`). It records one pending question and
 * returns a promise the prompt resolves. A second request while a question
 * is showing joins it and gets the same answer, so the user is asked once.
 *
 * Same module-store pattern as trackChangesGate.ts: plain state plus
 * subscribers, so the prompt re-renders whenever a question arrives.
 */

import type { ManagedRefreshReason, TrackedWriteConsentRequest } from "../word/trackedWriteConsent";
import type { TrackingMode } from "../word/trackChanges";
import { noteTrackedWriteDecision } from "./trackChangesGate";

/** The question showing, if any. */
export interface PendingTrackedRefresh {
  reason: ManagedRefreshReason;
  mode: TrackingMode;
}

let pending: PendingTrackedRefresh | null = null;
let resolvers: Array<(accept: boolean) => void> = [];
const subscribers = new Set<() => void>();

function notify(): void {
  for (const listener of Array.from(subscribers)) listener();
}

/** The question showing, or null. */
export function getPendingTrackedRefresh(): PendingTrackedRefresh | null {
  return pending ? { ...pending } : null;
}

/** The consent handler: show the question and wait for the answer. */
export function askTrackedRefresh(request: TrackedWriteConsentRequest): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    resolvers.push(resolve);
    if (!pending) {
      pending = { reason: request.reason, mode: request.mode };
      notify();
    }
  });
}

/** The user answered: true for "Refresh anyway", false for "Skip for now". */
export function answerTrackedRefresh(accept: boolean): void {
  if (!pending) return;
  const { mode } = pending;
  const waiting = resolvers;
  pending = null;
  resolvers = [];
  // The automatic refresh that follows does not raise the banner again.
  noteTrackedWriteDecision(mode);
  notify();
  for (const resolve of waiting) resolve(accept);
}

/** Subscribe to changes. Returns the unsubscribe function. */
export function subscribeTrackedRefresh(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * Reset (tests, and when the prompt unmounts): a question still showing is
 * answered "skip", so no caller waits forever and nothing is written
 * without consent.
 */
export function resetTrackedRefresh(): void {
  const waiting = resolvers;
  pending = null;
  resolvers = [];
  notify();
  for (const resolve of waiting) resolve(false);
}
