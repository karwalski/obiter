/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { FormattedRun } from "../../types/formattedRun";
import type { SourceType, SourceData } from "../../types/citation";

export interface CitationPreviewProps {
  runs: FormattedRun[];
  sourceType?: SourceType;
  /** Called when the user edits the preview text and fields are parsed out. */
  onParsed?: (data: Partial<SourceData>, warnings: string[]) => void;
  /** Called when the user's manual text should be used as-is for insertion. */
  onOverride?: (text: string) => void;
}

/** Parse a raw citation string into partial source data based on source type. */
function parseCitationText(
  text: string,
  sourceType?: SourceType,
): { data: Partial<SourceData>; warnings: string[] } {
  const data: Partial<SourceData> = {};
  const warnings: string[] = [];

  if (!text.trim()) return { data, warnings };

  if (sourceType?.startsWith("case.")) {
    // Pattern: Party1 v Party2 (Year) Volume Series Page
    // or: Party1 v Party2 [Year] Court Number
    const caseMatch = text.match(
      /^(.+?)\s+v\s+(.+?)\s+[\[\(](\d{4})[\]\)]\s*(.*)/i,
    );
    if (caseMatch) {
      data.party1 = caseMatch[1].trim();
      data.party2 = caseMatch[2].trim();
      data.year = parseInt(caseMatch[3], 10);
      const afterYear = caseMatch[4].trim();

      // Check bracket type
      if (text.includes(`[${caseMatch[3]}]`)) {
        data.yearType = "square";
      } else {
        data.yearType = "round";
      }

      // Try to parse "Volume Series Page" from remainder
      const reportMatch = afterYear.match(/^(\d+)\s+(.+?)\s+(\d+)/);
      if (reportMatch) {
        data.volume = parseInt(reportMatch[1], 10);
        data.reportSeries = reportMatch[2].trim();
        data.startingPage = parseInt(reportMatch[3], 10);
      } else {
        // Try "Series Page" (year-organised)
        const seriesMatch = afterYear.match(/^(.+?)\s+(\d+)/);
        if (seriesMatch) {
          data.reportSeries = seriesMatch[1].trim();
          data.startingPage = parseInt(seriesMatch[2], 10);
        }
      }
    } else {
      warnings.push("Could not parse case name. Expected: Party1 v Party2 (Year) Volume Series Page");
    }
  } else if (sourceType === "legislation.statute") {
    // Pattern: Title Year (Jurisdiction)
    const legMatch = text.match(/^(.+?)\s+(\d{4})\s*\(([^)]+)\)/);
    if (legMatch) {
      data.title = legMatch[1].trim();
      data.year = parseInt(legMatch[2], 10);
      data.jurisdiction = legMatch[3].trim();
    } else {
      warnings.push("Could not parse statute. Expected: Title Year (Jurisdiction)");
    }
  } else if (sourceType === "journal.article") {
    // Pattern: Author, 'Title' (Year) Volume Journal Page
    const journalMatch = text.match(
      /^(.+?),\s*['\u2018](.+?)['\u2019]\s*\((\d{4})\)\s*(\d+)?\s*(.+?)\s+(\d+)/,
    );
    if (journalMatch) {
      const authorParts = journalMatch[1].trim().split(/\s+/);
      data.authors = [{
        givenNames: authorParts.slice(0, -1).join(" "),
        surname: authorParts[authorParts.length - 1],
      }];
      data.title = journalMatch[2].trim();
      data.year = parseInt(journalMatch[3], 10);
      if (journalMatch[4]) data.volume = parseInt(journalMatch[4], 10);
      data.journal = journalMatch[5].trim();
      data.startingPage = parseInt(journalMatch[6], 10);
    } else {
      warnings.push("Could not parse journal article. Expected: Author, 'Title' (Year) Volume Journal Page");
    }
  } else if (sourceType === "book") {
    // Pattern: Author, Title (Publisher, Edition, Year)
    const bookMatch = text.match(
      /^(.+?),\s*(.+?)\s*\(([^)]+)\)/,
    );
    if (bookMatch) {
      const authorParts = bookMatch[1].trim().split(/\s+/);
      data.authors = [{
        givenNames: authorParts.slice(0, -1).join(" "),
        surname: authorParts[authorParts.length - 1],
      }];
      data.title = bookMatch[2].trim();
      const pubParts = bookMatch[3].split(",").map((s: string) => s.trim());
      if (pubParts.length >= 1) data.publisher = pubParts[0];
      // Look for edition
      const edMatch = pubParts.find((p: string) => /\d+\w*\s*ed/.test(p));
      if (edMatch) {
        const edNum = edMatch.match(/(\d+)/);
        if (edNum) data.edition = parseInt(edNum[1], 10);
      }
      // Year is usually last
      const yearPart = pubParts[pubParts.length - 1];
      const yearMatch = yearPart.match(/(\d{4})/);
      if (yearMatch) data.year = parseInt(yearMatch[1], 10);
    } else {
      warnings.push("Could not parse book. Expected: Author, Title (Publisher, Edition, Year)");
    }
  } else if (sourceType === "treaty") {
    // Pattern: Title, opened for signature Date, Series Volume Page
    const treatyMatch = text.match(
      /^(.+?),\s*opened for signature\s+(.+?),\s*(\d+)?\s*(.+?)\s+(\d+)/,
    );
    if (treatyMatch) {
      data.title = treatyMatch[1].trim();
      data.openedDate = treatyMatch[2].trim();
      if (treatyMatch[3]) data.seriesVolume = parseInt(treatyMatch[3], 10);
      data.treatySeries = treatyMatch[4].trim();
      data.startingPage = parseInt(treatyMatch[5], 10);
    } else {
      warnings.push("Could not parse treaty. Expected: Title, opened for signature Date, Series Volume Page");
    }
  } else {
    // Generic — try to extract author, title, year
    const genericMatch = text.match(/^(.+?),\s*(.+?)\s*\((\d{4})\)/);
    if (genericMatch) {
      data.author = genericMatch[1].trim();
      data.title = genericMatch[2].trim();
      data.year = parseInt(genericMatch[3], 10);
    }
  }

  return { data, warnings };
}

