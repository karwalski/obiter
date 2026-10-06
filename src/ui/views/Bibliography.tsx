/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Citation } from "../../types/citation";
import { FormattedRun } from "../../types/formattedRun";
import { getSharedStore } from "../../store/singleton";
import {
  generateBibliographyForStandard,
  generateCourtListOfAuthorities,
  type LoaValidationWarning,
} from "../../engine/rules/v4/general/bibliography";
import { resolveDocumentConfig } from "../../engine/standards";
import type { LoaType } from "../../engine/standards";
import type { CitationConfig } from "../../engine/standards/types";
import { getDevicePref } from "../../store/devicePreferences";
import {
  insertBibliographyIntoDocument,
  type EntryParagraphStyle,
} from "../../word/bibliographyInserter";
import { isNotAllowedError, writeErrorMessage } from "../../word/documentAccess";

// ─── FormattedRun Renderer ──────────────────────────────────────────────────

interface FormattedRunsProps {
  runs: FormattedRun[];
}

/**
 * Renders an array of FormattedRun objects as styled inline spans for the
 * bibliography preview.
 */
function FormattedRuns({ runs }: FormattedRunsProps): JSX.Element {
  return (
    <>
      {runs.map((run, i) => {
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
          <span key={i} style={style}>
            {run.text}
          </span>
        );
      })}
    </>
  );
}

// ─── Bibliography View ──────────────────────────────────────────────────────

/**
 * Returns the appropriate page heading based on writing mode and bibliography
 * structure. OSCOLA uses "Tables of Cases and Legislation"; court mode uses
 * "List of Authorities"; all others use "Bibliography".
 */
function getBibliographyHeading(
  writingMode: "academic" | "court",
  bibStructure: "aglc" | "oscola" | "nzlsg",
): string {
  if (writingMode === "court") return "List of Authorities";
  if (bibStructure === "oscola") return "Tables of Cases and Legislation";
  return "Bibliography";
}

