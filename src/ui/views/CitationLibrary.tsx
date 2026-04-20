/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CitationStore } from "../../store";
import { importWordSources } from "../../word/sourceImporter";
import { importBibTeX } from "../../api/bibtexImporter";
import { refreshAllCitations } from "../../word/citationRefresher";
import { insertCitationFootnote, getAllCitationFootnotes } from "../../word/footnoteManager";
import { formatCitation, getFormattedPreview } from "../../engine/engine";
import type { CitationContext } from "../../engine/engine";
import type { RefreshResult } from "../../word/citationRefresher";
import type { Citation, SourceType } from "../../types/citation";
import { useCitationContext } from "../context/CitationContext";
import CitationFinder from "../components/CitationFinder";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map a SourceType to a short human-readable badge label. */
export function getSourceTypeBadge(sourceType: SourceType): string {
  if (sourceType.startsWith("case.")) return "Case";
  if (sourceType.startsWith("legislation.")) return "Legislation";
  if (sourceType.startsWith("journal.")) return "Journal";
  if (sourceType.startsWith("book")) return "Book";
  if (sourceType.startsWith("report")) return "Report";
  if (sourceType.startsWith("research_paper")) return "Paper";
  if (sourceType.startsWith("foreign.")) return "Foreign";
  if (sourceType.startsWith("arbitral.")) return "Arbitral";
  if (sourceType.startsWith("un.")) return "UN";
  if (sourceType.startsWith("eu.")) return "EU";
  if (sourceType.startsWith("icj.")) return "ICJ";
  if (sourceType.startsWith("icc_tribunal.")) return "ICC";
  if (sourceType.startsWith("wto.")) return "WTO";
  if (sourceType.startsWith("gatt.")) return "GATT";
  if (sourceType.startsWith("echr.")) return "ECHR";
  if (sourceType.startsWith("supranational.")) return "Supranational";
  if (sourceType.startsWith("submission.")) return "Submission";
  if (sourceType.startsWith("evidence.")) return "Evidence";

  const labelMap: Partial<Record<SourceType, string>> = {
    treaty: "Treaty",
    thesis: "Thesis",
    speech: "Speech",
    hansard: "Hansard",
    newspaper: "Newspaper",
    dictionary: "Dictionary",
    legal_encyclopedia: "Encyclopedia",
    looseleaf: "Looseleaf",
    conference_paper: "Conference",
    press_release: "Press Release",
    correspondence: "Correspondence",
    interview: "Interview",
    film_tv_media: "Media",
    internet_material: "Internet",
    social_media: "Social Media",
    genai_output: "GenAI",
    ip_material: "IP Material",
    constitutive_document: "Constitutive",
    constitutional_convention: "Convention",
  };
  return labelMap[sourceType] ?? "Other";
}

/** Map a SourceType to the top-level category used for filtering. */
function getSourceTypeCategory(sourceType: SourceType): string {
  if (sourceType.startsWith("case.")) return "case";
  if (sourceType.startsWith("legislation.")) return "legislation";
  if (sourceType.startsWith("journal.")) return "journal";
  if (sourceType.startsWith("book")) return "book";
  if (sourceType.startsWith("report")) return "report";
  if (sourceType.startsWith("foreign.")) return "foreign";
  return "other";
}

/**
 * Extract a human-readable label from a citation based on its source type.
 * Uses party names for cases, title for legislation/books/journals, etc.
 */
export function getCitationLabel(citation: Citation): string {
  if (citation.shortTitle) return citation.shortTitle;

  const d = citation.data;

  // Cases: party names
  if (citation.sourceType.startsWith("case.")) {
    const partyA = asString(d.applicant) || asString(d.plaintiff) || asString(d.partyA);
    const partyB = asString(d.respondent) || asString(d.defendant) || asString(d.partyB);
    if (partyA && partyB) return `${partyA} v ${partyB}`;
    const caseName = asString(d.caseName) || asString(d.name);
    if (caseName) return caseName;
    if (partyA) return partyA;
  }

  // Legislation
  if (citation.sourceType.startsWith("legislation.")) {
    return asString(d.title) || asString(d.name) || "Untitled legislation";
  }

  // Journals
  if (citation.sourceType.startsWith("journal.")) {
    return asString(d.title) || asString(d.articleTitle) || "Untitled article";
  }

  // Books
  if (citation.sourceType.startsWith("book")) {
    return asString(d.title) || asString(d.bookTitle) || "Untitled book";
  }

  // Generic fallback: try common field names
  return (
    asString(d.title) ||
    asString(d.name) ||
    asString(d.caseName) ||
    `${getSourceTypeBadge(citation.sourceType)} citation`
  );
}

