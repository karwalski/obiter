/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Represents a validation issue found during document analysis.
 */
export interface ValidationIssue {
  ruleNumber: string;
  message: string;
  severity: "error" | "warning" | "info";
  offset: number;
  length: number;
  suggestion?: string;
  /** 1-based footnote index for navigation (if the issue is in a footnote). */
  footnoteIndex?: number;
  /** A short text snippet to search for when navigating to the issue. */
  searchText?: string;
  /** Citation ID for issues tied to a specific citation. */
  citationId?: string;
}

/**
 * COURT-110 (live test of v1.17.9, N2): one place a citation is cited in the
 * document, as the footnote scan reads it. The per-footnote pinpoint lives
 * in the occurrence's content-control title (`Citation:<pref>:<pinpoint>`),
 * not in the citation record, so pinpoint checks read it from here.
 */
export interface CitationOccurrence {
  /** The citation id (the occurrence control's tag). */
  citationId: string;
  /** 1-based footnote number. */
  footnoteIndex: number;
  /** The occurrence pinpoint as stored in the control title, if any. */
  pinpoint?: string;
}
