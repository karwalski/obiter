/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useCallback } from "react";
import { validateDocument, ValidationIssue } from "../../engine/validator";
import { CitationStore } from "../../store";
import { ValidationResult } from "../../engine/validator";
import { scanAndFormatInlineReferences, FormatResult } from "../../word/inlineFormatter";
import CheckReference from "../components/CheckReference";

type FilterTab = "all" | "error" | "warning" | "info";

const store = new CitationStore();

/** SVG icon for errors (circle with cross). */
function ErrorIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--colour-error)" />
      <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** SVG icon for warnings (triangle with exclamation). */
function WarningIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" fill="var(--colour-warning)" />
      <path d="M8 6V9.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="#fff" />
    </svg>
  );
}

/** SVG icon for info (circle with i). */
function InfoIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--colour-accent)" />
      <path d="M8 7V11.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.75" fill="#fff" />
    </svg>
  );
}

/** SVG checkmark icon for the "no issues" state. */
function CheckIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--colour-success)" />
      <path d="M4.5 8L7 10.5L11.5 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Spinner shown during scanning. */
function Spinner(): JSX.Element {
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

function severityIcon(severity: "error" | "warning" | "info"): JSX.Element {
  switch (severity) {
    case "error":
      return <ErrorIcon />;
    case "warning":
      return <WarningIcon />;
    case "info":
      return <InfoIcon />;
  }
}

function severityClass(severity: "error" | "warning" | "info"): string {
  switch (severity) {
    case "error":
      return "validation-card--error";
    case "warning":
      return "validation-card--warning";
    case "info":
      return "validation-card--info";
  }
}

export default function Validation(): JSX.Element {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [formatting, setFormatting] = useState(false);
  const [formatResult, setFormatResult] = useState<FormatResult | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);

  const handleValidate = useCallback(async () => {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      // Read footnote texts and body text from the document
      const { footnoteTexts, bodyText } = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        const footnotes = body.footnotes;
        footnotes.load("items");
        await context.sync();

        const texts: string[] = [];
        for (const fn of footnotes.items) {
          fn.body.load("text");
        }
        await context.sync();

        for (const fn of footnotes.items) {
          texts.push(fn.body.text);
        }
        return { footnoteTexts: texts, bodyText: body.text };
      });

      // Load citations from store
      await store.initStore();
      const citations = store.getAll();

      // Run validation (including body text for footnote position checks)
      const currentWritingMode = store.getWritingMode();
      const validationResult = validateDocument(footnoteTexts, citations, bodyText, currentWritingMode);
      setResult(validationResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Validation failed";
      setError(message);
    } finally {
      setScanning(false);
    }
  }, []);

  const handleFormatInline = useCallback(async () => {
    setFormatting(true);
    setFormatError(null);
    setFormatResult(null);

    try {
      await store.initStore();
      const citations = store.getAll();

      const result = await Word.run(async (context) => {
        return scanAndFormatInlineReferences(context, citations);
      });

      setFormatResult(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Inline formatting failed";
      setFormatError(message);
    } finally {
      setFormatting(false);
    }
  }, []);

  // Determine which issues to display based on active tab
  const getFilteredIssues = (): ValidationIssue[] => {
    if (!result) return [];
    switch (activeTab) {
      case "error":
        return result.errors;
      case "warning":
        return result.warnings;
      case "info":
        return result.info;
      case "all":
        return [...result.errors, ...result.warnings, ...result.info];
    }
  };

  const filteredIssues = getFilteredIssues();
  const totalCount = result ? result.errors.length + result.warnings.length + result.info.length : 0;
  const noIssues = result !== null && totalCount === 0;

  return (
    <div className="validation-view">
      <h2>Validation</h2>

      {/* Scan button */}
      <button
        className="validation-scan-btn"
        onClick={() => void handleValidate()}
        disabled={scanning}
      >
        {scanning ? "Validating..." : "Validate Document"}
      </button>

      {/* Format inline references button */}
      <button
        className="validation-scan-btn"
        onClick={() => void handleFormatInline()}
        disabled={formatting || scanning}
      >
        {formatting ? "Formatting..." : "Format Inline References"}
      </button>

      {/* Inline formatting result */}
      <div aria-live="polite" role="status">
        {formatResult && (
          <div className="validation-summary">
            <span>
              Formatted {formatResult.formatted} inline reference{formatResult.formatted !== 1 ? "s" : ""} ({formatResult.skipped} already correct)
            </span>
          </div>
        )}

        {/* Inline formatting error */}
        {formatError && (
          <div className="validation-error">
            <p>Error: {formatError}</p>
          </div>
        )}
      </div>

      {/* Check Reference (LLM-powered) */}
      <CheckReference />

      {/* Scanning state */}
      {scanning && (
        <div className="validation-scanning">
          <Spinner />
          <p>Scanning document for AGLC4 issues...</p>
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

      {/* Empty state (before scanning) */}
      {!scanning && result === null && !error && (
        <div className="validation-empty">
          <p>Click &lsquo;Validate Document&rsquo; to check your document against AGLC4 rules.</p>
        </div>
      )}

      {/* Results */}
      {result !== null && !scanning && (
        <>
          {/* Summary bar */}
          <div className={`validation-summary ${noIssues ? "validation-summary--clean" : ""}`} aria-live="polite">
            {noIssues ? (
              <>
                <CheckIcon />
                <span>No issues found</span>
              </>
            ) : (
              <span>
                {result.errors.length} error{result.errors.length !== 1 ? "s" : ""},
                {" "}{result.warnings.length} warning{result.warnings.length !== 1 ? "s" : ""},
                {" "}{result.info.length} info
              </span>
            )}
          </div>

          {/* Filter tabs */}
          {totalCount > 0 && (
            <div className="validation-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === "all"}
                className={`validation-tab ${activeTab === "all" ? "validation-tab--active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All ({totalCount})
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "error"}
                className={`validation-tab ${activeTab === "error" ? "validation-tab--active" : ""}`}
                onClick={() => setActiveTab("error")}
              >
                Errors ({result.errors.length})
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "warning"}
                className={`validation-tab ${activeTab === "warning" ? "validation-tab--active" : ""}`}
                onClick={() => setActiveTab("warning")}
              >
                Warnings ({result.warnings.length})
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "info"}
                className={`validation-tab ${activeTab === "info" ? "validation-tab--active" : ""}`}
                onClick={() => setActiveTab("info")}
              >
                Info ({result.info.length})
              </button>
            </div>
          )}

          {/* Result cards */}
          <div className="validation-results" role="tabpanel">
            {filteredIssues.map((issue, idx) => (
              <div key={idx} className={`validation-card ${severityClass(issue.severity)}`}>
                <div className="validation-card-header">
                  {severityIcon(issue.severity)}
                  <span className="validation-card-rule">Rule {issue.ruleNumber}</span>
                </div>
                <p className="validation-card-message">{issue.message}</p>
                {issue.suggestion && (
                  <p className="validation-card-suggestion">
                    Suggestion: <code>{issue.suggestion}</code>
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
