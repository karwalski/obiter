/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ModalDialog — the task pane's dialog shell: overlay, role="dialog",
 * initial focus, a Tab focus trap, Escape and overlay-click to close
 * (both suppressed while busy), and focus returned to the opener on close.
 * Extracted from the Citation Library's BibTeX modal (INTEROP-011).
 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface ModalDialogProps {
  /** id of the heading element inside the dialog. */
  titleId: string;
  /** While true, Escape and the overlay do not close the dialog. */
  busy?: boolean;
  onClose: () => void;
  /** Wider layout for tables. */
  wide?: boolean;
  /** Element to refocus when the dialog closes. */
  returnFocusTo?: HTMLElement | null;
  children: ReactNode;
}

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function ModalDialog({
  titleId,
  busy = false,
  onClose,
  wide = false,
  returnFocusTo,
  children,
}: ModalDialogProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const first = modal.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? modal).focus();

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (!busyRef.current) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusTo?.focus();
    };
    // The opener and close handler are stable for the dialog's lifetime.
  }, []);

  return (
    // Backdrop click is a redundant pointer affordance; the dialog is keyboard-closable
    // via Escape and its visible Cancel button (WCAG 2.1.1).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="library-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={`library-modal${wide ? " library-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={modalRef}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
