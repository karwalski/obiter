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
  BibliographySection,
} from "../../engine/rules/v4/general/bibliography";
import { getStandardConfig, buildCourtConfig } from "../../engine/standards";
import type { LoaType } from "../../engine/standards";
import { getDevicePref } from "../../store/devicePreferences";

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

    // Each paragraph is inserted AFTER the previously inserted one so the
    // document grows forward. Anchoring every insert against `selection`
    // stacks paragraphs in reverse order at the cursor.
    let anchor: Word.Paragraph | null = null;

    function insertAfter(text: string): Word.Paragraph {
      return anchor
        ? anchor.insertParagraph(text, Word.InsertLocation.after)
        : selection.insertParagraph(text, Word.InsertLocation.after);
    }

    for (const section of sections) {
      const headingParagraph = insertAfter(section.heading);
      headingParagraph.style = "AGLC4 Bibliography Heading";
      headingParagraph.alignment = Word.Alignment.centered;
      // Apply spacing directly so the visual separation works even when
      // the user has not installed the AGLC4 paragraph styles yet.
      headingParagraph.spaceBefore = 18;
      headingParagraph.spaceAfter = 6;
      anchor = headingParagraph;

      for (const entry of section.entries) {
        const entryParagraph = insertAfter("");
        // Entries are inserted after the heading paragraph and would
        // otherwise inherit its centred + italic style. Reset to Normal
        // and left-align so each entry renders as flowing body text.
        entryParagraph.style = "Normal";
        entryParagraph.alignment = Word.Alignment.left;

        // Build the paragraph content run-by-run. Explicitly set italic
        // (and bold / superscript / smallCaps) to the run's value rather
        // than only setting them when truthy — otherwise inherited
        // formatting from the prior paragraph leaks through.
        for (const run of entry) {
          const range = entryParagraph.insertText(
            run.text,
            Word.InsertLocation.end
          );
          range.font.italic = run.italic === true;
          range.font.bold = run.bold === true;
          range.font.superscript = run.superscript === true;
          range.font.smallCaps = run.smallCaps === true;
          if (run.font) range.font.name = run.font;
          if (run.size) range.font.size = run.size;
        }
        anchor = entryParagraph;
      }
    }

    await context.sync();
  });
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

  // Load citations from the store on mount
  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const store = await getSharedStore();
        const all = store.getAll();
        if (!cancelled) {
          setCitations(all);
          const baseConfig = getStandardConfig(store.getStandardId());
          const mode = store.getWritingMode();
          setBibStructure(baseConfig.bibliographyStructure);
          setWritingMode(mode);

          // COURT-FIX-005: Load court toggles and build config to get loaType
          if (mode === "court") {
            const courtToggles = getDevicePref("courtToggles") as Record<string, string> | undefined;
            const courtConfig = buildCourtConfig(
              { ...baseConfig, writingMode: mode },
              courtToggles,
            );
            setLoaType(courtConfig.loaType);
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
    () => generateBibliographyForStandard(filteredCitations, bibStructure, writingMode, loaType),
    [filteredCitations, bibStructure, writingMode, loaType]
  );

  const handleInsert = useCallback(async () => {
    if (sections.length === 0) return;

    setInserting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await insertBibliographyIntoDocument(sections);
      setSuccessMessage(`${getBibliographyHeading(writingMode, bibStructure)} inserted successfully.`);
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
