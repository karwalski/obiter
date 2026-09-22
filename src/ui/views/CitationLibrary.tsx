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
import DuplicatesDialog from "../components/DuplicatesDialog";
import type { DuplicatesDialogCluster } from "../components/DuplicatesDialog";
import { buildDedupeKeyFromCitation, findDuplicateClusters } from "../../api/interchange/dedupe";
import type { DedupeKey, DedupeMatchKind } from "../../api/interchange/dedupe";
import { useStatus } from "../context/StatusContext";
import { listMissingRequiredFields } from "../../engine/validator";
import { getFieldsForSourceType } from "./editCitationFields";
import { formatBibliographyEntry } from "../../engine/rules/v4/general/bibliography";
import { insertCitationFootnote, getAllCitationFootnotes, deleteAllOccurrences, buildOccurrenceTitle } from "../../word/footnoteManager";
import { ignoreDuplicatePair, mergeDuplicateCitation } from "../../actions/citationService";
import { formatCitation, getFormattedPreview } from "../../engine/engine";
import type { CitationContext } from "../../engine/engine";
import type { Citation, SourceData, SourceType } from "../../types/citation";
import type { FormattedRun } from "../../types/formattedRun";
import { useCitationContext } from "../context/CitationContext";
import CitationFinder from "../components/CitationFinder";
import type { CitationStandardId } from "../../engine/standards/types";
import { getStandardConfig, buildCourtConfig } from "../../engine/standards";
import { getDevicePref } from "../../store/devicePreferences";
import { RECOVERY_VIEW_ENABLED } from "../featureFlags";
import { userTags } from "../../engine/tags";
import { pinpointFromTitleString } from "../../engine/rules/v4/general/pinpoints";
import UpdateFromSourceDialog from "../components/UpdateFromSourceDialog";
import { canUpdateFromSource } from "../../api/updateFromSource";
import type { SourceUpdateResult } from "../../api/updateFromSource";
import { writeErrorMessage } from "../../word/documentAccess";

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

/** Strongest dedupe key first, matching findDuplicateClusters. */
const MANUAL_CLUSTER_KEYS: ReadonlyArray<{ field: keyof DedupeKey; kind: DedupeMatchKind }> = [
  { field: "doi", kind: "doi" },
  { field: "isbn", kind: "isbn" },
  { field: "citeKey", kind: "cite-key" },
  { field: "legal", kind: "legal" },
  { field: "loose", kind: "loose" },
];

/**
 * ENP-003: a card-level merge reviews the citation and the others sharing its
 * short title as one cluster. The kind is the strongest key every member
 * shares; when they share none the cluster is a manual merge on the pair's
 * ids.
 */
export function buildManualCluster(members: Citation[]): DuplicatesDialogCluster {
  const ordered = [...members].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
  const keys = ordered.map(buildDedupeKeyFromCitation);
  for (const { field, kind } of MANUAL_CLUSTER_KEYS) {
    const value = keys[0]?.[field];
    if (value && keys.every((k) => k[field] === value)) {
      return { kind, key: value, members: ordered };
    }
  }
  return {
    kind: "loose",
    key: ordered.map((c) => c.id).join("+"),
    members: ordered,
    label: "Manual merge",
  };
}

/** Safely coerce an unknown value to string, returning empty string for non-strings. */
function asString(val: unknown): string {
  return typeof val === "string" ? val : "";
}

/**
 * A footnote ends with closing punctuation. `formatCitation` leaves it to
 * the refresher; the preview path this replaced added it, so the inserted
 * text is unchanged.
 */
