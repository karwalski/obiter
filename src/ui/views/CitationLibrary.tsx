/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CitationStore } from "../../store";
import type { StoreDiagnostics } from "../../store";
import { getSharedStore } from "../../store/singleton";
import { getWordSourcesXml } from "../../word/sourceImporter";
import ImportDialog from "../components/ImportDialog";
import ExportDialog from "../components/ExportDialog";
import { useStatus } from "../context/StatusContext";
import { listMissingRequiredFields } from "../../engine/validator";
import { getFieldsForSourceType } from "./editCitationFields";
import { formatBibliographyEntry } from "../../engine/rules/v4/general/bibliography";
import { insertCitationFootnote, getAllCitationFootnotes, deleteAllOccurrences, buildOccurrenceTitle } from "../../word/footnoteManager";
import { mergeDuplicateCitation } from "../../actions/citationService";
import { formatCitation, getFormattedPreview } from "../../engine/engine";
import type { CitationContext } from "../../engine/engine";
import type { Citation, SourceType } from "../../types/citation";
import { useCitationContext } from "../context/CitationContext";
import CitationFinder from "../components/CitationFinder";
import type { CitationStandardId } from "../../engine/standards/types";
import { getStandardConfig, buildCourtConfig } from "../../engine/standards";
import { getDevicePref } from "../../store/devicePreferences";
import { RECOVERY_VIEW_ENABLED } from "../featureFlags";

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
    "treaty.mou": "MOU",
    periodical: "Periodical",
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
    custom: "Custom",
    explanatory_note: "Note",
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

/** Get a second line of detail for the citation card. */
function getCitationDetail(citation: Citation): string {
  const d = citation.data;
  const parts: string[] = [];

  // Source type badge
  parts.push(getSourceTypeBadge(citation.sourceType));

  // Year
  const year = asString(d.year) || asString(d.date);
  if (year) parts.push(year.length > 4 ? year : `(${year})`);

  // Jurisdiction
  const jurisdiction = asString(d.jurisdiction);
  if (jurisdiction) parts.push(jurisdiction);

  // Author (if not already in the label)
  const author = asString(d.author) ?? asString(d.institutionalAuthor) ?? asString(d.speaker) ?? asString(d.issuingBody);
  if (author && author !== citation.shortTitle) parts.push(author);

  // Court
  const court = asString(d.court) ?? asString(d.courtId);
  if (court) parts.push(court);

  // Report series / journal
  const series = asString(d.reportSeries) ?? asString(d.journal);
  if (series) parts.push(series);

  return parts.filter(Boolean).join(" · ");
}

/**
 * Check if a short title is duplicated across citations and suggest disambiguation.
 * Per AGLC4 Rule 1.4.4, when two sources share the same short title, add the year
 * or other distinguishing information.
 */
function getDisambiguatedShortTitle(citation: Citation, allCitations: Citation[]): string | null {
  const shortTitle = citation.shortTitle;
  if (!shortTitle) return null;

  const duplicates = allCitations.filter(
    (c) => c.id !== citation.id && c.shortTitle === shortTitle
  );
  if (duplicates.length === 0) return null;

  // Suggest adding year to disambiguate
  const year = asString(citation.data.year);
  if (year) return `${shortTitle} (${year})`;

  return `${shortTitle} [${citation.id.slice(0, 4)}]`;
}

/**
 * Other citations that share this one's short title — the candidate originals a
 * duplicate can be merged into. Sorted so the earliest-cited appears first (the
 * natural "original").
 */