/** Safely coerce an unknown value to string, returning empty string for non-strings. */
function asString(val: unknown): string {
  return typeof val === "string" ? val : "";
}

// ─── Sort ───────────────────────────────────────────────────────────────────

type SortKey = "firstCited" | "sourceType" | "alphabetical" | "dateAdded";

function sortCitations(citations: Citation[], sortBy: SortKey): Citation[] {
  const sorted = [...citations];
  switch (sortBy) {
    case "firstCited":
      return sorted.sort((a, b) => {
        const fa = a.firstFootnoteNumber ?? Number.MAX_SAFE_INTEGER;
        const fb = b.firstFootnoteNumber ?? Number.MAX_SAFE_INTEGER;
        return fa - fb;
      });
    case "sourceType":
      return sorted.sort((a, b) => a.sourceType.localeCompare(b.sourceType));
    case "alphabetical":
      return sorted.sort((a, b) =>
        getCitationLabel(a).localeCompare(getCitationLabel(b)),
      );
    case "dateAdded":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return sorted;
  }
}

// ─── Filter categories ──────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "case", label: "Cases" },
  { value: "legislation", label: "Legislation" },
  { value: "journal", label: "Journals" },
  { value: "book", label: "Books" },
  { value: "report", label: "Reports" },
  { value: "foreign", label: "Foreign" },
  { value: "other", label: "Other" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "firstCited", label: "First cited" },
  { value: "sourceType", label: "Source type" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "dateAdded", label: "Date added" },
];

// ─── BibTeX Modal (A11Y: focus trap, Escape, role="dialog") ─────────────────

