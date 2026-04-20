/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Citation, SourceType, SourceData, AustralianJurisdiction, ParallelCitation } from "../../types/citation";
import { FormattedRun } from "../../types/formattedRun";
import { CitationStore } from "../../store/citationStore";
import { insertCitationFootnote, getAllCitationFootnotes } from "../../word/footnoteManager";
import { getFormattedPreview, formatCitation, CitationContext as EngineCitationContext } from "../../engine/engine";
import CitationPreview from "../components/CitationPreview";
import FieldHelp from "../components/FieldHelp";
import TypeaheadInput from "../components/TypeaheadInput";
import { useCitationContext } from "../context/CitationContext";
import { searchCasesViaProxy, searchLegislationViaProxy } from "../../api/proxyClient";
import { LookupResult } from "../../api/types";
import { loadLlmConfig, LLMConfig } from "../../llm/config";
import { classifySourceType, ClassificationResult } from "../../llm/classifySource";
import { suggestShortTitle as suggestShortTitleLlm } from "../../llm/suggestShortTitle";

// ─── Source Type Grouping ────────────────────────────────────────────────────

interface SourceTypeOption {
  value: SourceType;
  label: string;
}

interface SourceTypeGroup {
  label: string;
  types: SourceTypeOption[];
}

interface SourceTypeCategory {
  label: string;
  groups: SourceTypeGroup[];
}

const SOURCE_TYPE_CATEGORIES: SourceTypeCategory[] = [
  {
    label: "Domestic",
    groups: [
      {
        label: "Cases",
        types: [
          { value: "case.reported", label: "Reported Case" },
          { value: "case.unreported.mnc", label: "Unreported (MNC)" },
          { value: "case.unreported.no_mnc", label: "Unreported (No MNC)" },
          { value: "case.proceeding", label: "Proceeding" },
          { value: "case.court_order", label: "Court Order" },
          { value: "case.quasi_judicial", label: "Quasi-Judicial" },
          { value: "case.arbitration", label: "Arbitration" },
          { value: "case.transcript", label: "Transcript" },
          { value: "case.submission", label: "Submission" },
        ],
      },
      {
        label: "Legislation",
        types: [
          { value: "legislation.statute", label: "Statute" },
          { value: "legislation.bill", label: "Bill" },
          { value: "legislation.delegated", label: "Delegated Legislation" },
          { value: "legislation.constitution", label: "Constitution" },
          { value: "legislation.explanatory", label: "Explanatory Memorandum" },
          { value: "legislation.quasi", label: "Quasi-Legislative Material" },
        ],
      },
    ],
  },
  {
    label: "Secondary",
    groups: [
      {
        label: "Journal Articles",
        types: [
          { value: "journal.article", label: "Journal Article" },
          { value: "journal.online", label: "Online Journal" },
          { value: "journal.forthcoming", label: "Forthcoming Article" },
        ],
      },
      {
        label: "Books",
        types: [
          { value: "book", label: "Book" },
          { value: "book.chapter", label: "Book Chapter" },
          { value: "book.translated", label: "Translated Book" },
          { value: "book.audiobook", label: "Audiobook" },
        ],
      },
      {
        label: "Reports",
        types: [
          { value: "report", label: "Report" },
          { value: "report.parliamentary", label: "Parliamentary Report" },
          { value: "report.royal_commission", label: "Royal Commission" },
          { value: "report.law_reform", label: "Law Reform Report" },
          { value: "report.abs", label: "ABS Report" },
        ],
      },
      {
        label: "Other Secondary",
        types: [
          { value: "research_paper", label: "Research Paper" },
          { value: "research_paper.parliamentary", label: "Parliamentary Research" },
          { value: "conference_paper", label: "Conference Paper" },
          { value: "thesis", label: "Thesis" },
          { value: "speech", label: "Speech" },
          { value: "press_release", label: "Press Release" },
          { value: "hansard", label: "Hansard" },
          { value: "submission.government", label: "Government Submission" },
          { value: "evidence.parliamentary", label: "Parliamentary Evidence" },
          { value: "constitutional_convention", label: "Constitutional Convention" },
          { value: "dictionary", label: "Dictionary" },
          { value: "legal_encyclopedia", label: "Legal Encyclopedia" },
          { value: "looseleaf", label: "Looseleaf" },
          { value: "ip_material", label: "IP Material" },
          { value: "constitutive_document", label: "Constitutive Document" },
          { value: "newspaper", label: "Newspaper" },
          { value: "correspondence", label: "Correspondence" },
          { value: "interview", label: "Interview" },
          { value: "film_tv_media", label: "Film/TV/Media" },
          { value: "internet_material", label: "Internet Material" },
          { value: "social_media", label: "Social Media" },
        ],
      },
      {
        label: "AI-Generated Content",
        types: [
          { value: "genai_output", label: "AI-Generated Content" },
        ],
      },
    ],
  },
  {
    label: "International",
    groups: [
      {
        label: "Treaties",
        types: [{ value: "treaty", label: "Treaty" }],
      },
      {
        label: "UN Materials",
        types: [
          { value: "un.document", label: "UN Document" },
          { value: "un.communication", label: "UN Communication" },
          { value: "un.yearbook", label: "UN Yearbook" },
        ],
      },
      {
        label: "ICJ",
        types: [
          { value: "icj.decision", label: "ICJ Decision" },
          { value: "icj.pleading", label: "ICJ Pleading" },
        ],
      },
      {
        label: "Other International",
        types: [
          { value: "arbitral.state_state", label: "State-State Arbitration" },
          { value: "arbitral.individual_state", label: "Individual-State Arbitration" },
          { value: "icc_tribunal.case", label: "ICC Tribunal Case" },
          { value: "wto.document", label: "WTO Document" },
          { value: "wto.decision", label: "WTO Decision" },
          { value: "gatt.document", label: "GATT Document" },
          { value: "eu.official_journal", label: "EU Official Journal" },
          { value: "eu.court", label: "EU Court Decision" },
          { value: "echr.decision", label: "ECHR Decision" },
          { value: "supranational.decision", label: "Supranational Decision" },
          { value: "supranational.document", label: "Supranational Document" },
        ],
      },
    ],
  },
  {
    label: "Foreign",
    groups: [
      {
        label: "By Jurisdiction",
        types: [
          { value: "foreign.canada", label: "Canada" },
          { value: "foreign.china", label: "China" },
          { value: "foreign.france", label: "France" },
          { value: "foreign.germany", label: "Germany" },
          { value: "foreign.hong_kong", label: "Hong Kong" },
          { value: "foreign.malaysia", label: "Malaysia" },
          { value: "foreign.new_zealand", label: "New Zealand" },
          { value: "foreign.singapore", label: "Singapore" },
          { value: "foreign.south_africa", label: "South Africa" },
          { value: "foreign.uk", label: "United Kingdom" },
          { value: "foreign.usa", label: "United States" },
          { value: "foreign.other", label: "Other Foreign" },
        ],
      },
    ],
  },
];

