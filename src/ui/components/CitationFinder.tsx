/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * DYN-002: Citation Find Panel
 *
 * Collapsible panel that shows all citations in the document in footnote
 * order, with counts, format type badges, and click-to-navigate.
 */

/* global Word */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllCitationFootnotes,
  type CitationFootnoteEntry,
} from "../../word/footnoteManager";

// ─── Format Type Detection ──────────────────────────────────────────────────

/** Determines the format type label for a citation at a given position. */
function getFormatType(
  entry: CitationFootnoteEntry,
  allEntries: CitationFootnoteEntry[],
  index: number,
): "full" | "short" | "ibid" {
  // Find the first occurrence of this citation ID
  const firstOccurrence = allEntries.findIndex(
    (e) => e.citationId === entry.citationId,
  );

  if (firstOccurrence === index) {
    return "full";
  }

  // Check for ibid: same citation as the sole citation in the preceding footnote
  const precedingFootnoteNumber = entry.footnoteIndex - 1;
  const precedingEntries = allEntries.filter(
    (e) => e.footnoteIndex === precedingFootnoteNumber,
  );

  if (
    precedingEntries.length === 1 &&
    precedingEntries[0].citationId === entry.citationId
  ) {
    return "ibid";
  }

  return "short";
}

// ─── Navigate to Footnote ───────────────────────────────────────────────────

async function navigateToFootnote(footnoteIndex: number): Promise<void> {
  await Word.run(async (context) => {
    const footnotes = context.document.body.footnotes;
    footnotes.load("items");
    await context.sync();

    const zeroBasedIndex = footnoteIndex - 1;
    if (zeroBasedIndex >= 0 && zeroBasedIndex < footnotes.items.length) {
      const noteItem = footnotes.items[zeroBasedIndex];
      const range = noteItem.body.getRange("Whole");
      range.select();
      await context.sync();
    }
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface CitationFinderProps {
  /** External signal to re-scan footnotes (e.g. after a refresh). */
  refreshSignal?: number;
}

export default function CitationFinder({
  refreshSignal,
}: CitationFinderProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<CitationFootnoteEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Scan footnotes when expanded or refreshSignal changes
  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;

    async function scan(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const results = await getAllCitationFootnotes();
        if (!cancelled) {
          setEntries(results);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to scan footnotes";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void scan();
    return () => {
      cancelled = true;
    };
  }, [expanded, refreshSignal]);

  // Compute summary counts
  const footnoteCount = useMemo(() => {
    const footnoteNumbers = new Set(entries.map((e) => e.footnoteIndex));
    return footnoteNumbers.size;
  }, [entries]);

  // Filter entries by search term
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const term = searchTerm.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.citationId.toLowerCase().includes(term),
    );
  }, [entries, searchTerm]);

  const handleNavigate = useCallback(
    (footnoteIndex: number) => {
      void navigateToFootnote(footnoteIndex);
    },
    [],
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className="finder-panel">
      <button
        className="finder-toggle"
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <span className="finder-toggle-chevron">
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
        <span className="finder-toggle-label">Find Citations</span>
        {entries.length > 0 && expanded && (
          <span className="finder-toggle-count">{entries.length}</span>
        )}
      </button>

      {expanded && (
        <div className="finder-body">
          {loading && (
            <p className="finder-status">Scanning footnotes...</p>
          )}

          {error && <p className="finder-error">{error}</p>}

          {!loading && !error && (
            <>
              <p className="finder-summary">
                {entries.length} citation{entries.length !== 1 ? "s" : ""} across{" "}
                {footnoteCount} footnote{footnoteCount !== 1 ? "s" : ""}
              </p>

              {entries.length > 0 && (
                <input
                  type="text"
                  className="finder-search"
                  placeholder="Filter citations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              )}

              {filteredEntries.length === 0 && entries.length > 0 && (
                <p className="finder-empty">No citations match your filter.</p>
              )}

              {filteredEntries.length > 0 && (
                <div className="finder-list">
                  {filteredEntries.map((entry, index) => {
                    const formatType = getFormatType(
                      entry,
                      entries,
                      entries.indexOf(entry),
                    );
                    return (
                      <button
                        key={`${entry.citationId}-${entry.footnoteIndex}-${index}`}
                        className="finder-item"
                        onClick={() => handleNavigate(entry.footnoteIndex)}
                        title={`Go to footnote ${entry.footnoteIndex}`}
                      >
                        <span className="finder-item-fn">
                          n {entry.footnoteIndex}
                        </span>
                        <span className="finder-item-title">{entry.title}</span>
                        <span
                          className={`finder-item-type finder-item-type--${formatType}`}
                        >
                          {formatType}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
