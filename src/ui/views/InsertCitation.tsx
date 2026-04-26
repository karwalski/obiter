/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Citation, SourceType, SourceData, AustralianJurisdiction, ParallelCitation, INTRODUCTORY_SIGNALS, IntroductorySignal } from "../../types/citation";
import type { CitationStandardId } from "../../engine/standards";
import { getStandardConfig, buildCourtConfig } from "../../engine/standards";
import { getDevicePref } from "../../store/devicePreferences";
import { FormattedRun } from "../../types/formattedRun";
import { CitationStore } from "../../store/citationStore";
import { getSharedStore } from "../../store/singleton";
import { insertCitationFootnote, getAllCitationFootnotes } from "../../word/footnoteManager";
import type { CitationFootnoteEntry } from "../../word/footnoteManager";
import { getFormattedPreview } from "../../engine/engine";
import CitationPreview from "../components/CitationPreview";
import FieldHelp from "../components/FieldHelp";
import TypeaheadInput from "../components/TypeaheadInput";
import { useCitationContext } from "../context/CitationContext";
import { useInsertCitationContext, type AuthorEntry } from "../context/InsertCitationContext";
import { searchViaAdapters } from "../../api/adapterSearch";
import { isMasterEnabled } from "../../api/sourceRegistry";
import { checkCorpusAvailable } from "../../api/corpus/corpusDownload";
import { LookupResult } from "../../api/types";
import { loadLlmConfig, LLMConfig } from "../../llm/config";
import { classifySourceType, ClassificationResult } from "../../llm/classifySource";
import { parseCitationText, ParsedCitation } from "../../llm/parseCitation";
import { suggestShortTitle as suggestShortTitleLlm } from "../../llm/suggestShortTitle";
import { getCitationLabel, getSourceTypeBadge } from "./CitationLibrary";
import {
  type CourtJurisdiction,
  type SubsequentTreatment,
  SUBSEQUENT_TREATMENT_OPTIONS,
  NEGATIVE_TREATMENTS,
  QLD_JURISDICTIONS,
  NSW_JURISDICTIONS,
  VIC_JURISDICTIONS,
  isCourtJurisdiction,
  getCourtPreset,
} from "../../engine/court/presets";
import {
  courtGuideQldSelectivity,
  courtGuideNswSelectivity,
  courtGuideVicAglcAdoption,
} from "../data/referenceGuide";

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
      {
        label: "Other",
        types: [
          { value: "custom", label: "Custom / Manual Citation" },
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

const JURISDICTIONS_AU: { value: AustralianJurisdiction; label: string }[] = [
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

const JURISDICTIONS_UK: { value: string; label: string }[] = [
  { value: "UK", label: "United Kingdom" },
  { value: "England and Wales", label: "England and Wales" },
  { value: "Scotland", label: "Scotland" },
  { value: "Northern Ireland", label: "Northern Ireland" },
];

const JURISDICTIONS_NZ: { value: string; label: string }[] = [
  { value: "NZ", label: "New Zealand" },
];

/**
 * SWITCH-004: Returns the jurisdiction options appropriate for the active
 * citation standard.
 */
function getJurisdictionsForStandard(
  standardId: CitationStandardId,
): { value: string; label: string }[] {
  if (standardId.startsWith("oscola")) return JURISDICTIONS_UK;
  if (standardId.startsWith("nzlsg")) return JURISDICTIONS_NZ;
  return JURISDICTIONS_AU;
}

/**
 * SWITCH-004: Filters SOURCE_TYPE_CATEGORIES to hide foreign jurisdiction
 * types irrelevant to the active standard.
 *
 * - AGLC: show all (no filtering)
 * - OSCOLA: hide foreign.* except foreign.uk
 * - NZLSG: hide foreign.* except foreign.new_zealand
 */
function filterCategoriesForStandard(
  categories: SourceTypeCategory[],
  standardId: CitationStandardId,
): SourceTypeCategory[] {
  if (standardId.startsWith("aglc")) return categories;

  const keepForeign = standardId.startsWith("oscola")
    ? "foreign.uk"
    : standardId.startsWith("nzlsg")
      ? "foreign.new_zealand"
      : null;

  return categories
    .map((cat) => {
      const filteredGroups = cat.groups
        .map((group) => ({
          ...group,
          types: group.types.filter((t) => {
            if (!t.value.startsWith("foreign.")) return true;
            return keepForeign !== null && t.value === keepForeign;
          }),
        }))
        .filter((group) => group.types.length > 0);
      return { ...cat, groups: filteredGroups };
    })
    .filter((cat) => cat.groups.length > 0);
}

/**
 * SWITCH-004: Returns the aglcVersion string for a given standard.
 */
function getVersionForStandard(standardId: CitationStandardId): "4" | "5" {
  if (standardId === "aglc5" || standardId === "oscola5") return "5";
  return "4";
}

// ─── Core Source Types (with dedicated forms) ────────────────────────────────

const CORE_SOURCE_TYPES: SourceType[] = [
  "case.reported",
  "case.unreported.mnc",
  "case.unreported.no_mnc",
  "case.proceeding",
  "case.court_order",
  "case.quasi_judicial",
  "case.arbitration",
  "case.transcript",
  "case.submission",
  "legislation.statute",
  "legislation.bill",
  "legislation.constitution",
  "legislation.explanatory",
  "legislation.quasi",
  "journal.article",
  "book",
  "treaty",
  "genai_output",
  "report",
  "report.parliamentary",
  "report.royal_commission",
  "report.law_reform",
  "report.abs",
  "research_paper",
  "research_paper.parliamentary",
  "conference_paper",
  "thesis",
  "speech",
  "press_release",
  "hansard",
  "submission.government",
  "evidence.parliamentary",
  "constitutional_convention",
  "dictionary",
  "legal_encyclopedia",
  "looseleaf",
  "ip_material",
  "constitutive_document",
  "newspaper",
  "correspondence",
  "interview",
  "film_tv_media",
  "internet_material",
  "social_media",
  "journal.online",
  "journal.forthcoming",
  "book.chapter",
  "book.translated",
  "book.audiobook",
  "foreign.canada",
  "foreign.china",
  "foreign.france",
  "foreign.germany",
  "foreign.hong_kong",
  "foreign.malaysia",
  "foreign.new_zealand",
  "foreign.singapore",
  "foreign.south_africa",
  "foreign.uk",
  "foreign.usa",
  "foreign.other",
  "un.document",
  "un.communication",
  "un.yearbook",
  "icj.decision",
  "icj.pleading",
  "arbitral.state_state",
  "arbitral.individual_state",
  "icc_tribunal.case",
  "wto.document",
  "wto.decision",
  "gatt.document",
  "eu.official_journal",
  "eu.court",
  "echr.decision",
  "supranational.decision",
  "supranational.document",
  "custom",
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
function buildPreviewCitation(
  sourceType: SourceType,
  data: SourceData,
  shortTitle?: string,
  aglcVersion?: "4" | "5",
  signalValue?: IntroductorySignal | "",
  commentaryBeforeValue?: string,
  commentaryAfterValue?: string,
): Citation {
  return {
    id: "",
    aglcVersion: aglcVersion ?? "4",
    sourceType,
    data: { ...data },
    shortTitle: shortTitle || undefined,
    signal: signalValue || undefined,
    commentaryBefore: commentaryBeforeValue || undefined,
    commentaryAfter: commentaryAfterValue || undefined,
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

// ─── Adapter-Based Search Functions ──────────────────────────────────────────

/**
 * Case search via the adapter framework (Epic 17). Queries all enabled
 * adapters that support the "case" content type.
 */
const searchCases = (q: string): Promise<LookupResult[]> =>
  searchViaAdapters(q, "case");

/**
 * Legislation search via the adapter framework (Epic 17). Queries all
 * enabled adapters that support the "legislation" content type.
 */
const searchLegislation = (q: string): Promise<LookupResult[]> =>
  searchViaAdapters(q, "legislation");

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

// ─── Shared Store ────────────────────────────────────────────────────────────

async function getStore(): Promise<CitationStore> {
  return getSharedStore();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InsertCitation(): JSX.Element {
  // API-007: User-entered form data is stored in context so it survives
  // navigation away from this view and back again.
  const {
    selectedCategory, setSelectedCategory,
    selectedSourceType, setSelectedSourceType,
    formData, setFormData,
    shortTitle, setShortTitle,
    shortTitleTouched, setShortTitleTouched,
    authors, setAuthors,
    signal, setSignal,
    commentaryBefore, setCommentaryBefore,
    commentaryAfter, setCommentaryAfter,
    appendToFootnote, setAppendToFootnote,
    selectedFootnoteIndex, setSelectedFootnoteIndex,
    classifyDescription, setClassifyDescription,
    classifyResult, setClassifyResult,
    pasteCitationExpanded, setPasteCitationExpanded,
    pasteCitationText, setPasteCitationText,
    pasteCitationResult, setPasteCitationResult,
    standardId, setStandardId,
    courtJurisdiction, setCourtJurisdiction,
    recentExpanded, setRecentExpanded,
    resetForm,
  } = useInsertCitationContext();

  // Transient states — remain local, reset on unmount is fine
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [inserting, setInserting] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  // AI-ENH-001: Paste Citation transient state
  const [pasteCitationLoading, setPasteCitationLoading] = useState(false);
  const [pasteCitationError, setPasteCitationError] = useState<string | null>(null);

  // BUGS-013: Existing footnotes loaded from Word on mount
  const [existingFootnotes, setExistingFootnotes] = useState<CitationFootnoteEntry[]>([]);

  // Source lookup enabled — always true when corpus is downloaded (local, no
  // network call), or when the master toggle is on for network adapters.
  const [searchEnabled] = useState(() => isMasterEnabled() || checkCorpusAvailable());

  // COURT-007 / COURT-010: Court mode transient state
  const [unreportedGateShown, setUnreportedGateShown] = useState<Set<string>>(new Set());
  const [unreportedGateVisible, setUnreportedGateVisible] = useState(false);
  const [courtGuideReminderDismissed, setCourtGuideReminderDismissed] = useState(false);

  // RIBBON-002: Recent citations state (loaded from store on mount)
  const [recentCitations, setRecentCitations] = useState<Citation[]>([]);

  // Load LLM config on mount to determine if AI suggest is available
  useEffect(() => {
    const config = loadLlmConfig();
    setLlmConfig(config);
  }, []);

  // COURT-007: Load court jurisdiction from store on mount and refresh
  const { refreshCounter, triggerRefresh } = useCitationContext();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const store = await getStore();
        // SWITCH-004: Load active standard
        if (!cancelled) {
          setStandardId(store.getStandardId());
        }
        const mode = store.getWritingMode();
        const jurisdictionId = store.getCourtJurisdiction();
        if (!cancelled) {
          if (mode === "court" && jurisdictionId && isCourtJurisdiction(jurisdictionId)) {
            setCourtJurisdiction(jurisdictionId as CourtJurisdiction);
          } else {
            setCourtJurisdiction(null);
          }
        }
      } catch {
        // Silently fail
      }
    })();
    return () => { cancelled = true; };
  }, [refreshCounter]);

  // ─── SWITCH-004: Derived standard values ────────────────────────────────
  const standardConfig = getStandardConfig(standardId);
  const standardLabel = standardConfig.standardLabel;
  const isAglcStandard = standardId.startsWith("aglc");
  const filteredCategories = useMemo(
    () => filterCategoriesForStandard(SOURCE_TYPE_CATEGORIES, standardId),
    [standardId],
  );
  const jurisdictionOptions = useMemo(
    () => getJurisdictionsForStandard(standardId),
    [standardId],
  );

  // ─── Derived court mode flags ──────────────────────────────────────────
  // COURT-FIX-006: Build court config from device preferences so that the
  // unreported gate reads the toggle value (which may be user-overridden)
  // instead of the hardcoded jurisdiction set.
  const courtConfig = useMemo(() => {
    const courtToggles = getDevicePref("courtToggles") as Record<string, string> | undefined;
    return buildCourtConfig(getStandardConfig(standardId), courtToggles);
  }, [standardId]);

  const isUnreportedGateActive = courtJurisdiction !== null &&
    courtConfig.unreportedGateMode === "warn";
  const isQldMode = courtJurisdiction !== null &&
    QLD_JURISDICTIONS.has(courtJurisdiction);
  const isNswMode = courtJurisdiction !== null &&
    NSW_JURISDICTIONS.has(courtJurisdiction);
  const isVicMode = courtJurisdiction !== null &&
    VIC_JURISDICTIONS.has(courtJurisdiction);

  // BUGS-013: Load existing footnotes when the append toggle is enabled
  useEffect(() => {
    if (!appendToFootnote) {
      setExistingFootnotes([]);
      setSelectedFootnoteIndex(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const entries = await getAllCitationFootnotes();
        if (!cancelled) {
          setExistingFootnotes(entries);
          // Default to the last footnote if any exist
          if (entries.length > 0) {
            // Find the highest footnote index
            const maxIndex = Math.max(...entries.map((e) => e.footnoteIndex));
            setSelectedFootnoteIndex(maxIndex);
          }
        }
      } catch {
        if (!cancelled) {
          setExistingFootnotes([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [appendToFootnote, refreshCounter]);

  // RIBBON-002: Load recent citations (sorted by modifiedAt desc, top 5)

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const store = await getStore();
        const all = store.getAll();
        const sorted = [...all]
          .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
          .slice(0, 5);
        if (!cancelled) setRecentCitations(sorted);
      } catch {
        // Silently fail
      }
    })();
    return () => { cancelled = true; };
  }, [refreshCounter]);

  // RIBBON-002: Re-insert a recent citation (auto mode — same logic as Library)
  const handleReinsert = useCallback(async (citation: Citation) => {
    try {
      // BUGS-011: Always insert as full citation — refreshAllCitations will
      // rescan footnotes in document order and assign the correct format
      // (full for earliest, short/ibid for subsequent) regardless of where
      // the cursor is positioned relative to existing occurrences.
      const runs = getFormattedPreview(citation, courtConfig);

      const title = citation.shortTitle || getCitationLabel(citation);
      await insertCitationFootnote(citation.id, title, runs);

      triggerRefresh();
      setFeedback({ type: "success", message: "Citation re-inserted as footnote." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to re-insert citation";
      setFeedback({ type: "error", message });
    }
  }, [triggerRefresh, courtConfig]);

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
    setSignal("");
    setCommentaryBefore("");
    setCommentaryAfter("");
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
    setSignal("");
    setCommentaryBefore("");
    setCommentaryAfter("");
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

  // ─── AI-ENH-001: Paste Citation Handler ─────────────────────────────────

  const handleParseCitation = useCallback(async () => {
    if (!llmConfig || !pasteCitationText.trim()) return;
    setPasteCitationLoading(true);
    setPasteCitationResult(null);
    setPasteCitationError(null);
    try {
      const result = await parseCitationText(pasteCitationText.trim(), llmConfig);
      setPasteCitationResult(result);

      // Auto-select category and source type in the dropdowns
      const match = findCategoryForSourceType(result.sourceType);
      if (match) {
        setSelectedCategory(match.category);
        setSelectedSourceType(result.sourceType);
      }

      // Populate form data with extracted fields
      const newFormData: SourceData = { ...result.data };

      // Extract authors array if present and populate the authors state
      const extractedAuthors = result.data.authors as
        | Array<{ givenNames?: string; surname?: string }>
        | undefined;
      if (Array.isArray(extractedAuthors) && extractedAuthors.length > 0) {
        const authorEntries: AuthorEntry[] = extractedAuthors.map((a) => ({
          givenNames: a.givenNames ?? "",
          surname: a.surname ?? "",
        }));
        setAuthors(authorEntries);
        newFormData.authors = authorEntries;
      } else {
        setAuthors([{ givenNames: "", surname: "" }]);
      }

      setFormData(newFormData);

      // Set short title if suggested
      if (result.shortTitle) {
        setShortTitle(result.shortTitle);
        setShortTitleTouched(true);
      } else {
        setShortTitle("");
        setShortTitleTouched(false);
      }

      // Reset signals and commentary
      setSignal("");
      setCommentaryBefore("");
      setCommentaryAfter("");
      setFeedback(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not parse citation. Please fill in the fields manually.";
      setPasteCitationError(message);
    } finally {
      setPasteCitationLoading(false);
    }
  }, [llmConfig, pasteCitationText]);

  // ─── COURT-007: Unreported-judgment gate check ──────────────────────────

  /**
   * Determines whether to show the unreported-judgment gate warning.
   * Active when: court mode with warn gate, case source type, MNC only
   * (no report series), and not already dismissed for this case.
   */
  const shouldShowUnreportedGate = useMemo(() => {
    if (!isUnreportedGateActive) return false;
    if (!selectedSourceType || !selectedSourceType.startsWith("case.")) return false;

    // Check if the case has a report series (meaning it is reported)
    const reportSeries = (formData.reportSeries as string) || "";
    if (reportSeries.trim()) return false;

    // Must have at least a party name to trigger the gate
    const party1 = (formData.party1 as string) || "";
    if (!party1.trim()) return false;

    // Build a key for deduplication (once per case per document)
    const year = (formData.year as string) || "";
    const caseKey = `${party1.trim()}_${year.trim()}`;
    if (unreportedGateShown.has(caseKey)) return false;

    return true;
  }, [isUnreportedGateActive, selectedSourceType, formData, unreportedGateShown]);

  const handleUnreportedGateProceed = useCallback(() => {
    const party1 = (formData.party1 as string) || "";
    const year = (formData.year as string) || "";
    const caseKey = `${party1.trim()}_${year.trim()}`;
    setUnreportedGateShown((prev) => new Set(prev).add(caseKey));
    setUnreportedGateVisible(false);
  }, [formData]);

  const handleUnreportedGateCheck = useCallback(() => {
    // Leave citation in review state - user should check before proceeding
    setUnreportedGateVisible(false);
    setFeedback({
      type: "error",
      message: "Citation flagged for review: unreported judgment requires confirmation of material legal principle.",
    });
  }, []);

  // Show the gate notification when conditions are met
  useEffect(() => {
    setUnreportedGateVisible(shouldShowUnreportedGate);
  }, [shouldShowUnreportedGate]);

  // ─── Preview ────────────────────────────────────────────────────────────

  const previewRuns = useMemo((): FormattedRun[] => {
    if (!selectedSourceType) return [];

    const previewCitation = buildPreviewCitation(
      selectedSourceType as SourceType,
      formData,
      shortTitle,
      undefined,
      signal,
      commentaryBefore,
      commentaryAfter,
    );
    return getFormattedPreview(previewCitation, courtConfig);
  }, [selectedSourceType, formData, shortTitle, signal, commentaryBefore, commentaryAfter, courtConfig]);

  // ─── Clear Handler ──────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    resetForm();
    setFeedback(null);
  }, [resetForm]);

  // ─── Insert Handler ─────────────────────────────────────────────────────

  const handleInsert = useCallback(async () => {
    const overrideText = formData._overrideText as string | undefined;
    if (!selectedSourceType || (previewRuns.length === 0 && !overrideText)) {
      setFeedback({ type: "error", message: "Please fill in the required fields." });
      return;
    }

    setInserting(true);
    setFeedback(null);

    try {
      const id = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
          });
      const now = new Date().toISOString();
      const citation: Citation = {
        id,
        aglcVersion: getVersionForStandard(standardId),
        sourceType: selectedSourceType as SourceType,
        data: { ...formData },
        shortTitle: shortTitle || undefined,
        signal: signal || undefined,
        commentaryBefore: commentaryBefore || undefined,
        commentaryAfter: commentaryAfter || undefined,
        tags: [],
        createdAt: now,
        modifiedAt: now,
      };

      const store = await getStore();

      // BUGS-013: Determine if we should append to an existing footnote.
      const appendIndex = appendToFootnote && selectedFootnoteIndex > 0
        ? selectedFootnoteIndex
        : undefined;

      // Handle override mode — user typed citation text directly
      if (overrideText) {
        const overrideRuns: FormattedRun[] = [{ text: overrideText }];
        await store.add(citation);
        const title = shortTitle || citation.sourceType;
        await insertCitationFootnote(id, title, overrideRuns, appendIndex);
        triggerRefresh();
        setFeedback({ type: "success", message: "Citation inserted as footnote (manual override)." });
        setFormData({});
        setAuthors([{ givenNames: "", surname: "" }]);
        setShortTitle("");
        setShortTitleTouched(false);
        setSignal("");
        setCommentaryBefore("");
        setCommentaryAfter("");
        setInserting(false);
        return;
      }

      // BUG-009: Check if a matching citation already exists in the store
      const existingCitations = store.getAll();
      const existingMatch = findMatchingCitation(citation, existingCitations);

      let runsToInsert: FormattedRun[];

      if (existingMatch) {
        // BUGS-011: Always insert as full citation — refreshAllCitations will
        // rescan footnotes in document order and assign the correct format
        // (full for earliest, short/ibid for subsequent) regardless of where
        // the cursor is positioned relative to existing occurrences.
        runsToInsert = getFormattedPreview(existingMatch, courtConfig);

        // Don't add duplicate to store; use existing citation ID for the footnote
        const existingTitle = shortTitle || existingMatch.shortTitle || existingMatch.sourceType;
        await insertCitationFootnote(existingMatch.id, existingTitle, runsToInsert, appendIndex);
      } else {
        // First citation of this source — use full format from the engine
        runsToInsert = getFormattedPreview(citation, courtConfig);

        await store.add(citation);

        const title = shortTitle || citation.sourceType;
        await insertCitationFootnote(id, title, runsToInsert, appendIndex);
      }

      // BUG-003: Signal the Citation Library to refresh
      triggerRefresh();

      const successMsg = appendIndex
        ? `Citation appended to footnote ${appendIndex} (Rule 1.1.3).`
        : "Citation inserted as footnote.";
      setFeedback({ type: "success", message: successMsg });

      // Reset form
      setFormData({});
      setAuthors([{ givenNames: "", surname: "" }]);
      setShortTitle("");
      setShortTitleTouched(false);
      setSignal("");
      setCommentaryBefore("");
      setCommentaryAfter("");
      setAppendToFootnote(false);
      setSelectedFootnoteIndex(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback({ type: "error", message });
    } finally {
      setInserting(false);
    }
  }, [selectedSourceType, formData, shortTitle, previewRuns, triggerRefresh, standardId, signal, commentaryBefore, commentaryAfter, appendToFootnote, selectedFootnoteIndex, courtConfig]);

  // ─── Available sub-types for selected category ──────────────────────────

  const availableGroups = useMemo(() => {
    if (!selectedCategory) return [];
    const category = filteredCategories.find((c) => c.label === selectedCategory);
    return category ? category.groups : [];
  }, [selectedCategory, filteredCategories]);

  // ─── Determine whether a dedicated form exists ──────────────────────────

  const isCoreType = selectedSourceType && CORE_SOURCE_TYPES.includes(selectedSourceType as SourceType);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="insert-citation">
      <h2>Insert Citation</h2>

      {/* RIBBON-002: Recent Citations */}
      {recentCitations.length > 0 && (
        <div className="ic-recent-section">
          <div
            className="ic-recent-header"
            role="button"
            tabIndex={0}
            onClick={() => setRecentExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setRecentExpanded((prev) => !prev);
              }
            }}
            aria-expanded={recentExpanded}
          >
            <span className="ic-recent-title">Recent</span>
            <span className="ic-recent-chevron">{recentExpanded ? "\u25B2" : "\u25BC"}</span>
          </div>
          {recentExpanded && (
            <div className="ic-recent-list">
              {recentCitations.map((citation) => (
                <div key={citation.id} className="ic-recent-card">
                  <span className="ic-recent-badge">
                    {getSourceTypeBadge(citation.sourceType)}
                  </span>
                  <span className="ic-recent-label">
                    {getCitationLabel(citation)}
                  </span>
                  <button
                    type="button"
                    className="ic-recent-insert-btn"
                    onClick={() => void handleReinsert(citation)}
                  >
                    Re-insert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* AI-ENH-001: Paste Citation section */}
      {llmConfig?.enabled && (
        <div className="ic-paste-citation">
          <div
            className="ic-paste-citation-header"
            role="button"
            tabIndex={0}
            onClick={() => setPasteCitationExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setPasteCitationExpanded((prev) => !prev);
              }
            }}
            aria-expanded={pasteCitationExpanded}
          >
            <span className="ic-paste-citation-title">Paste Citation</span>
            <span className="ic-paste-citation-chevron">
              {pasteCitationExpanded ? "\u25B2" : "\u25BC"}
            </span>
          </div>
          {pasteCitationExpanded && (
            <div className="ic-paste-citation-body">
              <textarea
                className="ic-textarea"
                value={pasteCitationText}
                placeholder="Paste a formatted citation (e.g. Mabo v Queensland (No 2) (1992) 175 CLR 1)"
                rows={3}
                onChange={(e) => {
                  setPasteCitationText(e.target.value);
                  setPasteCitationResult(null);
                  setPasteCitationError(null);
                }}
              />
              <button
                type="button"
                className="ic-paste-citation-btn"
                disabled={pasteCitationLoading || !pasteCitationText.trim()}
                onClick={() => void handleParseCitation()}
              >
                {pasteCitationLoading ? "Parsing..." : "Parse"}
              </button>
              {pasteCitationResult && (
                <div className="ic-paste-citation-result">
                  <div className="ic-paste-citation-confidence">
                    Confidence: {Math.round(pasteCitationResult.confidence * 100)}%
                    {pasteCitationResult.standard && (
                      <> (detected as {pasteCitationResult.standard.toUpperCase()})</>
                    )}
                  </div>
                  <div className="ic-paste-citation-note">
                    Review the populated fields before inserting.
                  </div>
                </div>
              )}
              {pasteCitationError && (
                <div className="ic-paste-citation-error">
                  Could not parse citation. Please fill in the fields manually.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category selector */}
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-category">
          {standardLabel} Part
        </label>
        <select
          id="ic-category"
          className="ic-select"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">Select a category...</option>
          {filteredCategories.map((cat) => (
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
      {selectedSourceType === "case.reported" && renderCaseReportedForm(formData, updateField, handleCaseSelect, isAglcStandard, searchEnabled)}
      {selectedSourceType === "case.unreported.mnc" && renderCaseUnreportedMncForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "case.unreported.no_mnc" && renderCaseUnreportedNoMncForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "case.proceeding" && renderCaseProceedingForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "case.court_order" && renderCaseCourtOrderForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "case.quasi_judicial" && renderCaseQuasiJudicialForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "case.arbitration" && renderCaseArbitrationForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "case.transcript" && renderCaseTranscriptForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "case.submission" && renderCaseSubmissionForm(formData, updateField, isAglcStandard)}
      {(selectedSourceType === "legislation.statute" || selectedSourceType === "legislation.delegated") && renderLegislationForm(formData, updateField, handleLegislationSelect, jurisdictionOptions, isAglcStandard, searchEnabled)}
      {selectedSourceType === "legislation.bill" && renderBillForm(formData, updateField, jurisdictionOptions, isAglcStandard)}
      {selectedSourceType === "legislation.constitution" && renderConstitutionForm(formData, updateField, jurisdictionOptions, isAglcStandard)}
      {selectedSourceType === "legislation.explanatory" && renderExplanatoryForm(formData, updateField, jurisdictionOptions, isAglcStandard)}
      {selectedSourceType === "legislation.quasi" && renderQuasiLegislativeForm(formData, updateField, jurisdictionOptions, isAglcStandard)}
      {selectedSourceType === "journal.article" &&
        renderJournalForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "book" &&
        renderBookForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "treaty" && renderTreatyForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "genai_output" && renderGenaiForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "report" && renderReportForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "report.parliamentary" && renderReportParliamentaryForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "report.royal_commission" && renderReportRoyalCommissionForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "report.law_reform" && renderReportLawReformForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "report.abs" && renderReportAbsForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "research_paper" &&
        renderResearchPaperForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "research_paper.parliamentary" &&
        renderResearchPaperParliamentaryForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "conference_paper" &&
        renderConferencePaperForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "thesis" && renderThesisForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "speech" && renderSpeechForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "press_release" && renderPressReleaseForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "hansard" && renderHansardForm(formData, updateField, jurisdictionOptions, isAglcStandard)}
      {selectedSourceType === "submission.government" && renderSubmissionGovernmentForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "evidence.parliamentary" && renderEvidenceParliamentaryForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "constitutional_convention" && renderConstitutionalConventionForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "dictionary" && renderDictionaryForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "legal_encyclopedia" && renderLegalEncyclopediaForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "looseleaf" &&
        renderLooseleafForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "ip_material" && renderIpMaterialForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "constitutive_document" && renderConstitutiveDocumentForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "newspaper" && renderNewspaperForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "correspondence" && renderCorrespondenceForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "interview" && renderInterviewForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "film_tv_media" && renderFilmTvMediaForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "internet_material" && renderInternetMaterialForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "social_media" && renderSocialMediaForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "journal.online" &&
        renderJournalOnlineForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "journal.forthcoming" &&
        renderJournalForthcomingForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "book.chapter" &&
        renderBookChapterForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "book.translated" &&
        renderBookTranslatedForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "book.audiobook" &&
        renderBookAudiobookForm(formData, updateField, authors, updateAuthor, addAuthor, removeAuthor, isAglcStandard)}
      {selectedSourceType === "un.document" && renderUnDocumentForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "un.communication" && renderUnCommunicationForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "un.yearbook" && renderUnYearbookForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "icj.decision" && renderIcjDecisionForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "icj.pleading" && renderIcjPleadingForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "arbitral.state_state" && renderArbitralStateStateForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "arbitral.individual_state" && renderArbitralIndividualStateForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "icc_tribunal.case" && renderIccTribunalCaseForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "wto.document" && renderWtoDocumentForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "wto.decision" && renderWtoDecisionForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "gatt.document" && renderGattDocumentForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "eu.official_journal" && renderEuOfficialJournalForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "eu.court" && renderEuCourtForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "echr.decision" && renderEchrDecisionForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "supranational.decision" && renderSupranationalDecisionForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "supranational.document" && renderSupranationalDocumentForm(formData, updateField, isAglcStandard)}
      {selectedSourceType === "custom" && renderCustomForm(formData, updateField)}
      {selectedSourceType?.startsWith("foreign.") && renderForeignForm(formData, updateField, selectedSourceType === "foreign.other" ? "Other Foreign" : selectedSourceType.split(".")[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), selectedSourceType === "foreign.canada" ? "15" : selectedSourceType === "foreign.china" ? "16" : selectedSourceType === "foreign.france" ? "17" : selectedSourceType === "foreign.germany" ? "18" : selectedSourceType === "foreign.hong_kong" ? "19" : selectedSourceType === "foreign.malaysia" ? "20" : selectedSourceType === "foreign.new_zealand" ? "21" : selectedSourceType === "foreign.singapore" ? "22" : selectedSourceType === "foreign.south_africa" ? "23" : selectedSourceType === "foreign.uk" ? "24" : selectedSourceType === "foreign.usa" ? "25" : "26", isAglcStandard)}
      {selectedSourceType && !isCoreType && renderGenericForm(formData, updateField)}

      {/* COURT-007: Unreported-judgment gate notification (AGLC only) */}
      {isAglcStandard && unreportedGateVisible && courtJurisdiction && (
        <div className="ic-court-gate" role="alert">
          <div className="ic-court-gate-text">
            Practice directions in {getCourtPreset(courtJurisdiction)?.label ?? courtJurisdiction} restrict
            citation of unreported judgments to those containing a material statement of legal
            principle not found in reported authority. Does this case meet that threshold?
          </div>
          <div className="ic-court-gate-actions">
            <button
              type="button"
              className="ic-court-gate-btn ic-court-gate-btn--proceed"
              onClick={handleUnreportedGateProceed}
            >
              Yes, proceed
            </button>
            <button
              type="button"
              className="ic-court-gate-btn ic-court-gate-btn--check"
              onClick={handleUnreportedGateCheck}
            >
              Let me check
            </button>
          </div>
        </div>
      )}

      {/* COURT-010: Queensland subsequent-treatment field (AGLC only) */}
      {isAglcStandard && selectedSourceType && selectedSourceType.startsWith("case.") && isQldMode && (
        <div className="ic-field">
          <label className="ic-label" htmlFor="ic-subsequent-treatment">
            Subsequent Treatment
            <FieldHelp
              ruleNumber="PD 1/2024 cl 4(c)"
              description="Queensland practice directions require practitioners to confirm whether cited authorities have been subsequently doubted or not followed."
              example="Not affected"
            />
          </label>
          <select
            id="ic-subsequent-treatment"
            className="ic-select"
            value={(formData.subsequentTreatment as string) || ""}
            onChange={(e) => updateField("subsequentTreatment", e.target.value)}
          >
            {SUBSEQUENT_TREATMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {NEGATIVE_TREATMENTS.has((formData.subsequentTreatment as SubsequentTreatment) || "") && (
            <p className="ic-court-treatment-warning">
              This authority has been {(formData.subsequentTreatment as string)?.replace("-", " ")}.
              Consider whether it remains appropriate to cite.
            </p>
          )}
        </div>
      )}

      {/* COURT-011: Qld / NSW selectivity duty reminder (AGLC only) */}
      {isAglcStandard && courtJurisdiction && !courtGuideReminderDismissed && (isQldMode || isNswMode) && (
        <div className="ic-court-reminder" role="note">
          <div className="ic-court-reminder-text">
            {isQldMode ? courtGuideQldSelectivity.summary : courtGuideNswSelectivity.summary}
          </div>
          <button
            type="button"
            className="ic-court-reminder-dismiss"
            onClick={() => setCourtGuideReminderDismissed(true)}
            aria-label="Dismiss reminder"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* COURT-012: Victoria AGLC adoption note (AGLC only) */}
      {isAglcStandard && courtJurisdiction && !courtGuideReminderDismissed && isVicMode && (
        <div className="ic-court-reminder" role="note">
          <div className="ic-court-reminder-text">
            {courtGuideVicAglcAdoption.summary}
          </div>
          <button
            type="button"
            className="ic-court-reminder-dismiss"
            onClick={() => setCourtGuideReminderDismissed(true)}
            aria-label="Dismiss reminder"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SIGNAL-001: Introductory signal and commentary */}
      {selectedSourceType && (
        <div className="ic-signal-section">
          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-signal">
              Introductory Signal
              <FieldHelp
                {...(isAglcStandard ? { ruleNumber: "1.2" } : {})}
                description="An introductory signal precedes the citation to indicate its relationship to the proposition in the text. Italicised in the footnote."
                example="See, See also, Cf"
              />
            </label>
            <select
              id="ic-signal"
              className="ic-select"
              value={signal}
              onChange={(e) => setSignal(e.target.value as IntroductorySignal | "")}
            >
              <option value="">None</option>
              {INTRODUCTORY_SIGNALS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-commentary-before">
              Commentary Before
            </label>
            <input
              id="ic-commentary-before"
              className="ic-input"
              type="text"
              value={commentaryBefore}
              placeholder="e.g., For a discussion of this principle, see"
              onChange={(e) => setCommentaryBefore(e.target.value)}
            />
          </div>

          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-commentary-after">
              Commentary After
            </label>
            <input
              id="ic-commentary-after"
              className="ic-input"
              type="text"
              value={commentaryAfter}
              placeholder="e.g., where the court distinguished the earlier authority"
              onChange={(e) => setCommentaryAfter(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Short title */}
      {selectedSourceType && (
        <div className="ic-field">
          <label className="ic-label" htmlFor="ic-short-title">
            Short Title
            <FieldHelp
              {...(isAglcStandard ? { ruleNumber: "1.4" } : {})}
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

      {/* BUGS-013: Add to existing footnote (AGLC4 Rule 1.1.3) */}
      {selectedSourceType && (
        <div className="ic-append-section">
          <div className="ic-field ic-field--checkbox">
            <label className="ic-checkbox-label">
              <input
                type="checkbox"
                checked={appendToFootnote}
                onChange={(e) => setAppendToFootnote(e.target.checked)}
              />
              Add to existing footnote (Rule 1.1.3)
            </label>
          </div>
          {appendToFootnote && (
            <div className="ic-field">
              <label className="ic-label" htmlFor="ic-append-footnote">
                Append to footnote
              </label>
              {existingFootnotes.length > 0 ? (
                <select
                  id="ic-append-footnote"
                  className="ic-select"
                  value={selectedFootnoteIndex}
                  onChange={(e) => setSelectedFootnoteIndex(Number(e.target.value))}
                >
                  {/* Deduplicate by footnote index — multiple citations may share a footnote */}
                  {[...new Map(existingFootnotes.map((fn) => [fn.footnoteIndex, fn])).values()].map((fn) => (
                    <option key={fn.footnoteIndex} value={fn.footnoteIndex}>
                      Footnote {fn.footnoteIndex}: {fn.title}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="ic-note">No existing footnotes with citations found in this document.</p>
              )}
            </div>
          )}
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

      {/* Action buttons */}
      {selectedSourceType && (
        <div className="ic-action-bar">
          <button
            className="ic-insert-btn"
            type="button"
            disabled={inserting || previewRuns.length === 0}
            onClick={handleInsert}
          >
            {inserting
              ? "Inserting..."
              : appendToFootnote && selectedFootnoteIndex > 0
                ? `Append to Footnote ${selectedFootnoteIndex}`
                : "Insert as Footnote"}
          </button>
          <button
            className="ic-clear-btn"
            type="button"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Form Renderers ──────────────────────────────────────────────────────────

function renderCaseReportedForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  onCaseSelect: (result: LookupResult) => void,
  isAglcStandard: boolean,
  searchEnabled: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-party1">
          Party 1
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.2.1" } : {})}
            description="The first-named party in the case name. Italicised in the citation."
            example="Mabo"
          />
        </label>
        {searchEnabled ? (
          <TypeaheadInput
            id="ic-party1"
            className="ic-input"
            value={(data.party1 as string) || ""}
            placeholder="e.g. Mabo"
            searchFn={searchCases}
            onSelect={onCaseSelect}
            onChange={(v) => updateField("party1", v)}
          />
        ) : (
          <input
            id="ic-party1"
            className="ic-input"
            type="text"
            value={(data.party1 as string) || ""}
            placeholder="e.g. Mabo"
            onChange={(e) => updateField("party1", e.target.value)}
          />
        )}
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
              {...(isAglcStandard ? { ruleNumber: "2.2.1" } : {})}
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
              {...(isAglcStandard ? { ruleNumber: "2.2.2" } : {})}
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
              {...(isAglcStandard ? { ruleNumber: "2.2.6" } : {})}
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

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-mnc">
          Medium Neutral Citation (optional)
          <FieldHelp
            description="The court's neutral citation. Used for parallel citations in court submission mode."
            example="[2009] HCA 23"
          />
        </label>
        <input
          id="ic-mnc"
          className="ic-input"
          type="text"
          value={(data.mnc as string) || ""}
          placeholder="e.g. [2009] HCA 23"
          onChange={(e) => updateField("mnc", e.target.value)}
        />
      </div>

      {/* Parallel Citations (Rule 2.2.7) */}
      <div className="ic-parallel-section">
        <div className="ic-label">
          Parallel Citations
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.2.7" } : {})}
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
            {...(isAglcStandard ? { ruleNumber: "2.2.5" } : {})}
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

function renderCaseUnreportedMncForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-umnc-party1">
          Party 1
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.1" } : {})}
            description="The first-named party in the case name. Italicised in the citation."
            example="Mabo"
          />
        </label>
        <input
          id="ic-umnc-party1"
          className="ic-input"
          type="text"
          value={(data.party1 as string) || ""}
          placeholder="e.g. Mabo"
          onChange={(e) => updateField("party1", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-umnc-party2">
          Party 2
        </label>
        <input
          id="ic-umnc-party2"
          className="ic-input"
          type="text"
          value={(data.party2 as string) || ""}
          placeholder="e.g. Queensland"
          onChange={(e) => updateField("party2", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-umnc-year">
            Year
          </label>
          <input
            id="ic-umnc-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2020"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-umnc-court">
            Court
            <FieldHelp
              {...(isAglcStandard ? { ruleNumber: "2.3.1" } : {})}
              description="The court identifier as it appears in the medium neutral citation."
              example="HCA, FCA, NSWSC"
            />
          </label>
          <input
            id="ic-umnc-court"
            className="ic-input"
            type="text"
            value={(data.court as string) || ""}
            placeholder="e.g. FCA"
            onChange={(e) => updateField("court", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-umnc-case-number">
          Case Number
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.1" } : {})}
            description="The judgment number assigned by the court."
            example="123"
          />
        </label>
        <input
          id="ic-umnc-case-number"
          className="ic-input"
          type="text"
          value={(data.caseNumber as string) || ""}
          placeholder="e.g. 123"
          onChange={(e) => updateField("caseNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-umnc-pinpoint">
          Pinpoint
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.1" } : {})}
            description="A specific paragraph reference within the judgment."
            example="[23]"
          />
        </label>
        <input
          id="ic-umnc-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [23]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-umnc-judicial-officer">
          Judicial Officer
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.1" } : {})}
            description="The name of the judge or judicial officer, if relevant to the pinpoint."
            example="Kiefel CJ"
          />
        </label>
        <input
          id="ic-umnc-judicial-officer"
          className="ic-input"
          type="text"
          value={(data.judicialOfficer as string) || ""}
          placeholder="e.g. Kiefel CJ"
          onChange={(e) => updateField("judicialOfficer", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderCaseUnreportedNoMncForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unomnc-party1">
          Party 1
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.2" } : {})}
            description="The first-named party in the case name. Italicised in the citation."
            example="Smith"
          />
        </label>
        <input
          id="ic-unomnc-party1"
          className="ic-input"
          type="text"
          value={(data.party1 as string) || ""}
          placeholder="e.g. Smith"
          onChange={(e) => updateField("party1", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unomnc-party2">
          Party 2
        </label>
        <input
          id="ic-unomnc-party2"
          className="ic-input"
          type="text"
          value={(data.party2 as string) || ""}
          placeholder="e.g. Jones"
          onChange={(e) => updateField("party2", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unomnc-court">
          Court
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.2" } : {})}
            description="The court in which the case was heard."
            example="Supreme Court of New South Wales"
          />
        </label>
        <input
          id="ic-unomnc-court"
          className="ic-input"
          type="text"
          value={(data.court as string) || ""}
          placeholder="e.g. Supreme Court of New South Wales"
          onChange={(e) => updateField("court", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unomnc-proceeding-number">
          Proceeding Number
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.2" } : {})}
            description="The proceeding or file number assigned by the court."
            example="2020/12345"
          />
        </label>
        <input
          id="ic-unomnc-proceeding-number"
          className="ic-input"
          type="text"
          value={(data.proceedingNumber as string) || ""}
          placeholder="e.g. 2020/12345"
          onChange={(e) => updateField("proceedingNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unomnc-date">
          Date
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.3.2" } : {})}
            description="The full date of the judgment in the format D Month Year."
            example="5 October 2020"
          />
        </label>
        <input
          id="ic-unomnc-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 5 October 2020"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderCaseProceedingForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-proc-party1">
          Party 1
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.9" } : {})}
            description="The first-named party in the proceeding."
            example="Smith"
          />
        </label>
        <input
          id="ic-proc-party1"
          className="ic-input"
          type="text"
          value={(data.party1 as string) || ""}
          placeholder="e.g. Smith"
          onChange={(e) => updateField("party1", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-proc-party2">
          Party 2
        </label>
        <input
          id="ic-proc-party2"
          className="ic-input"
          type="text"
          value={(data.party2 as string) || ""}
          placeholder="e.g. Jones"
          onChange={(e) => updateField("party2", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-proc-court">
          Court
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.9" } : {})}
            description="The court in which the proceeding was commenced."
            example="Federal Court of Australia"
          />
        </label>
        <input
          id="ic-proc-court"
          className="ic-input"
          type="text"
          value={(data.court as string) || ""}
          placeholder="e.g. Federal Court of Australia"
          onChange={(e) => updateField("court", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-proc-proceeding-number">
          Proceeding Number
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.9" } : {})}
            description="The proceeding or file number assigned by the court."
            example="NSD 1234/2020"
          />
        </label>
        <input
          id="ic-proc-proceeding-number"
          className="ic-input"
          type="text"
          value={(data.proceedingNumber as string) || ""}
          placeholder="e.g. NSD 1234/2020"
          onChange={(e) => updateField("proceedingNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-proc-commenced-date">
          Commenced Date
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.9" } : {})}
            description="The date the proceeding was commenced, in the format D Month Year."
            example="1 March 2020"
          />
        </label>
        <input
          id="ic-proc-commenced-date"
          className="ic-input"
          type="text"
          value={(data.commencedDate as string) || ""}
          placeholder="e.g. 1 March 2020"
          onChange={(e) => updateField("commencedDate", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderCaseCourtOrderForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-co-party1">
          Party 1
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.10" } : {})}
            description="The first-named party in the case."
            example="Smith"
          />
        </label>
        <input
          id="ic-co-party1"
          className="ic-input"
          type="text"
          value={(data.party1 as string) || ""}
          placeholder="e.g. Smith"
          onChange={(e) => updateField("party1", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-co-party2">
          Party 2
        </label>
        <input
          id="ic-co-party2"
          className="ic-input"
          type="text"
          value={(data.party2 as string) || ""}
          placeholder="e.g. Jones"
          onChange={(e) => updateField("party2", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-co-court">
          Court
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.10" } : {})}
            description="The court that made the order."
            example="Federal Court of Australia"
          />
        </label>
        <input
          id="ic-co-court"
          className="ic-input"
          type="text"
          value={(data.court as string) || ""}
          placeholder="e.g. Federal Court of Australia"
          onChange={(e) => updateField("court", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-co-order-date">
          Order Date
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.10" } : {})}
            description="The date the order was made, in the format D Month Year."
            example="15 June 2021"
          />
        </label>
        <input
          id="ic-co-order-date"
          className="ic-input"
          type="text"
          value={(data.orderDate as string) || ""}
          placeholder="e.g. 15 June 2021"
          onChange={(e) => updateField("orderDate", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderLegislationForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  onLegislationSelect: (result: LookupResult) => void,
  jurisdictionOptions: { value: string; label: string }[],
  isAglcStandard: boolean,
  searchEnabled: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-leg-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.1" } : {})}
            description="The title of the Act as it appears in the statute book. Italicised in the citation."
            example="Competition and Consumer Act 2010"
          />
        </label>
        {searchEnabled ? (
          <TypeaheadInput
            id="ic-leg-title"
            className="ic-input"
            value={(data.title as string) || ""}
            placeholder="e.g. Competition and Consumer Act"
            searchFn={searchLegislation}
            onSelect={onLegislationSelect}
            onChange={(v) => updateField("title", v)}
          />
        ) : (
          <input
            id="ic-leg-title"
            className="ic-input"
            type="text"
            value={(data.title as string) || ""}
            placeholder="e.g. Competition and Consumer Act"
            onChange={(e) => updateField("title", e.target.value)}
          />
        )}
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
            {isAglcStandard && (
              <FieldHelp
                ruleNumber="3.1"
                description="The abbreviated jurisdiction of the legislation."
                example="Cth, NSW, Vic"
              />
            )}
          </label>
          <select
            id="ic-leg-jurisdiction"
            className="ic-select"
            value={(data.jurisdiction as string) || ""}
            onChange={(e) => updateField("jurisdiction", e.target.value)}
          >
            <option value="">Select...</option>
            {jurisdictionOptions.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-leg-number">
          Number (optional)
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.1" } : {})}
            description="Used when multiple Acts share the same title in one year."
            example="No 2"
          />
        </label>
        <input
          id="ic-leg-number"
          className="ic-input"
          type="text"
          value={(data.number as string) || ""}
          placeholder="e.g. No 2"
          onChange={(e) => updateField("number", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-leg-pinpoint">
          Pinpoint
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.1.4" } : {})}
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

// ─── FORMS-003: Bill Form (Rule 3.2) ─────────────────────────────────────────

function renderBillForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  jurisdictionOptions: { value: string; label: string }[],
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bill-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.2" } : {})}
            description="The title of the Bill. Not italicised in the citation."
            example="Corporations Amendment Bill"
          />
        </label>
        <input
          id="ic-bill-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Corporations Amendment Bill"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bill-year">
            Year
          </label>
          <input
            id="ic-bill-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2023"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bill-jurisdiction">
            Jurisdiction
          </label>
          <select
            id="ic-bill-jurisdiction"
            className="ic-select"
            value={(data.jurisdiction as string) || ""}
            onChange={(e) => updateField("jurisdiction", e.target.value)}
          >
            <option value="">Select...</option>
            {jurisdictionOptions.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bill-number">
          Number (optional)
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.2" } : {})}
            description="Used when multiple Bills share the same title in one year."
            example="No 2"
          />
        </label>
        <input
          id="ic-bill-number"
          className="ic-input"
          type="text"
          value={(data.number as string) || ""}
          placeholder="e.g. No 2"
          onChange={(e) => updateField("number", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bill-pinpoint">
          Pinpoint
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.1.4" } : {})}
            description="Section, part, schedule, or other subdivision reference."
            example="cl 5"
          />
        </label>
        <input
          id="ic-bill-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. cl 5"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── FORMS-003: Constitution Form (Rule 3.6) ─────────────────────────────────

function renderConstitutionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  jurisdictionOptions: { value: string; label: string }[],
  isAglcStandard: boolean,
): JSX.Element {
  const isCommonwealth = (data.constitutionType as string) !== "state";

  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label">
          Constitution type
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.6" } : {})}
            description="Commonwealth Constitution uses the fixed title 'Australian Constitution'. State/Territory constitutions require a title and year."
          />
        </label>
        <div className="ic-field-row" style={{ gap: "1rem", marginTop: "0.25rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="ic-const-type"
              value="cth"
              checked={isCommonwealth}
              onChange={() => {
                updateField("constitutionType", "cth");
                updateField("jurisdiction", "Cth");
                updateField("title", "");
                updateField("year", "");
              }}
            />
            Commonwealth
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="ic-const-type"
              value="state"
              checked={!isCommonwealth}
              onChange={() => {
                updateField("constitutionType", "state");
                updateField("jurisdiction", "");
              }}
            />
            State/Territory
          </label>
        </div>
      </div>

      {!isCommonwealth && (
        <>
          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-const-title">
              Title
              <FieldHelp
                {...(isAglcStandard ? { ruleNumber: "3.6" } : {})}
                description="The title of the state or territory constitution Act."
                example="Constitution Act 1975"
              />
            </label>
            <input
              id="ic-const-title"
              className="ic-input"
              type="text"
              value={(data.title as string) || ""}
              placeholder="e.g. Constitution Act"
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div className="ic-field-row">
            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-const-year">
                Year
              </label>
              <input
                id="ic-const-year"
                className="ic-input"
                type="text"
                value={(data.year as string) || ""}
                placeholder="e.g. 1975"
                onChange={(e) => updateField("year", e.target.value)}
              />
            </div>

            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-const-jurisdiction">
                Jurisdiction
              </label>
              <select
                id="ic-const-jurisdiction"
                className="ic-select"
                value={(data.jurisdiction as string) || ""}
                onChange={(e) => updateField("jurisdiction", e.target.value)}
              >
                <option value="">Select...</option>
                {jurisdictionOptions
                  .filter((j) => j.value !== "Cth")
                  .map((j) => (
                    <option key={j.value} value={j.value}>
                      {j.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-const-pinpoint">
          Pinpoint
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.6" } : {})}
            description="Section or chapter reference within the constitution."
            example="s 51(xxxi)"
          />
        </label>
        <input
          id="ic-const-pinpoint"
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

// ─── FORMS-003: Explanatory Memorandum Form (Rule 3.7) ───────────────────────

const EXPLANATORY_TYPE_OPTIONS = [
  { value: "Explanatory Memorandum", label: "Explanatory Memorandum" },
  { value: "Explanatory Notes", label: "Explanatory Notes" },
  { value: "Explanatory Statement", label: "Explanatory Statement" },
];

function renderExplanatoryForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  jurisdictionOptions: { value: string; label: string }[],
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-expl-type">
          Document type
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.7" } : {})}
            description="The type of explanatory document accompanying the Bill."
          />
        </label>
        <select
          id="ic-expl-type"
          className="ic-select"
          value={(data.type as string) || "Explanatory Memorandum"}
          onChange={(e) => updateField("type", e.target.value)}
        >
          {EXPLANATORY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-expl-bill-title">
          Bill title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.7" } : {})}
            description="The title of the Bill to which this explanatory document relates."
            example="Corporations Amendment Bill"
          />
        </label>
        <input
          id="ic-expl-bill-title"
          className="ic-input"
          type="text"
          value={(data.billTitle as string) || ""}
          placeholder="e.g. Corporations Amendment Bill"
          onChange={(e) => updateField("billTitle", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-expl-bill-year">
            Bill year
          </label>
          <input
            id="ic-expl-bill-year"
            className="ic-input"
            type="text"
            value={(data.billYear as string) || ""}
            placeholder="e.g. 2023"
            onChange={(e) => updateField("billYear", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-expl-jurisdiction">
            Jurisdiction
          </label>
          <select
            id="ic-expl-jurisdiction"
            className="ic-select"
            value={(data.jurisdiction as string) || ""}
            onChange={(e) => updateField("jurisdiction", e.target.value)}
          >
            <option value="">Select...</option>
            {jurisdictionOptions.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-expl-pinpoint">
          Pinpoint
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.7" } : {})}
            description="Page or paragraph reference within the explanatory document."
            example="5"
          />
        </label>
        <input
          id="ic-expl-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 5"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── FORMS-003: Quasi-Legislative Material Form (Rule 3.9) ───────────────────

const GAZETTE_TYPE_OPTIONS = [
  { value: "Commonwealth of Australia Gazette", label: "Commonwealth" },
  { value: "New South Wales Government Gazette", label: "New South Wales" },
  { value: "Victoria Government Gazette", label: "Victoria" },
  { value: "Queensland Government Gazette", label: "Queensland" },
  { value: "South Australia Government Gazette", label: "South Australia" },
  { value: "Tasmanian Government Gazette", label: "Tasmania" },
  { value: "Western Australian Government Gazette", label: "Western Australia" },
  { value: "Australian Capital Territory Gazette", label: "ACT" },
  { value: "Northern Territory Government Gazette", label: "Northern Territory" },
];

function renderQuasiLegislativeForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  jurisdictionOptions: { value: string; label: string }[],
  isAglcStandard: boolean,
): JSX.Element {
  const isGazette = (data.quasiVariant as string) === "gazette";

  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label">
          Variant
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "3.9" } : {})}
            description="Select Gazette for official government gazettes (Rule 3.9.1), or Other for ASIC class orders, ATO rulings, practice directions, etc. (Rules 3.9.2-3.9.4)."
          />
        </label>
        <div className="ic-field-row" style={{ gap: "1rem", marginTop: "0.25rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="ic-quasi-variant"
              value="other"
              checked={!isGazette}
              onChange={() => {
                updateField("quasiVariant", "other");
                updateField("gazetteType", "");
              }}
            />
            Other material
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="ic-quasi-variant"
              value="gazette"
              checked={isGazette}
              onChange={() => {
                updateField("quasiVariant", "gazette");
                updateField("issuingBody", "");
                updateField("documentType", "");
                updateField("title", "");
              }}
            />
            Gazette
          </label>
        </div>
      </div>

      {!isGazette && (
        <>
          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-quasi-body">
              Issuing body
              <FieldHelp
                {...(isAglcStandard ? { ruleNumber: "3.9" } : {})}
                description="The body that issued the document."
                example="ASIC, ATO, APRA"
              />
            </label>
            <input
              id="ic-quasi-body"
              className="ic-input"
              type="text"
              value={(data.issuingBody as string) || ""}
              placeholder="e.g. ASIC"
              onChange={(e) => updateField("issuingBody", e.target.value)}
            />
          </div>

          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-quasi-doctype">
              Document type
              <FieldHelp
                {...(isAglcStandard ? { ruleNumber: "3.9" } : {})}
                description="The type or class of the document."
                example="Class Order, Taxation Ruling, Practice Direction"
              />
            </label>
            <input
              id="ic-quasi-doctype"
              className="ic-input"
              type="text"
              value={(data.documentType as string) || ""}
              placeholder="e.g. Class Order"
              onChange={(e) => updateField("documentType", e.target.value)}
            />
          </div>

          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-quasi-number">
              Number
            </label>
            <input
              id="ic-quasi-number"
              className="ic-input"
              type="text"
              value={(data.number as string) || ""}
              placeholder="e.g. CO 13/760"
              onChange={(e) => updateField("number", e.target.value)}
            />
          </div>

          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-quasi-title">
              Title (optional)
            </label>
            <input
              id="ic-quasi-title"
              className="ic-input"
              type="text"
              value={(data.title as string) || ""}
              placeholder="e.g. Employee Share Schemes"
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div className="ic-field-row">
            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-quasi-date">
                Date
              </label>
              <input
                id="ic-quasi-date"
                className="ic-input"
                type="text"
                value={(data.date as string) || ""}
                placeholder="e.g. 21 June 2013"
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>

            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-quasi-jurisdiction">
                Jurisdiction
              </label>
              <select
                id="ic-quasi-jurisdiction"
                className="ic-select"
                value={(data.jurisdiction as string) || ""}
                onChange={(e) => updateField("jurisdiction", e.target.value)}
              >
                <option value="">Select...</option>
                {jurisdictionOptions.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {isGazette && (
        <>
          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-quasi-gazette-type">
              Gazette
              <FieldHelp
                {...(isAglcStandard ? { ruleNumber: "3.9.1" } : {})}
                description="The gazette publication in which the notice appeared."
              />
            </label>
            <select
              id="ic-quasi-gazette-type"
              className="ic-select"
              value={(data.gazetteType as string) || ""}
              onChange={(e) => updateField("gazetteType", e.target.value)}
            >
              <option value="">Select...</option>
              {GAZETTE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-quasi-gazette-number">
              Number (optional)
            </label>
            <input
              id="ic-quasi-gazette-number"
              className="ic-input"
              type="text"
              value={(data.number as string) || ""}
              placeholder="e.g. No S 178"
              onChange={(e) => updateField("number", e.target.value)}
            />
          </div>

          <div className="ic-field-row">
            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-quasi-gazette-date">
                Date
              </label>
              <input
                id="ic-quasi-gazette-date"
                className="ic-input"
                type="text"
                value={(data.date as string) || ""}
                placeholder="e.g. 28 June 2013"
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>

            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-quasi-gazette-page">
                Page
              </label>
              <input
                id="ic-quasi-gazette-page"
                className="ic-input"
                type="text"
                value={(data.page as string) || ""}
                placeholder="e.g. 1234"
                onChange={(e) => updateField("page", e.target.value)}
              />
            </div>
          </div>

          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-quasi-gazette-jurisdiction">
              Jurisdiction
            </label>
            <select
              id="ic-quasi-gazette-jurisdiction"
              className="ic-select"
              value={(data.jurisdiction as string) || ""}
              onChange={(e) => updateField("jurisdiction", e.target.value)}
            >
              <option value="">Select...</option>
              {jurisdictionOptions.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
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
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "5" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ja-title">
          Article Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "5.1" } : {})}
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
            {...(isAglcStandard ? { ruleNumber: "5.2" } : {})}
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
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "6" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-book-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.1" } : {})}
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
            {...(isAglcStandard ? { ruleNumber: "6.4" } : {})}
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
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-treaty-title">
          Treaty Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "8.1" } : {})}
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
        <label className="ic-label" htmlFor="ic-treaty-parties">
          Parties
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "8.7" } : {})}
            description="Parties to a bilateral treaty, separated by commas."
            example="Australia, New Zealand"
          />
        </label>
        <input
          id="ic-treaty-parties"
          className="ic-input"
          type="text"
          value={(data.parties as string) || ""}
          placeholder="e.g. Australia, New Zealand"
          onChange={(e) => updateField("parties", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-treaty-opened">
          Opened for Signature Date
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "8.3" } : {})}
            description="The date the treaty was opened for signature."
            example="20 November 1989"
          />
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

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-treaty-signed">
          Signed Date
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "8.3" } : {})}
            description="The date the treaty was signed (for bilateral treaties)."
            example="10 December 1982"
          />
        </label>
        <input
          id="ic-treaty-signed"
          className="ic-input"
          type="text"
          value={(data.signedDate as string) || ""}
          placeholder="e.g. 10 December 1982"
          onChange={(e) => updateField("signedDate", e.target.value)}
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
            value={(data.seriesVolume as string) || ""}
            placeholder="e.g. 1577"
            onChange={(e) => updateField("seriesVolume", e.target.value)}
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

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-treaty-pinpoint">
          Pinpoint
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "8.1" } : {})}
            description="A specific article or clause reference within the treaty."
            example="art 31"
          />
        </label>
        <input
          id="ic-treaty-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. art 31"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderGenaiForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  const isOtherPlatform = (data.platform as string) === "__other__";
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-genai-platform">
          Platform
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.12" } : {})}
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

// ─── FORMS-002: Quasi-Judicial Form (Rule 2.6.1) ────────────────────────────

function renderCaseQuasiJudicialForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-qj-party">
          Party
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.6.1" } : {})}
            description="The party or applicant in the administrative decision."
            example="Re Smith"
          />
        </label>
        <input
          id="ic-qj-party"
          className="ic-input"
          type="text"
          value={(data.party as string) || ""}
          placeholder="e.g. Re Smith"
          onChange={(e) => updateField("party", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-qj-department">
          Department / Body
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.6.1" } : {})}
            description="The government department, tribunal, or administrative body."
            example="Department of Immigration"
          />
        </label>
        <input
          id="ic-qj-department"
          className="ic-input"
          type="text"
          value={(data.department as string) || ""}
          placeholder="e.g. Department of Immigration"
          onChange={(e) => updateField("department", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-qj-year">
            Year
          </label>
          <input
            id="ic-qj-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2015"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-qj-volume">
            Volume (optional)
          </label>
          <input
            id="ic-qj-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. 42"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-qj-report-series">
          Report Series (optional)
        </label>
        <input
          id="ic-qj-report-series"
          className="ic-input"
          type="text"
          value={(data.reportSeries as string) || ""}
          placeholder="e.g. ALD"
          onChange={(e) => updateField("reportSeries", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-qj-starting-page">
          Starting Page (optional)
        </label>
        <input
          id="ic-qj-starting-page"
          className="ic-input"
          type="text"
          value={(data.startingPage as string) || ""}
          placeholder="e.g. 123"
          onChange={(e) => updateField("startingPage", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-qj-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-qj-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 130"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── FORMS-002: Arbitration Form (Rule 2.6.2) ───────────────────────────────

function renderCaseArbitrationForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arb-parties">
          Parties
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.6.2" } : {})}
            description="The parties to the arbitration, separated by 'v'."
            example="Party A v Party B"
          />
        </label>
        <input
          id="ic-arb-parties"
          className="ic-input"
          type="text"
          value={(data.parties as string) || ""}
          placeholder="e.g. Party A v Party B"
          onChange={(e) => updateField("parties", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-arb-type">
            Arbitration Type
            <FieldHelp
              {...(isAglcStandard ? { ruleNumber: "2.6.2" } : {})}
              description="Whether the arbitration is domestic or international."
            />
          </label>
          <select
            id="ic-arb-type"
            className="ic-select"
            value={(data.arbitrationType as string) || ""}
            onChange={(e) => updateField("arbitrationType", e.target.value)}
          >
            <option value="">Select type...</option>
            <option value="Domestic">Domestic</option>
            <option value="International">International</option>
          </select>
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-arb-year">
            Year
          </label>
          <input
            id="ic-arb-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2020"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arb-award">
          Award Details
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.6.2" } : {})}
            description="Details of the award, such as award number or description."
            example="Award No 123"
          />
        </label>
        <input
          id="ic-arb-award"
          className="ic-input"
          type="text"
          value={(data.awardDetails as string) || ""}
          placeholder="e.g. Award No 123"
          onChange={(e) => updateField("awardDetails", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arb-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-arb-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [15]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── FORMS-002: Transcript Form (Rules 2.7.1-2.7.2) ─────────────────────────

function renderCaseTranscriptForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  const isHca = Boolean(data.hcaTranscript);

  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label ic-label--checkbox">
          <input
            type="checkbox"
            checked={isHca}
            onChange={(e) => updateField("hcaTranscript", e.target.checked)}
          />
          HCA Transcript
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.7.2" } : {})}
            description="Check if this is a High Court of Australia transcript, which uses a special format with [Year] HCATrans Number."
          />
        </label>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-tr-party1">
          Party 1
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.7.1" } : {})}
            description="The first-named party in the case."
            example="Smith"
          />
        </label>
        <input
          id="ic-tr-party1"
          className="ic-input"
          type="text"
          value={(data.party1 as string) || ""}
          placeholder="e.g. Smith"
          onChange={(e) => updateField("party1", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-tr-party2">
          Party 2
        </label>
        <input
          id="ic-tr-party2"
          className="ic-input"
          type="text"
          value={(data.party2 as string) || ""}
          placeholder="e.g. Jones"
          onChange={(e) => updateField("party2", e.target.value)}
        />
      </div>

      {isHca ? (
        <>
          <div className="ic-field-row">
            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-tr-year">
                Year
              </label>
              <input
                id="ic-tr-year"
                className="ic-input"
                type="text"
                value={(data.year as string) || ""}
                placeholder="e.g. 2020"
                onChange={(e) => updateField("year", e.target.value)}
              />
            </div>

            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-tr-case-number">
                Case Number
                <FieldHelp
                  {...(isAglcStandard ? { ruleNumber: "2.7.2" } : {})}
                  description="The HCATrans number for the transcript."
                  example="5"
                />
              </label>
              <input
                id="ic-tr-case-number"
                className="ic-input"
                type="text"
                value={(data.caseNumber as string) || ""}
                placeholder="e.g. 5"
                onChange={(e) => updateField("caseNumber", e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="ic-field">
            <label className="ic-label" htmlFor="ic-tr-court">
              Court
              <FieldHelp
                {...(isAglcStandard ? { ruleNumber: "2.7.1" } : {})}
                description="The court where the transcript was recorded."
                example="Supreme Court of New South Wales"
              />
            </label>
            <input
              id="ic-tr-court"
              className="ic-input"
              type="text"
              value={(data.court as string) || ""}
              placeholder="e.g. Supreme Court of New South Wales"
              onChange={(e) => updateField("court", e.target.value)}
            />
          </div>

          <div className="ic-field-row">
            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-tr-proc-number">
                Proceeding Number
              </label>
              <input
                id="ic-tr-proc-number"
                className="ic-input"
                type="text"
                value={(data.proceedingNumber as string) || ""}
                placeholder="e.g. 2020/12345"
                onChange={(e) => updateField("proceedingNumber", e.target.value)}
              />
            </div>

            <div className="ic-field ic-field--grow">
              <label className="ic-label" htmlFor="ic-tr-date">
                Date
              </label>
              <input
                id="ic-tr-date"
                className="ic-input"
                type="text"
                value={(data.date as string) || ""}
                placeholder="e.g. 15 March 2020"
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-tr-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-tr-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 25"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── FORMS-002: Submission Form (Rule 2.8) ───────────────────────────────────

function renderCaseSubmissionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sub-party-name">
          Party Name (filer)
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.8" } : {})}
            description="The party who filed the submission."
            example="Plaintiff"
          />
        </label>
        <input
          id="ic-sub-party-name"
          className="ic-input"
          type="text"
          value={(data.partyName as string) || ""}
          placeholder="e.g. Plaintiff"
          onChange={(e) => updateField("partyName", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sub-title">
          Submission Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "2.8" } : {})}
            description="The title of the submission (will be quoted in the citation)."
            example="Outline of Submissions"
          />
        </label>
        <input
          id="ic-sub-title"
          className="ic-input"
          type="text"
          value={(data.submissionTitle as string) || ""}
          placeholder="e.g. Outline of Submissions"
          onChange={(e) => updateField("submissionTitle", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-sub-case-party1">
            Case Party 1
          </label>
          <input
            id="ic-sub-case-party1"
            className="ic-input"
            type="text"
            value={(data.caseParty1 as string) || ""}
            placeholder="e.g. Smith"
            onChange={(e) => updateField("caseParty1", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-sub-case-party2">
            Case Party 2
          </label>
          <input
            id="ic-sub-case-party2"
            className="ic-input"
            type="text"
            value={(data.caseParty2 as string) || ""}
            placeholder="e.g. Jones"
            onChange={(e) => updateField("caseParty2", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-sub-proc-number">
            Proceeding Number
          </label>
          <input
            id="ic-sub-proc-number"
            className="ic-input"
            type="text"
            value={(data.proceedingNumber as string) || ""}
            placeholder="e.g. S28/2020"
            onChange={(e) => updateField("proceedingNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-sub-date">
            Date
          </label>
          <input
            id="ic-sub-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 1 May 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sub-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-sub-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [5]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── FORMS: Reports Group (Rule 7.1) ─────────────────────────────────────────

function renderReportForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rpt-author">
          Author/Body
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.1" } : {})}
            description="The author or body that produced the report."
            example="Australian Law Reform Commission"
          />
        </label>
        <input
          id="ic-rpt-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. Australian Law Reform Commission"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rpt-title">
          Title
        </label>
        <input
          id="ic-rpt-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Serious Invasions of Privacy in the Digital Era"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rpt-number">
            Report Number
          </label>
          <input
            id="ic-rpt-number"
            className="ic-input"
            type="text"
            value={(data.reportNumber as string) || ""}
            placeholder="e.g. Report No 123"
            onChange={(e) => updateField("reportNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rpt-year">
            Year
          </label>
          <input
            id="ic-rpt-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2014"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rpt-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-rpt-pinpoint"
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

function renderReportParliamentaryForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptparl-body">
          Body
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.1.2" } : {})}
            description="The parliamentary body or committee that produced the report."
            example="Senate Standing Committee on Legal and Constitutional Affairs"
          />
        </label>
        <input
          id="ic-rptparl-body"
          className="ic-input"
          type="text"
          value={(data.body as string) || ""}
          placeholder="e.g. Senate Standing Committee on Legal and Constitutional Affairs"
          onChange={(e) => updateField("body", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptparl-title">
          Title
        </label>
        <input
          id="ic-rptparl-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Road to a Republic"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptparl-number">
            Parl Paper Number
          </label>
          <input
            id="ic-rptparl-number"
            className="ic-input"
            type="text"
            value={(data.parlPaperNumber as string) || ""}
            placeholder="e.g. Parl Paper No 100"
            onChange={(e) => updateField("parlPaperNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptparl-year">
            Year
          </label>
          <input
            id="ic-rptparl-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2004"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptparl-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-rptparl-pinpoint"
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

function renderReportRoyalCommissionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptrc-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.1.3" } : {})}
            description="The title of the royal commission report."
            example="Royal Commission into Misconduct in the Banking, Superannuation and Financial Services Industry, Final Report"
          />
        </label>
        <input
          id="ic-rptrc-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Royal Commission into Misconduct in the Banking..."
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptrc-commissioner">
          Commissioner(s)
        </label>
        <input
          id="ic-rptrc-commissioner"
          className="ic-input"
          type="text"
          value={(data.commissioner as string) || ""}
          placeholder="e.g. Kenneth Hayne"
          onChange={(e) => updateField("commissioner", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptrc-year">
            Year
          </label>
          <input
            id="ic-rptrc-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2019"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptrc-volume">
            Volume
          </label>
          <input
            id="ic-rptrc-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. vol 1"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptrc-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-rptrc-pinpoint"
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

function renderReportLawReformForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptlr-body">
          Body
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.1.4" } : {})}
            description="The law reform body that produced the report."
            example="Australian Law Reform Commission"
          />
        </label>
        <input
          id="ic-rptlr-body"
          className="ic-input"
          type="text"
          value={(data.body as string) || ""}
          placeholder="e.g. Australian Law Reform Commission"
          onChange={(e) => updateField("body", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptlr-title">
          Title
        </label>
        <input
          id="ic-rptlr-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Traditional Rights and Freedoms"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptlr-number">
            Report Number
          </label>
          <input
            id="ic-rptlr-number"
            className="ic-input"
            type="text"
            value={(data.reportNumber as string) || ""}
            placeholder="e.g. Report No 129"
            onChange={(e) => updateField("reportNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptlr-year">
            Year
          </label>
          <input
            id="ic-rptlr-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2015"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptlr-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-rptlr-pinpoint"
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

function renderReportAbsForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptabs-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.1.5" } : {})}
            description="The title of the ABS publication."
            example="Census of Population and Housing"
          />
        </label>
        <input
          id="ic-rptabs-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Census of Population and Housing"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptabs-catalogue">
            Catalogue Number
          </label>
          <input
            id="ic-rptabs-catalogue"
            className="ic-input"
            type="text"
            value={(data.catalogueNumber as string) || ""}
            placeholder="e.g. 2071.0"
            onChange={(e) => updateField("catalogueNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rptabs-date">
            Date
          </label>
          <input
            id="ic-rptabs-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 9 August 2016"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rptabs-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-rptabs-pinpoint"
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

// ─── FORMS: Other Secondary Sources (Rules 7.2–7.16) ────────────────────────

function renderResearchPaperForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "7.2" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rp-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.2" } : {})}
            description="The title of the research paper."
            example="The Future of Legal Education"
          />
        </label>
        <input
          id="ic-rp-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Future of Legal Education"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rp-series">
            Series/Number
          </label>
          <input
            id="ic-rp-series"
            className="ic-input"
            type="text"
            value={(data.seriesNumber as string) || ""}
            placeholder="e.g. Working Paper No 12"
            onChange={(e) => updateField("seriesNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rp-year">
            Year
          </label>
          <input
            id="ic-rp-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2020"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rp-institution">
          Institution
        </label>
        <input
          id="ic-rp-institution"
          className="ic-input"
          type="text"
          value={(data.institution as string) || ""}
          placeholder="e.g. University of Melbourne"
          onChange={(e) => updateField("institution", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rp-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-rp-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 15"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderResearchPaperParliamentaryForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "7.2.3" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rpp-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.2.3" } : {})}
            description="The title of the parliamentary research paper."
            example="Social Security Payments for People Caring for Children"
          />
        </label>
        <input
          id="ic-rpp-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Social Security Payments for People Caring for Children"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rpp-number">
            Research Paper Number
          </label>
          <input
            id="ic-rpp-number"
            className="ic-input"
            type="text"
            value={(data.researchPaperNumber as string) || ""}
            placeholder="e.g. Research Paper No 1"
            onChange={(e) => updateField("researchPaperNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-rpp-date">
            Date
          </label>
          <input
            id="ic-rpp-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 20 June 2019"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-rpp-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-rpp-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 15"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderConferencePaperForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "7.2.4" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-cp-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.2.4" } : {})}
            description="The title of the conference paper."
            example="The Future of Indigenous Rights"
          />
        </label>
        <input
          id="ic-cp-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Future of Indigenous Rights"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-cp-conference">
          Conference Name
        </label>
        <input
          id="ic-cp-conference"
          className="ic-input"
          type="text"
          value={(data.conferenceName as string) || ""}
          placeholder="e.g. Australian Law Reform Conference"
          onChange={(e) => updateField("conferenceName", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-cp-location">
            Location
          </label>
          <input
            id="ic-cp-location"
            className="ic-input"
            type="text"
            value={(data.location as string) || ""}
            placeholder="e.g. Melbourne"
            onChange={(e) => updateField("location", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-cp-date">
            Date
          </label>
          <input
            id="ic-cp-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 15 March 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-cp-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-cp-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 15"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderThesisForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-thesis-author">
          Author
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.2.5" } : {})}
            description="The author of the thesis."
            example="Jane Smith"
          />
        </label>
        <input
          id="ic-thesis-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. Jane Smith"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-thesis-title">
          Title
        </label>
        <input
          id="ic-thesis-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Constitutional Implications of Climate Change Litigation"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-thesis-type">
          Thesis Type
        </label>
        <select
          id="ic-thesis-type"
          className="ic-select"
          value={(data.thesisType as string) || ""}
          onChange={(e) => updateField("thesisType", e.target.value)}
        >
          <option value="">Select type...</option>
          <option value="PhD">PhD Thesis</option>
          <option value="Masters">Masters Thesis</option>
          <option value="Honours">Honours Thesis</option>
        </select>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-thesis-institution">
            Institution
          </label>
          <input
            id="ic-thesis-institution"
            className="ic-input"
            type="text"
            value={(data.institution as string) || ""}
            placeholder="e.g. University of Melbourne"
            onChange={(e) => updateField("institution", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-thesis-year">
            Year
          </label>
          <input
            id="ic-thesis-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2020"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-thesis-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-thesis-pinpoint"
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

function renderSpeechForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-speech-speaker">
          Speaker
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.3" } : {})}
            description="The person who delivered the speech."
            example="Robert French"
          />
        </label>
        <input
          id="ic-speech-speaker"
          className="ic-input"
          type="text"
          value={(data.speaker as string) || ""}
          placeholder="e.g. Robert French"
          onChange={(e) => updateField("speaker", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-speech-title">
          Title
        </label>
        <input
          id="ic-speech-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Role of the High Court"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-speech-event">
          Event
        </label>
        <input
          id="ic-speech-event"
          className="ic-input"
          type="text"
          value={(data.event as string) || ""}
          placeholder="e.g. Law Council of Australia Dinner"
          onChange={(e) => updateField("event", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-speech-location">
            Location
          </label>
          <input
            id="ic-speech-location"
            className="ic-input"
            type="text"
            value={(data.location as string) || ""}
            placeholder="e.g. Canberra"
            onChange={(e) => updateField("location", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-speech-date">
            Date
          </label>
          <input
            id="ic-speech-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 25 March 2019"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-speech-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-speech-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 5"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderPressReleaseForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-pr-body">
          Issuing Body
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.4" } : {})}
            description="The body that issued the press release."
            example="Attorney-General's Department"
          />
        </label>
        <input
          id="ic-pr-body"
          className="ic-input"
          type="text"
          value={(data.issuingBody as string) || ""}
          placeholder="e.g. Attorney-General's Department"
          onChange={(e) => updateField("issuingBody", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-pr-title">
          Title
        </label>
        <input
          id="ic-pr-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. New Measures to Combat Terrorism"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-pr-number">
            Number
          </label>
          <input
            id="ic-pr-number"
            className="ic-input"
            type="text"
            value={(data.number as string) || ""}
            placeholder="e.g. No 123/2020"
            onChange={(e) => updateField("number", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-pr-date">
            Date
          </label>
          <input
            id="ic-pr-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 1 July 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-pr-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-pr-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 3"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderHansardForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  jurisdictionOptions: { value: string; label: string }[],
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-hansard-jurisdiction">
            Jurisdiction
            <FieldHelp
              {...(isAglcStandard ? { ruleNumber: "7.5.1" } : {})}
              description="The jurisdiction of the parliamentary debate."
              example="Commonwealth"
            />
          </label>
          <select
            id="ic-hansard-jurisdiction"
            className="ic-select"
            value={(data.jurisdiction as string) || ""}
            onChange={(e) => updateField("jurisdiction", e.target.value)}
          >
            <option value="">Select jurisdiction...</option>
            {jurisdictionOptions.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-hansard-chamber">
            Chamber
          </label>
          <select
            id="ic-hansard-chamber"
            className="ic-select"
            value={(data.chamber as string) || ""}
            onChange={(e) => updateField("chamber", e.target.value)}
          >
            <option value="">Select chamber...</option>
            <option value="House of Representatives">House of Representatives</option>
            <option value="Senate">Senate</option>
          </select>
        </div>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-hansard-date">
            Date
          </label>
          <input
            id="ic-hansard-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 12 February 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-hansard-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-hansard-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. 1234"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-hansard-speaker">
          Speaker
        </label>
        <input
          id="ic-hansard-speaker"
          className="ic-input"
          type="text"
          value={(data.speaker as string) || ""}
          placeholder="e.g. Mark Dreyfus"
          onChange={(e) => updateField("speaker", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderSubmissionGovernmentForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-subgov-author">
          Author/Body
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.5.2" } : {})}
            description="The author or body that made the submission."
            example="Law Council of Australia"
          />
        </label>
        <input
          id="ic-subgov-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. Law Council of Australia"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-subgov-title">
          Title
        </label>
        <input
          id="ic-subgov-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Submission to the Senate Legal and Constitutional Affairs Committee"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-subgov-inquiry">
          Inquiry Name
        </label>
        <input
          id="ic-subgov-inquiry"
          className="ic-input"
          type="text"
          value={(data.inquiryName as string) || ""}
          placeholder="e.g. Inquiry into the Human Rights (Parliamentary Scrutiny) Bill 2010"
          onChange={(e) => updateField("inquiryName", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-subgov-number">
            Submission Number
          </label>
          <input
            id="ic-subgov-number"
            className="ic-input"
            type="text"
            value={(data.submissionNumber as string) || ""}
            placeholder="e.g. Submission No 12"
            onChange={(e) => updateField("submissionNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-subgov-date">
            Date
          </label>
          <input
            id="ic-subgov-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 1 March 2011"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-subgov-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-subgov-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 5"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderEvidenceParliamentaryForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-evparl-witness">
          Witness
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.5.3" } : {})}
            description="The name of the witness giving evidence."
            example="Dr Sarah Jones"
          />
        </label>
        <input
          id="ic-evparl-witness"
          className="ic-input"
          type="text"
          value={(data.witness as string) || ""}
          placeholder="e.g. Dr Sarah Jones"
          onChange={(e) => updateField("witness", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-evparl-committee">
          Committee
        </label>
        <input
          id="ic-evparl-committee"
          className="ic-input"
          type="text"
          value={(data.committee as string) || ""}
          placeholder="e.g. Senate Legal and Constitutional Affairs Legislation Committee"
          onChange={(e) => updateField("committee", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-evparl-inquiry">
          Inquiry Title
        </label>
        <input
          id="ic-evparl-inquiry"
          className="ic-input"
          type="text"
          value={(data.inquiryTitle as string) || ""}
          placeholder="e.g. Inquiry into the Migration Amendment Bill 2020"
          onChange={(e) => updateField("inquiryTitle", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-evparl-date">
            Date
          </label>
          <input
            id="ic-evparl-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 15 October 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-evparl-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-evparl-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. 23"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function renderConstitutionalConventionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-cc-name">
          Convention Name
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.5.4" } : {})}
            description="The name of the constitutional convention."
            example="Official Record of the Debates of the Australasian Federal Convention"
          />
        </label>
        <input
          id="ic-cc-name"
          className="ic-input"
          type="text"
          value={(data.conventionName as string) || ""}
          placeholder="e.g. Official Record of the Debates of the Australasian Federal Convention"
          onChange={(e) => updateField("conventionName", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-cc-date">
            Date
          </label>
          <input
            id="ic-cc-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 8 February 1898"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-cc-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-cc-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. 654"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-cc-speaker">
          Speaker
        </label>
        <input
          id="ic-cc-speaker"
          className="ic-input"
          type="text"
          value={(data.speaker as string) || ""}
          placeholder="e.g. Edmund Barton"
          onChange={(e) => updateField("speaker", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderDictionaryForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-dict-title">
          Dictionary Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.6" } : {})}
            description="The title of the dictionary."
            example="Black's Law Dictionary"
          />
        </label>
        <input
          id="ic-dict-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Black's Law Dictionary"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-dict-edition">
            Edition
          </label>
          <input
            id="ic-dict-edition"
            className="ic-input"
            type="text"
            value={(data.edition as string) || ""}
            placeholder="e.g. 11th"
            onChange={(e) => updateField("edition", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-dict-year">
            Year
          </label>
          <input
            id="ic-dict-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2019"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-dict-entry">
          Entry Term
        </label>
        <input
          id="ic-dict-entry"
          className="ic-input"
          type="text"
          value={(data.entryTerm as string) || ""}
          placeholder="e.g. estoppel"
          onChange={(e) => updateField("entryTerm", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-dict-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-dict-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 642"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderLegalEncyclopediaForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-le-title">
          Encyclopedia Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.7" } : {})}
            description="The title of the legal encyclopedia."
            example="Halsbury's Laws of Australia"
          />
        </label>
        <input
          id="ic-le-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Halsbury's Laws of Australia"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-le-volume">
            Volume
          </label>
          <input
            id="ic-le-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. vol 1"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-le-titleNumber">
            Title Number
          </label>
          <input
            id="ic-le-titleNumber"
            className="ic-input"
            type="text"
            value={(data.titleNumber as string) || ""}
            placeholder="e.g. 10"
            onChange={(e) => updateField("titleNumber", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-le-topic">
          Paragraph/Topic
        </label>
        <input
          id="ic-le-topic"
          className="ic-input"
          type="text"
          value={(data.topic as string) || ""}
          placeholder="e.g. Equity [10-1234]"
          onChange={(e) => updateField("topic", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-le-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-le-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [10-1234]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderLooseleafForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "7.8" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ll-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.8" } : {})}
            description="The title of the looseleaf service."
            example="Australian Corporations Law: Principles and Practice"
          />
        </label>
        <input
          id="ic-ll-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Australian Corporations Law: Principles and Practice"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ll-publisher">
          Publisher
        </label>
        <input
          id="ic-ll-publisher"
          className="ic-input"
          type="text"
          value={(data.publisher as string) || ""}
          placeholder="e.g. LexisNexis"
          onChange={(e) => updateField("publisher", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ll-serviceNumber">
            Service Number
          </label>
          <input
            id="ic-ll-serviceNumber"
            className="ic-input"
            type="text"
            value={(data.serviceNumber as string) || ""}
            placeholder="e.g. Service 45"
            onChange={(e) => updateField("serviceNumber", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ll-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-ll-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. [1.234]"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function renderIpMaterialForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ip-applicant">
          Applicant/Owner
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.9" } : {})}
            description="The applicant or owner of the intellectual property."
            example="Dyson Technology Ltd"
          />
        </label>
        <input
          id="ic-ip-applicant"
          className="ic-input"
          type="text"
          value={(data.applicant as string) || ""}
          placeholder="e.g. Dyson Technology Ltd"
          onChange={(e) => updateField("applicant", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ip-titleNumber">
          Title/Number
        </label>
        <input
          id="ic-ip-titleNumber"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Patent Application No 2020123456"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ip-type">
          IP Type
        </label>
        <select
          id="ic-ip-type"
          className="ic-select"
          value={(data.ipType as string) || ""}
          onChange={(e) => updateField("ipType", e.target.value)}
        >
          <option value="">Select type...</option>
          <option value="Patent">Patent</option>
          <option value="Trade Mark">Trade Mark</option>
          <option value="Design">Design</option>
          <option value="Plant Breeder's Right">Plant Breeder's Right</option>
        </select>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ip-country">
            Country
          </label>
          <input
            id="ic-ip-country"
            className="ic-input"
            type="text"
            value={(data.country as string) || ""}
            placeholder="e.g. Australia"
            onChange={(e) => updateField("country", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ip-date">
            Date
          </label>
          <input
            id="ic-ip-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 15 January 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ip-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-ip-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. claim 1"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderConstitutiveDocumentForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-cd-entity">
          Entity Name
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.10" } : {})}
            description="The name of the entity whose constitutive document is being cited."
            example="BHP Group Limited"
          />
        </label>
        <input
          id="ic-cd-entity"
          className="ic-input"
          type="text"
          value={(data.entityName as string) || ""}
          placeholder="e.g. BHP Group Limited"
          onChange={(e) => updateField("entityName", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-cd-docType">
          Document Type
        </label>
        <select
          id="ic-cd-docType"
          className="ic-select"
          value={(data.documentType as string) || ""}
          onChange={(e) => updateField("documentType", e.target.value)}
        >
          <option value="">Select type...</option>
          <option value="Constitution">Constitution</option>
          <option value="Articles of Association">Articles of Association</option>
          <option value="Memorandum of Association">Memorandum of Association</option>
          <option value="Rules">Rules</option>
          <option value="Charter">Charter</option>
        </select>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-cd-date">
            Date
          </label>
          <input
            id="ic-cd-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 1 January 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-cd-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-cd-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. cl 12"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function renderNewspaperForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-news-author">
          Author
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.11" } : {})}
            description="The author of the newspaper article (if attributed)."
            example="Michael Pelly"
          />
        </label>
        <input
          id="ic-news-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. Michael Pelly"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-news-articleTitle">
          Article Title
        </label>
        <input
          id="ic-news-articleTitle"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Courts Face Backlog Crisis"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-news-newspaper">
            Newspaper Name
          </label>
          <input
            id="ic-news-newspaper"
            className="ic-input"
            type="text"
            value={(data.newspaperName as string) || ""}
            placeholder="e.g. The Australian"
            onChange={(e) => updateField("newspaperName", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-news-place">
            Place
          </label>
          <input
            id="ic-news-place"
            className="ic-input"
            type="text"
            value={(data.place as string) || ""}
            placeholder="e.g. Sydney"
            onChange={(e) => updateField("place", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-news-date">
            Date
          </label>
          <input
            id="ic-news-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 15 March 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-news-page">
            Page
          </label>
          <input
            id="ic-news-page"
            className="ic-input"
            type="text"
            value={(data.page as string) || ""}
            placeholder="e.g. 1"
            onChange={(e) => updateField("page", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-news-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-news-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 3"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderCorrespondenceForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-corr-author">
          Author
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.12" } : {})}
            description="The person who sent the correspondence."
            example="Professor John Smith"
          />
        </label>
        <input
          id="ic-corr-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. Professor John Smith"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-corr-recipient">
          Recipient
        </label>
        <input
          id="ic-corr-recipient"
          className="ic-input"
          type="text"
          value={(data.recipient as string) || ""}
          placeholder="e.g. Dr Jane Doe"
          onChange={(e) => updateField("recipient", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-corr-date">
            Date
          </label>
          <input
            id="ic-corr-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 1 January 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-corr-medium">
            Medium
          </label>
          <select
            id="ic-corr-medium"
            className="ic-select"
            value={(data.medium as string) || ""}
            onChange={(e) => updateField("medium", e.target.value)}
          >
            <option value="">Select medium...</option>
            <option value="Letter">Letter</option>
            <option value="Email">Email</option>
            <option value="Fax">Fax</option>
          </select>
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-corr-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-corr-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 2"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderInterviewForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-int-interviewee">
          Interviewee
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.13" } : {})}
            description="The person being interviewed."
            example="Justice Virginia Bell"
          />
        </label>
        <input
          id="ic-int-interviewee"
          className="ic-input"
          type="text"
          value={(data.interviewee as string) || ""}
          placeholder="e.g. Justice Virginia Bell"
          onChange={(e) => updateField("interviewee", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-int-interviewer">
          Interviewer
        </label>
        <input
          id="ic-int-interviewer"
          className="ic-input"
          type="text"
          value={(data.interviewer as string) || ""}
          placeholder="e.g. Leigh Sales"
          onChange={(e) => updateField("interviewer", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-int-program">
          Program/Publication
        </label>
        <input
          id="ic-int-program"
          className="ic-input"
          type="text"
          value={(data.program as string) || ""}
          placeholder="e.g. 7.30"
          onChange={(e) => updateField("program", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-int-date">
            Date
          </label>
          <input
            id="ic-int-date"
            className="ic-input"
            type="text"
            value={(data.date as string) || ""}
            placeholder="e.g. 15 March 2020"
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-int-medium">
            Medium
          </label>
          <select
            id="ic-int-medium"
            className="ic-select"
            value={(data.medium as string) || ""}
            onChange={(e) => updateField("medium", e.target.value)}
          >
            <option value="">Select medium...</option>
            <option value="Television">Television</option>
            <option value="Radio">Radio</option>
            <option value="Podcast">Podcast</option>
            <option value="In Person">In Person</option>
            <option value="Telephone">Telephone</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function renderFilmTvMediaForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ftm-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.14" } : {})}
            description="The title of the film, TV show, podcast, or radio program."
            example="The Castle"
          />
        </label>
        <input
          id="ic-ftm-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Castle"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ftm-director">
          Director
        </label>
        <input
          id="ic-ftm-director"
          className="ic-input"
          type="text"
          value={(data.director as string) || ""}
          placeholder="e.g. Rob Sitch"
          onChange={(e) => updateField("director", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ftm-production">
          Production Company
        </label>
        <input
          id="ic-ftm-production"
          className="ic-input"
          type="text"
          value={(data.productionCompany as string) || ""}
          placeholder="e.g. Working Dog Productions"
          onChange={(e) => updateField("productionCompany", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ftm-year">
            Year
          </label>
          <input
            id="ic-ftm-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 1997"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ftm-medium">
            Medium
          </label>
          <select
            id="ic-ftm-medium"
            className="ic-select"
            value={(data.medium as string) || ""}
            onChange={(e) => updateField("medium", e.target.value)}
          >
            <option value="">Select medium...</option>
            <option value="Film">Film</option>
            <option value="Television">Television</option>
            <option value="Podcast">Podcast</option>
            <option value="Radio">Radio</option>
          </select>
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ftm-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-ftm-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 1:23:45"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderInternetMaterialForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-web-author">
          Author
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.15" } : {})}
            description="The author of the internet material (if attributed)."
            example="Department of Health"
          />
        </label>
        <input
          id="ic-web-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. Department of Health"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-web-title">
          Title
        </label>
        <input
          id="ic-web-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. COVID-19 Vaccination Program"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-web-website">
          Website Name
        </label>
        <input
          id="ic-web-website"
          className="ic-input"
          type="text"
          value={(data.websiteName as string) || ""}
          placeholder="e.g. Australian Government Department of Health"
          onChange={(e) => updateField("websiteName", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-web-date">
          Date
        </label>
        <input
          id="ic-web-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 15 March 2021"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-web-url">
          URL
        </label>
        <input
          id="ic-web-url"
          className="ic-input"
          type="url"
          value={(data.url as string) || ""}
          placeholder="e.g. https://www.health.gov.au/..."
          onChange={(e) => updateField("url", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-web-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-web-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 3"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderSocialMediaForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sm-author">
          Author/Handle
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "7.16" } : {})}
            description="The author or handle of the social media post."
            example="@HighCourtAus"
          />
        </label>
        <input
          id="ic-sm-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. @HighCourtAus"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sm-platform">
          Platform
        </label>
        <select
          id="ic-sm-platform"
          className="ic-select"
          value={(data.platform as string) || ""}
          onChange={(e) => updateField("platform", e.target.value)}
        >
          <option value="">Select platform...</option>
          <option value="Twitter">Twitter/X</option>
          <option value="Facebook">Facebook</option>
          <option value="Instagram">Instagram</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="YouTube">YouTube</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sm-content">
          Content (first words)
        </label>
        <input
          id="ic-sm-content"
          className="ic-input"
          type="text"
          value={(data.content as string) || ""}
          placeholder="e.g. Today the High Court handed down..."
          onChange={(e) => updateField("content", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sm-date">
          Date
        </label>
        <input
          id="ic-sm-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 15 March 2021"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-sm-url">
          URL
        </label>
        <input
          id="ic-sm-url"
          className="ic-input"
          type="url"
          value={(data.url as string) || ""}
          placeholder="e.g. https://twitter.com/HighCourtAus/status/..."
          onChange={(e) => updateField("url", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderUnDocumentForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-undoc-body">
          Body/Organ
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "9.2" } : {})}
            description="The UN body or organ that issued the document."
            example="GA, SC, ECOSOC"
          />
        </label>
        <input
          id="ic-undoc-body"
          className="ic-input"
          type="text"
          value={(data.body as string) || ""}
          placeholder="e.g. GA, SC, ECOSOC"
          onChange={(e) => updateField("body", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-undoc-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "9.2" } : {})}
            description="The title of the UN document."
            example="Universal Declaration of Human Rights"
          />
        </label>
        <input
          id="ic-undoc-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Universal Declaration of Human Rights"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-undoc-docnumber">
          UN Doc Number
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "9.2" } : {})}
            description="The official UN document number."
            example="A/RES/217A(III)"
          />
        </label>
        <input
          id="ic-undoc-docnumber"
          className="ic-input"
          type="text"
          value={(data.docNumber as string) || ""}
          placeholder="e.g. A/RES/217A(III)"
          onChange={(e) => updateField("docNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-undoc-date">
          Date
        </label>
        <input
          id="ic-undoc-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 10 December 1948"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-undoc-session">
          Session (optional)
        </label>
        <input
          id="ic-undoc-session"
          className="ic-input"
          type="text"
          value={(data.session as string) || ""}
          placeholder="e.g. 3rd sess"
          onChange={(e) => updateField("session", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-undoc-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-undoc-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. art 1"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: UN Communication (Rule 9.3) ─────────────────────────────────

function renderUnCommunicationForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-uncomm-author">
          Author
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "9.3" } : {})}
            description="The author of the communication."
            example="Toonen"
          />
        </label>
        <input
          id="ic-uncomm-author"
          className="ic-input"
          type="text"
          value={(data.author as string) || ""}
          placeholder="e.g. Toonen"
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-uncomm-commno">
          Communication Number
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "9.3" } : {})}
            description="The communication number assigned by the committee."
            example="488/1992"
          />
        </label>
        <input
          id="ic-uncomm-commno"
          className="ic-input"
          type="text"
          value={(data.communicationNumber as string) || ""}
          placeholder="e.g. 488/1992"
          onChange={(e) => updateField("communicationNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-uncomm-committee">
          Committee
        </label>
        <input
          id="ic-uncomm-committee"
          className="ic-input"
          type="text"
          value={(data.committee as string) || ""}
          placeholder="e.g. Human Rights Committee"
          onChange={(e) => updateField("committee", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-uncomm-date">
          Date
        </label>
        <input
          id="ic-uncomm-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 4 April 1994"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-uncomm-docnumber">
          UN Doc Number
        </label>
        <input
          id="ic-uncomm-docnumber"
          className="ic-input"
          type="text"
          value={(data.docNumber as string) || ""}
          placeholder="e.g. CCPR/C/50/D/488/1992"
          onChange={(e) => updateField("docNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-uncomm-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-uncomm-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [8.7]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: UN Yearbook (Rule 9.4) ──────────────────────────────────────

function renderUnYearbookForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unyb-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "9.4" } : {})}
            description="The title of the yearbook article or entry."
            example="Reservations to the Convention on Genocide"
          />
        </label>
        <input
          id="ic-unyb-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Reservations to the Convention on Genocide"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-unyb-year">
            Year
          </label>
          <input
            id="ic-unyb-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 1951"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-unyb-volume">
            Volume
          </label>
          <input
            id="ic-unyb-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. II"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unyb-startpage">
          Starting Page
        </label>
        <input
          id="ic-unyb-startpage"
          className="ic-input"
          type="text"
          value={(data.startingPage as string) || ""}
          placeholder="e.g. 820"
          onChange={(e) => updateField("startingPage", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-unyb-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-unyb-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 823"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: ICJ Decision (Rule 10.2) ────────────────────────────────────

function renderIcjDecisionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjd-casetitle">
          Case Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "10.2" } : {})}
            description="The title of the ICJ case. Italicised in the citation."
            example="North Sea Continental Shelf Cases"
          />
        </label>
        <input
          id="ic-icjd-casetitle"
          className="ic-input"
          type="text"
          value={(data.caseTitle as string) || ""}
          placeholder="e.g. North Sea Continental Shelf Cases"
          onChange={(e) => updateField("caseTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjd-parties">
          Parties
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "10.2" } : {})}
            description="The parties to the case."
            example="Germany/Denmark; Germany/Netherlands"
          />
        </label>
        <input
          id="ic-icjd-parties"
          className="ic-input"
          type="text"
          value={(data.parties as string) || ""}
          placeholder="e.g. Germany/Denmark; Germany/Netherlands"
          onChange={(e) => updateField("parties", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjd-decisiontype">
          Decision Type
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "10.2" } : {})}
            description="The type of ICJ decision."
          />
        </label>
        <select
          id="ic-icjd-decisiontype"
          className="ic-select"
          value={(data.decisionType as string) || ""}
          onChange={(e) => updateField("decisionType", e.target.value)}
        >
          <option value="">Select...</option>
          <option value="Judgment">Judgment</option>
          <option value="Advisory Opinion">Advisory Opinion</option>
          <option value="Order">Order</option>
        </select>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjd-year">
          Year
        </label>
        <input
          id="ic-icjd-year"
          className="ic-input"
          type="text"
          value={(data.year as string) || ""}
          placeholder="e.g. 1969"
          onChange={(e) => updateField("year", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjd-icjpage">
          ICJ Reports Page
        </label>
        <input
          id="ic-icjd-icjpage"
          className="ic-input"
          type="text"
          value={(data.icjReportsPage as string) || ""}
          placeholder="e.g. 3"
          onChange={(e) => updateField("icjReportsPage", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjd-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-icjd-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 46"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: ICJ Pleading (Rule 10.3) ────────────────────────────────────

function renderIcjPleadingForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjp-casetitle">
          Case Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "10.3" } : {})}
            description="The title of the ICJ case."
            example="Nuclear Tests"
          />
        </label>
        <input
          id="ic-icjp-casetitle"
          className="ic-input"
          type="text"
          value={(data.caseTitle as string) || ""}
          placeholder="e.g. Nuclear Tests"
          onChange={(e) => updateField("caseTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjp-doctype">
          Document Type
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "10.3" } : {})}
            description="The type of pleading document."
            example="Memorial, Counter-Memorial, Reply"
          />
        </label>
        <input
          id="ic-icjp-doctype"
          className="ic-input"
          type="text"
          value={(data.documentType as string) || ""}
          placeholder="e.g. Memorial, Counter-Memorial"
          onChange={(e) => updateField("documentType", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjp-party">
          Party
        </label>
        <input
          id="ic-icjp-party"
          className="ic-input"
          type="text"
          value={(data.party as string) || ""}
          placeholder="e.g. Australia"
          onChange={(e) => updateField("party", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjp-date">
          Date
        </label>
        <input
          id="ic-icjp-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 20 December 1973"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjp-volume">
          ICJ Pleadings Volume
        </label>
        <input
          id="ic-icjp-volume"
          className="ic-input"
          type="text"
          value={(data.icjPleadingsVolume as string) || ""}
          placeholder="e.g. I"
          onChange={(e) => updateField("icjPleadingsVolume", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icjp-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-icjp-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 15"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: Arbitral Award — State v State (Rule 11.1) ──────────────────

function renderArbitralStateStateForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbss-casetitle">
          Case Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "11.1" } : {})}
            description="The title of the arbitral case. Italicised in the citation."
            example="Island of Palmas Case"
          />
        </label>
        <input
          id="ic-arbss-casetitle"
          className="ic-input"
          type="text"
          value={(data.caseTitle as string) || ""}
          placeholder="e.g. Island of Palmas Case"
          onChange={(e) => updateField("caseTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbss-parties">
          Parties
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "11.1" } : {})}
            description="The state parties to the arbitration."
            example="Netherlands/United States"
          />
        </label>
        <input
          id="ic-arbss-parties"
          className="ic-input"
          type="text"
          value={(data.parties as string) || ""}
          placeholder="e.g. Netherlands/United States"
          onChange={(e) => updateField("parties", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbss-tribunal">
          Tribunal
        </label>
        <input
          id="ic-arbss-tribunal"
          className="ic-input"
          type="text"
          value={(data.tribunal as string) || ""}
          placeholder="e.g. Permanent Court of Arbitration"
          onChange={(e) => updateField("tribunal", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbss-date">
          Award Date
        </label>
        <input
          id="ic-arbss-date"
          className="ic-input"
          type="text"
          value={(data.awardDate as string) || ""}
          placeholder="e.g. 4 April 1928"
          onChange={(e) => updateField("awardDate", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbss-report">
          Report Series
        </label>
        <input
          id="ic-arbss-report"
          className="ic-input"
          type="text"
          value={(data.reportSeries as string) || ""}
          placeholder="e.g. (1928) 2 RIAA 829"
          onChange={(e) => updateField("reportSeries", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbss-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-arbss-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 838"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: Arbitral Award — Individual v State (Rule 11.2) ─────────────

function renderArbitralIndividualStateForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbis-casetitle">
          Case Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "11.2" } : {})}
            description="The title of the investment arbitration case. Italicised in the citation."
            example="Philip Morris Asia Ltd v Australia"
          />
        </label>
        <input
          id="ic-arbis-casetitle"
          className="ic-input"
          type="text"
          value={(data.caseTitle as string) || ""}
          placeholder="e.g. Philip Morris Asia Ltd v Australia"
          onChange={(e) => updateField("caseTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbis-caseno">
          Case Number
        </label>
        <input
          id="ic-arbis-caseno"
          className="ic-input"
          type="text"
          value={(data.caseNumber as string) || ""}
          placeholder="e.g. ICSID Case No ARB/12/2"
          onChange={(e) => updateField("caseNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbis-tribunal">
          Tribunal
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "11.2" } : {})}
            description="The arbitral tribunal or institution."
          />
        </label>
        <select
          id="ic-arbis-tribunal"
          className="ic-select"
          value={(data.tribunal as string) || ""}
          onChange={(e) => updateField("tribunal", e.target.value)}
        >
          <option value="">Select...</option>
          <option value="ICSID">ICSID</option>
          <option value="PCA">PCA</option>
          <option value="UNCITRAL">UNCITRAL</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {(data.tribunal as string) === "Other" && (
        <div className="ic-field">
          <label className="ic-label" htmlFor="ic-arbis-tribunal-other">
            Tribunal Name
          </label>
          <input
            id="ic-arbis-tribunal-other"
            className="ic-input"
            type="text"
            value={(data.tribunalOther as string) || ""}
            placeholder="Enter tribunal name"
            onChange={(e) => updateField("tribunalOther", e.target.value)}
          />
        </div>
      )}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbis-date">
          Award Date
        </label>
        <input
          id="ic-arbis-date"
          className="ic-input"
          type="text"
          value={(data.awardDate as string) || ""}
          placeholder="e.g. 17 December 2015"
          onChange={(e) => updateField("awardDate", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-arbis-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-arbis-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [125]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: ICC Tribunal Case (Rule 12.2) ──────────────────────────────

function renderIccTribunalCaseForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icc-accused">
          Accused
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "12.2" } : {})}
            description="The name of the accused person."
            example="Prosecutor v Lubanga"
          />
        </label>
        <input
          id="ic-icc-accused"
          className="ic-input"
          type="text"
          value={(data.accused as string) || ""}
          placeholder="e.g. Prosecutor v Lubanga"
          onChange={(e) => updateField("accused", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icc-caseno">
          Case Number
        </label>
        <input
          id="ic-icc-caseno"
          className="ic-input"
          type="text"
          value={(data.caseNumber as string) || ""}
          placeholder="e.g. ICC-01/04-01/06"
          onChange={(e) => updateField("caseNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icc-tribunal">
          Tribunal
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "12.2" } : {})}
            description="The international criminal tribunal."
          />
        </label>
        <select
          id="ic-icc-tribunal"
          className="ic-select"
          value={(data.tribunal as string) || ""}
          onChange={(e) => updateField("tribunal", e.target.value)}
        >
          <option value="">Select...</option>
          <option value="ICC">ICC</option>
          <option value="ICTY">ICTY</option>
          <option value="ICTR">ICTR</option>
          <option value="SCSL">SCSL</option>
          <option value="STL">STL</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {(data.tribunal as string) === "Other" && (
        <div className="ic-field">
          <label className="ic-label" htmlFor="ic-icc-tribunal-other">
            Tribunal Name
          </label>
          <input
            id="ic-icc-tribunal-other"
            className="ic-input"
            type="text"
            value={(data.tribunalOther as string) || ""}
            placeholder="Enter tribunal name"
            onChange={(e) => updateField("tribunalOther", e.target.value)}
          />
        </div>
      )}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icc-chamber">
          Chamber
        </label>
        <input
          id="ic-icc-chamber"
          className="ic-input"
          type="text"
          value={(data.chamber as string) || ""}
          placeholder="e.g. Trial Chamber I"
          onChange={(e) => updateField("chamber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icc-decisiontype">
          Decision Type
        </label>
        <input
          id="ic-icc-decisiontype"
          className="ic-input"
          type="text"
          value={(data.decisionType as string) || ""}
          placeholder="e.g. Judgment, Decision on Confirmation of Charges"
          onChange={(e) => updateField("decisionType", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icc-date">
          Date
        </label>
        <input
          id="ic-icc-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 14 March 2012"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-icc-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-icc-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [125]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: WTO Document (Rule 13.1.2) ─────────────────────────────────

function renderWtoDocumentForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodoc-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "13.1.2" } : {})}
            description="The title of the WTO document."
            example="Marrakesh Agreement Establishing the World Trade Organization"
          />
        </label>
        <input
          id="ic-wtodoc-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Marrakesh Agreement..."
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodoc-docno">
          WTO Doc Number
        </label>
        <input
          id="ic-wtodoc-docno"
          className="ic-input"
          type="text"
          value={(data.docNumber as string) || ""}
          placeholder="e.g. WT/MIN(01)/DEC/1"
          onChange={(e) => updateField("docNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodoc-date">
          Date
        </label>
        <input
          id="ic-wtodoc-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 20 November 2001"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodoc-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-wtodoc-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. art IV"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: WTO Decision (Rule 13.1.3) ─────────────────────────────────

function renderWtoDecisionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodec-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "13.1.3" } : {})}
            description="The short title or subject of the dispute."
            example="Australia -- Measures Affecting Importation of Salmon"
          />
        </label>
        <input
          id="ic-wtodec-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Australia -- Measures Affecting..."
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-wtodec-complainant">
            Complainant
          </label>
          <input
            id="ic-wtodec-complainant"
            className="ic-input"
            type="text"
            value={(data.complainant as string) || ""}
            placeholder="e.g. Canada"
            onChange={(e) => updateField("complainant", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-wtodec-respondent">
            Respondent
          </label>
          <input
            id="ic-wtodec-respondent"
            className="ic-input"
            type="text"
            value={(data.respondent as string) || ""}
            placeholder="e.g. Australia"
            onChange={(e) => updateField("respondent", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodec-paneltype">
          Panel/Appellate Body
        </label>
        <select
          id="ic-wtodec-paneltype"
          className="ic-select"
          value={(data.panelType as string) || ""}
          onChange={(e) => updateField("panelType", e.target.value)}
        >
          <option value="">Select...</option>
          <option value="Panel">Panel</option>
          <option value="Appellate Body">Appellate Body</option>
        </select>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodec-docno">
          WTO Doc Number
        </label>
        <input
          id="ic-wtodec-docno"
          className="ic-input"
          type="text"
          value={(data.docNumber as string) || ""}
          placeholder="e.g. WT/DS18/AB/R"
          onChange={(e) => updateField("docNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodec-date">
          Date
        </label>
        <input
          id="ic-wtodec-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 20 October 1998"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-wtodec-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-wtodec-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [125]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: GATT Document (Rule 13.2) ──────────────────────────────────

function renderGattDocumentForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gatt-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "13.2" } : {})}
            description="The title of the GATT document."
            example="Japan -- Customs Duties, Taxes and Labelling Practices on Imported Wines and Alcoholic Beverages"
          />
        </label>
        <input
          id="ic-gatt-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Japan -- Customs Duties..."
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gatt-docno">
          GATT Doc Number
        </label>
        <input
          id="ic-gatt-docno"
          className="ic-input"
          type="text"
          value={(data.docNumber as string) || ""}
          placeholder="e.g. BISD 34S/83"
          onChange={(e) => updateField("docNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gatt-date">
          Date
        </label>
        <input
          id="ic-gatt-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 10 November 1987"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gatt-bisd">
          BISD Volume (optional)
        </label>
        <input
          id="ic-gatt-bisd"
          className="ic-input"
          type="text"
          value={(data.bisdVolume as string) || ""}
          placeholder="e.g. 34S"
          onChange={(e) => updateField("bisdVolume", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-gatt-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-gatt-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 83"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: EU Official Journal (Rule 14.2.1) ──────────────────────────

function renderEuOfficialJournalForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euoj-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "14.2.1" } : {})}
            description="The title of the EU legislative instrument."
            example="Regulation (EC) No 561/2006 on the harmonisation of certain social legislation relating to road transport"
          />
        </label>
        <input
          id="ic-euoj-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Regulation (EC) No 561/2006..."
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euoj-doctype">
          Document Type
        </label>
        <select
          id="ic-euoj-doctype"
          className="ic-select"
          value={(data.documentType as string) || ""}
          onChange={(e) => updateField("documentType", e.target.value)}
        >
          <option value="">Select...</option>
          <option value="Regulation">Regulation</option>
          <option value="Directive">Directive</option>
          <option value="Decision">Decision</option>
        </select>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euoj-number">
          Number
        </label>
        <input
          id="ic-euoj-number"
          className="ic-input"
          type="text"
          value={(data.number as string) || ""}
          placeholder="e.g. 561/2006"
          onChange={(e) => updateField("number", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euoj-ojseries">
          OJ Series
        </label>
        <input
          id="ic-euoj-ojseries"
          className="ic-input"
          type="text"
          value={(data.ojSeries as string) || ""}
          placeholder="e.g. OJ L 102"
          onChange={(e) => updateField("ojSeries", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euoj-date">
          Date
        </label>
        <input
          id="ic-euoj-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 11 April 2006"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euoj-page">
          Page
        </label>
        <input
          id="ic-euoj-page"
          className="ic-input"
          type="text"
          value={(data.page as string) || ""}
          placeholder="e.g. 1"
          onChange={(e) => updateField("page", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euoj-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-euoj-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. art 5"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: EU Court Decision (Rule 14.2.3) ────────────────────────────

function renderEuCourtForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euc-casetitle">
          Case Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "14.2.3" } : {})}
            description="The title of the EU court case. Italicised in the citation."
            example="Van Gend en Loos v Nederlandse Administratie der Belastingen"
          />
        </label>
        <input
          id="ic-euc-casetitle"
          className="ic-input"
          type="text"
          value={(data.caseTitle as string) || ""}
          placeholder="e.g. Van Gend en Loos..."
          onChange={(e) => updateField("caseTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euc-caseno">
          Case Number
        </label>
        <input
          id="ic-euc-caseno"
          className="ic-input"
          type="text"
          value={(data.caseNumber as string) || ""}
          placeholder="e.g. C-26/62"
          onChange={(e) => updateField("caseNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euc-court">
          Court
        </label>
        <select
          id="ic-euc-court"
          className="ic-select"
          value={(data.court as string) || ""}
          onChange={(e) => updateField("court", e.target.value)}
        >
          <option value="">Select...</option>
          <option value="CJEU">CJEU</option>
          <option value="General Court">General Court</option>
        </select>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euc-date">
          Date
        </label>
        <input
          id="ic-euc-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 5 February 1963"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euc-ecr">
          ECR Citation
        </label>
        <input
          id="ic-euc-ecr"
          className="ic-input"
          type="text"
          value={(data.ecrCitation as string) || ""}
          placeholder="e.g. [1963] ECR 1"
          onChange={(e) => updateField("ecrCitation", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-euc-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-euc-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 12"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: ECHR Decision (Rule 14.3.2) ────────────────────────────────

function renderEchrDecisionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-echr-casetitle">
          Case Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "14.3.2" } : {})}
            description="The title of the ECHR case. Italicised in the citation."
            example="Soering v United Kingdom"
          />
        </label>
        <input
          id="ic-echr-casetitle"
          className="ic-input"
          type="text"
          value={(data.caseTitle as string) || ""}
          placeholder="e.g. Soering v United Kingdom"
          onChange={(e) => updateField("caseTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-echr-appno">
          Application Number
        </label>
        <input
          id="ic-echr-appno"
          className="ic-input"
          type="text"
          value={(data.applicationNumber as string) || ""}
          placeholder="e.g. 14038/88"
          onChange={(e) => updateField("applicationNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-echr-court">
          Court/Chamber
        </label>
        <input
          id="ic-echr-court"
          className="ic-input"
          type="text"
          value={(data.court as string) || ""}
          placeholder="e.g. Grand Chamber"
          onChange={(e) => updateField("court", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-echr-date">
          Date
        </label>
        <input
          id="ic-echr-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 7 July 1989"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-echr-reports">
          ECHR Reports
        </label>
        <input
          id="ic-echr-reports"
          className="ic-input"
          type="text"
          value={(data.echrReports as string) || ""}
          placeholder="e.g. (1989) 161 Eur Court HR (ser A)"
          onChange={(e) => updateField("echrReports", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-echr-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-echr-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [88]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: Supranational Decision (Rule 14.4) ─────────────────────────

function renderSupranationalDecisionForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supd-casetitle">
          Case Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "14.4" } : {})}
            description="The title of the supranational court case. Italicised in the citation."
            example="Velasquez Rodriguez v Honduras"
          />
        </label>
        <input
          id="ic-supd-casetitle"
          className="ic-input"
          type="text"
          value={(data.caseTitle as string) || ""}
          placeholder="e.g. Velasquez Rodriguez v Honduras"
          onChange={(e) => updateField("caseTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supd-parties">
          Parties
        </label>
        <input
          id="ic-supd-parties"
          className="ic-input"
          type="text"
          value={(data.parties as string) || ""}
          placeholder="e.g. Velasquez Rodriguez, Honduras"
          onChange={(e) => updateField("parties", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supd-court">
          Court/Tribunal
        </label>
        <input
          id="ic-supd-court"
          className="ic-input"
          type="text"
          value={(data.court as string) || ""}
          placeholder="e.g. Inter-American Court of Human Rights"
          onChange={(e) => updateField("court", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supd-date">
          Date
        </label>
        <input
          id="ic-supd-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 29 July 1988"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supd-report">
          Report Series
        </label>
        <input
          id="ic-supd-report"
          className="ic-input"
          type="text"
          value={(data.reportSeries as string) || ""}
          placeholder="e.g. (Ser C) No 4"
          onChange={(e) => updateField("reportSeries", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supd-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-supd-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [166]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── INTL-FORMS: Supranational Document (Rule 14.5) ─────────────────────────

function renderSupranationalDocumentForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supdoc-body">
          Body
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "14.5" } : {})}
            description="The supranational body that issued the document."
            example="Inter-American Commission on Human Rights"
          />
        </label>
        <input
          id="ic-supdoc-body"
          className="ic-input"
          type="text"
          value={(data.body as string) || ""}
          placeholder="e.g. Inter-American Commission on Human Rights"
          onChange={(e) => updateField("body", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supdoc-title">
          Title
        </label>
        <input
          id="ic-supdoc-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Report on the Situation of Human Rights in Brazil"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supdoc-docno">
          Document Number
        </label>
        <input
          id="ic-supdoc-docno"
          className="ic-input"
          type="text"
          value={(data.documentNumber as string) || ""}
          placeholder="e.g. OEA/Ser.L/V/II.97"
          onChange={(e) => updateField("documentNumber", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supdoc-date">
          Date
        </label>
        <input
          id="ic-supdoc-date"
          className="ic-input"
          type="text"
          value={(data.date as string) || ""}
          placeholder="e.g. 29 September 1997"
          onChange={(e) => updateField("date", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-supdoc-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-supdoc-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. ch V"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}


function renderJournalOnlineForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "5.10" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-jo-title">
          Article Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "5.10" } : {})}
            description="The title of the online journal article, enclosed in single quotation marks."
            example="'Digital Rights in the Modern Era'"
          />
        </label>
        <input
          id="ic-jo-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Digital Rights in the Modern Era"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-jo-journal">
          Journal Name
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "5.10" } : {})}
            description="The name of the online journal. Italicised in the citation."
            example="Journal of Law and Technology"
          />
        </label>
        <input
          id="ic-jo-journal"
          className="ic-input"
          type="text"
          value={(data.journal as string) || ""}
          placeholder="e.g. Journal of Law and Technology"
          onChange={(e) => updateField("journal", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-jo-url">
          URL
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "5.10" } : {})}
            description="The URL where the article can be accessed."
            example="https://example.com/article"
          />
        </label>
        <input
          id="ic-jo-url"
          className="ic-input"
          type="text"
          value={(data.url as string) || ""}
          placeholder="e.g. https://example.com/article"
          onChange={(e) => updateField("url", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-jo-date-accessed">
            Date Accessed
          </label>
          <input
            id="ic-jo-date-accessed"
            className="ic-input"
            type="text"
            value={(data.dateAccessed as string) || ""}
            placeholder="e.g. 15 March 2024"
            onChange={(e) => updateField("dateAccessed", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-jo-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-jo-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. 5"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Journal Forthcoming Form (Rule 5.11) ─────────────────────────────────────

function renderJournalForthcomingForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "5.11" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-jf-title">
          Article Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "5.11" } : {})}
            description="The title of the forthcoming article, enclosed in single quotation marks."
            example="'The Future of Administrative Law'"
          />
        </label>
        <input
          id="ic-jf-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Future of Administrative Law"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-jf-journal">
          Journal Name
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "5.11" } : {})}
            description="The name of the journal. Italicised in the citation."
            example="Sydney Law Review"
          />
        </label>
        <input
          id="ic-jf-journal"
          className="ic-input"
          type="text"
          value={(data.journal as string) || ""}
          placeholder="e.g. Sydney Law Review"
          onChange={(e) => updateField("journal", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-jf-year">
            Year
          </label>
          <input
            id="ic-jf-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2025"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-jf-volume">
            Volume
          </label>
          <input
            id="ic-jf-volume"
            className="ic-input"
            type="text"
            value={(data.volume as string) || ""}
            placeholder="e.g. 47"
            onChange={(e) => updateField("volume", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-jf-forthcoming-note">
          Forthcoming Note
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "5.11" } : {})}
            description="Label indicating the article is forthcoming, e.g. 'forthcoming'."
            example="forthcoming"
          />
        </label>
        <input
          id="ic-jf-forthcoming-note"
          className="ic-input"
          type="text"
          value={(data.forthcomingNote as string) || "forthcoming"}
          placeholder="e.g. forthcoming"
          onChange={(e) => updateField("forthcomingNote", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-jf-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-jf-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. 15"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Book Chapter Form (Rule 6.6.1) ───────────────────────────────────────────

function renderBookChapterForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "6.6.1" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bc-chapter-title">
          Chapter Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.6.1" } : {})}
            description="The title of the chapter, enclosed in single quotation marks."
            example="'The Separation of Powers'"
          />
        </label>
        <input
          id="ic-bc-chapter-title"
          className="ic-input"
          type="text"
          value={(data.chapterTitle as string) || ""}
          placeholder="e.g. The Separation of Powers"
          onChange={(e) => updateField("chapterTitle", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bc-editors">
          Editors
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.6.1" } : {})}
            description="The editor(s) of the book containing the chapter."
            example="Michael Coper and George Williams"
          />
        </label>
        <input
          id="ic-bc-editors"
          className="ic-input"
          type="text"
          value={(data.editors as string) || ""}
          placeholder="e.g. Michael Coper and George Williams"
          onChange={(e) => updateField("editors", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bc-book-title">
          Book Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.6.1" } : {})}
            description="The title of the book. Italicised in the citation."
            example="The Oxford Handbook of Australian Politics"
          />
        </label>
        <input
          id="ic-bc-book-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Oxford Handbook of Australian Politics"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bc-publisher">
          Publisher
        </label>
        <input
          id="ic-bc-publisher"
          className="ic-input"
          type="text"
          value={(data.publisher as string) || ""}
          placeholder="e.g. Oxford University Press"
          onChange={(e) => updateField("publisher", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bc-edition">
            Edition
          </label>
          <input
            id="ic-bc-edition"
            className="ic-input"
            type="text"
            value={(data.edition as string) || ""}
            placeholder="e.g. 2nd"
            onChange={(e) => updateField("edition", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bc-year">
            Year
          </label>
          <input
            id="ic-bc-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2018"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bc-start-page">
            Starting Page
          </label>
          <input
            id="ic-bc-start-page"
            className="ic-input"
            type="text"
            value={(data.startingPage as string) || ""}
            placeholder="e.g. 101"
            onChange={(e) => updateField("startingPage", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bc-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-bc-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. 115"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Book Translated Form (Rule 6.7) ──────────────────────────────────────────

function renderBookTranslatedForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "6.7" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bt-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.7" } : {})}
            description="The title of the translated book. Italicised in the citation."
            example="The Social Contract"
          />
        </label>
        <input
          id="ic-bt-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. The Social Contract"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bt-translator">
          Translator(s)
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.7" } : {})}
            description="The translator(s) of the work, preceded by 'tr'."
            example="Maurice Cranston"
          />
        </label>
        <input
          id="ic-bt-translator"
          className="ic-input"
          type="text"
          value={(data.translator as string) || ""}
          placeholder="e.g. Maurice Cranston"
          onChange={(e) => updateField("translator", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bt-publisher">
          Publisher
        </label>
        <input
          id="ic-bt-publisher"
          className="ic-input"
          type="text"
          value={(data.publisher as string) || ""}
          placeholder="e.g. Penguin Books"
          onChange={(e) => updateField("publisher", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bt-edition">
            Edition
          </label>
          <input
            id="ic-bt-edition"
            className="ic-input"
            type="text"
            value={(data.edition as string) || ""}
            placeholder="e.g. 2nd"
            onChange={(e) => updateField("edition", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-bt-year">
            Year
          </label>
          <input
            id="ic-bt-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 1968"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-bt-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-bt-pinpoint"
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

// ─── Book Audiobook Form (Rule 6.9) ───────────────────────────────────────────

function renderBookAudiobookForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  authorsList: AuthorEntry[],
  updateAuthor: (index: number, field: keyof AuthorEntry, value: string) => void,
  addAuthor: () => void,
  removeAuthor: (index: number) => void,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      {renderAuthorsFields(authorsList, updateAuthor, addAuthor, removeAuthor, isAglcStandard ? "6.9" : undefined)}

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ba-title">
          Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.9" } : {})}
            description="The title of the audiobook. Italicised in the citation."
            example="To Kill a Mockingbird"
          />
        </label>
        <input
          id="ic-ba-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. To Kill a Mockingbird"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ba-narrator">
          Narrator
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber: "6.9" } : {})}
            description="The narrator of the audiobook."
            example="Sissy Spacek"
          />
        </label>
        <input
          id="ic-ba-narrator"
          className="ic-input"
          type="text"
          value={(data.narrator as string) || ""}
          placeholder="e.g. Sissy Spacek"
          onChange={(e) => updateField("narrator", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-ba-publisher">
          Publisher
        </label>
        <input
          id="ic-ba-publisher"
          className="ic-input"
          type="text"
          value={(data.publisher as string) || ""}
          placeholder="e.g. HarperAudio"
          onChange={(e) => updateField("publisher", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ba-year">
            Year
          </label>
          <input
            id="ic-ba-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2006"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-ba-pinpoint">
            Pinpoint
          </label>
          <input
            id="ic-ba-pinpoint"
            className="ic-input"
            type="text"
            value={(data.pinpoint as string) || ""}
            placeholder="e.g. ch 5"
            onChange={(e) => updateField("pinpoint", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Foreign Jurisdiction Form (Rules 15–26) ──────────────────────────────────

function renderForeignForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
  countryLabel: string,
  ruleNumber: string,
  isAglcStandard: boolean,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-fgn-subtype">
          Source Sub-Type
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber } : {})}
            description={`The type of ${countryLabel} source being cited.`}
            example="Case, Legislation, or Secondary Source"
          />
        </label>
        <select
          id="ic-fgn-subtype"
          className="ic-input"
          value={(data.foreignSubType as string) || ""}
          onChange={(e) => updateField("foreignSubType", e.target.value)}
        >
          <option value="">-- Select sub-type --</option>
          <option value="case">Case</option>
          <option value="legislation">Legislation</option>
          <option value="secondary">Secondary Source</option>
        </select>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-fgn-title">
          Party / Title
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber } : {})}
            description="The case name, legislation title, or source title."
            example="Smith v Jones"
          />
        </label>
        <input
          id="ic-fgn-title"
          className="ic-input"
          type="text"
          value={(data.title as string) || ""}
          placeholder="e.g. Smith v Jones"
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-fgn-citation-details">
          Citation Details
          <FieldHelp
            {...(isAglcStandard ? { ruleNumber } : {})}
            description="The full citation details including report series, volume, page numbers, or other identifying information as required by the jurisdiction's citation conventions."
            example="[2020] UKSC 5"
          />
        </label>
        <input
          id="ic-fgn-citation-details"
          className="ic-input"
          type="text"
          value={(data.citationDetails as string) || ""}
          placeholder="e.g. [2020] UKSC 5"
          onChange={(e) => updateField("citationDetails", e.target.value)}
        />
      </div>

      <div className="ic-field-row">
        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-fgn-court">
            Court / Body
          </label>
          <input
            id="ic-fgn-court"
            className="ic-input"
            type="text"
            value={(data.court as string) || ""}
            placeholder="e.g. Supreme Court"
            onChange={(e) => updateField("court", e.target.value)}
          />
        </div>

        <div className="ic-field ic-field--grow">
          <label className="ic-label" htmlFor="ic-fgn-year">
            Year
          </label>
          <input
            id="ic-fgn-year"
            className="ic-input"
            type="text"
            value={(data.year as string) || ""}
            placeholder="e.g. 2020"
            onChange={(e) => updateField("year", e.target.value)}
          />
        </div>
      </div>

      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-fgn-pinpoint">
          Pinpoint
        </label>
        <input
          id="ic-fgn-pinpoint"
          className="ic-input"
          type="text"
          value={(data.pinpoint as string) || ""}
          placeholder="e.g. [42]"
          onChange={(e) => updateField("pinpoint", e.target.value)}
        />
      </div>
    </div>
  );
}

function renderCustomForm(
  data: SourceData,
  updateField: (key: string, value: unknown) => void,
): JSX.Element {
  return (
    <div className="ic-form-fields">
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-custom-text">
          Citation Text
        </label>
        <textarea
          id="ic-custom-text"
          className="ic-input"
          rows={4}
          value={(data.customText as string) || ""}
          placeholder="Enter the full citation text exactly as it should appear in the footnote"
          onChange={(e) => updateField("customText", e.target.value)}
          style={{ resize: "vertical", fontFamily: "'Times New Roman', Georgia, serif" }}
        />
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
          This text will be inserted as-is into the footnote. Formatting (italics, etc.) can be applied manually in the document after insertion.
        </p>
      </div>
      <div className="ic-field">
        <label className="ic-label" htmlFor="ic-custom-short">
          Short Title
        </label>
        <input
          id="ic-custom-short"
          className="ic-input"
          type="text"
          value={(data.shortTitle as string) || ""}
          placeholder="e.g. Report (optional — used for subsequent references)"
          onChange={(e) => updateField("shortTitle", e.target.value)}
        />
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
  ruleNumber: string | undefined,
): JSX.Element {
  return (
    <div className="ic-authors-section">
      <div className="ic-label">
        Authors
        <FieldHelp
          {...(ruleNumber ? { ruleNumber } : {})}
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