// ─── Jurisdiction Options ────────────────────────────────────────────────────

const JURISDICTIONS: { value: AustralianJurisdiction; label: string }[] = [
  { value: "Cth", label: "Commonwealth" },
  { value: "ACT", label: "ACT" },
  { value: "NSW", label: "New South Wales" },
  { value: "NT", label: "Northern Territory" },
  { value: "Qld", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "Tas", label: "Tasmania" },
  { value: "Vic", label: "Victoria" },
  { value: "WA", label: "Western Australia" },
];

// ─── Core Source Types (with dedicated forms) ────────────────────────────────

const CORE_SOURCE_TYPES: SourceType[] = [
  "case.reported",
  "legislation.statute",
  "journal.article",
  "book",
  "treaty",
  "genai_output",
];

// ─── Help Me Choose: Category Lookup ─────────────────────────────────────────

/**
 * Finds which category and group a source type belongs to within
 * SOURCE_TYPE_CATEGORIES, used to auto-select the dropdowns after
 * AI classification.
 */
export function findCategoryForSourceType(
  sourceType: SourceType,
): { category: string; group: string } | null {
  for (const cat of SOURCE_TYPE_CATEGORIES) {
    for (const grp of cat.groups) {
      for (const t of grp.types) {
        if (t.value === sourceType) {
          return { category: cat.label, group: grp.label };
        }
      }
    }
  }
  return null;
}

/**
 * Finds the label for a source type within SOURCE_TYPE_CATEGORIES.
 */
function findSourceTypeLabel(sourceType: SourceType): string | null {
  for (const cat of SOURCE_TYPE_CATEGORIES) {
    for (const grp of cat.groups) {
      for (const t of grp.types) {
        if (t.value === sourceType) {
          return t.label;
        }
      }
    }
  }
  return null;
}

// ─── Author Entry ────────────────────────────────────────────────────────────

interface AuthorEntry {
  givenNames: string;
  surname: string;
}

// ─── Feedback State ──────────────────────────────────────────────────────────

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

// ─── Preview via Engine ──────────────────────────────────────────────────────

/**
 * Builds a temporary Citation object from the form state so the engine's
 * getFormattedPreview can produce the preview runs.
 */
function buildPreviewCitation(sourceType: SourceType, data: SourceData, shortTitle?: string): Citation {
  return {
    id: "",
    aglcVersion: "4",
    sourceType,
    data: { ...data },
    shortTitle: shortTitle || undefined,
    tags: [],
    createdAt: "",
    modifiedAt: "",
  };
}

/**
 * Finds an existing citation in the store that matches the new citation by
 * source type and key identifying fields (e.g. case name + year, title + year).
 */
function findMatchingCitation(newCitation: Citation, existing: Citation[]): Citation | undefined {
  const st = newCitation.sourceType;
  const d = newCitation.data;

  return existing.find((c) => {
    if (c.sourceType !== st) return false;
    const cd = c.data;

    if (st.startsWith("case.")) {
      return (
        asString(cd.party1) === asString(d.party1) &&
        asString(cd.party2) === asString(d.party2) &&
        asString(cd.year) === asString(d.year)
      );
    }
    if (st.startsWith("legislation.")) {
      return (
        asString(cd.title) === asString(d.title) &&
        asString(cd.year) === asString(d.year) &&
        asString(cd.jurisdiction) === asString(d.jurisdiction)
      );
    }
    // Secondary/international sources: match on title + year
    return (
      asString(cd.title) === asString(d.title) &&
      asString(cd.year) === asString(d.year)
    );
  });
}

/** Safely coerce an unknown value to string for comparison. */
function asString(val: unknown): string {
  return typeof val === "string" ? val : "";
}

// ─── Proxy-Based Search Functions ────────────────────────────────────────────

/**
 * Combined case search via the proxy server. Queries AustLII and Jade
 * in parallel, merges and deduplicates by sourceId.
 */
const searchCases = searchCasesViaProxy;

/**
 * Legislation search via the proxy server (Federal Register of Legislation).
 */
const searchLegislation = searchLegislationViaProxy;

// ─── Short Title Suggestion ──────────────────────────────────────────────────

function suggestShortTitle(sourceType: SourceType, data: SourceData): string {
  if (sourceType === "case.reported" || sourceType.startsWith("case.")) {
    const p1 = (data.party1 as string) || "";
    return p1;
  }
  if (sourceType.startsWith("legislation.")) {
    const title = (data.title as string) || "";
    // Simple abbreviation: take first letters of main words
    if (title.length > 30) {
      return title
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    }
    return title;
  }
  return "";
}

