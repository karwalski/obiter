/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * API-007: Preserves Insert Citation form state across tab switches.
 *
 * When the user navigates away from the Insert Citation view and returns,
 * component-local useState is destroyed on unmount. This context lifts
 * user-entered form data above the router so it survives navigation.
 *
 * Only user-entered data is stored here. Transient states (loading flags,
 * error messages, feedback banners) remain local to the component.
 */

import { createContext, useContext, useState, useCallback } from "react";
import type { SourceType, SourceData, IntroductorySignal } from "../../types/citation";
import type { CitationStandardId } from "../../engine/standards";
import type { ClassificationResult } from "../../llm/classifySource";
import type { ParsedCitation } from "../../llm/parseCitation";
import type { CourtJurisdiction } from "../../engine/court/presets";

// ─── Author Entry (duplicated from InsertCitation to avoid circular imports) ─

export interface AuthorEntry {
  givenNames: string;
  surname: string;
}

// ─── Context Shape ──────────────────────────────────────────────────────────

interface InsertCitationState {
  // Source selection
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedSourceType: SourceType | "";
  setSelectedSourceType: (v: SourceType | "") => void;

  // Form data
  formData: SourceData;
  setFormData: React.Dispatch<React.SetStateAction<SourceData>>;
  shortTitle: string;
  setShortTitle: (v: string) => void;
  shortTitleTouched: boolean;
  setShortTitleTouched: (v: boolean) => void;
  authors: AuthorEntry[];
  setAuthors: React.Dispatch<React.SetStateAction<AuthorEntry[]>>;

  // Introductory signal and commentary
  signal: IntroductorySignal | "";
  setSignal: (v: IntroductorySignal | "") => void;
  commentaryBefore: string;
  setCommentaryBefore: (v: string) => void;
  commentaryAfter: string;
  setCommentaryAfter: (v: string) => void;

  // Footnote append
  appendToFootnote: boolean;
  setAppendToFootnote: (v: boolean) => void;
  selectedFootnoteIndex: number;
  setSelectedFootnoteIndex: (v: number) => void;

  // AI classify
  classifyDescription: string;
  setClassifyDescription: (v: string) => void;
  classifyResult: ClassificationResult | null;
  setClassifyResult: (v: ClassificationResult | null) => void;

  // Paste citation
  pasteCitationExpanded: boolean;
  setPasteCitationExpanded: (v: boolean) => void;
  pasteCitationText: string;
  setPasteCitationText: (v: string) => void;
  pasteCitationResult: ParsedCitation | null;
  setPasteCitationResult: (v: ParsedCitation | null) => void;

  // Citation standard
  standardId: CitationStandardId;
  setStandardId: (v: CitationStandardId) => void;

  // Court jurisdiction
  courtJurisdiction: CourtJurisdiction | null;
  setCourtJurisdiction: (v: CourtJurisdiction | null) => void;

  // Recent citations panel
  recentExpanded: boolean;
  setRecentExpanded: (v: boolean) => void;

  // Reset all form state (e.g. after successful insert)
  resetForm: () => void;
}

const InsertCitationContext = createContext<InsertCitationState | undefined>(undefined);

const DEFAULT_AUTHORS: AuthorEntry[] = [{ givenNames: "", surname: "" }];

export function InsertCitationProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType | "">("");
  const [formData, setFormData] = useState<SourceData>({});
  const [shortTitle, setShortTitle] = useState("");
  const [shortTitleTouched, setShortTitleTouched] = useState(false);
  const [authors, setAuthors] = useState<AuthorEntry[]>([...DEFAULT_AUTHORS]);

  const [signal, setSignal] = useState<IntroductorySignal | "">("");
  const [commentaryBefore, setCommentaryBefore] = useState("");
  const [commentaryAfter, setCommentaryAfter] = useState("");

  const [appendToFootnote, setAppendToFootnote] = useState(false);
  const [selectedFootnoteIndex, setSelectedFootnoteIndex] = useState<number>(0);

  const [classifyDescription, setClassifyDescription] = useState("");
  const [classifyResult, setClassifyResult] = useState<ClassificationResult | null>(null);

  const [pasteCitationExpanded, setPasteCitationExpanded] = useState(false);
  const [pasteCitationText, setPasteCitationText] = useState("");
  const [pasteCitationResult, setPasteCitationResult] = useState<ParsedCitation | null>(null);

  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");

  const [courtJurisdiction, setCourtJurisdiction] = useState<CourtJurisdiction | null>(null);

  const [recentExpanded, setRecentExpanded] = useState(true);

  const resetForm = useCallback(() => {
    setSelectedCategory("");
    setSelectedSourceType("");
    setFormData({});
    setShortTitle("");
    setShortTitleTouched(false);
    setAuthors([...DEFAULT_AUTHORS]);
    setSignal("");
    setCommentaryBefore("");
    setCommentaryAfter("");
    setAppendToFootnote(false);
    setSelectedFootnoteIndex(0);
    setClassifyDescription("");
    setClassifyResult(null);
    setPasteCitationExpanded(false);
    setPasteCitationText("");
    setPasteCitationResult(null);
    setCourtJurisdiction(null);
  }, []);

  return (
    <InsertCitationContext.Provider value={{
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
    }}>
      {children}
    </InsertCitationContext.Provider>
  );
}

export function useInsertCitationContext(): InsertCitationState {
  const ctx = useContext(InsertCitationContext);
  if (!ctx) {
    throw new Error("useInsertCitationContext must be used within an InsertCitationProvider");
  }
  return ctx;
}
