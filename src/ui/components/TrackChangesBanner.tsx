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

import { useEffect, useState } from "react";
import {
  acknowledgeTrackChangesPause,
  getTrackChangesGate,
  subscribeTrackChangesGate,
} from "../trackChangesGate";

interface TrackChangesBannerProps {
  /** Runs one explicit refresh (the Refresh All path). */
  onRefreshNow: () => void;
  /** Disables "Refresh now" while a refresh is running. */
  refreshing?: boolean;
}

export default function TrackChangesBanner({
  onRefreshNow,
  refreshing = false,
}: TrackChangesBannerProps): JSX.Element | null {
  const [gate, setGate] = useState(getTrackChangesGate);

  useEffect(() => subscribeTrackChangesGate(() => setGate(getTrackChangesGate())), []);

  if (!gate.paused || gate.acknowledged) return null;

  const pending = gate.pendingRevisions;
  return (
    <div className="obiter-manual-banner" role="status">
      <span>
        Track Changes is on: refresh will be recorded as revisions. Automatic refresh is
        paused.
        {pending !== undefined && pending > 0
          ? ` Managed footnotes hold ${pending} pending revision${pending !== 1 ? "s" : ""}.`
          : ""}
      </span>
      <button
        type="button"
        className="obiter-manual-banner-action"
        disabled={refreshing}
        onClick={() => {
          acknowledgeTrackChangesPause();
          onRefreshNow();
        }}
      >
        Refresh now
      </button>
      <button
        type="button"
        className="obiter-manual-banner-action"
        onClick={() => acknowledgeTrackChangesPause()}
      >
        Keep paused
      </button>
    </div>
  );
}