// ─── Singleton Store Instance ────────────────────────────────────────────────

let storeInstance: CitationStore | null = null;

async function getStore(): Promise<CitationStore> {
  if (!storeInstance) {
    storeInstance = new CitationStore();
    await storeInstance.initStore();
  }
  return storeInstance;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InsertCitation(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType | "">("");
  const [formData, setFormData] = useState<SourceData>({});
  const [shortTitle, setShortTitle] = useState("");
  const [shortTitleTouched, setShortTitleTouched] = useState(false);
  const [authors, setAuthors] = useState<AuthorEntry[]>([{ givenNames: "", surname: "" }]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [inserting, setInserting] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [classifyDescription, setClassifyDescription] = useState("");
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassificationResult | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  // Load LLM config on mount to determine if AI suggest is available
  useEffect(() => {
    const config = loadLlmConfig();
    setLlmConfig(config);
  }, []);

  // ─── Field Updater ──────────────────────────────────────────────────────

  const updateField = useCallback(
    (key: string, value: unknown) => {
      setFormData((prev) => {
        const next = { ...prev, [key]: value };
        // Auto-suggest short title if not manually edited
        if (!shortTitleTouched && selectedSourceType) {
          const suggestion = suggestShortTitle(selectedSourceType as SourceType, next);
          setShortTitle(suggestion);
        }
        return next;
      });
    },
    [shortTitleTouched, selectedSourceType],
  );

  // ─── Author Management ─────────────────────────────────────────────────

  const updateAuthor = useCallback(
    (index: number, field: keyof AuthorEntry, value: string) => {
      setAuthors((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        // Sync to formData
        setFormData((fd) => {
          const updated = { ...fd, authors: next };
          if (!shortTitleTouched && selectedSourceType) {
            const suggestion = suggestShortTitle(selectedSourceType as SourceType, updated);
            setShortTitle(suggestion);
          }
          return updated;
        });
        return next;
      });
    },
    [shortTitleTouched, selectedSourceType],
  );

  const addAuthor = useCallback(() => {
    setAuthors((prev) => {
      const next = [...prev, { givenNames: "", surname: "" }];
      setFormData((fd) => ({ ...fd, authors: next }));
      return next;
    });
  }, []);

  const removeAuthor = useCallback(
    (index: number) => {
      if (authors.length <= 1) return;
      setAuthors((prev) => {
        const next = prev.filter((_, i) => i !== index);
        setFormData((fd) => ({ ...fd, authors: next }));
        return next;
      });
    },
    [authors.length],
  );

  // ─── Typeahead Selection Handlers ───────────────────────────────────────

  const handleCaseSelect = useCallback(
    (result: LookupResult) => {
      // Parse a typical case title like "Party1 v Party2" into fields.
      const title = result.title;
      const vIndex = title.search(/\s+v\s+/i);
      if (vIndex !== -1) {
        const p1 = title.substring(0, vIndex).trim();
        const p2 = title.substring(vIndex).replace(/^\s+v\s+/i, "").trim();
        updateField("party1", p1);
        updateField("party2", p2);
      } else {
        updateField("party1", title);
      }

      // Extract year from snippet or title — look for [YYYY] or (YYYY)
      const yearMatch = /[\[(](\d{4})[\])]/.exec(result.snippet || result.title);
      if (yearMatch) {
        updateField("year", yearMatch[1]);
        // Determine bracket type
        const bracket = (result.snippet || result.title).charAt(
          (result.snippet || result.title).indexOf(yearMatch[0]),
        );
        updateField("yearType", bracket === "[" ? "square" : "round");
      }
    },
    [updateField],
  );

  const handleLegislationSelect = useCallback(
    (result: LookupResult) => {
      const title = result.title;

      // Try to extract year from the end of the title (e.g. "Competition and Consumer Act 2010")
      const yearMatch = /\b(\d{4})\s*$/.exec(title);
      if (yearMatch) {
        updateField("title", title.substring(0, yearMatch.index).trim());
        updateField("year", yearMatch[1]);
      } else {
        updateField("title", title);
      }

      // Federal Register results are Commonwealth by default
      updateField("jurisdiction", "Cth");
    },
    [updateField],
  );

  // ─── Source Type Change Handler ─────────────────────────────────────────

  const handleSourceTypeChange = useCallback((value: string) => {
    setSelectedSourceType(value as SourceType);
    setFormData({});
    setAuthors([{ givenNames: "", surname: "" }]);
    setShortTitle("");
    setShortTitleTouched(false);
    setFeedback(null);
  }, []);

  // ─── Category Change Handler ────────────────────────────────────────────

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value);
    setSelectedSourceType("");
    setFormData({});
    setAuthors([{ givenNames: "", surname: "" }]);
    setShortTitle("");
    setShortTitleTouched(false);
    setFeedback(null);
  }, []);

  // ─── Help Me Choose Handler ─────────────────────────────────────────────

  const handleClassifySource = useCallback(async () => {
    if (!llmConfig || !classifyDescription.trim()) return;
    setClassifyLoading(true);
    setClassifyResult(null);
    setClassifyError(null);
    try {
      const result = await classifySourceType(classifyDescription.trim(), llmConfig);
      setClassifyResult(result);
      // Auto-select the identified source type in the dropdowns
      const match = findCategoryForSourceType(result.sourceType);
      if (match) {
        setSelectedCategory(match.category);
        setSelectedSourceType(result.sourceType);
        setFormData({});
        setAuthors([{ givenNames: "", surname: "" }]);
        setShortTitle("");
        setShortTitleTouched(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to classify source type.";
      setClassifyError(message);
    } finally {
      setClassifyLoading(false);
    }
  }, [llmConfig, classifyDescription]);

  // ─── Preview ────────────────────────────────────────────────────────────

  const previewRuns = useMemo((): FormattedRun[] => {
    if (!selectedSourceType) return [];

    const previewCitation = buildPreviewCitation(
      selectedSourceType as SourceType,
      formData,
      shortTitle,
    );
    return getFormattedPreview(previewCitation);
  }, [selectedSourceType, formData, shortTitle]);

  // ─── Insert Handler ─────────────────────────────────────────────────────

  const { triggerRefresh } = useCitationContext();

  const handleInsert = useCallback(async () => {
    const overrideText = formData._overrideText as string | undefined;
    if (!selectedSourceType || (previewRuns.length === 0 && !overrideText)) {
      setFeedback({ type: "error", message: "Please fill in the required fields." });
      return;
    }

    setInserting(true);
    setFeedback(null);

    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const citation: Citation = {
        id,
        aglcVersion: "4",
        sourceType: selectedSourceType as SourceType,
        data: { ...formData },
        shortTitle: shortTitle || undefined,
        tags: [],
        createdAt: now,
        modifiedAt: now,
      };

      const store = await getStore();

      // Handle override mode — user typed citation text directly
      if (overrideText) {
        const overrideRuns: FormattedRun[] = [{ text: overrideText }];
        await store.add(citation);
        const title = shortTitle || citation.sourceType;
        await insertCitationFootnote(id, title, overrideRuns);
        triggerRefresh();
        setFeedback({ type: "success", message: "Citation inserted as footnote (manual override)." });
        setFormData({});
        setAuthors([{ givenNames: "", surname: "" }]);
        setShortTitle("");
        setShortTitleTouched(false);
        setInserting(false);
        return;
      }

      // BUG-009: Check if a matching citation already exists in the store
      const existingCitations = store.getAll();
      const existingMatch = findMatchingCitation(citation, existingCitations);

      let runsToInsert: FormattedRun[];

      if (existingMatch) {
        // This is a repeat citation — use subsequent reference format
        const footnotes = await getAllCitationFootnotes();

        // Find the first footnote number for the existing citation
        const firstEntry = footnotes.find((f) => f.citationId === existingMatch.id);
        const firstFootnoteNumber = firstEntry?.footnoteIndex ?? 1;

        // Determine if ibid applies: preceding footnote has exactly one citation
        // and it references the same citation
        const lastFootnoteIndex = footnotes.length > 0
          ? Math.max(...footnotes.map((f) => f.footnoteIndex))
          : 0;
        const precedingCitations = footnotes.filter(
          (f) => f.footnoteIndex === lastFootnoteIndex,
        );
        const isSameAsPreceding =
          precedingCitations.length === 1 &&
          precedingCitations[0].citationId === existingMatch.id;

        const engineContext: EngineCitationContext = {
          footnoteNumber: lastFootnoteIndex + 1,
          isFirstCitation: false,
          isSameAsPreceding,
          precedingFootnoteCitationCount: precedingCitations.length,
          firstFootnoteNumber,
          isWithinSameFootnote: false,
          formatPreference: "auto",
        };

        runsToInsert = formatCitation(existingMatch, engineContext);

        // Don't add duplicate to store; use existing citation ID for the footnote
        const existingTitle = shortTitle || existingMatch.shortTitle || existingMatch.sourceType;
        await insertCitationFootnote(existingMatch.id, existingTitle, runsToInsert);
      } else {
        // First citation of this source — use full format from the engine
        runsToInsert = getFormattedPreview(citation);

        await store.add(citation);

        const title = shortTitle || citation.sourceType;
        await insertCitationFootnote(id, title, runsToInsert);
      }

      // BUG-003: Signal the Citation Library to refresh
      triggerRefresh();

      setFeedback({ type: "success", message: "Citation inserted as footnote." });

      // Reset form
      setFormData({});
      setAuthors([{ givenNames: "", surname: "" }]);
      setShortTitle("");
      setShortTitleTouched(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback({ type: "error", message });
    } finally {
      setInserting(false);
    }
  }, [selectedSourceType, formData, shortTitle, previewRuns, triggerRefresh]);

  // ─── Available sub-types for selected category ──────────────────────────

  const availableGroups = useMemo(() => {
    if (!selectedCategory) return [];
    const category = SOURCE_TYPE_CATEGORIES.find((c) => c.label === selectedCategory);
    return category ? category.groups : [];
  }, [selectedCategory]);

  // ─── Determine whether a dedicated form exists ──────────────────────────

  const isCoreType = selectedSourceType && CORE_SOURCE_TYPES.includes(selectedSourceType as SourceType);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="insert-citation">
      <h2>Insert Citation</h2>

      {/* Help Me Choose — AI source type classifier */}
      {llmConfig?.enabled ? (
        <div className="ic-help-me-choose">
          <div className="ic-label">Help me choose</div>
          <div className="ic-field-row">
            <input
              className="ic-input ic-input--grow"
              type="text"
              value={classifyDescription}
              placeholder="Describe your source (e.g., 'a High Court case from 1992' or 'a UN General Assembly resolution')"
              onChange={(e) => setClassifyDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleClassifySource();
                }
              }}
            />
            <button
              type="button"
              className="ic-classify-btn"
              disabled={classifyLoading || !classifyDescription.trim()}
              onClick={() => void handleClassifySource()}
            >
              {classifyLoading ? "Identifying..." : "Identify"}
            </button>
          </div>
          {classifyResult && (
            <div className="ic-classify-result">
              Identified as: {findSourceTypeLabel(classifyResult.sourceType) || classifyResult.sourceType}
              {" — "}
              {Math.round(classifyResult.confidence * 100)}% confidence.
              {" "}
              {classifyResult.explanation}
            </div>
          )}
          {classifyError && (
            <div className="ic-classify-error">
              {classifyError}
            </div>
          )}
        </div>
      ) : (
        <div className="ic-help-me-choose-disabled">
          Enable AI Assistant in Settings to identify source types automatically
        </div>
      )}

      {/* Category selector */}
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-category">
          AGLC4 Part
        </label>
        <select
          id="ic-category"
          className="ic-select"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">Select a category...</option>
          {SOURCE_TYPE_CATEGORIES.map((cat) => (
            <option key={cat.label} value={cat.label}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Source type selector */}
      {selectedCategory && (
        <div className="ic-field">
          <label className="ic-label" htmlFor="ic-source-type">
            Source Type
          </label>
          <select
            id="ic-source-type"
            className="ic-select"
            value={selectedSourceType}
            onChange={(e) => handleSourceTypeChange(e.target.value)}
          >
            <option value="">Select a type...</option>
            {availableGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* Dynamic Form */}
      {selectedSourceType === "case.reported" && renderCaseReportedForm(formData, updateField, handleCaseSelect)}
      {selectedSourceType === "legislation.statute" && renderLegislationForm(formData, updateField, handleLegislationSelect)}
      {selectedSourceType === "journal.article" &&
        renderJournalForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor)}
      {selectedSourceType === "book" &&
        renderBookForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor)}
      {selectedSourceType === "treaty" && renderTreatyForm(formData, updateField)}
      {selectedSourceType === "genai_output" && renderGenaiForm(formData, updateField)}
      {selectedSourceType && !isCoreType && renderGenericForm(formData, updateField)}

      {/* Short title */}
      {selectedSourceType && (
        <div className="ic-field">
          <label className="ic-label" htmlFor="ic-short-title">
            Short Title
            <FieldHelp
              ruleNumber="1.4"
              description="A short title may be assigned to a source for use in subsequent references."
              example="Mabo (No 2)"
            />
          </label>
          <div className="ic-short-title-row">
            <input
              id="ic-short-title"
              className="ic-input"
              type="text"
              value={shortTitle}
              placeholder="e.g. Mabo (No 2)"
              onChange={(e) => {
                setShortTitle(e.target.value);
                setShortTitleTouched(true);
              }}
            />
            {llmConfig?.enabled && (
              <button
                type="button"
                className="ic-ai-suggest-link"
                disabled={aiSuggestLoading}
                onClick={async () => {
                  if (!llmConfig || !selectedSourceType) return;
                  setAiSuggestLoading(true);
                  try {
                    const tempCitation = buildPreviewCitation(
                      selectedSourceType as SourceType,
                      formData,
                      shortTitle,
                    );
                    const suggestion = await suggestShortTitleLlm(tempCitation, llmConfig);
                    setShortTitle(suggestion);
                    setShortTitleTouched(true);
                  } catch {
                    // Silently fail — user can still type manually
                  } finally {
                    setAiSuggestLoading(false);
                  }
                }}
              >
                {aiSuggestLoading ? "..." : "(AI suggest)"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {selectedSourceType && (
        <div className="ic-preview-section">
          <div className="ic-label">Preview</div>
          <CitationPreview
            runs={previewRuns}
            sourceType={selectedSourceType as SourceType}
            onParsed={(parsedData) => {
              // Merge parsed fields into formData
              setFormData((prev) => ({ ...prev, ...parsedData }));
            }}
            onOverride={(text) => {
              // Store override text for direct insertion
              setFormData((prev) => ({ ...prev, _overrideText: text }));
            }}
            onSourceTypeDetected={(detectedType) => {
              // AI detected a different source type — switch the form
              const st = detectedType as SourceType;
              // Find the category that contains this source type
              const matchingCategory = SOURCE_TYPE_CATEGORIES.find((cat) =>
                cat.groups.some((g) => g.types.some((t) => t.value === st)),
              );
              if (matchingCategory) {
                setSelectedCategory(matchingCategory.label);
              }
              setSelectedSourceType(st);
            }}
          />
        </div>
      )}

      {/* Feedback */}
      <div aria-live="polite" role="status">
        {feedback && (
          <div className={`ic-feedback ic-feedback--${feedback.type}`}>
            {feedback.type === "error" ? "Error: " : "Success: "}
            {feedback.message}
          </div>
        )}
      </div>

      {/* Insert button */}
      {selectedSourceType && (
        <button
          className="ic-insert-btn"
          type="button"
          disabled={inserting || previewRuns.length === 0}
          onClick={handleInsert}
        >
          {inserting ? "Inserting..." : "Insert as Footnote"}
        </button>
      )}
    </div>
  );
}

// ─── Form Renderers ──────────────────────────────────────────────────────────

function renderCaseReportedForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  onCaseSelect: (result: LookupResult) => void,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-party1">
          Party 1
          <FieldHelp
            ruleNumber="2.2.1"
            description="The first-named party in the case name. Italicised in the citation."
            example="Mabo"
          />
        </label>
        <TypeaheadInput
          id="ic-party1"
          className="ic-input"
          value={(data.party1 as string) || ""}
          placeholder="e.g. Mabo"
          searchFn={searchCases}
          onSelect={onCaseSelect}
          onChange={(v) => updateField("party1", v)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-separator">
            Separator
          </label>
          <select
            id="ic-separator"
            className="ic-select"
            value={(data.separator as string) || "v"}
            onChange={(e) => updateField("separator", e.target.value)}
          >
            <option value="v">v</option>
            <option value="Re">Re</option>
            <option value="Ex parte">Ex parte</option>
          </select>
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-party2">
            Party 2
          </label>
          <input
            id="ic-party2"
            className="ic-input"
            type="text"
            value={(data.party2 as string) || ""}
            placeholder="e.g. Queensland"
            onChange={(e) => updateField("party2", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-year">
            Year
          </label>
          <input
            id="ic-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 1992"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-year-type">
            Year Type
            <FieldHelp
              ruleNumber="2.2.1"
              description="Round brackets for volume-organised series; square brackets for year-organised series."
              example="(1992) = round, [1974] = square"
            />
          </label>
          <select
            id="ic-year-type"
            className="ic-select"
            value={(data.yearType as string) || "round"}
            onChange={(e) => updateField("yearType", e.target.value)}
          >
            <option value="round">Round (year)</option>
            <option value="square">Square [year]</option>
          </select>
        </div>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-volume">
            Volume
          </label>
          <input
            id="ic-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. 175"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-report-series">
            Report Series
            <FieldHelp
              ruleNumber="2.2.2"
              description="The abbreviation of the report series. Use the authorised abbreviation where possible."
              example="CLR, FCR, NSWLR"
            />
          </label>
          <input
            id="ic-report-series"
            className="ic-input"
            type="text"
            value={(data.reportSeries as string) || ""}
            placeholder="e.g. CLR"
            onChange={(e) => updateField("reportSeries", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-starting-page">
            Starting Page
          </label>
          <input
            id="ic-starting-page"
            className="ic-input"
            type="text"
            value={(data.startingPage as string) || ""}
            placeholder="e.g. 1"
            onChange={(e) => updateField("startingPage", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-court-id">
            Court ID
            <FieldHelp
              ruleNumber="2.2.6"
              description="Omitted when apparent from the report series (e.g. CLR implies HCA)."
              example="HCA, FCA, NSWSC"
            />
          </label>
          <input
            id="ic-court-id"
            className="ic-input"
            type="text"
            value={(data.courtId as string) || ""}
            placeholder="e.g. HCA"
            onChange={(e) => updateField("courtId", e.target.value)}
          />
        </div>
      </div>

      {/* Parallel Citations (Rule 2.2.7) */}
      <div className="ic-parallel-section">
        <div className="ic-label">
          Parallel Citations
          <FieldHelp
            ruleNumber="2.2.7"
            description="When a case is reported in more than one report series, parallel citations are provided, separated by semicolons."
            example="[1974] VR 1; (1974) 4 ALR 57"
          />
        </div>
        {((data.parallelCitations as ParallelCitation[]) || []).map(
          (pc: ParallelCitation, index: number) => (
            <div key={index} className="ic-parallel-entry">
              <div className="ic-field-row">
                <div className="ic-field ic-field--grow">
                  <label className="ic-label" htmlFor={`ic-pc-year-type-${index}`}>
                    Year Type
                  </label>
                  <select
                    id={`ic-pc-year-type-${index}`}
                    className="ic-select"
                    value={pc.yearType || "round"}
                    onChange={(e) => {
                      const pcs = [
                        ...((data.parallelCitations as ParallelCitation[]) || []),
                      ];
                      pcs[index] = { ...pcs[index], yearType: e.target.value as "round" | "square" };
                      updateField("parallelCitations", pcs);
                    }}
                  >
                    <option value="round">Round (year)</option>
                    <option value="square">Square [year]</option>
                  </select>
                </div>
                <div className="ic-field ic-field--grow">
                  <label className="ic-label" htmlFor={`ic-pc-year-${index}`}>
                    Year
                  </label>
                  <input
                    id={`ic-pc-year-${index}`}
                    className="ic-input"
                    type="text"
                    value={pc.year || ""}
                    placeholder="e.g. 1974"
                    onChange={(e) => {
                      const pcs = [
                        ...((data.parallelCitations as ParallelCitation[]) || []),
                      ];
                      pcs[index] = { ...pcs[index], year: Number(e.target.value) || 0 };
                      updateField("parallelCitations", pcs);
                    }}
                  />
                </div>
                <div className="ic-field ic-field--grow">
                  <label className="ic-label" htmlFor={`ic-pc-volume-${index}`}>
                    Volume
                  </label>
                  <input
                    id={`ic-pc-volume-${index}`}
                    className="ic-input"
                    type="text"
                    value={pc.volume ?? ""}
                    placeholder="Optional"
                    onChange={(e) => {
                      const pcs = [
                        ...((data.parallelCitations as ParallelCitation[]) || []),
                      ];
                      const val = e.target.value.trim();
                      pcs[index] = {
                        ...pcs[index],
                        volume: val ? Number(val) || undefined : undefined,
                      };
                      updateField("parallelCitations", pcs);
                    }}
                  />
                </div>
              </div>
              <div className="ic-field-row">
                <div className="ic-field ic-field--grow">
                  <label className="ic-label" htmlFor={`ic-pc-series-${index}`}>
                    Report Series
                  </label>
                  <input
                    id={`ic-pc-series-${index}`}
                    className="ic-input"
                    type="text"
                    value={pc.reportSeries || ""}
                    placeholder="e.g. ALR"
                    onChange={(e) => {
                      const pcs = [
                        ...((data.parallelCitations as ParallelCitation[]) || []),
                      ];
                      pcs[index] = { ...pcs[index], reportSeries: e.target.value };
                      updateField("parallelCitations", pcs);
                    }}
                  />
                </div>
                <div className="ic-field ic-field--grow">
                  <label className="ic-label" htmlFor={`ic-pc-page-${index}`}>
                    Starting Page
                  </label>
                  <input
                    id={`ic-pc-page-${index}`}
                    className="ic-input"
                    type="text"
                    value={pc.startingPage || ""}
                    placeholder="e.g. 57"
                    onChange={(e) => {
                      const pcs = [
                        ...((data.parallelCitations as ParallelCitation[]) || []),
                      ];
                      pcs[index] = { ...pcs[index], startingPage: Number(e.target.value) || 0 };
                      updateField("parallelCitations", pcs);
                    }}
                  />
                </div>
                <button
                  className="ic-remove-btn"
                  type="button"
                  aria-label={`Remove parallel citation ${index + 1}`}
                  onClick={() => {
                    const pcs = (
                      (data.parallelCitations as ParallelCitation[]) || []
                    ).filter((_: ParallelCitation, i: number) => i !== index);
                    updateField("parallelCitations", pcs);
                  }}
                >
                  x
                </button>
              </div>
            </div>
          ),
        )}
        <button
          className="ic-add-btn"
          type="button"
          onClick={() => {
            const pcs = [
              ...((data.parallelCitations as ParallelCitation[]) || []),
              {
                yearType: "round" as const,
                year: 0,
                reportSeries: "",
                startingPage: 0,
              },
            ];
            updateField("parallelCitations", pcs);
          }}
        >
          + Add parallel citation
        </button>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-pinpoint">
          Pinpoint
          <FieldHelp
            ruleNumber="2.2.5"
            description="A specific page, paragraph, or other reference within the source."
            example="6 or [23]"
          />
        </label>
        <input
          id="ic-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 6 or [23]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderLegislationForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  onLegislationSelect: (result: LookupResult) => void,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-leg-title">
          Title
          <FieldHelp
            ruleNumber="3.1"
            description="The title of the Act as it appears in the statute book. Italicised in the citation."
            example="Competition and Consumer Act 2010"
          />
        </label>
        <TypeaheadInput
          id="ic-leg-title"
          className="ic-input"
          value={(data.title as string) || ""}
          placeholder="e.g. Competition and Consumer Act"
          searchFn={searchLegislation}
          onSelect={onLegislationSelect}
          onChange={(v) => updateField("title", v)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-leg-year">
            Year
          </label>
          <input
            id="ic-leg-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2010"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-leg-jurisdiction">
            Jurisdiction
            <FieldHelp
              ruleNumber="3.1"
              description="The abbreviated jurisdiction of the legislation."
              example="Cth, NSW, Vic"
            />
          </label>
          <select
            id="ic-leg-jurisdiction"
            className="ic-select"
            value={(data.jurisdiction as string) || ""}
            onChange={(e) => updateField("jurisdiction", e.target.value)}
          >
            <option value="">Select...</option>
            {JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-leg-pinpoint">
          Pinpoint
          <FieldHelp
            ruleNumber="3.1.4"
            description="Section, part, schedule, or other subdivision reference."
            example="s 51(xxxi)"
          />
        </label>
        <input
          id="ic-leg-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. s 51(xxxi)"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderJournalForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, "5")}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ja-title">
          Article Title
          <FieldHelp
            ruleNumber="5.1"
            description="The title of the article, enclosed in single quotation marks."
            example="'The Rule of Law'"
          />
        </label>
        <input
          id="ic-ja-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Rule of Law"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ja-year">
            Year
          </label>
          <input
            id="ic-ja-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2020"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ja-volume">
            Volume
          </label>
          <input
            id="ic-ja-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. 44"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ja-issue">
            Issue
          </label>
          <input
            id="ic-ja-issue"
            className="ic-input"
            type="text"
            value={(data.issue as string) || ""}
            placeholder="e.g. 2"
            onChange={(e) => updateField("issue", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ja-journal">
          Journal Name
          <FieldHelp
            ruleNumber="5.2"
            description="The abbreviated journal name. Italicised in the citation."
            example="Melbourne University Law Review"
          />
        </label>
        <input
          id="ic-ja-journal"
          className="ic-input"
          type="text"
          value={(data.journal as string) || ""}
          placeholder="e.g. Melbourne University Law Review"
          onChange={(e) => updateField("journal", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ja-start-page">
            Starting Page
          </label>
          <input
            id="ic-ja-start-page"
            className="ic-input"
            type="text"
            value={(data.startingPage as string) || ""}
            placeholder="e.g. 123"
            onChange={(e) => updateField("startingPage", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ja-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-ja-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. 130"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function renderBookForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, "6")}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-book-title">
          Title
          <FieldHelp
            ruleNumber="6.1"
            description="The title of the book. Italicised in the citation."
            example="The Common Law"
          />
        </label>
        <input
          id="ic-book-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Common Law"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-book-publisher">
          Publisher
        </label>
        <input
          id="ic-book-publisher"
          className="ic-input"
          type="text"
          value={(data.publisher as string) || ""}
          placeholder="e.g. Oxford University Press"
          onChange={(e) => updateField("publisher", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-book-edition">
            Edition
          </label>
          <input
            id="ic-book-edition"
            className="ic-input"
            type="text"
            value={(data.edition as string) || ""}
            placeholder="e.g. 3rd"
            onChange={(e) => updateField("edition", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-book-year">
            Year
          </label>
          <input
            id="ic-book-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2019"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-book-pinpoint">
          Pinpoint
          <FieldHelp
            ruleNumber="6.4"
            description="A specific page, paragraph, or chapter reference within the book."
            example="42"
          />
        </label>
        <input
          id="ic-book-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 42"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderTreatyForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-treaty-title">
          Treaty Title
          <FieldHelp
            ruleNumber="8.1"
            description="The full title of the treaty. Italicised in the citation."
            example="Convention on the Rights of the Child"
          />
        </label>
        <input
          id="ic-treaty-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Convention on the Rights of the Child"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-treaty-opened">
          Opened/Signed Date
        </label>
        <input
          id="ic-treaty-opened"
          className="ic-input"
          type="text"
          value={(data.openedDate as string) || ""}
          placeholder="e.g. 20 November 1989"
          onChange={(e) => updateField("openedDate", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-treaty-series">
            Treaty Series
          </label>
          <input
            id="ic-treaty-series"
            className="ic-input"
            type="text"
            value={(data.treatySeries as string) || ""}
            placeholder="e.g. UNTS"
            onChange={(e) => updateField("treatySeries", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-treaty-volume">
            Volume
          </label>
          <input
            id="ic-treaty-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. 1577"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-treaty-start-page">
            Starting Page
          </label>
          <input
            id="ic-treaty-start-page"
            className="ic-input"
            type="text"
            value={(data.startingPage as string) || ""}
            placeholder="e.g. 3"
            onChange={(e) => updateField("startingPage", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-treaty-eif">
          Entry Into Force Date
        </label>
        <input
          id="ic-treaty-eif"
          className="ic-input"
          type="text"
          value={(data.entryIntoForceDate as string) || ""}
          placeholder="e.g. 2 September 1990"
          disabled={!!data.notYetInForce}
          onChange={(e) => updateField("entryIntoForceDate", e.target.value)}
        />
      </div>

      <div className="ic-field ic-field--checkbox">
        <label className="ic-checkbox-label">
          <input
            type="checkbox"
            checked={!!data.notYetInForce}
            onChange={(e) => {
              updateField("notYetInForce", e.target.checked);
              if (e.target.checked) {
                updateField("entryIntoForceDate", "");
              }
            }}
          />
          Not yet in force
        </label>
      </div>
    </div>
  );
}

function renderGenaiForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
): JSX.Element {
  const isOtherPlatform = (data.platform as string) === "__other__";
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-genai-platform">
          Platform
          <FieldHelp
            ruleNumber="7.12"
            description="The AI platform used to generate the output."
            example="ChatGPT, Claude, Gemini"
          />
        </label>
        <select
          id="ic-genai-platform"
          className="ic-select"
          value={isOtherPlatform ? "__other__" : (data.platform as string) || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "__other__") {
              updateField("platform", "__other__");
              updateField("platformCustom", "");
            } else {
              updateField("platform", val);
              updateField("platformCustom", "");
            }
          }}
        >
          <option value="">Select a platform...</option>
          <option value="ChatGPT">ChatGPT</option>
          <option value="Claude">Claude</option>
          <option value="Gemini">Gemini</option>
          <option value="Copilot">Copilot</option>
          <option value="__other__">Other</option>
        </select>
      </div>

      {isOtherPlatform && (
        <div className="ic-field">
          <label className="ic-label" htmlFor="ic-genai-platform-custom">
            Platform Name
          </label>
          <input
            id="ic-genai-platform-custom"
            className="ic-input"
            type="text"
            value={(data.platformCustom as string) || ""}
            placeholder="e.g. Perplexity"
            onChange={(e) => updateField("platformCustom", e.target.value)}
          />
        </div>
      )}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-genai-model">
          Model
        </label>
        <input
          id="ic-genai-model"
          className="ic-input"
          type="text"
          value={(data.model as string) || ""}
          placeholder="e.g. GPT-4o, Claude Sonnet 4.6"
          onChange={(e) => updateField("model", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-genai-prompt">
          Prompt (optional)
        </label>
        <textarea
          id="ic-genai-prompt"
          className="ic-textarea"
          value={(data.prompt as string) || ""}
          placeholder="What did you ask the AI?"
          rows={3}
          onChange={(e) => updateField("prompt", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-genai-date">
          Date of Output
        </label>
        <input
          id="ic-genai-date"
          className="ic-input"
          type="date"
          value={(data.outputDate as string) || ""}
          onChange={(e) => updateField("outputDate", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-genai-url">
          URL (optional)
        </label>
        <input
          id="ic-genai-url"
          className="ic-input"
          type="url"
          value={(data.url as string) || ""}
          placeholder="e.g. https://chat.openai.com/share/..."
          onChange={(e) => updateField("url", e.target.value)}
        />
      </div>

      <div className="ic-note">
        Per MULR interim guidance, AI-generated content is cited as written
        correspondence (Rule 7.12). This will be updated when AGLC5 provides
        formal guidance.
      </div>
    </div>
  );
}

function renderGenericForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gen-author">
          Author
        </label>
        <input
          id="ic-gen-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="Author name"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gen-title">
          Title
        </label>
        <input
          id="ic-gen-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="Title"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gen-year">
          Year
        </label>
        <input
          id="ic-gen-year"
          className="ic-input"
          type="text"
          value={(data.year as string) || ""}
          placeholder="Year"
          onChange={(e) => updateField("year", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gen-additional">
          Additional Fields
        </label>
        <textarea
          id="ic-gen-additional"
          className="ic-textarea"
          value={(data.additional as string) || ""}
          placeholder="Enter any additional citation details here..."
          rows={3}
          onChange={(e) => updateField("additional", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderAuthorsFields(
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  ruleNumber: string,
): JSX.Element {
  return (
    <div className="ic-authors-section">
      <div className="ic-label">
        Authors
        <FieldHelp
          ruleNumber={ruleNumber}
          description="Enter the author's given names and surname separately. Add multiple authors as needed."
          example="James Crawford"
        />
      </div>
      {authorsList.map((author, index) => (
        <div key={index} className="ic-field-row ic-author-row">
          <div className="ic-field ic-field--grow">
            <input
              className="ic-input"
              type="text"
              value={author.givenNames}
              placeholder="Given names"
              aria-label={`Author ${index + 1} given names`}
              onChange={(e) => updateAuthor(index, "givenNames", e.target.value)}
            />
          </div>
          <div className="ic-field ic-field--grow">
            <input
              className="ic-input"
              type="text"
              value={author.surname}
              placeholder="Surname"
              aria-label={`Author ${index + 1} surname`}
              onChange={(e) => updateAuthor(index, "surname", e.target.value)}
            />
          </div>
          {authorsList.length > 1 && (
            <button
              className="ic-remove-btn"
              type="button"
              aria-label={`Remove author ${index + 1}`}
              onClick={() => removeAuthor(index)}
            >
              x
            </button>
          )}
        </div>
      ))}
      <button className="ic-add-btn" type="button" onClick={addAuthor}>
        + Add Author
      </button>
    </div>
  );
}
