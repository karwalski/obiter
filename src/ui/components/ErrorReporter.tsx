/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useEffect, useRef } from "react";
import { collectDiagnostics, sendErrorReport } from "../../utils/diagnostics";
import type { ErrorReport } from "../../utils/diagnostics";

export interface ErrorReporterProps {
  /** The error that occurred. */
  error: Error;
  /** A human-readable description of the action that caused the error. */
  action: string;
  /** Optional form data to include if the user opts in. */
  formData?: Record<string, unknown>;
  /** Called when the modal is dismissed. */
  onClose: () => void;
}

/**
 * A modal dialog that allows users to optionally send diagnostic information
 * to the developers when an error occurs. All data is shown before sending
 * and the user explicitly chooses what to include.
 */
export default function ErrorReporter({
  error,
  action,
  formData,
  onClose,
}: ErrorReporterProps): JSX.Element {
  const [includeFormData, setIncludeFormData] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and Escape key handler
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const firstFocusable = modal.querySelector<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !sending) {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sending, onClose]);

  const handleSend = async (): Promise<void> => {
    setSending(true);
    setSendError(false);

    const diagnostics = collectDiagnostics();

    const report: ErrorReport = {
      errorMessage: error.message,
      errorStack: error.stack,
      action,
      obiterVersion: diagnostics.obiterVersion ?? "unknown",
      timestamp: diagnostics.timestamp ?? new Date().toISOString(),
      wordVersion: diagnostics.wordVersion,
      platform: diagnostics.platform,
      ...(includeFormData && formData ? { formData: sanitiseFormData(formData) } : {}),
    };

    const success = await sendErrorReport(report);
    setSending(false);

    if (success) {
      setSent(true);
    } else {
      setSendError(true);
    }
  };

  if (sent) {
    return (
      <div
        className="error-reporter-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="error-reporter-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Error report sent"
          ref={modalRef}
        >
          <p className="error-reporter-sent">Report sent. Thank you for helping improve Obiter.</p>
          <div className="error-reporter-actions">
            <button
              className="error-reporter-btn error-reporter-btn-primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="error-reporter-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div
        className="error-reporter-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Report this error"
        ref={modalRef}
      >
        <h3 className="error-reporter-title">Report This Error</h3>
        <p className="error-reporter-description">
          Would you like to send diagnostic information to the developers?
        </p>

        <div className="error-reporter-info">
          <p className="error-reporter-info-heading">The following will be sent:</p>
          <ul className="error-reporter-info-list">
            <li>Error message and stack trace</li>
            <li>Your Word version and operating system</li>
            <li>The action that caused the error ({action})</li>
            <li>Obiter version</li>
          </ul>
        </div>

        {formData && (
          <label className="error-reporter-checkbox">
            <input
              type="checkbox"
              checked={includeFormData}
              onChange={(e) => setIncludeFormData(e.target.checked)}
              disabled={sending}
            />
            <span>Include current form data (helps reproduce the issue)</span>
          </label>
        )}

        {sendError && (
          <p className="error-reporter-error">
            Failed to send report. You can try again or dismiss this dialog.
          </p>
        )}

        <div className="error-reporter-actions">
          <button
            className="error-reporter-btn error-reporter-btn-primary"
            onClick={() => void handleSend()}
            disabled={sending}
          >
            {sending ? "Sending..." : "Send Report"}
          </button>
          <button
            className="error-reporter-btn"
            onClick={onClose}
            disabled={sending}
          >
            No Thanks
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Remove potentially sensitive fields from form data before sending.
 * Strips any keys that might contain API keys or personal information.
 */
function sanitiseFormData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitised: Record<string, unknown> = {};
  const sensitiveKeys = ["apiKey", "api_key", "token", "password", "secret", "key"];

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some((s) => keyLower.includes(s))) continue;
    sanitised[key] = value;
  }

  return sanitised;
}