function ensureClosingFullStop(runs: FormattedRun[]): FormattedRun[] {
  if (runs.length === 0) return runs;
  const last = runs[runs.length - 1];
  const trimmed = last.text.trimEnd();
  if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) return runs;
  return [...runs.slice(0, -1), { ...last, text: `${last.text}.` }];
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
  // ENP-001: tag filter (OR semantics across the chosen tags).
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
  // ENP-003: the Find duplicates dialog, its clusters and the element to refocus.
  const duplicatesButtonRef = useRef<HTMLButtonElement>(null);
  const [duplicateClusters, setDuplicateClusters] = useState<DuplicatesDialogCluster[] | null>(null);
  const [occurrenceCounts, setOccurrenceCounts] = useState<Record<string, number>>({});
  const [duplicatesReturnTo, setDuplicatesReturnTo] = useState<HTMLElement | null>(null);
  // ENP-007: the Update from source dialog's target and the element to refocus.
  const [updateTarget, setUpdateTarget] = useState<Citation | null>(null);
  const [updateReturnTo, setUpdateReturnTo] = useState<HTMLElement | null>(null);
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

  // ENP-001: every user tag in the library with the number of citations
  // carrying it, for the tag filter.
  const tagCounts = useMemo((): Array<{ tag: string; count: number }> => {
    const counts = new Map<string, number>();
    for (const c of citations) {
      for (const tag of userTags(Array.isArray(c.tags) ? c.tags : [])) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [citations]);

  const toggleTagFilter = useCallback((tag: string, on: boolean) => {
    setSelectedTags((prev) => {
      if (on) return prev.includes(tag) ? prev : [...prev, tag];
      return prev.filter((t) => t !== tag);
    });
  }, []);

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

    // Tag filter (ENP-001): any of the chosen tags
    if (selectedTags.length > 0) {
      result = result.filter((c) =>
        userTags(Array.isArray(c.tags) ? c.tags : []).some((t) => selectedTags.includes(t)),
      );
    }

    return sortCitations(result, sortBy);
  }, [citations, searchTerm, typeFilter, selectedTags, sortBy, needsDetailsOnly, missingFor]);

  // Actions
  const handleEdit = useCallback(
    (id: string) => {
      setSelectedCitationId(id);
      navigate("/edit");
    },
    [navigate, setSelectedCitationId],
  );

  // ENP-005: open the Edit view with the record details panel expanded.
  const handleDetails = useCallback(
    (id: string) => {
      setSelectedCitationId(id);
      navigate("/edit", { state: { citationId: id, expandDetails: true } });
    },
    [navigate, setSelectedCitationId],
  );

  // Open the Quote view with this citation preselected.
  const handleQuote = useCallback(
    (id: string) => {
      navigate("/quote", { state: { citationId: id } });
    },
    [navigate],
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
        // The typed pinpoint, parsed once: `[42]` is a paragraph, `s 5` a
        // section, a bare `42` stays a page (Rule 1.1.6).
        const pin = pinpointFromTitleString(pinpointInput);
        let runs;
        // Only force full if mode is "full" or ("auto" and first occurrence).
        // Explicit "short" and "ibid" should work even if no prior CC is found
        // (the user knows what format they want).
        if (mode === "full" || (mode === "auto" && isFirst)) {
          const ctx: CitationContext = {
            footnoteNumber: lastFootnoteNumber + 1,
            isFirstCitation: true,
            isSameAsPreceding: false,
            precedingFootnoteCitationCount: precedingCitations.length,
            currentPinpoint: pin,
            firstFootnoteNumber: lastFootnoteNumber + 1,
            isWithinSameFootnote: false,
            formatPreference: mode,
          };
          // The full first reference honours the occurrence pinpoint; the
          // closing full stop the preview path added is restored here.
          runs = ensureClosingFullStop(formatCitation(citation, ctx, courtConfig));
        } else {
          const ctx: CitationContext = {
            footnoteNumber: lastFootnoteNumber + 1,
            isFirstCitation: false,
            isSameAsPreceding: mode === "ibid" ? true : isSameAsPreceding,
            precedingFootnoteCitationCount: precedingCitations.length,
            currentPinpoint: pin,
            firstFootnoteNumber: firstFn?.footnoteIndex ?? citation.firstFootnoteNumber ?? 1,
            isWithinSameFootnote: false,
            formatPreference: mode,
          };
          const result = formatCitation(citation, ctx, courtConfig);
          runs = result ?? getFormattedPreview(citation, courtConfig);
        }

        // Encode the user's format preference and pinpoint in the CC title so
        // the refresher can preserve them across rebuild cycles.
        const ccTitle = buildOccurrenceTitle(mode, pin);
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

  // ENP-003: open the duplicates dialog over the given clusters. The footnote
  // scan is one Office.js call for the whole document (PERF: never per card).
  const openDuplicates = useCallback(
    async (clusters: DuplicatesDialogCluster[], opener: HTMLElement | null) => {
      const counts: Record<string, number> = {};
      try {
        for (const entry of await getAllCitationFootnotes()) {
          counts[entry.citationId] = (counts[entry.citationId] ?? 0) + 1;
        }
      } catch {
        // Footnote scan unavailable — the dialog still opens; counts show as 0.
      }
      setOccurrenceCounts(counts);
      setDuplicatesReturnTo(opener);
      setDuplicateClusters(clusters);
    },
    []
  );

  const handleDuplicateMerge = useCallback(
    async (
      survivorId: string,
      removedIds: string[],
      mergedData: SourceData,
      mergedTags: string[]
    ): Promise<number> => {
      const moved = await mergeDuplicateCitation(removedIds, survivorId, mergedData, mergedTags);
      // The removed entries are gone and their occurrences now resolve
      // against the survivor; reload the library from the (refreshed) store.
      setCitations((await getSharedStore()).getAll());
      triggerRefresh();
      const total = removedIds.length + 1;
      const message =
        moved > 0
          ? `Merged ${total} citations into one. ${moved} footnote${moved === 1 ? "" : "s"} updated.`
          : `Merged ${total} citations into one.`;
      setRefreshStatus(message);
      announce(message, "success");
      return moved;
    },
    [triggerRefresh, announce]
  );

  const handleDuplicateIgnore = useCallback(
    async (clusterKey: string, memberIds: string[]): Promise<void> => {
      await ignoreDuplicatePair(clusterKey, memberIds);
      setCitations((await getSharedStore()).getAll());
      triggerRefresh();
      announce("Marked as not duplicates.", "success");
    },
    [triggerRefresh, announce]
  );

  // ENP-007: the dialog's Apply writes the merged record; the document is
  // re-rendered so every footnote picks up the new values.
  const handleUpdateApplied = useCallback(
    async (
      citation: Citation,
      mergedData: SourceData,
      applied: number,
      result: SourceUpdateResult
    ): Promise<void> => {
      const updated: Citation = {
        ...citation,
        data: mergedData,
        modifiedAt: new Date().toISOString(),
      };
      try {
        await store.update(updated);
      } catch (err: unknown) {
        throw new Error(writeErrorMessage(err, "The citation could not be updated. Try again."));
      }
      setCitations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      triggerRefresh();
      const label = result.adapterLabel ?? "the source";
      const message = `Updated ${applied} field${applied === 1 ? "" : "s"} from ${label}.`;
      setRefreshStatus(message);
      announce(message, "success");
    },
    [triggerRefresh, announce]
  );

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
          ref={duplicatesButtonRef}
          className="library-btn library-btn--import"
          onClick={() =>
            void openDuplicates(findDuplicateClusters(citations), duplicatesButtonRef.current)
          }
          disabled={citations.length < 2}
          title={
            citations.length < 2
              ? "Add at least two citations to the library before checking for duplicates"
              : undefined
          }
        >
          Find duplicates
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
          hasActiveFilter={
            Boolean(searchTerm.trim()) ||
            typeFilter !== "all" ||
            selectedTags.length > 0 ||
            needsDetailsOnly
          }
          formatCitation={formatForExport}
          standardLabel={standardConfig.standardLabel}
          onClose={() => setExportOpen(false)}
          onExported={handleExported}
          returnFocusTo={exportButtonRef.current}
        />
      )}
      {duplicateClusters !== null && (
        <DuplicatesDialog
          clusters={duplicateClusters}
          formatCitation={renderCitationText}
          occurrenceCounts={occurrenceCounts}
          onMerge={handleDuplicateMerge}
          onIgnore={handleDuplicateIgnore}
          onClose={() => setDuplicateClusters(null)}
          returnFocusTo={duplicatesReturnTo}
        />
      )}
      {updateTarget !== null && (
        <UpdateFromSourceDialog
          citation={updateTarget}
          citationText={renderCitationText(updateTarget).trim().replace(/\.$/, "")}
          onApply={(mergedData, applied, result) =>
            handleUpdateApplied(updateTarget, mergedData, applied, result)
          }
          onClose={() => setUpdateTarget(null)}
          returnFocusTo={updateReturnTo}
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
        {(tagCounts.length > 0 || selectedTags.length > 0) && (
          <details className="library-tag-filter">
            <summary className="library-select library-tag-filter-summary">
              Tags{selectedTags.length > 0 ? ` (${selectedTags.length})` : ""}
            </summary>
            <fieldset className="library-tag-filter-panel">
              <legend className="obiter-visually-hidden">Filter by tag</legend>
              {tagCounts.map(({ tag, count }) => (
                <label key={tag} className="library-tag-filter-option">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={(e) => toggleTagFilter(tag, e.target.checked)}
                  />
                  {tag} ({count})
                </label>
              ))}
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  className="library-btn"
                  onClick={() => setSelectedTags([])}
                >
                  Clear tags
                </button>
              )}
            </fieldset>
          </details>
        )}
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
                const chips = userTags(Array.isArray(citation.tags) ? citation.tags : []);
                return chips.length > 0 ? (
                  <div className="library-card-tags">
                    {chips.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="library-tag-chip"
                        aria-label={`Filter by tag ${tag}`}
                        aria-pressed={selectedTags.includes(tag)}
                        onClick={() => setSelectedTags([tag])}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
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
                        <button
                          className="library-btn"
                          onClick={(e) =>
                            void openDuplicates(
                              [buildManualCluster([citation, ...candidates])],
                              e.currentTarget
                            )
                          }
                        >
                          Mark as duplicate / merge
                        </button>
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
                <button
                  className="library-btn"
                  onClick={() => handleDetails(citation.id)}
                  title="History, provenance and source links for this citation"
                >
                  Details
                </button>
                <button
                  className="library-btn"
                  onClick={() => handleQuote(citation.id)}
                  title="Insert a quotation from this source"
                >
                  Quote
                </button>
                {(() => {
                  const gate = canUpdateFromSource(citation);
                  return (
                    <button
                      className="library-btn library-btn--update-source"
                      disabled={!gate.ok}
                      title={gate.ok ? "Refetch this citation from its online source" : gate.reason}
                      onClick={(e) => {
                        setUpdateReturnTo(e.currentTarget);
                        setUpdateTarget(citation);
                      }}
                    >
                      Update from source
                    </button>
                  );
                })()}
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