interface BibTeXModalProps {
  bibtexText: string;
  setBibtexText: (text: string) => void;
  bibtexImporting: boolean;
  onImport: () => void;
  onClose: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function BibTeXModal({
  bibtexText,
  setBibtexText,
  bibtexImporting,
  onImport,
  onClose,
  onFileUpload,
}: BibTeXModalProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus the modal on mount; trap focus and handle Escape
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Move focus into the modal
    const firstFocusable = modal.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !bibtexImporting) {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab") {
        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
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
  }, [bibtexImporting, onClose]);

  return (
    <div className="library-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget && !bibtexImporting) onClose();
    }}>
      <div
        className="library-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import BibTeX"
        ref={modalRef}
      >
        <h3>Import BibTeX</h3>
        <p className="library-modal-description">
          Paste BibTeX/BibLaTeX entries below, or upload a .bib file.
        </p>
        <div className="library-modal-file-row">
          <label className="library-btn library-btn--import library-file-label">
            Choose .bib file
            <input
              type="file"
              accept=".bib,.bibtex,text/plain"
              onChange={onFileUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <textarea
          className="library-bibtex-textarea"
          rows={12}
          value={bibtexText}
          onChange={(e) => setBibtexText(e.target.value)}
          aria-label="BibTeX entries"
          placeholder={"@article{smith2020,\n  author = {Smith, John},\n  title = {Example Article},\n  journal = {Example Journal},\n  year = {2020},\n  volume = {1},\n  pages = {1--10}\n}"}
        />
        <div className="library-modal-actions">
          <button
            className="library-btn library-btn--import"
            onClick={onImport}
            disabled={bibtexImporting || !bibtexText.trim()}
          >
            {bibtexImporting ? "Importing..." : "Import"}
          </button>
          <button
            className="library-btn"
            onClick={onClose}
            disabled={bibtexImporting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

const store = new CitationStore();

export default function CitationLibrary(): JSX.Element {
  const navigate = useNavigate();
  const { setSelectedCitationId, refreshCounter, triggerRefresh } = useCitationContext();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("firstCited");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [finderSignal, setFinderSignal] = useState(0);
  const [bibtexModalOpen, setBibtexModalOpen] = useState(false);
  const [bibtexText, setBibtexText] = useState("");
  const [bibtexImporting, setBibtexImporting] = useState(false);

  // Load citations on mount and when refreshCounter changes
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        await store.initStore();
        if (!cancelled) {
          setCitations(store.getAll());
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load citations";
          setError(message);
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshCounter]);

  // Filter + sort
  const filteredCitations = useMemo(() => {
    let result = citations;

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const label = getCitationLabel(c).toLowerCase();
        const shortTitle = (c.shortTitle ?? "").toLowerCase();
        const title = asString(c.data.title).toLowerCase();
        const author = asString(c.data.author).toLowerCase();
        const partyA = (
          asString(c.data.applicant) ||
          asString(c.data.plaintiff) ||
          asString(c.data.partyA)
        ).toLowerCase();
        const partyB = (
          asString(c.data.respondent) ||
          asString(c.data.defendant) ||
          asString(c.data.partyB)
        ).toLowerCase();
        return (
          label.includes(term) ||
          shortTitle.includes(term) ||
          title.includes(term) ||
          author.includes(term) ||
          partyA.includes(term) ||
          partyB.includes(term)
        );
      });
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter(
        (c) => getSourceTypeCategory(c.sourceType) === typeFilter,
      );
    }

    return sortCitations(result, sortBy);
  }, [citations, searchTerm, typeFilter, sortBy]);

  // Actions
  const handleEdit = useCallback(
    (id: string) => {
      setSelectedCitationId(id);
      navigate("/edit");
    },
    [navigate, setSelectedCitationId],
  );

  const [insertMenuId, setInsertMenuId] = useState<string | null>(null);
  const [pinpointInput, setPinpointInput] = useState("");

  const handleInsertAs = useCallback(
    async (citation: Citation, mode: "full" | "short" | "ibid" | "auto") => {
      try {
        // Scan existing footnotes to build context
        const existing = await getAllCitationFootnotes();
        const firstFn = existing.find((e) => e.citationId === citation.id);
        const totalFootnotes = existing.length;

        // Determine preceding footnote's citations
        const precedingCitations = existing.filter(
          (e) => e.footnoteIndex === totalFootnotes
        );

        const isFirst = !firstFn;
        const isSameAsPreceding =
          precedingCitations.length === 1 &&
          precedingCitations[0].citationId === citation.id;

        let runs;
        if (mode === "full" || isFirst) {
          runs = getFormattedPreview(citation);
        } else {
          const ctx: CitationContext = {
            footnoteNumber: totalFootnotes + 1,
            isFirstCitation: false,
            isSameAsPreceding: mode === "ibid" ? true : isSameAsPreceding,
            precedingFootnoteCitationCount: precedingCitations.length,
            currentPinpoint: pinpointInput
              ? { type: "page", value: pinpointInput }
              : undefined,
            firstFootnoteNumber: firstFn?.footnoteIndex ?? 1,
            isWithinSameFootnote: false,
            formatPreference: mode,
          };
          const result = formatCitation(citation, ctx);
          runs = result ?? getFormattedPreview(citation);
        }

        const title = citation.shortTitle || getCitationLabel(citation);
        await insertCitationFootnote(citation.id, title, runs);

        // Update store with firstFootnoteNumber if this is the first citation
        if (isFirst) {
          citation.firstFootnoteNumber = totalFootnotes + 1;
          await store.update(citation);
        }

        setInsertMenuId(null);
        setPinpointInput("");
        triggerRefresh();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to insert citation";
        setError(message);
        setInsertMenuId(null);
      }
    },
    [pinpointInput, triggerRefresh],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await store.remove(id);
        setCitations((prev) => prev.filter((c) => c.id !== id));
        setDeletingId(null);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete citation";
        setError(message);
        setDeletingId(null);
      }
    },
    [],
  );

  const handleImportFromWord = useCallback(async () => {
    setImporting(true);
    setImportStatus(null);
    try {
      const result = await Word.run(async (context) => {
        return importWordSources(context, store);
      });
      setCitations(store.getAll());
      setImportStatus(
        `Imported ${result.imported} source${result.imported !== 1 ? "s" : ""} (${result.skipped} skipped as duplicate${result.skipped !== 1 ? "s" : ""})`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to import sources";
      setImportStatus(`Import failed: ${message}`);
    } finally {
      setImporting(false);
    }
  }, []);

  const handleImportBibTeX = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setBibtexImporting(true);
    setImportStatus(null);
    try {
      const result = await importBibTeX(text, store);
      setCitations(store.getAll());
      setImportStatus(
        `BibTeX: imported ${result.imported} entr${result.imported !== 1 ? "ies" : "y"} (${result.skipped} skipped as duplicate${result.skipped !== 1 ? "s" : ""})`,
      );
      setBibtexModalOpen(false);
      setBibtexText("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to import BibTeX";
      setImportStatus(`BibTeX import failed: ${message}`);
    } finally {
      setBibtexImporting(false);
    }
  }, []);

  const handleBibFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          setBibtexText(content);
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    setRefreshStatus(null);
    try {
      const result: RefreshResult = await Word.run(async (context) => {
        return refreshAllCitations(context, store);
      });
      setCitations(store.getAll());
      setFinderSignal((prev) => prev + 1);
      setRefreshStatus(
        `Refreshed: ${result.updated} updated, ${result.unchanged} unchanged`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh citations";
      setRefreshStatus(`Refresh failed: ${message}`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <h2>Citation Library</h2>
        <p>Loading citations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>Citation Library</h2>
        <p style={{ color: "var(--colour-error)" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="library-panel">
      <h2>Citation Library</h2>

      {/* Citation Finder (collapsible) */}
      <CitationFinder refreshSignal={finderSignal} />

      {/* Refresh All Citations */}
      <div className="library-refresh-bar">
        <button
          className="library-btn library-btn--refresh"
          onClick={() => void handleRefreshAll()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh All Citations"}
        </button>
      </div>

      {/* Refresh status toast */}
      <div aria-live="polite" role="status">
      {refreshStatus && (
        <div className="library-toast">
          <span>{refreshStatus}</span>
          <button
            className="library-toast-dismiss"
            onClick={() => setRefreshStatus(null)}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
      </div>

      {/* Import + Summary bar */}
      <div className="library-import-bar">
        <p className="library-summary">
          {citations.length} citation{citations.length !== 1 ? "s" : ""} in
          document
        </p>
        <button
          className="library-btn library-btn--import"
          onClick={() => void handleImportFromWord()}
          disabled={importing}
        >
          {importing ? "Importing..." : "Import from Word"}
        </button>
        <button
          className="library-btn library-btn--import"
          onClick={() => setBibtexModalOpen(true)}
        >
          Import BibTeX
        </button>
      </div>

      {/* BibTeX import modal */}
      {bibtexModalOpen && (
        <BibTeXModal
          bibtexText={bibtexText}
          setBibtexText={setBibtexText}
          bibtexImporting={bibtexImporting}
          onImport={() => void handleImportBibTeX(bibtexText)}
          onClose={() => {
            setBibtexModalOpen(false);
            setBibtexText("");
          }}
          onFileUpload={handleBibFileUpload}
        />
      )}

      {/* Import status toast */}
      <div aria-live="polite" role="status">
        {importStatus && (
          <div className="library-toast">
            <span>{importStatus}</span>
            <button
              className="library-toast-dismiss"
              onClick={() => setImportStatus(null)}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        className="library-search"
        placeholder="Search by title, author, or party name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Search citations"
      />

      {/* Filter + Sort controls */}
      <div className="library-controls">
        <select
          className="library-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by source type"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="library-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort citations"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Citation list */}
      {filteredCitations.length === 0 ? (
        <p className="library-empty">
          {citations.length === 0
            ? "No citations in this document. Use Insert Citation to add your first citation."
            : "No citations match your search."}
        </p>
      ) : (
        <div className="library-list">
          {filteredCitations.map((citation) => (
            <div key={citation.id} className="library-card">
              <div className="library-card-header">
                <span className="library-card-badge">
                  {getSourceTypeBadge(citation.sourceType)}
                </span>
                {citation.firstFootnoteNumber != null && (
                  <span className="library-card-fn">
                    n {citation.firstFootnoteNumber}
                  </span>
                )}
              </div>
              <div className="library-card-title">
                {getCitationLabel(citation)}
              </div>
              <div className="library-card-date">
                Added{" "}
                {new Date(citation.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="library-card-actions">
                <button
                  className="library-btn library-btn--edit"
                  onClick={() => handleEdit(citation.id)}
                >
                  Edit
                </button>
                <button
                  className="library-btn library-btn--insert"
                  onClick={() =>
                    setInsertMenuId(
                      insertMenuId === citation.id ? null : citation.id
                    )
                  }
                >
                  Insert ▾
                </button>
                {deletingId === citation.id ? (
                  <span className="library-confirm">
                    Delete?{" "}
                    <button
                      className="library-btn library-btn--danger"
                      onClick={() => void handleDelete(citation.id)}
                    >
                      Yes
                    </button>
                    <button
                      className="library-btn"
                      onClick={() => setDeletingId(null)}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    className="library-btn library-btn--delete"
                    onClick={() => setDeletingId(citation.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
              {insertMenuId === citation.id && (
                <div className="library-insert-menu">
                  <button
                    className="library-insert-option"
                    onClick={() => void handleInsertAs(citation, "auto")}
                  >
                    Auto (full or short)
                  </button>
                  <button
                    className="library-insert-option"
                    onClick={() => void handleInsertAs(citation, "full")}
                  >
                    Full citation
                  </button>
                  <button
                    className="library-insert-option"
                    onClick={() => void handleInsertAs(citation, "short")}
                  >
                    Short reference (n {citation.firstFootnoteNumber ?? "X"})
                  </button>
                  <button
                    className="library-insert-option"
                    onClick={() => void handleInsertAs(citation, "ibid")}
                  >
                    Ibid
                  </button>
                  <div className="library-insert-pinpoint">
                    <input
                      type="text"
                      placeholder="Pinpoint (eg 42, [23])"
                      value={pinpointInput}
                      onChange={(e) => setPinpointInput(e.target.value)}
                      className="library-insert-pinpoint-input"
                      aria-label="Pinpoint reference"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
