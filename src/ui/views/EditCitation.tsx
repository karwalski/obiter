/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCitationContext } from "../context/CitationContext";
import { getSharedStore, resetSharedStore } from "../../store/singleton";
import type { CitationStandardId } from "../../engine/standards/types";
import { getStandardConfig, buildCourtConfig } from "../../engine/standards";
import { getDevicePref } from "../../store/devicePreferences";
import { Citation, SourceType, SourceData, INTRODUCTORY_SIGNALS, IntroductorySignal } from "../../types/citation";
import {
  updateCitationContent,
  deleteCitationFootnote,
  getAllCitationFootnotes,
  appendToFootnoteByIndex,
} from "../../word/footnoteManager";
import type { CitationFootnoteEntry } from "../../word/footnoteManager";
import { getCitationLabel } from "./CitationLibrary";
import { getFormattedPreview } from "../../engine/engine";
import type { FormattedRun } from "../../types/formattedRun";
import CitationPreview from "../components/CitationPreview";

// ─── Format Preference ───────────────────────────────────────────────────────

type FormatPreference = "auto" | "full" | "short" | "ibid";

// ─── Source Type Display Labels ──────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  "case.reported": "Reported Case",
  "case.unreported.mnc": "Unreported Case (MNC)",
  "case.unreported.no_mnc": "Unreported Case (No MNC)",
  "case.proceeding": "Court Proceeding",
  "case.court_order": "Court Order",
  "case.quasi_judicial": "Quasi-Judicial Decision",
  "case.arbitration": "Arbitration",
  "case.transcript": "Transcript of Proceedings",
  "case.submission": "Court Submission",
  "legislation.statute": "Statute",
  "legislation.bill": "Bill",
  "legislation.delegated": "Delegated Legislation",
  "legislation.constitution": "Constitution",
  "legislation.explanatory": "Explanatory Memorandum",
  "legislation.quasi": "Quasi-Legislative Material",
  "journal.article": "Journal Article",
  "journal.online": "Online Journal Article",
  "journal.forthcoming": "Forthcoming Article",
  book: "Book",
  "book.chapter": "Book Chapter",
  "book.translated": "Translated Book",
  "book.audiobook": "Audiobook",
  "book.ebook": "Ebook",
  report: "Report",
  "report.parliamentary": "Parliamentary Report",
  "report.royal_commission": "Royal Commission Report",
  "report.law_reform": "Law Reform Report",
  "report.waitangi_tribunal": "Waitangi Tribunal Report",
  "report.abs": "ABS Report",
  research_paper: "Research Paper",
  "research_paper.parliamentary": "Parliamentary Research Paper",
  conference_paper: "Conference Paper",
  thesis: "Thesis",
  speech: "Speech",
  press_release: "Press Release",
  hansard: "Hansard",
  "submission.government": "Government Submission",
  "evidence.parliamentary": "Parliamentary Evidence",
  constitutional_convention: "Constitutional Convention",
  dictionary: "Dictionary",
  legal_encyclopedia: "Legal Encyclopedia",
  looseleaf: "Looseleaf Service",
  ip_material: "Intellectual Property Material",
  constitutive_document: "Constitutive Document",
  periodical: "Periodical / Magazine",
  newspaper: "Newspaper Article",
  correspondence: "Correspondence",
  interview: "Interview",
  film_tv_media: "Film / TV / Media",
  internet_material: "Internet Material",
  social_media: "Social Media",
  genai_output: "Generative AI Output",
  treaty: "Treaty",
  "treaty.mou": "Memorandum of Understanding",
  "un.document": "UN Document",
  "un.communication": "UN Communication",
  "un.yearbook": "UN Yearbook",
  "icj.decision": "ICJ Decision",
  "icj.pleading": "ICJ Pleading",
  "arbitral.state_state": "State-State Arbitration",
  "arbitral.individual_state": "Individual-State Arbitration",
  "icc_tribunal.case": "ICC Tribunal Case",
  "wto.document": "WTO Document",
  "wto.decision": "WTO Decision",
  "gatt.document": "GATT Document",
  "eu.official_journal": "EU Official Journal",
  "eu.court": "EU Court Decision",
  "echr.decision": "ECHR Decision",
  "supranational.decision": "Supranational Decision",
  "supranational.document": "Supranational Document",
  "foreign.canada": "Canadian Source",
  "foreign.china": "Chinese Source",
  "foreign.france": "French Source",
  "foreign.germany": "German Source",
  "foreign.hong_kong": "Hong Kong Source",
  "foreign.malaysia": "Malaysian Source",
  "foreign.new_zealand": "New Zealand Source",
  "foreign.singapore": "Singaporean Source",
  "foreign.south_africa": "South African Source",
  "foreign.uk": "United Kingdom Source",
  "foreign.usa": "United States Source",
  "foreign.other": "Other Foreign Source",
  custom: "Custom / Manual Citation",
  explanatory_note: "Explanatory Note",
};

