/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NEXT-001: Check Reference component.
 *
 * Lets the user select text in Word, preview it, and send it to the LLM
 * for AGLC4 conformance checking. Results are displayed as a card with
 * pass/fail status, issues list, and rule references with links to the
 * Guide view.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loadLlmConfig } from "../../llm/config";
import { checkReference } from "../../llm/verifyCitation";
import type { VerificationResult } from "../../llm/verifyCitation";
import { getSelectedText } from "../../word/selectionHelper";

/** Green checkmark for a passing result. */
function PassIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="var(--colour-success)" />
      <path
        d="M6 10L9 13L14 7"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Red cross for a failing result. */
function FailIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="var(--colour-error)" />
      <path
        d="M7 7L13 13M13 7L7 13"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Spinner shown while the LLM is processing. */
function CheckSpinner(): JSX.Element {
  return (
    <svg
      className="validation-spinner"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="var(--colour-border)" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--colour-accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CheckReference(): JSX.Element {
  const navigate = useNavigate();

  const [selectedText, setSelectedText] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Grab the current selection from Word and display it in the preview. */
  const handleLoadSelection = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const text = await getSelectedText();
      setSelectedText(text);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to read selection";
      setError(message);
    }
  }, []);

  /** Send the selected text to the LLM for AGLC4 conformance checking. */
  const handleCheck = useCallback(async () => {
    if (!selectedText.trim()) return;

    const config = loadLlmConfig();
    if (!config || !config.enabled) {
      setError(
        "Configure an LLM provider in Settings to use this feature",
      );
      return;
    }

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      const verification = await checkReference(selectedText, config);
      setResult(verification);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Reference check failed";
      setError(message);
    } finally {
      setChecking(false);
    }
  }, [selectedText]);

  const handleViewRule = (ruleNumber: string): void => {
    navigate(`/abbreviations?rule=${encodeURIComponent(ruleNumber)}`);
  };

  return (
    <div className="check-reference">
      <h3>Check Reference</h3>

      <button
        className="validation-scan-btn"
        onClick={() => void handleLoadSelection()}
        disabled={checking}
      >
        Check Selected Text
      </button>

      {/* Preview of selected text */}
      {selectedText.trim() && (
        <div className="check-reference-preview">
          <span className="check-reference-preview-label">Selected text</span>
          <p className="check-reference-preview-text">{selectedText}</p>
          <button
            className="check-reference-check-btn"
            onClick={() => void handleCheck()}
            disabled={checking}
          >
            {checking ? "Checking..." : "Verify against AGLC4"}
          </button>
        </div>
      )}

      {/* Spinner while LLM processes */}
      {checking && (
        <div className="validation-scanning">
          <CheckSpinner />
          <p>Checking reference against AGLC4 rules...</p>
        </div>
      )}

      {/* Error state */}
      <div aria-live="polite" role="status">
        {error && (
          <div className="validation-error">
            <p>Error: {error}</p>
          </div>
        )}
      </div>

      {/* Result card */}
      {result && !checking && (
        <div
          className={`check-reference-result ${
            result.valid
              ? "check-reference-result--pass"
              : "check-reference-result--fail"
          }`}
          aria-live="polite"
        >
          <div className="check-reference-result-header">
            {result.valid ? <PassIcon /> : <FailIcon />}
            <span className="check-reference-result-verdict">
              {result.valid ? "Citation appears correct" : "Issues found"}
            </span>
          </div>

          {/* Issues list */}
          {result.issues.length > 0 && (
            <ul className="check-reference-issues">
              {result.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          )}

          {/* Rule references */}
          {result.ruleReferences.length > 0 && (
            <div className="check-reference-rules">
              <span className="check-reference-rules-label">
                Applicable rules:
              </span>
              {result.ruleReferences.map((rule, idx) => (
                <button
                  key={idx}
                  className="check-reference-rule-link"
                  onClick={() => handleViewRule(rule)}
                >
                  Rule {rule}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
