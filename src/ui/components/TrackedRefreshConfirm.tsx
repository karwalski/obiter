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
import { currentFocus, isEarlyClick, restoreFocus } from "../noticeGuard";

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

/** The Refresh All button in the Layout: where focus returns when nothing else had it. */
export const REFRESH_ALL_BUTTON_ID = "obiter-refresh-all";

/**
 * COURT-108 (live test of v1.17.9, N1): the prompt is a sheet docked at the
 * bottom of the pane (see `.obiter-notice-dock`), so opening it never moves
 * the tabs or the toolbar under the pointer. Focus starts on "Skip for now",
 * Escape skips, a click on "Refresh anyway" within EARLY_CLICK_GUARD_MS of
 * opening is ignored (double-click carry-over), and focus returns to the
 * control that started the refresh.
 */
export default function TrackedRefreshConfirm(): JSX.Element | null {
  const [pending, setPending] = useState(getPendingTrackedRefresh);
  const skipButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const openedAt = useRef<number | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const isOpen = pending !== null;
  const reason = pending?.reason;

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
    if (!isOpen) return;
    openedAt.current = Date.now();
    // Remember where the user was (WebKit does not focus a clicked button, so
    // a Refresh All question falls back to the Refresh All button).
    trigger.current =
      currentFocus() ??
      (reason === "refresh-all" ? document.getElementById(REFRESH_ALL_BUTTON_ID) : null);
    skipButton.current?.focus();
    // Escape is "Skip for now" while focus is in the prompt (or nowhere).
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      const focus = currentFocus();
      if (focus && !sheet.current?.contains(focus)) return;
      event.preventDefault();
      event.stopPropagation();
      answerTrackedRefresh(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openedAt.current = null;
      const target = trigger.current;
      trigger.current = null;
      restoreFocus(target);
    };
  }, [isOpen, reason]);

  if (!pending) return null;

  return (
    <div
      className="obiter-notice-sheet"
      role="alertdialog"
      aria-labelledby="tracked-refresh-title"
      aria-describedby="tracked-refresh-text"
      ref={sheet}
    >
      <p className="obiter-notice-sheet-text">
        <strong id="tracked-refresh-title">Refresh with Track Changes on?</strong>{" "}
        <span id="tracked-refresh-text">
          {TRACKED_REFRESH_LEAD[pending.reason]} {TRACKED_REFRESH_EXPLANATION}
        </span>
      </p>
      <div className="obiter-notice-sheet-actions">
        <button
          ref={skipButton}
          type="button"
          className="obiter-manual-banner-action"
          onClick={() => answerTrackedRefresh(false)}
        >
          Skip for now
        </button>
        <button
          type="button"
          className="obiter-manual-banner-action"
          onClick={() => {
            if (isEarlyClick(openedAt.current)) return;
            answerTrackedRefresh(true);
          }}
        >
          Refresh anyway (as tracked changes)
        </button>
      </div>
    </div>
  );
}
