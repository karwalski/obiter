/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-108: banner shown while automatic refresh is paused because Word's
 * Track Changes is on. "Refresh now" runs one refresh (Word records its
 * changes as revisions); "Keep paused" hides the banner until Track Changes
 * is turned off and on again. Obiter never accepts or rejects a revision.
 */

import { useEffect, useRef, useState } from "react";
import {
  acknowledgeTrackChangesPause,
  getTrackChangesGate,
  subscribeTrackChangesGate,
} from "../trackChangesGate";
import { getPendingTrackedRefresh, subscribeTrackedRefresh } from "../trackedRefreshConsent";
import { currentFocus, isEarlyClick, isTypingTarget, restoreFocus } from "../noticeGuard";

interface TrackChangesBannerProps {
  /** Runs one explicit refresh (the Refresh All path). */
  onRefreshNow: () => void;
  /** Disables "Refresh now" while a refresh is running. */
  refreshing?: boolean;
}

/**
 * COURT-108 (live test of v1.17.9, N1): the banner is docked at the bottom
 * of the pane (see `.obiter-notice-dock`), so it never pushes the tabs or the
 * toolbar down under the pointer. It is hidden while the "refresh with Track
 * Changes on?" prompt is showing (the prompt supersedes it). "Keep paused"
 * comes first and takes focus when the pane already has it (never while the
 * user is typing in a field); a click on "Refresh now" within
 * EARLY_CLICK_GUARD_MS of the banner appearing is ignored.
 */
export default function TrackChangesBanner({
  onRefreshNow,
  refreshing = false,
}: TrackChangesBannerProps): JSX.Element | null {
  const [gate, setGate] = useState(getTrackChangesGate);
  const [asking, setAsking] = useState(() => getPendingTrackedRefresh() !== null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const openedAt = useRef<number | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => subscribeTrackChangesGate(() => setGate(getTrackChangesGate())), []);
  useEffect(
    () => subscribeTrackedRefresh(() => setAsking(getPendingTrackedRefresh() !== null)),
    []
  );

  const visible = gate.paused && !gate.acknowledged && !asking;

  useEffect(() => {
    if (!visible) return;
    openedAt.current = Date.now();
    const focused = currentFocus();
    if (focused && !isTypingTarget(focused)) {
      returnTo.current = focused;
      keepButton.current?.focus();
    }
    return () => {
      openedAt.current = null;
      const target = returnTo.current;
      returnTo.current = null;
      // Only when focus was moved here and is now lost with the banner.
      if (target && currentFocus() === null) restoreFocus(target);
    };
  }, [visible]);

  if (!visible) return null;

  const pending = gate.pendingRevisions;
  return (
    <div className="obiter-notice-sheet" role="status">
      <p className="obiter-notice-sheet-text">
        Track Changes is on: refresh will be recorded as revisions. Automatic refresh is
        paused.
        {pending !== undefined && pending > 0
          ? ` Managed footnotes hold ${pending} pending revision${pending !== 1 ? "s" : ""}.`
          : ""}
      </p>
      <div className="obiter-notice-sheet-actions">
        <button
          ref={keepButton}
          type="button"
          className="obiter-manual-banner-action"
          onClick={() => acknowledgeTrackChangesPause()}
        >
          Keep paused
        </button>
        <button
          type="button"
          className="obiter-manual-banner-action"
          disabled={refreshing}
          onClick={() => {
            if (isEarlyClick(openedAt.current)) return;
            acknowledgeTrackChangesPause();
            onRefreshNow();
          }}
        >
          Refresh now
        </button>
      </div>
    </div>
  );
}