/**
 * Dual-mode citation preview: formatted read-only display with an editable
 * text input. Users can type or paste a citation, which is parsed via regex
 * to populate form fields. Warnings are shown for unparseable input.
 * An override mode allows inserting the raw text as-is.
 */
export default function CitationPreview({
  runs,
  sourceType,
  onParsed,
  onOverride,
}: CitationPreviewProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [manualText, setManualText] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [overrideMode, setOverrideMode] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync formatted preview text into the manual text field when not editing
  const formattedText = runs.map((r) => r.text).join("");
  useEffect(() => {
    if (!editing) {
      setManualText(formattedText);
      setWarnings([]);
      setOverrideMode(false);
    }
  }, [formattedText, editing]);

  const handleTextChange = useCallback(
    (value: string) => {
      setManualText(value);
      if (!sourceType || !onParsed) return;

      const { data, warnings: w } = parseCitationText(value, sourceType);
      setWarnings(w);

      if (Object.keys(data).length > 0) {
        onParsed(data, w);
      }
    },
    [sourceType, onParsed],
  );

  const handleEditClick = useCallback(() => {
    setEditing(true);
    setManualText(formattedText);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [formattedText]);

  const handleDoneClick = useCallback(() => {
    setEditing(false);
  }, []);

  const handleOverride = useCallback(() => {
    setOverrideMode(true);
    if (onOverride) onOverride(manualText);
  }, [manualText, onOverride]);

  if (runs.length === 0 && !editing) {
    return (
      <div className="citation-preview citation-preview--empty">
        <span className="citation-preview-placeholder">
          Citation preview will appear here as you fill in the fields.
        </span>
        {onParsed && (
          <button
            type="button"
            className="citation-preview-edit-btn"
            onClick={handleEditClick}
          >
            Or type a citation directly
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="citation-preview">
      {!editing ? (
        <>
          <div className="citation-preview-formatted">
            {runs.map((run, index) => {
              const style: React.CSSProperties = {};
              if (run.italic) style.fontStyle = "italic";
              if (run.bold) style.fontWeight = "bold";
              if (run.superscript) {
                style.verticalAlign = "super";
                style.fontSize = "0.75em";
              }
              if (run.smallCaps) style.fontVariant = "small-caps";
              if (run.font) style.fontFamily = run.font;
              if (run.size) style.fontSize = `${run.size}pt`;
              return (
                <span key={index} style={style}>
                  {run.text}
                </span>
              );
            })}
          </div>
          {onParsed && (
            <button
              type="button"
              className="citation-preview-edit-btn"
              onClick={handleEditClick}
            >
              Edit directly
            </button>
          )}
        </>
      ) : (
        <div className="citation-preview-editor">
          <textarea
            ref={inputRef}
            className="citation-preview-textarea"
            value={manualText}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={3}
            placeholder="Type or paste a formatted citation..."
            aria-label="Edit citation text"
          />
          {warnings.length > 0 && !overrideMode && (
            <div className="citation-preview-warnings">
              {warnings.map((w, i) => (
                <div key={i} className="citation-preview-warning">
                  {w}
                </div>
              ))}
              <button
                type="button"
                className="citation-preview-override-btn"
                onClick={handleOverride}
              >
                Use as-is (override formatting)
              </button>
            </div>
          )}
          {overrideMode && (
            <div className="citation-preview-override-active">
              Override active — citation will be inserted exactly as typed.
            </div>
          )}
          <button
            type="button"
            className="citation-preview-done-btn"
            onClick={handleDoneClick}
          >
            Done editing
          </button>
        </div>
      )}
    </div>
  );
}
