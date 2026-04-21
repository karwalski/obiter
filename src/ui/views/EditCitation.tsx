/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useEffect, useCallback } from "react";
import { useCitationContext } from "../context/CitationContext";
import { CitationStore } from "../../store/citationStore";
import { Citation, SourceType, SourceData } from "../../types/citation";
import {
  updateCitationContent,
  deleteCitationFootnote,
  getAllCitationFootnotes,
} from "../../word/footnoteManager";
import { getCitationLabel } from "./CitationLibrary";

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
  newspaper: "Newspaper Article",
  correspondence: "Correspondence",
  interview: "Interview",
  film_tv_media: "Film / TV / Media",
  internet_material: "Internet Material",
  social_media: "Social Media",
  genai_output: "Generative AI Output",
  treaty: "Treaty",
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
};

// ─── Field Definitions Per Source Type ────────────────────────────────────────

interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
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
    case "treaty":
      return [
        { key: "title", label: "Title", required: true },
        { key: "dateOpened", label: "Date Opened for Signature", required: true },
        { key: "treatySeries", label: "Treaty Series", required: true },
        { key: "entryIntoForce", label: "Entry into Force" },
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

// ─── Singleton Store Instance ────────────────────────────────────────────────

let storeInstance: CitationStore | null = null;

function getStore(): CitationStore {
  if (!storeInstance) {
    storeInstance = new CitationStore();
  }
  return storeInstance;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EditCitation(): JSX.Element {
  const { selectedCitationId, setSelectedCitationId } = useCitationContext();

  const [citation, setCitation] = useState<Citation | null>(null);
  const [allCitations, setAllCitations] = useState<Citation[]>([]);
  const [formData, setFormData] = useState<SourceData>({});
  const [shortTitle, setShortTitle] = useState("");
  const [formatPreference, setFormatPreference] = useState<FormatPreference>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Load all citations on mount so the manual picker dropdown is populated.
  useEffect(() => {
    let cancelled = false;

    async function loadAll(): Promise<void> {
      try {
        const store = getStore();
        await store.initStore();
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
  }, []);

  // Load citation when selectedCitationId changes
  useEffect(() => {
    if (!selectedCitationId) {
      setCitation(null);
      setFormData({});
      setShortTitle("");
      setFormatPreference("auto");
      setError(null);
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
        const store = getStore();
        await store.initStore();
        const found = store.getById(selectedCitationId!);

        if (cancelled) return;

        if (!found) {
          setError(`Citation "${selectedCitationId}" not found in the document store.`);
          setCitation(null);
          return;
        }

        setCitation(found);
        setFormData({ ...found.data });
        setShortTitle(found.shortTitle ?? "");
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
          setError(err instanceof Error ? err.message : "Failed to load citation.");
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

  // ─── Field Change Handler ────────────────────────────────────────────────

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSuccessMessage(null);
  }, []);

  // ─── Update Citation ─────────────────────────────────────────────────────

  const handleUpdate = useCallback(async () => {
    if (!citation) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const store = getStore();
      const updatedCitation: Citation = {
        ...citation,
        data: { ...formData, _formatPreference: formatPreference },
        shortTitle: shortTitle || undefined,
        modifiedAt: new Date().toISOString(),
      };

      await store.update(updatedCitation);
      setCitation(updatedCitation);

      // Refresh the citation content in the document. Build a simple
      // formatted run from the citation title for now; the full formatter
      // pipeline will produce richer output once the rule engine is wired up.
      const displayTitle = shortTitle || (formData.title as string) || (formData.caseName as string) || "Citation";
      await updateCitationContent(citation.id, [{ text: displayTitle }]);

      setSuccessMessage("Citation updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update citation.");
    } finally {
      setLoading(false);
    }
  }, [citation, formData, shortTitle, formatPreference]);

  // ─── Delete Citation ──────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!citation) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const store = getStore();

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

  if (error && !citation) {
    return (
      <div>
        <h2>Edit Citation</h2>
        <p className="edit-error">{error}</p>
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

      <div className="edit-type-badge">{typeLabel}</div>

      <div aria-live="polite" role="status">
        {error && <p className="edit-error">Error: {error}</p>}
        {successMessage && <p className="edit-success">Success: {successMessage}</p>}
      </div>

      <div className="edit-form">
        {fields.map((field) => (
          <label key={field.key} className="edit-field">
            <span className="edit-field-label">
              {field.label}
              {field.required && <span className="edit-field-required">*</span>}
            </span>
            <input
              type="text"
              className="edit-field-input"
              value={(formData[field.key] as string) ?? ""}
              placeholder={field.placeholder ?? ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={loading}
            />
          </label>
        ))}

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

      {/* Format Preference */}
      <fieldset className="edit-format-section settings-section">
        <legend className="settings-section-title">Format Preference</legend>
        {(["auto", "full", "short", "ibid"] as FormatPreference[]).map((pref) => (
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

      {/* Action Buttons */}
      <div className="edit-actions">
        <button
          className="edit-btn edit-btn-primary"
          onClick={() => void handleUpdate()}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Citation"}
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