export default function Bibliography(): JSX.Element {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citedOnly, setCitedOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [inserting, setInserting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bibStructure, setBibStructure] = useState<"aglc" | "oscola" | "nzlsg">("aglc");
  const [writingMode, setWritingMode] = useState<"academic" | "court">("academic");
  const [loaType, setLoaType] = useState<LoaType>("simple");
  // STD-018: the document config, so OSCOLA and NZLSG entries render in
  // their own standard.
  const [documentConfig, setDocumentConfig] = useState<CitationConfig | undefined>(undefined);
  // COURT-116: entry paragraph style. Court lists take the style of the
  // paragraph at the cursor by default; academic bibliographies keep Normal.
  const [entryStyle, setEntryStyle] = useState<EntryParagraphStyle | null>(null);
  const effectiveEntryStyle: EntryParagraphStyle =
    entryStyle ?? (writingMode === "court" ? "inherit" : "Normal");

  // Load citations from the store on mount
  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const store = await getSharedStore();
        const all = store.getAll();
        if (!cancelled) {
          setCitations(all);
          // STD-013: the document config (standard, writing mode, court toggles).
          const config = resolveDocumentConfig(
            store,
            getDevicePref("courtToggles") as Record<string, string> | undefined
          );
          setDocumentConfig(config);
          setBibStructure(config.bibliographyStructure);
          setWritingMode(config.writingMode);

          // COURT-FIX-005: the court toggles decide the loaType
          if (config.writingMode === "court") {
            setLoaType(config.loaType);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load citations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter citations: exclude explanatory notes (never in bibliography) and
  // optionally limit to cited-only sources
  const filteredCitations = useMemo(() => {
    let filtered = citations.filter((c) => c.sourceType !== "explanatory_note");
    if (citedOnly) {
      filtered = filtered.filter(
        (c) => c.firstFootnoteNumber !== undefined && c.firstFootnoteNumber > 0
      );
    }
    return filtered;
  }, [citations, citedOnly]);

  // Generate bibliography or List of Authorities from filtered citations
  // COURT-FIX-005: Pass loaType to control LoA format in court mode
  const sections = useMemo(
    () =>
      generateBibliographyForStandard(
        filteredCitations,
        bibStructure,
        writingMode,
        loaType,
        documentConfig
      ),
    [filteredCitations, bibStructure, writingMode, loaType, documentConfig]
  );

  // COURT-116 / COURT-117: the layout's validation warnings (for example an
  // empty Part A, or legislation with no version date). Court mode only.
  const loaWarnings = useMemo((): LoaValidationWarning[] => {
    if (writingMode !== "court") return [];
    return generateCourtListOfAuthorities(filteredCitations, loaType, false, documentConfig)
      .warnings;
  }, [filteredCitations, writingMode, loaType, documentConfig]);

  const handleInsert = useCallback(async () => {
    if (sections.length === 0) return;

    setInserting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await insertBibliographyIntoDocument(sections, effectiveEntryStyle);
      setSuccessMessage(`${getBibliographyHeading(writingMode, bibStructure)} inserted successfully.`);
    } catch (err) {
      // A read-only or protected document refuses the write with "NotAllowed",
      // which needs an explanation rather than an error location.
      if (isNotAllowedError(err)) {
        setError(writeErrorMessage(err, "Failed to insert bibliography."));
      } else {
        // Unwrap OfficeExtension.Error debugInfo — the generic message alone
        // ("Sorry, something went wrong") is undiagnosable in field reports.
        const debug = err as { debugInfo?: { errorLocation?: string; message?: string } };
        const location = debug.debugInfo?.errorLocation ? ` (at ${debug.debugInfo.errorLocation})` : "";
        setError(
          err instanceof Error ? `${err.message}${location}` : "Failed to insert bibliography."
        );
      }
    } finally {
      setInserting(false);
    }
  }, [sections, effectiveEntryStyle]);

  // ── Loading state ──
  if (loading) {
    return (
      <div>
        <h2>{getBibliographyHeading(writingMode, bibStructure)}</h2>
        <p>Loading citations...</p>
      </div>
    );
  }

  // ── Empty state ──
  if (citations.length === 0) {
    return (
      <div>
        <h2>{getBibliographyHeading(writingMode, bibStructure)}</h2>
        <p>No citations to generate a {getBibliographyHeading(writingMode, bibStructure).toLowerCase()} from.</p>
      </div>
    );
  }

  // COURT-FIX-005: When LoA is disabled, show a message instead of the generator.
  if (writingMode === "court" && loaType === "off") {
    return (
      <div className="bib-view">
        <h2>{getBibliographyHeading(writingMode, bibStructure)}</h2>
        <p>List of Authorities generation is disabled. Change the LoA format in court settings to enable it.</p>
      </div>
    );
  }

  const isEmpty = sections.length === 0;

  return (
    <div className="bib-view">
      <h2>{getBibliographyHeading(writingMode, bibStructure)}</h2>

      {/* Options */}
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={citedOnly}
          onChange={(e) => setCitedOnly(e.target.checked)}
        />
        <span className="settings-toggle-label">
          Include only cited sources
        </span>
      </label>

      {/* COURT-116: entry paragraph style */}
      <label className="settings-toggle" style={{ display: "block" }}>
        <span className="settings-toggle-label">Entry paragraph style</span>
        <select
          className="ic-select"
          style={{ width: "100%", marginTop: 2 }}
          value={effectiveEntryStyle}
          onChange={(e) => setEntryStyle(e.target.value as EntryParagraphStyle)}
        >
          <option value="inherit">Same as the paragraph at the cursor</option>
          <option value="Normal">Normal</option>
        </select>
      </label>

      {/* COURT-116 / COURT-117: List of Authorities checks */}
      {loaWarnings.length > 0 && (
        <ul className="bib-warnings" data-testid="loa-warnings" style={{ fontSize: 11, paddingLeft: 16 }}>
          {loaWarnings.map((w, i) => (
            <li key={`${w.code}-${i}`}>{w.message}</li>
          ))}
        </ul>
      )}

      {/* Status messages */}
      <div aria-live="polite" role="status">
        {error && <p className="bib-error">Error: {error}</p>}
        {successMessage && <p className="bib-success">Success: {successMessage}</p>}
      </div>

      {/* Insert button */}
      <button
        className="bib-insert-btn"
        disabled={isEmpty || inserting}
        onClick={() => void handleInsert()}
      >
        {inserting ? "Inserting..." : `Insert ${getBibliographyHeading(writingMode, bibStructure)} at Cursor`}
      </button>

      {/* Preview or filtered-empty message */}
      {isEmpty ? (
        <p className="bib-empty-filtered">
          No citations match the current filter.
        </p>
      ) : (
        <div className="bib-preview">
          {sections.map((section) => (
            <div key={section.heading || "closing-statement"} className="bib-section">
              {section.heading && <p className="bib-section-heading">{section.heading}</p>}
              {section.entries.map((entry, idx) => (
                <p key={idx} className="bib-entry">
                  <FormattedRuns runs={entry} />
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
