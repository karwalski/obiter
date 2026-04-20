/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Citation } from "../../types/citation";
import { FormattedRun } from "../../types/formattedRun";
import { CitationStore } from "../../store/citationStore";
import {
  generateBibliography,
  BibliographySection,
} from "../../engine/rules/v4/general/bibliography";

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

// ─── Word Insertion ─────────────────────────────────────────────────────────

/**
 * Inserts the bibliography sections into the Word document at the cursor,
 * applying formatting from FormattedRun arrays.
 */
async function insertBibliographyIntoDocument(
  sections: BibliographySection[]
): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();

    for (const section of sections) {
      // Insert section heading
      const headingParagraph = selection.insertParagraph(
        section.heading,
        Word.InsertLocation.after
      );
      headingParagraph.style = "AGLC4 Bibliography Heading";
      headingParagraph.alignment = Word.Alignment.centered;

      // Insert each entry
      for (const entry of section.entries) {
        const entryParagraph = selection.insertParagraph(
          "",
          Word.InsertLocation.after
        );

        // Build the paragraph content run-by-run
        for (const run of entry) {
          const range = entryParagraph.insertText(
            run.text,
            Word.InsertLocation.end
          );
          if (run.italic) range.font.italic = true;
          if (run.bold) range.font.bold = true;
          if (run.superscript) range.font.superscript = true;
          if (run.smallCaps) range.font.smallCaps = true;
          if (run.font) range.font.name = run.font;
          if (run.size) range.font.size = run.size;
        }
      }
    }

    await context.sync();
  });
}

// ─── Bibliography View ──────────────────────────────────────────────────────

export default function Bibliography(): JSX.Element {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citedOnly, setCitedOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [inserting, setInserting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load citations from the store on mount
  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const store = new CitationStore();
        await store.initStore();
        const all = store.getAll();
        if (!cancelled) {
          setCitations(all);
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

  // Filter citations based on the "cited only" toggle
  const filteredCitations = useMemo(() => {
    if (!citedOnly) return citations;
    return citations.filter(
      (c) => c.firstFootnoteNumber !== undefined && c.firstFootnoteNumber > 0
    );
  }, [citations, citedOnly]);

  // Generate bibliography sections from filtered citations
  const sections = useMemo(
    () => generateBibliography(filteredCitations),
    [filteredCitations]
  );

  const handleInsert = useCallback(async () => {
    if (sections.length === 0) return;

    setInserting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await insertBibliographyIntoDocument(sections);
      setSuccessMessage("Bibliography inserted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to insert bibliography."
      );
    } finally {
      setInserting(false);
    }
  }, [sections]);

  // ── Loading state ──
  if (loading) {
    return (
      <div>
        <h2>Bibliography</h2>
        <p>Loading citations...</p>
      </div>
    );
  }

  // ── Empty state ──
  if (citations.length === 0) {
    return (
      <div>
        <h2>Bibliography</h2>
        <p>No citations to generate a bibliography from.</p>
      </div>
    );
  }

  const isEmpty = sections.length === 0;

  return (
    <div className="bib-view">
      <h2>Bibliography</h2>

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

      {/* Status messages */}
      <div aria-live="polite" role="status">
        {error && <p className="bib-error">Error: {error}</p>}
        {successMessage && <p className="bib-success">Success: {successMessage}</p>}
      </div>

      {/* Insert button */}
      <button
        className="bib-insert-btn"
        disabled={isEmpty || inserting}
        onClick={handleInsert}
      >
        {inserting ? "Inserting..." : "Insert Bibliography at Cursor"}
      </button>

      {/* Preview or filtered-empty message */}
      {isEmpty ? (
        <p className="bib-empty-filtered">
          No citations match the current filter.
        </p>
      ) : (
        <div className="bib-preview">
          {sections.map((section) => (
            <div key={section.heading} className="bib-section">
              <p className="bib-section-heading">{section.heading}</p>
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
