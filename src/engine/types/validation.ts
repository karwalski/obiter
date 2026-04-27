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
