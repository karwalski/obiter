/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-108 (live test of v1.17.9, N1): helpers shared by the two Track
 * Changes notices (the paused-refresh banner and the "refresh with Track
 * Changes on?" prompt).
 *
 * Both notices offer a risky action (a refresh Word records as revisions).
 * A click that lands within EARLY_CLICK_GUARD_MS of a notice opening is
 * taken as carry-over from the click that opened it (a double-click on
 * Refresh All, say) and ignored, so nothing is consented to unread.
 */

/** Clicks on a risky action this soon after its notice opens are ignored. */
export const EARLY_CLICK_GUARD_MS = 400;

/** True when a click at `now` is too soon after a notice opened at `openedAt`. */
export function isEarlyClick(openedAt: number | null, now: number = Date.now()): boolean {
  return openedAt !== null && now - openedAt < EARLY_CLICK_GUARD_MS;
}

/** True when focus is on a field the user may be typing in. */
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file"].includes(
      type
    );
  }
  return (el as HTMLElement).isContentEditable === true;
}

/** The focused element worth returning to, or null for none (the page body). */
export function currentFocus(): HTMLElement | null {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  return el as HTMLElement;
}

/**
 * Return focus to `target` once the notice has closed. A button the pane
 * disabled while it waited (Refresh All, during a refresh) is focused as
 * soon as it is enabled again, unless the user has moved focus elsewhere.
 */
export function restoreFocus(target: HTMLElement | null): void {
  if (!target || !target.isConnected) return;
  const disabled = (): boolean => (target as HTMLButtonElement).disabled === true;
  if (!disabled()) {
    target.focus();
    return;
  }
  if (typeof MutationObserver === "undefined") return;
  const observer = new MutationObserver(() => {
    if (!target.isConnected) {
      observer.disconnect();
      return;
    }
    if (disabled()) return;
    observer.disconnect();
    if (currentFocus() === null) target.focus();
  });
  observer.observe(target, { attributes: true, attributeFilter: ["disabled"] });
  // Do not watch for ever.
  setTimeout(() => observer.disconnect(), 60_000);
}