function getShortTitleDuplicates(citation: Citation, allCitations: Citation[]): Citation[] {
  const shortTitle = citation.shortTitle;
  if (!shortTitle) return [];
  return allCitations
    .filter((c) => c.id !== citation.id && c.shortTitle === shortTitle)
    .sort(
      (a, b) =>
        (a.firstFootnoteNumber ?? Number.MAX_SAFE_INTEGER) -
        (b.firstFootnoteNumber ?? Number.MAX_SAFE_INTEGER)
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

// ─── Component ──────────────────────────────────────────────────────────────

let store: InstanceType<typeof CitationStore>;

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
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [finderSignal] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [needsDetailsOnly, setNeedsDetailsOnly] = useState(false);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const { announce } = useStatus();
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");

  // Clear-all / clear-unused state
  const [clearMode, setClearMode] = useState<"all" | "unused" | null>(null);
  const [clearing, setClearing] = useState(false);

  // BUG-003: store health diagnostics + orphaned-control detection
  const [storeDiagnostics, setStoreDiagnostics] = useState<StoreDiagnostics | null>(null);
  const [orphanControlCount, setOrphanControlCount] = useState<number>(0);
  const [detailsCopied, setDetailsCopied] = useState(false);

  const standardConfig = getStandardConfig(standardId);

  // INTEROP-014: imported citations still missing required fields, labelled
  // with the Edit form's field names.
  const missingFor = useCallback((citation: Citation): string[] => {
    if (!citation.tags.includes("import")) return [];
    const missing = listMissingRequiredFields(citation.sourceType, citation.data);
    if (missing.length === 0) return [];
    const fields = getFieldsForSourceType(citation.sourceType);
    return missing.map((key) => fields.find((f) => f.key === key)?.label ?? key);
  }, []);

  // Load citations on mount and when refreshCounter changes.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        store = await getSharedStore();
        if (!cancelled) {
          const all = store.getAll();
          setCitations(all);
          setStandardId(store.getStandardId());
          setStoreDiagnostics(store.getDiagnostics());
          setLoading(false);

          // BUG-003: an empty library with Obiter content controls still in
          // the document means the library has come unlinked — never present
          // that as a plain "no citations" state.
          if (all.length === 0) {
            try {
              const entries = await getAllCitationFootnotes();
              if (!cancelled) setOrphanControlCount(entries.length);
            } catch {
              // Footnote scan unavailable — leave the count at 0.
            }
          } else {
            setOrphanControlCount(0);
          }
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

    // Needs details (INTEROP-014): imported citations missing required fields
    if (needsDetailsOnly) {
      result = result.filter((c) => missingFor(c).length > 0);
    }

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
  }, [citations, searchTerm, typeFilter, sortBy, needsDetailsOnly, missingFor]);

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
      setInsertingId(citation.id);
      try {
        // Scan existing footnotes to build context
        const existing = await getAllCitationFootnotes();
        const firstFn = existing.find((e) => e.citationId === citation.id);
        // Get the actual last footnote number (max footnoteIndex), not the entry count
        const lastFootnoteNumber = existing.length > 0
          ? Math.max(...existing.map((e) => e.footnoteIndex))
          : 0;

        // Determine preceding footnote's citations (the last footnote before the new one)
        const precedingCitations = existing.filter(
          (e) => e.footnoteIndex === lastFootnoteNumber
        );

        const isFirst = !firstFn;
        const isSameAsPreceding =
          precedingCitations.length === 1 &&
          precedingCitations[0].citationId === citation.id;

        const courtToggles =
          (await getSharedStore()).getCourtToggles() ??
          (getDevicePref("courtToggles") as Record<string, string> | undefined);
        const courtConfig = buildCourtConfig(getStandardConfig(standardId), courtToggles);
        let runs;
        // Only force full if mode is "full" or ("auto" and first occurrence).
        // Explicit "short" and "ibid" should work even if no prior CC is found
        // (the user knows what format they want).
        if (mode === "full" || (mode === "auto" && isFirst)) {
          runs = getFormattedPreview(citation, courtConfig);
        } else {
          const ctx: CitationContext = {
            footnoteNumber: lastFootnoteNumber + 1,
            isFirstCitation: false,
            isSameAsPreceding: mode === "ibid" ? true : isSameAsPreceding,
            precedingFootnoteCitationCount: precedingCitations.length,
            currentPinpoint: pinpointInput
              ? { type: "page", value: pinpointInput }
              : undefined,
            firstFootnoteNumber: firstFn?.footnoteIndex ?? citation.firstFootnoteNumber ?? 1,
            isWithinSameFootnote: false,
            formatPreference: mode,
          };
          const result = formatCitation(citation, ctx, courtConfig);
          runs = result ?? getFormattedPreview(citation, courtConfig);
        }

        // Encode the user's format preference and pinpoint in the CC title so
        // the refresher can preserve them across rebuild cycles.
        const ccTitle = buildOccurrenceTitle(mode, pinpointInput || undefined);
        await insertCitationFootnote(citation.id, ccTitle, runs);

        // Update store with firstFootnoteNumber if this is the first citation
        if (isFirst) {
          citation.firstFootnoteNumber = lastFootnoteNumber + 1;
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
      } finally {
        setInsertingId(null);
      }
    },
    [pinpointInput, triggerRefresh, standardId],
  );

  const [deleteLoading, setDeleteLoading] = useState(false);

  // Merge-duplicate UI: which card's "merge into…" chooser is open, and busy state.
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);

  const handleMerge = useCallback(async (duplicateId: string, targetId: string) => {
    if (mergeLoading) return;
    setMergeLoading(true);
    setError(null);
    try {
      const moved = await mergeDuplicateCitation(duplicateId, targetId);
      // The duplicate entry is gone and occurrences now resolve against the
      // target; reload the library from the (refreshed) store.
      const fresh = (await getSharedStore()).getAll();
      setCitations(fresh);
      setMergingId(null);
      setRefreshStatus(
        moved > 0
          ? `Merged duplicate into the original — ${moved} reference${moved === 1 ? "" : "s"} updated.`
          : "Merged duplicate into the original."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to merge the duplicate citation.");
      setMergingId(null);
    } finally {
      setMergeLoading(false);
    }
  }, [mergeLoading]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (deleteLoading) return; // guard against double-click
      setDeleteLoading(true);
      try {
        // FN-004: Remove all child CCs from footnotes before removing from store.
        const allEntries = await getAllCitationFootnotes();
        const matching = allEntries.filter((e) => e.citationId === id);

        // Batch all footnote deletions into a single Word.run()
        await deleteAllOccurrences(id, matching.map((e) => e.footnoteIndex));

        await store.remove(id);
        setCitations((prev) => prev.filter((c) => c.id !== id));
        setDeletingId(null);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete citation";
        setError(message);
        setDeletingId(null);
      } finally {
        setDeleteLoading(false);
      }
    },
    [deleteLoading],
  );

  const handleClearLibrary = useCallback(
    async (mode: "all" | "unused") => {
      setClearing(true);
      setImportStatus(null);
      try {
        const allEntries = await getAllCitationFootnotes();
        const usedIds = new Set(allEntries.map((e) => e.citationId));

        const targets = store.getAll().filter((c) => {
          if (mode === "all") return true;
          return !usedIds.has(c.id);
        });

        for (const citation of targets) {
          const matchingIndices = allEntries
            .filter((e) => e.citationId === citation.id)
            .map((e) => e.footnoteIndex);
          if (matchingIndices.length > 0) {
            await deleteAllOccurrences(citation.id, matchingIndices);
          }
          await store.remove(citation.id);
        }

        setCitations(store.getAll());
        setClearMode(null);
        const noun = targets.length === 1 ? "citation" : "citations";
        setImportStatus(
          mode === "all"
            ? `Cleared ${targets.length} ${noun} from the library.`
            : `Cleared ${targets.length} unused ${noun} from the library.`,
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to clear citations";
        setImportStatus(`Clear failed: ${message}`);
      } finally {
        setClearing(false);
      }
    },
    [],
  );

  // BUG-003: diagnostic details for field reports (copy-to-clipboard)
  const buildDiagnosticDetails = useCallback((): string => {
    const d = storeDiagnostics;
    return [
      "Obiter citation store diagnostics",
      `Time: ${new Date().toISOString()}`,
      `Status: ${d?.status ?? "unknown"}`,
      `Store parts found: ${d?.partsFound ?? 0} (readable ${d?.readableParts ?? 0}, unreadable ${d?.unreadableParts ?? 0})`,
      `Selected part: ${d?.selectedPartId ?? "none"}`,
      `Citations in library: ${citations.length}`,
      `Citations merged from duplicate parts: ${d?.mergedFromDuplicates ?? 0}`,
      `Obiter content controls found in footnotes: ${orphanControlCount}`,
      `Detail: ${d?.detail ?? "none"}`,
    ].join("\n");
  }, [storeDiagnostics, citations.length, orphanControlCount]);

  const handleCopyDiagnostics = useCallback(async () => {
    const text = buildDiagnosticDetails();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable in this webview — textarea fallback.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setDetailsCopied(true);
    window.setTimeout(() => setDetailsCopied(false), 2000);
  }, [buildDiagnosticDetails]);

  // ── Interchange (INTEROP-012/013/014) ──────────────────────────────────

  const courtConfigForPreview = useCallback(() => {
    const courtToggles =
      store?.getCourtToggles() ?? (getDevicePref("courtToggles") as Record<string, string> | undefined);
    return buildCourtConfig(getStandardConfig(standardId), courtToggles);
  }, [standardId]);

  const renderCitationText = useCallback(
    (citation: Citation): string =>
      getFormattedPreview(citation, courtConfigForPreview())
        .map((r) => r.text)
        .join(""),
    [courtConfigForPreview]
  );

  const formatForExport = useCallback(
    (citation: Citation): { footnote: string; bibliography?: string } => {
      const footnote = renderCitationText(citation);
      let bibliography: string | undefined;
      try {
        bibliography = formatBibliographyEntry(citation)
          .map((r) => r.text)
          .join("");
      } catch {
        bibliography = undefined;
      }
      return { footnote, bibliography };
    },
    [renderCitationText]
  );

  const readWordSources = useCallback(
    () => Word.run(async (context) => getWordSourcesXml(context)),
    []
  );


  const needsDetailsCount = useMemo(
    () => citations.filter((c) => missingFor(c).length > 0).length,
    [citations, missingFor]
  );

  const handleImported = useCallback(
    (result: { added: number; updated: number; skippedDuplicates: number; incompleteIds: string[]; formats: string[] }) => {
      setImportOpen(false);
      setCitations(store.getAll());
      triggerRefresh();
      const parts: string[] = [];
      const label = result.formats.length > 0 ? ` from ${result.formats.join(", ")}` : "";
      parts.push(`Added ${result.added} citation${result.added === 1 ? "" : "s"}${label}.`);
      if (result.updated > 0) parts.push(`${result.updated} updated.`);
      if (result.skippedDuplicates > 0) parts.push(`${result.skippedDuplicates} skipped as already in library.`);
      const message = parts.join(" ");
      setImportStatus(message);
      setReviewIds(result.incompleteIds);
      announce(message, "success");
    },
    [triggerRefresh, announce]
  );

  const handleExported = useCallback(
    (message: string) => {
      setExportOpen(false);
      setImportStatus(message);
      announce(message, "success");
    },
    [announce]
  );

  const toggleSelected = useCallback((id: string, on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    // Prune selections for citations that no longer exist.
    setSelectedIds((prev) => {
      const ids = new Set(citations.map((c) => c.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [citations]);

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

      {/* Citation Finder (collapsible) — scan document for all citations */}
      <CitationFinder refreshSignal={finderSignal} />

      {/* BUG-003: store health diagnostics — never present an empty library
          silently while a store part or Obiter content controls exist. */}
      {(storeDiagnostics?.status === "unreadable" ||
        storeDiagnostics?.status === "recovered" ||
        (citations.length === 0 && orphanControlCount > 0)) && (
        <div
          className="library-toast"
          role={storeDiagnostics?.status === "recovered" && citations.length > 0 ? "status" : "alert"}
        >
          <div>
            {storeDiagnostics?.status === "unreadable" ? (
              <span>
                Citation store found but unreadable. The stored citation data is still in this
                document and has not been deleted. Use Scan &amp; Repair to rebuild the library
                from the document, or copy the details below and report the issue. Avoid
                clearing the library until the store is repaired.
              </span>
            ) : citations.length === 0 && orphanControlCount > 0 ? (
              <span>
                The library is empty, but {orphanControlCount} Obiter citation
                {orphanControlCount !== 1 ? " markers were" : " marker was"} found in the
                document&apos;s footnotes. The library appears to have become unlinked from the
                document. Use Scan &amp; Repair to rebuild it, or copy the details below and
                report the issue.
              </span>
            ) : (
              <span>
                Duplicate citation store parts were detected and recovered
                {storeDiagnostics && storeDiagnostics.mergedFromDuplicates > 0
                  ? ` (${storeDiagnostics.mergedFromDuplicates} citation${storeDiagnostics.mergedFromDuplicates !== 1 ? "s" : ""} merged)`
                  : ""}
                . Please review the library for completeness.
              </span>
            )}
            <button
              className="library-btn library-btn--insert"
              style={{ marginLeft: 8 }}
              onClick={() => navigate("/scan-repair")}
            >
              Scan &amp; Repair
            </button>
            <button
              className="library-btn"
              style={{ marginLeft: 8 }}
              onClick={() => void handleCopyDiagnostics()}
            >
              {detailsCopied ? "Copied" : "Copy details"}
            </button>
            {/* SAFE-006: entry point to the Recovery view (SAFE-005). Hidden
                behind the feature flag until that story adds the route. */}
            {RECOVERY_VIEW_ENABLED && (
              <button
                className="library-btn"
                style={{ marginLeft: 8 }}
                onClick={() => navigate("/recovery")}
              >
                Open Recovery
              </button>
            )}
          </div>
        </div>
      )}

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
          ref={importButtonRef}
          className="library-btn library-btn--import"
          onClick={() => setImportOpen(true)}
        >
          Import
        </button>
        <button
          ref={exportButtonRef}
          className="library-btn library-btn--import"
          onClick={() => setExportOpen(true)}
          disabled={citations.length === 0}
          title={citations.length === 0 ? "Add citations to the library before exporting" : undefined}
        >
          Export
        </button>
        <button
          className="library-btn library-btn--import"
          onClick={() => navigate("/scan-repair")}
          title="Deep scan of body, footnotes and endnotes: relink Obiter citation markers, rebuild lost library entries and adopt plain-text citations"
        >
          Scan &amp; Repair
        </button>
        {citations.length > 0 && (
          <>
            <button
              className="library-btn library-btn--delete"
              onClick={() => setClearMode("unused")}
              disabled={clearing}
            >
              Clear unused
            </button>
            <button
              className="library-btn library-btn--danger"
              onClick={() => setClearMode("all")}
              disabled={clearing}
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Clear-library confirmation */}
      {clearMode !== null && (
        <div className="library-toast" role="alertdialog" aria-modal="true">
          <span>
            {clearMode === "all"
              ? `Remove all ${citations.length} citation${citations.length !== 1 ? "s" : ""} from the library and document?`
              : (() => {
                  // Count of unused citations is computed when the user confirms,
                  // but show an approximate prompt here.
                  return "Remove all citations not currently used in any footnote?";
                })()}
          </span>
          <button
            className="library-btn library-btn--danger"
            onClick={() => void handleClearLibrary(clearMode)}
            disabled={clearing}
            style={{ marginLeft: 8 }}
          >
            {clearing ? "Clearing..." : "Yes, clear"}
          </button>
          <button
            className="library-btn"
            onClick={() => setClearMode(null)}
            disabled={clearing}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Import and Export dialogs (INTEROP-012/013) */}
      {importOpen && (
        <ImportDialog
          store={store}
          renderCitation={renderCitationText}
          readWordSources={readWordSources}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
          returnFocusTo={importButtonRef.current}
        />
      )}
      {exportOpen && (
        <ExportDialog
          all={citations}
          selected={citations.filter((c) => selectedIds.has(c.id))}
          shown={filteredCitations}
          hasActiveFilter={Boolean(searchTerm.trim()) || typeFilter !== "all" || needsDetailsOnly}
          formatCitation={formatForExport}
          standardLabel={standardConfig.standardLabel}
          onClose={() => setExportOpen(false)}
          onExported={handleExported}
          returnFocusTo={exportButtonRef.current}
        />
      )}

      {/* Import status toast */}
      <div aria-live="polite" role="status">
        {importStatus && (
          <div className="library-toast">
            <span>{importStatus}</span>
            {reviewIds.length > 0 && (
              <button
                className="library-btn"
                onClick={() => {
                  setNeedsDetailsOnly(true);
                  setReviewIds([]);
                }}
              >
                Review {reviewIds.length} needing details
              </button>
            )}
            <button
              className="library-toast-dismiss"
              onClick={() => {
                setImportStatus(null);
                setReviewIds([]);
              }}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Selection and review controls (INTEROP-013/014) */}
      {citations.length > 0 && (
        <div className="library-selection-bar">
          <label>
            <input
              type="checkbox"
              className="library-card-select"
              aria-label="Select all shown citations"
              checked={filteredCitations.length > 0 && filteredCitations.every((c) => selectedIds.has(c.id))}
              ref={(el) => {
                if (el) {
                  const some = filteredCitations.some((c) => selectedIds.has(c.id));
                  const all = filteredCitations.every((c) => selectedIds.has(c.id));
                  el.indeterminate = some && !all;
                }
              }}
              onChange={(e) => {
                const on = e.target.checked;
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  for (const c of filteredCitations) {
                    if (on) next.add(c.id);
                    else next.delete(c.id);
                  }
                  return next;
                });
              }}
            />
            Select all shown
          </label>
          {selectedIds.size > 0 && (
            <>
              <span role="status">{selectedIds.size} selected</span>
              <button className="library-btn" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </button>
            </>
          )}
          {needsDetailsCount > 0 && (
            <button
              className="library-btn"
              aria-pressed={needsDetailsOnly}
              onClick={() => setNeedsDetailsOnly((v) => !v)}
            >
              Needs details ({needsDetailsCount})
            </button>
          )}
        </div>
      )}

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
        <div className="library-empty">
          <p>
            {citations.length === 0
              ? orphanControlCount > 0 || storeDiagnostics?.status === "unreadable"
                ? "The citation library could not be loaded normally. See the notice above for details."
                : "No citations in this document. Use Insert Citation to add your first citation."
              : "No citations match your search."}
          </p>
          {citations.length === 0 &&
            orphanControlCount === 0 &&
            storeDiagnostics?.status !== "unreadable" && (
              <p style={{ fontSize: "var(--text-min)", color: "var(--colour-text-secondary)" }}>
                Working on a document with existing footnotes? Run{" "}
                <button
                  className="library-btn"
                  onClick={() => navigate("/scan-repair")}
                >
                  Scan &amp; Repair
                </button>{" "}
                to find citations already in the document and adopt them into the library.
              </p>
            )}
        </div>
      ) : (
        <div className="library-list">
          {filteredCitations.map((citation) => (
            <div
              key={citation.id}
              className={`library-card${selectedIds.has(citation.id) ? " library-card--selected" : ""}`}
            >
              <div className="library-card-header">
                <input
                  type="checkbox"
                  className="library-card-select"
                  checked={selectedIds.has(citation.id)}
                  onChange={(e) => toggleSelected(citation.id, e.target.checked)}
                  aria-label={`Select ${getCitationLabel(citation)}`}
                />
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
              <div style={{ fontSize: "var(--text-min)", color: "var(--colour-text-secondary)", margin: "2px 0" }}>
                {getCitationDetail(citation)}
              </div>
              {(() => {
                const missing = missingFor(citation);
                return missing.length > 0 ? (
                  <div className="library-needs-details">Needs details: {missing.join(", ")}</div>
                ) : null;
              })()}
              {(() => {
                const dup = getDisambiguatedShortTitle(citation, citations);
                if (!dup) return null;
                const candidates = getShortTitleDuplicates(citation, citations);
                return (
                  <div style={{ fontSize: "var(--text-min)", color: "var(--colour-warning, #f59e0b)", margin: "2px 0" }}>
                    Duplicate short title — consider: {dup}
                    {candidates.length > 0 && (
                      <div style={{ marginTop: 3 }}>
                        {mergingId === citation.id ? (
                          <div>
                            <div style={{ color: "var(--colour-text-secondary)", marginBottom: 2 }}>
                              {mergeLoading
                                ? "Merging…"
                                : "Merge this into (its references become ibid / short / (n X)):"}
                            </div>
                            {!mergeLoading &&
                              candidates.map((target) => (
                                <button
                                  key={target.id}
                                  className="library-btn"
                                  style={{ marginRight: 4, marginBottom: 2 }}
                                  onClick={() => void handleMerge(citation.id, target.id)}
                                >
                                  {getCitationLabel(target)}
                                  {target.firstFootnoteNumber != null
                                    ? ` (n ${target.firstFootnoteNumber})`
                                    : ""}
                                </button>
                              ))}
                            {!mergeLoading && (
                              <button className="library-btn" onClick={() => setMergingId(null)}>
                                Cancel
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            className="library-btn"
                            onClick={() => setMergingId(citation.id)}
                            disabled={mergeLoading}
                          >
                            Mark as duplicate / merge
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
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
                    {deleteLoading ? (
                      <span className="library-btn library-btn--danger" style={{ opacity: 0.6 }}>
                        Deleting...
                      </span>
                    ) : (
                      <>
                        Delete?{" "}
                        <button
                          className="library-btn library-btn--danger"
                          onClick={() => void handleDelete(citation.id)}
                          disabled={deleteLoading}
                        >
                          Yes
                        </button>
                        <button
                          className="library-btn"
                          onClick={() => setDeletingId(null)}
                          disabled={deleteLoading}
                        >
                          No
                        </button>
                      </>
                    )}
                  </span>
                ) : (
                  <button
                    className="library-btn library-btn--delete"
                    onClick={() => setDeletingId(citation.id)}
                    disabled={deleteLoading}
                  >
                    Delete
                  </button>
                )}
              </div>
              {insertMenuId === citation.id && (
                <div className="library-insert-menu">
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
                  {insertingId === citation.id && (
                    <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", padding: "4px 0", textAlign: "center" }}>
                      Inserting...
                    </p>
                  )}
                  <button
                    className="library-insert-option"
                    disabled={insertingId !== null}
                    onClick={() => void handleInsertAs(citation, "auto")}
                  >
                    {insertingId === citation.id ? "Inserting..." : "Auto (full or short)"}
                  </button>
                  <button
                    className="library-insert-option"
                    disabled={insertingId !== null}
                    onClick={() => void handleInsertAs(citation, "full")}
                  >
                    Full citation
                  </button>
                  <button
                    className="library-insert-option"
                    disabled={insertingId !== null}
                    onClick={() => void handleInsertAs(citation, "short")}
                  >
                    {standardConfig.subsequentReferenceFormat === "above n"
                      ? `Short reference (above n ${citation.firstFootnoteNumber ?? "X"})`
                      : `Short reference (n ${citation.firstFootnoteNumber ?? "X"})`}
                  </button>
                  {standardConfig.ibidEnabled && (
                    <button
                      className="library-insert-option"
                      disabled={insertingId !== null}
                      onClick={() => void handleInsertAs(citation, "ibid")}
                    >
                      Ibid
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
