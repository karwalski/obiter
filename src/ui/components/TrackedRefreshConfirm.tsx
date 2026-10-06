/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-108 follow-up (owner, 7 Oct 2026): the in-pane question asked before
 * a managed refresh while Word's Track Changes is on.
 *
 * Refresh All, the refresh after inserting or editing a citation, and a
 * refresh a Settings change starts wait for this answer. "Refresh anyway"
 * runs the refresh and Word records its changes as tracked revisions; "Skip
 * for now" leaves the footnotes as they are. It is an in-pane prompt because
 * `window.confirm` and `alert` block Office add-ins. Mounted once, in the
 * Layout; while mounted it is the consent handler the word layer asks.
 * Obiter never accepts or rejects a revision.
 */

import { useEffect, useRef, useState } from "react";
import {
  setTrackedWriteConsentHandler,
  type ManagedRefreshReason,
} from "../../word/trackedWriteConsent";
import {
  answerTrackedRefresh,
  askTrackedRefresh,
  getPendingTrackedRefresh,
  resetTrackedRefresh,
  subscribeTrackedRefresh,
} from "../trackedRefreshConsent";

/** What the refresh is for, in plain words. */
export const TRACKED_REFRESH_LEAD: Record<ManagedRefreshReason, string> = {
  "refresh-all": "Refresh All updates every managed footnote that needs it.",
  insert:
    "The citation is inserted. Obiter now refreshes the other footnotes so ibid and short references stay correct.",
  edit: "Your change is saved. Obiter now refreshes the footnotes that cite this source.",
  settings: "The new setting reaches existing footnotes when they are refreshed.",
};

export const TRACKED_REFRESH_EXPLANATION =
  "Track Changes is on, so Word will record each change the refresh makes as a tracked revision. You can review them in Word.";

export default function TrackedRefreshConfirm(): JSX.Element | null {
  const [pending, setPending] = useState(getPendingTrackedRefresh);
  const refreshButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeTrackedRefresh(() => setPending(getPendingTrackedRefresh()));
    const unregister = setTrackedWriteConsentHandler(askTrackedRefresh);
    return () => {
      unsubscribe();
      unregister();
      // Nothing is written without an answer.
      resetTrackedRefresh();
    };
  }, []);

  useEffect(() => {
    if (pending) refreshButton.current?.focus();
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      className="obiter-manual-banner"
      role="alertdialog"
      aria-labelledby="tracked-refresh-title"
      aria-describedby="tracked-refresh-text"
    >
      <span>
        <strong id="tracked-refresh-title">Refresh with Track Changes on?</strong>{" "}
        <span id="tracked-refresh-text">
          {TRACKED_REFRESH_LEAD[pending.reason]} {TRACKED_REFRESH_EXPLANATION}
        </span>
      </span>
      <button
        ref={refreshButton}
        type="button"
        className="obiter-manual-banner-action"
        onClick={() => answerTrackedRefresh(true)}
      >
        Refresh anyway (as tracked changes)
      </button>
      <button
        type="button"
        className="obiter-manual-banner-action"
        onClick={() => answerTrackedRefresh(false)}
      >
        Skip for now
      </button>
    </div>
  );
}