// ─── Field Definitions Per Source Type ────────────────────────────────────────

interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "checkbox";
}

/**
 * Returns field definitions for a given source type. These mirror the Insert
 * view layout — each source type shows only the fields relevant to it.
 */
function getFieldsForSourceType(sourceType: SourceType): FieldDefinition[] {
  switch (sourceType) {
    case "case.reported":
      return [
        { key: "caseName", label: "Case Name", required: true, placeholder: "Smith v Jones" },
        { key: "year", label: "Year", required: true, placeholder: "2024" },
        { key: "yearType", label: "Year Brackets", placeholder: "round or square" },
        { key: "volume", label: "Volume", placeholder: "123" },
        { key: "reportSeries", label: "Report Series", required: true, placeholder: "CLR" },
        { key: "startingPage", label: "Starting Page", required: true, placeholder: "1" },
        { key: "pinpoint", label: "Pinpoint", placeholder: "42" },
        { key: "court", label: "Court", placeholder: "HCA" },
      ];
    case "case.unreported.mnc":
      return [
        { key: "caseName", label: "Case Name", required: true },
        { key: "year", label: "Year", required: true },
        { key: "court", label: "Court", required: true },
        { key: "judgmentNumber", label: "Judgment Number", required: true },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "case.unreported.no_mnc":
      return [
        { key: "caseName", label: "Case Name", required: true },
        { key: "court", label: "Court", required: true },
        { key: "judgeName", label: "Judge", required: true },
        { key: "date", label: "Date", required: true },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "legislation.statute":
      return [
        { key: "title", label: "Title", required: true, placeholder: "Competition and Consumer Act" },
        { key: "year", label: "Year", required: true, placeholder: "2010" },
        { key: "jurisdiction", label: "Jurisdiction", required: true, placeholder: "Cth" },
        { key: "pinpoint", label: "Pinpoint", placeholder: "s 52" },
      ];
    case "legislation.bill":
      return [
        { key: "title", label: "Title", required: true },
        { key: "year", label: "Year", required: true },
        { key: "jurisdiction", label: "Jurisdiction", required: true },
        { key: "chamber", label: "Chamber" },
      ];
    case "legislation.delegated":
      return [
        { key: "title", label: "Title", required: true },
        { key: "year", label: "Year", required: true },
        { key: "jurisdiction", label: "Jurisdiction", required: true },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "legislation.constitution":
      return [
        { key: "jurisdiction", label: "Jurisdiction", required: true, placeholder: "Cth" },
        { key: "pinpoint", label: "Pinpoint", required: true, placeholder: "s 51(i)" },
      ];
    case "journal.article":
      return [
        { key: "author", label: "Author", required: true, placeholder: "Jane Smith" },
        { key: "title", label: "Article Title", required: true },
        { key: "year", label: "Year", required: true },
        { key: "volume", label: "Volume", required: true },
        { key: "journalName", label: "Journal Name", required: true },
        { key: "startingPage", label: "Starting Page", required: true },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "book":
      return [
        { key: "author", label: "Author", required: true },
        { key: "title", label: "Title", required: true },
        { key: "publisher", label: "Publisher", required: true },
        { key: "edition", label: "Edition" },
        { key: "year", label: "Year", required: true },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "book.chapter":
      return [
        { key: "author", label: "Chapter Author", required: true },
        { key: "chapterTitle", label: "Chapter Title", required: true },
        { key: "editor", label: "Editor", required: true },
        { key: "bookTitle", label: "Book Title", required: true },
        { key: "publisher", label: "Publisher", required: true },
        { key: "edition", label: "Edition" },
        { key: "year", label: "Year", required: true },
        { key: "startingPage", label: "Starting Page", required: true },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "film_tv_media":
      return [
        { key: "title", label: "Title", required: true },
        { key: "director", label: "Director" },
        { key: "productionCompany", label: "Production Company" },
        { key: "year", label: "Year" },
        { key: "medium", label: "Medium" },
        { key: "episodeTitle", label: "Episode Title" },
        { key: "seriesTitle", label: "Series Title" },
        { key: "seasonNumber", label: "Season" },
        { key: "episodeNumber", label: "Episode" },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "internet_material":
      return [
        { key: "author", label: "Author" },
        { key: "title", label: "Title", required: true },
        { key: "webPage", label: "Web Page / Site" },
        { key: "date", label: "Date" },
        { key: "url", label: "URL", required: true },
      ];
    case "newspaper":
      return [
        { key: "author", label: "Author" },
        { key: "title", label: "Article Title", required: true },
        { key: "newspaper", label: "Newspaper", required: true },
        { key: "date", label: "Date", required: true },
        { key: "startingPage", label: "Starting Page" },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "book.ebook":
      return [
        { key: "author", label: "Author", required: true },
        { key: "title", label: "Title", required: true },
        { key: "publisher", label: "Publisher", required: true },
        { key: "edition", label: "Edition" },
        { key: "year", label: "Year", required: true },
        { key: "platform", label: "Platform", placeholder: "e.g. Kindle, Google Books" },
        { key: "url", label: "URL" },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "periodical":
      return [
        { key: "author", label: "Author" },
        { key: "title", label: "Article Title", required: true },
        { key: "periodicalName", label: "Periodical Name", required: true },
        { key: "datePeriod", label: "Date/Period", placeholder: "e.g. Spring 2024, March 2024" },
        { key: "volume", label: "Volume" },
        { key: "issue", label: "Issue" },
        { key: "page", label: "Page" },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    case "treaty.mou":
      return [
        { key: "title", label: "Title", required: true },
        { key: "parties", label: "Parties" },
        { key: "signedDate", label: "Date Signed" },
        { key: "pinpoint", label: "Pinpoint" },
        { key: "url", label: "URL" },
      ];
    case "treaty":
      return [
        { key: "title", label: "Title", required: true },
        { key: "openedDate", label: "Date Opened for Signature", required: true },
        { key: "treatySeries", label: "Treaty Series", required: true },
        { key: "seriesVolume", label: "Series Volume" },
        { key: "startingPage", label: "Starting Page" },
        { key: "entryIntoForceDate", label: "Entry into Force Date" },
        { key: "notYetInForce", label: "Not yet in force", type: "checkbox" },
        { key: "pinpoint", label: "Pinpoint" },
      ];
    default:
      // Generic fallback: expose the existing data keys as editable fields,
      // plus common fields that most source types share.
      return [
        { key: "title", label: "Title" },
        { key: "author", label: "Author" },
        { key: "year", label: "Year" },
        { key: "pinpoint", label: "Pinpoint" },
      ];
  }
}

// ─── Shared Store Instance ───────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

export default function EditCitation(): JSX.Element {
  const { selectedCitationId, setSelectedCitationId, focusField, setFocusField, refreshCounter } = useCitationContext();

  // Refs for scroll-to-field support
  const pinpointRef = useRef<HTMLInputElement>(null);
  const formatSectionRef = useRef<HTMLFieldSetElement>(null);

  const [citation, setCitation] = useState<Citation | null>(null);
  const [allCitations, setAllCitations] = useState<Citation[]>([]);
  const [formData, setFormData] = useState<SourceData>({});
  const [shortTitle, setShortTitle] = useState("");
  const [formatPreference, setFormatPreference] = useState<FormatPreference>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");

  // UX-002: Track load errors separately so we can show a Reload button
  const [loadError, setLoadError] = useState<string | null>(null);

  // SIGNAL-001: Introductory signal and commentary
  const [signal, setSignal] = useState<IntroductorySignal | "">("");
  const [commentaryBefore, setCommentaryBefore] = useState("");
  const [commentaryAfter, setCommentaryAfter] = useState("");

  // UX-004: Occurrences — footnotes where this citation appears
  const [occurrences, setOccurrences] = useState<CitationFootnoteEntry[]>([]);
  const [occurrencesOpen, setOccurrencesOpen] = useState(false);
  const [occurrencesLoading, setOccurrencesLoading] = useState(false);
  const [removingFootnote, setRemovingFootnote] = useState<number | null>(null);
  const [addToFootnoteOpen, setAddToFootnoteOpen] = useState(false);
  const [allFootnoteEntries, setAllFootnoteEntries] = useState<CitationFootnoteEntry[]>([]);

  // Load the active standard on mount
  useEffect(() => {
    void (async () => {
      try {
        const store = await getSharedStore();
        setStandardId(store.getStandardId());
      } catch {
        // Default to aglc4
      }
    })();
  }, []);

  const standardConfig = getStandardConfig(standardId);

  // Preview runs — rebuilds whenever form data or citation changes
  const previewRuns = useMemo((): FormattedRun[] => {
    if (!citation) return [];
    const previewCitation: Citation = {
      ...citation,
      data: { ...formData },
      shortTitle: shortTitle || undefined,
      signal: signal || undefined,
      commentaryBefore: commentaryBefore || undefined,
      commentaryAfter: commentaryAfter || undefined,
    };
    const courtToggles = getDevicePref("courtToggles") as Record<string, string> | undefined;
    const courtConfig = buildCourtConfig(standardConfig, courtToggles);
    return getFormattedPreview(previewCitation, courtConfig);
  }, [citation, formData, shortTitle, signal, commentaryBefore, commentaryAfter, standardConfig]);

  // UX-002: Re-initialise the store and reload all citations from the document.
  const refreshCitations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setError(null);

    try {
      // Reset the singleton so initStore re-reads the Custom XML Part
      resetSharedStore();
      const store = await getSharedStore();
      setAllCitations(store.getAll());
      setSuccessMessage("Citations reloaded from document.");
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to reload citations from the document."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all citations on mount AND when refresh counter changes (new
  // citations inserted, deleted, or settings changed).
  useEffect(() => {
    let cancelled = false;

    async function loadAll(): Promise<void> {
      try {
        const store = await getSharedStore();
        if (!cancelled) {
          setAllCitations(store.getAll());
        }
      } catch {
        // Non-critical — the picker will simply be empty.
      }
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [refreshCounter]);

  // Load citation when selectedCitationId changes
  useEffect(() => {
    if (!selectedCitationId || selectedCitationId.startsWith("obiter-")) {
      setCitation(null);
      setFormData({});
      setShortTitle("");
      setFormatPreference("auto");
      setSignal("");
      setCommentaryBefore("");
      setCommentaryAfter("");
      setError(null);
      setLoadError(null);
      setSuccessMessage(null);
      return;
    }

    let cancelled = false;

    async function loadCitation(): Promise<void> {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      setConfirmingDelete(false);

      try {
        const store = await getSharedStore();
        const found = store.getById(selectedCitationId!);

        if (cancelled) return;

        if (!found) {
          // UX-002: Citation not found — may have been removed by undo
          setLoadError(
            `Citation "${selectedCitationId}" not found in the document store. ` +
            "This can happen after an undo. Try reloading."
          );
          setCitation(null);
          return;
        }

        setLoadError(null);
        setCitation(found);
        setFormData({ ...found.data });
        setShortTitle(found.shortTitle ?? "");
        setSignal(found.signal ?? "");
        setCommentaryBefore(found.commentaryBefore ?? "");
        setCommentaryAfter(found.commentaryAfter ?? "");
        // Restore format preference from data if previously saved
        const savedPref = found.data._formatPreference;
        if (
          typeof savedPref === "string" &&
          (savedPref === "auto" || savedPref === "full" || savedPref === "short" || savedPref === "ibid")
        ) {
          setFormatPreference(savedPref as FormatPreference);
        } else {
          setFormatPreference("auto");
        }
      } catch (err) {
        if (!cancelled) {
          // UX-002: Store or content control error — surface reload option
          setLoadError(
            err instanceof Error ? err.message : "Failed to load citation."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCitation();

    return () => {
      cancelled = true;
    };
  }, [selectedCitationId]);

  // ─── Focus Field: scroll to pinpoint or format section on CC click ───────

  useEffect(() => {
    if (!focusField || !citation) return;

    // Delay slightly to ensure the DOM has rendered
    const timer = setTimeout(() => {
      if (focusField === "pinpoint" && pinpointRef.current) {
        pinpointRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        pinpointRef.current.focus();
      } else if (focusField === "format" && formatSectionRef.current) {
        formatSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Clear the focus field after scrolling so it doesn't re-trigger
      setFocusField(null);
    }, 100);

    return () => clearTimeout(timer);
  }, [focusField, citation, setFocusField]);

  // ─── UX-004: Load Occurrences ─────────────────────────────────────────────

  const loadOccurrences = useCallback(async (citationId: string) => {
    setOccurrencesLoading(true);
    try {
      const allEntries = await getAllCitationFootnotes();
      setAllFootnoteEntries(allEntries);
      const matching = allEntries.filter((e) => e.citationId === citationId);
      setOccurrences(matching);
    } catch {
      // Non-critical — the list will simply be empty.
      setOccurrences([]);
    } finally {
      setOccurrencesLoading(false);
    }
  }, []);

  // Reload occurrences when the selected citation changes
  useEffect(() => {
    if (selectedCitationId && citation) {
      void loadOccurrences(selectedCitationId);
    } else {
      setOccurrences([]);
      setOccurrencesOpen(false);
      setAddToFootnoteOpen(false);
    }
  }, [selectedCitationId, citation, loadOccurrences]);

  // ─── UX-004: Remove Single Occurrence ───────────────────────────────────

  const handleRemoveOccurrence = useCallback(async (footnoteIndex: number) => {
    if (!citation) return;

    setRemovingFootnote(footnoteIndex);
    setError(null);

    try {
      await deleteCitationFootnote(citation.id, footnoteIndex);
      // Rebuild footnotes to clean up orphaned separators
      const store = await getSharedStore();
      await Word.run(async (ctx) => {
        const { refreshAllCitations } = await import("../../word/citationRefresher");
        await refreshAllCitations(ctx, store);
      });
      // Refresh the occurrences list after removal
      await loadOccurrences(citation.id);
      setSuccessMessage(`Removed from footnote ${footnoteIndex}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove occurrence.");
    } finally {
      setRemovingFootnote(null);
    }
  }, [citation, loadOccurrences]);

  // ─── UX-004: Add to Existing Footnote ──────────────────────────────────

  const handleAddToFootnote = useCallback(async (footnoteIndex: number) => {
    if (!citation) return;

    setLoading(true);
    setError(null);

    try {
      const displayTitle =
        citation.shortTitle ||
        (citation.data.title as string) ||
        (citation.data.caseName as string) ||
        "Citation";
      await appendToFootnoteByIndex(
        footnoteIndex,
        citation.id,
        displayTitle,
        [{ text: displayTitle }],
      );
      setAddToFootnoteOpen(false);
      // Refresh occurrences to show the new entry
      await loadOccurrences(citation.id);
      setSuccessMessage(`Added to footnote ${footnoteIndex}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to footnote.");
    } finally {
      setLoading(false);
    }
  }, [citation, loadOccurrences]);

  // ─── Field Change Handler ────────────────────────────────────────────────

  const handleFieldChange = useCallback((key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSuccessMessage(null);
  }, []);

  // ─── UX-003: Discard Changes ──────────────────────────────────────────────

  const handleDiscard = useCallback(() => {
    // Clear selection and reset all form state to return to the list view
    setSelectedCitationId(null);
    setCitation(null);
    setFormData({});
    setShortTitle("");
    setFormatPreference("auto");
    setSignal("");
    setCommentaryBefore("");
    setCommentaryAfter("");
    setError(null);
    setLoadError(null);
    setSuccessMessage(null);
    setConfirmingDelete(false);
  }, [setSelectedCitationId]);

  // ─── Update Citation ─────────────────────────────────────────────────────

  const handleUpdate = useCallback(async () => {
    if (!citation) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const store = await getSharedStore();
      const updatedCitation: Citation = {
        ...citation,
        data: { ...formData, _formatPreference: formatPreference },
        shortTitle: shortTitle || undefined,
        signal: signal || undefined,
        commentaryBefore: commentaryBefore || undefined,
        commentaryAfter: commentaryAfter || undefined,
        modifiedAt: new Date().toISOString(),
      };

      await store.update(updatedCitation);
      setCitation(updatedCitation);

      // Refresh the citation content in the document using the engine formatter.
      // Build court config from device preferences for court-mode support.
      const courtToggles = getDevicePref("courtToggles") as Record<string, string> | undefined;
      const courtConfig = buildCourtConfig(standardConfig, courtToggles);
      const runs = getFormattedPreview(updatedCitation, courtConfig);
      await updateCitationContent(citation.id, runs);

      setSuccessMessage("Citation updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update citation.");
    } finally {
      setLoading(false);
    }
  }, [citation, formData, shortTitle, formatPreference, signal, commentaryBefore, commentaryAfter]);

  // ─── Delete Citation ──────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!citation) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const store = await getSharedStore();

      // Find all footnotes containing this citation so we can clean up
      const footnotes = await getAllCitationFootnotes();
      const matching = footnotes.filter((f) => f.citationId === citation.id);

      // Delete each content control from the document
      for (const entry of matching) {
        await deleteCitationFootnote(citation.id, entry.footnoteIndex);
      }

      // Remove from the store
      await store.remove(citation.id);

      setCitation(null);
      setFormData({});
      setShortTitle("");
      setConfirmingDelete(false);
      setSuccessMessage("Citation removed from the document.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove citation.");
      setConfirmingDelete(false);
    } finally {
      setLoading(false);
    }
  }, [citation]);

  // ─── Manual Citation Picker Handler ──────────────────────────────────────

  const handleManualSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      if (id) {
        setSelectedCitationId(id);
      }
    },
    [setSelectedCitationId],
  );

  // ─── No Citation Selected ────────────────────────────────────────────────

  if (!selectedCitationId && !successMessage) {
    return (
      <div>
        <h2>Edit Citation</h2>
        <p className="edit-empty-message">
          Click a citation in the document to edit it, or select one below.
        </p>

        {loadError && (
          <div aria-live="polite" role="alert">
            <p className="edit-error">{loadError}</p>
          </div>
        )}

        {allCitations.length > 0 && (
          <label className="edit-field">
            <span className="edit-field-label">Select a citation</span>
            <select
              className="edit-field-input"
              value=""
              onChange={handleManualSelect}
            >
              <option value="" disabled>
                Choose a citation...
              </option>
              {allCitations.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCitationLabel(c)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  // ─── Loading State ───────────────────────────────────────────────────────

  if (loading && !citation) {
    return (
      <div>
        <h2>Edit Citation</h2>
        <p>Loading citation...</p>
      </div>
    );
  }

  // ─── Error State (no citation loaded) ─────────────────────────────────────

  if ((error || loadError) && !citation) {
    return (
      <div>
        <h2>Edit Citation</h2>
        <p className="edit-error">{loadError || error}</p>
        <button
          className="edit-btn edit-btn-secondary"
          onClick={() => {
            setSelectedCitationId(null);
          }}
          style={{ marginTop: "var(--space-xs)" }}
        >
          Back to picker
        </button>
      </div>
    );
  }

  // ─── Success after deletion ───────────────────────────────────────────────

  if (!citation && successMessage) {
    return (
      <div>
        <h2>Edit Citation</h2>
        <p className="edit-success">{successMessage}</p>
      </div>
    );
  }

  if (!citation) return <></>;

  // ─── Edit Form ───────────────────────────────────────────────────────────

  const fields = getFieldsForSourceType(citation.sourceType);
  const typeLabel = SOURCE_TYPE_LABELS[citation.sourceType] || citation.sourceType;

  return (
    <div className="edit-citation">
      <h2>Edit Citation</h2>

      {/* Citation switcher — always visible so user can change or close */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
        <select
          className="edit-field-input"
          style={{ flex: 1, fontSize: 11 }}
          value={citation.id}
          onChange={(e) => {
            const newId = e.target.value;
            if (newId === "__close__") {
              setSelectedCitationId(null);
            } else {
              setSelectedCitationId(newId);
            }
          }}
        >
          <option value="__close__">Close / select another...</option>
          {allCitations.map((c) => (
            <option key={c.id} value={c.id}>
              {getCitationLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div className="edit-type-badge">{typeLabel}</div>

      <div aria-live="polite" role="status">
        {error && <p className="edit-error">Error: {error}</p>}
        {successMessage && <p className="edit-success">Success: {successMessage}</p>}
      </div>

      <div className="edit-form">
        {fields.map((field) =>
          field.type === "checkbox" ? (
            <label key={field.key} className="edit-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={!!formData[field.key]}
                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                disabled={loading}
              />
              <span className="edit-field-label" style={{ margin: 0 }}>{field.label}</span>
            </label>
          ) : (
            <label key={field.key} className="edit-field">
              <span className="edit-field-label">
                {field.label}
                {field.required && <span className="edit-field-required">*</span>}
              </span>
              <input
                ref={field.key === "pinpoint" ? pinpointRef : undefined}
                type="text"
                className="edit-field-input"
                value={(formData[field.key] as string) ?? ""}
                placeholder={field.placeholder ?? ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                disabled={loading}
              />
            </label>
          )
        )}

        <label className="edit-field">
          <span className="edit-field-label">Short Title</span>
          <input
            type="text"
            className="edit-field-input"
            value={shortTitle}
            placeholder="Optional short title for subsequent references"
            onChange={(e) => {
              setShortTitle(e.target.value);
              setSuccessMessage(null);
            }}
            disabled={loading}
          />
        </label>
      </div>

      {/* SIGNAL-001: Introductory signal and commentary */}
      <div className="edit-signal-section">
        <label className="edit-field">
          <span className="edit-field-label">Introductory Signal</span>
          <select
            className="edit-field-input"
            value={signal}
            onChange={(e) => {
              setSignal(e.target.value as IntroductorySignal | "");
              setSuccessMessage(null);
            }}
            disabled={loading}
          >
            <option value="">None</option>
            {INTRODUCTORY_SIGNALS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="edit-field">
          <span className="edit-field-label">Commentary Before</span>
          <input
            type="text"
            className="edit-field-input"
            value={commentaryBefore}
            placeholder="e.g., For a discussion of this principle, see"
            onChange={(e) => {
              setCommentaryBefore(e.target.value);
              setSuccessMessage(null);
            }}
            disabled={loading}
          />
        </label>

        <label className="edit-field">
          <span className="edit-field-label">Commentary After</span>
          <input
            type="text"
            className="edit-field-input"
            value={commentaryAfter}
            placeholder="e.g., where the court distinguished the earlier authority"
            onChange={(e) => {
              setCommentaryAfter(e.target.value);
              setSuccessMessage(null);
            }}
            disabled={loading}
          />
        </label>
      </div>

      {/* Format Preference */}
      <fieldset ref={formatSectionRef} className="edit-format-section settings-section">
        <legend className="settings-section-title">Format Preference</legend>
        {(["auto", "full", "short", "ibid"] as FormatPreference[]).filter(
          (pref) => pref !== "ibid" || standardConfig.ibidEnabled
        ).map((pref) => (
          <label key={pref} className="settings-radio">
            <input
              type="radio"
              name="formatPreference"
              value={pref}
              checked={formatPreference === pref}
              onChange={() => {
                setFormatPreference(pref);
                setSuccessMessage(null);
              }}
              disabled={loading}
            />
            <span className="settings-radio-label">
              {pref === "auto" ? "Auto (default)" : pref.charAt(0).toUpperCase() + pref.slice(1)}
            </span>
          </label>
        ))}
      </fieldset>

      {/* UX-004: Occurrences */}
      <fieldset className="edit-occurrences-section settings-section">
        <legend className="settings-section-title">
          <button
            type="button"
            className="edit-occurrences-toggle"
            onClick={() => setOccurrencesOpen((prev) => !prev)}
            aria-expanded={occurrencesOpen}
          >
            Occurrences ({occurrences.length})
            <span className="edit-occurrences-chevron" aria-hidden="true">
              {occurrencesOpen ? "\u25B2" : "\u25BC"}
            </span>
          </button>
        </legend>

        {occurrencesOpen && (
          <div className="edit-occurrences-body">
            {occurrencesLoading && <p className="edit-occurrences-note">Scanning document...</p>}

            {!occurrencesLoading && occurrences.length === 0 && (
              <p className="edit-occurrences-note">
                This citation does not appear in any footnote.
              </p>
            )}

            {!occurrencesLoading && occurrences.length > 0 && (
              <ul className="edit-occurrences-list">
                {occurrences.map((entry) => {
                  const formatLabel = entry.renderedFormat
                    ? entry.renderedFormat.charAt(0).toUpperCase() + entry.renderedFormat.slice(1)
                    : "Full";
                  return (
                    <li key={entry.footnoteIndex} className="edit-occurrences-item" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      <span className="edit-occurrences-label" style={{ flex: "1 1 auto", minWidth: 80 }}>
                        <strong>n {entry.footnoteIndex}</strong>
                        <span className="edit-occurrences-format" style={{ marginLeft: 4 }}>({formatLabel})</span>
                      </span>
                      <button
                        type="button"
                        className="edit-btn edit-btn-danger edit-btn-small"
                        onClick={() => void handleRemoveOccurrence(entry.footnoteIndex)}
                        disabled={removingFootnote === entry.footnoteIndex || loading}
                        style={{ fontSize: 10 }}
                      >
                        {removingFootnote === entry.footnoteIndex ? "..." : "Remove"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Add to footnote */}
            {!addToFootnoteOpen ? (
              <button
                type="button"
                className="edit-btn edit-btn-secondary edit-btn-small"
                onClick={() => setAddToFootnoteOpen(true)}
                disabled={loading}
              >
                Add to footnote...
              </button>
            ) : (
              <div className="edit-add-to-footnote">
                <p className="edit-occurrences-note">Select a footnote to append this citation to:</p>
                <ul className="edit-occurrences-list">
                  {(() => {
                    // Build list of unique footnote numbers from all entries,
                    // excluding footnotes that already contain this citation.
                    const existingFootnotes = new Set(occurrences.map((o) => o.footnoteIndex));
                    const uniqueFootnotes = new Map<number, string>();
                    for (const entry of allFootnoteEntries) {
                      if (!existingFootnotes.has(entry.footnoteIndex) && !uniqueFootnotes.has(entry.footnoteIndex)) {
                        uniqueFootnotes.set(entry.footnoteIndex, entry.title);
                      }
                    }
                    const footnoteList = Array.from(uniqueFootnotes.entries()).sort((a, b) => a[0] - b[0]);

                    if (footnoteList.length === 0) {
                      return (
                        <li className="edit-occurrences-note">
                          No other footnotes available.
                        </li>
                      );
                    }

                    return footnoteList.map(([fnIndex, fnTitle]) => (
                      <li key={fnIndex} className="edit-occurrences-item">
                        <span className="edit-occurrences-label">
                          Footnote {fnIndex}
                          {fnTitle ? ` \u2014 ${fnTitle}` : ""}
                        </span>
                        <button
                          type="button"
                          className="edit-btn edit-btn-primary edit-btn-small"
                          onClick={() => void handleAddToFootnote(fnIndex)}
                          disabled={loading}
                        >
                          Add
                        </button>
                      </li>
                    ));
                  })()}
                </ul>
                <button
                  type="button"
                  className="edit-btn edit-btn-secondary edit-btn-small"
                  onClick={() => setAddToFootnoteOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </fieldset>

      {/* Citation Preview — editable: paste/type a citation to repopulate fields */}
      <fieldset className="settings-section" style={{ marginTop: 8 }}>
        <legend className="settings-section-title">Preview</legend>
        <CitationPreview
          runs={previewRuns}
          sourceType={citation?.sourceType}
          onParsed={(parsedData) => {
            setFormData((prev) => ({ ...prev, ...parsedData }));
            setSuccessMessage(null);
          }}
        />
      </fieldset>

      {/* Action Buttons */}
      <div className="edit-actions">
        <button
          className="edit-btn edit-btn-primary"
          onClick={() => void handleUpdate()}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Citation"}
        </button>

        {/* UX-003: Discard unsaved changes and return to list */}
        <button
          className="edit-btn edit-btn-secondary"
          onClick={handleDiscard}
          disabled={loading}
        >
          Discard
        </button>

        {!confirmingDelete ? (
          <button
            className="edit-btn edit-btn-danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={loading}
          >
            Remove Citation
          </button>
        ) : (
          <div className="edit-confirm-delete">
            <p className="edit-confirm-text">Remove this citation from the document?</p>
            <div className="edit-confirm-actions">
              <button
                className="edit-btn edit-btn-danger"
                onClick={() => void handleDelete()}
                disabled={loading}
              >
                {loading ? "Removing..." : "Confirm Remove"}
              </button>
              <button
                className="edit-btn edit-btn-secondary"
                onClick={() => setConfirmingDelete(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
