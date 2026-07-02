/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Document accessibility check (ATAG 2.0 Part B.3 — help authors produce
 * accessible content). A pure, side-effect-free analyser that inspects a small
 * model of the document's structure and reports accessibility problems using the
 * same ValidationIssue shape as the AGLC4 validator, so findings render in the
 * existing Validation view.
 *
 * Standards: WCAG 2.2 — 1.3.1 Info and Relationships, 2.4.10 Section Headings,
 * 3.1.1 Language of Page.
 */

import { ValidationIssue } from "./types/validation";

export interface DocumentA11yModel {
  /** Outline levels (1-based) of the document's headings, in document order. */
  headingLevels: number[];
  /** Whether the document's editing/proofing language has been set. */
  documentLanguageSet: boolean;
  /**
   * Count of footnotes detected as faux superscript runs rather than native Word
   * footnotes (non-semantic; invisible to the footnote navigation and to AT).
   */
  fauxFootnoteCount?: number;
}

/**
 * Analyses a document model for accessibility problems and returns a list of
 * issues. The result is empty when the document is structurally accessible.
 */
export function checkDocumentAccessibility(model: DocumentA11yModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { headingLevels, documentLanguageSet, fauxFootnoteCount = 0 } = model;

  // 3.1.1 Language of Page — AT cannot pronounce content without a language.
  if (!documentLanguageSet) {
    issues.push({
      ruleNumber: "WCAG 3.1.1",
      message:
        "The document has no editing language set, so screen readers cannot determine how to pronounce the text.",
      severity: "warning",
      offset: 0,
      length: 0,
      suggestion:
        "Apply the AGLC4 template (Settings) to set the document language to English (Australia).",
    });
  }

  // 2.4.10 / 1.3.1 — the first heading should establish the top of the outline.
  if (headingLevels.length > 0 && headingLevels[0] > 1) {
    issues.push({
      ruleNumber: "WCAG 2.4.10",
      message: `The first heading is level ${headingLevels[0]} rather than level 1, so the document outline does not start at the top level.`,
      severity: "info",
      offset: 0,
      length: 0,
      suggestion: "Start the document's heading structure at Heading 1.",
    });
  }

  // 1.3.1 Info and Relationships — heading levels must not skip (e.g. H1 → H3),
  // which breaks the programmatic outline AT relies on for navigation.
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1];
    const current = headingLevels[i];
    if (current - prev > 1) {
      issues.push({
        ruleNumber: "WCAG 1.3.1",
        message: `Heading level jumps from ${prev} to ${current}; a level is skipped, which breaks the document outline.`,
        severity: "warning",
        offset: 0,
        length: 0,
        suggestion: `Use Heading ${prev + 1} instead, or add the intervening heading level.`,
      });
    }
  }

  // 1.3.1 — faux footnotes are not exposed to the footnote navigation or to AT.
  if (fauxFootnoteCount > 0) {
    issues.push({
      ruleNumber: "WCAG 1.3.1",
      message: `${fauxFootnoteCount} footnote-style ${fauxFootnoteCount === 1 ? "reference is" : "references are"} formatted as superscript text rather than native Word footnotes, so they are not announced as footnotes.`,
      severity: "warning",
      offset: 0,
      length: 0,
      suggestion: "Insert citations through Obiter so they become native Word footnotes.",
    });
  }

  return issues;
}
