/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * The whole-document validation the Validate view runs, as one pure
 * function, so the pre-handover check (COURT-122) reports exactly what
 * Validate reports. Moved out of the Validate view unchanged.
 *
 * - `validateDocument` with the config the refresher renders with
 *   (STD-019: the standard selects the check set; court checks for parallel
 *   citations, ibid suppression and the unreported gate use the same court
 *   config; COURT-107 and COURT-111 options pass through).
 * - The OSCOLA or NZLSG rule checks for those standards.
 * - The document accessibility check (ATAG Part B.3 / A11Y-028): heading
 *   order from the live scan; the language is set by the AGLC4 template and
 *   Obiter footnotes are native, so those branches are not re-flagged.
 */

import {
  validateDocument,
  checkOscolaRules,
  checkNzlsgRules,
  type ValidationIssue,
  type ValidationResult,
} from "./validator";
import { getStandardConfig, buildCourtConfig } from "./standards";
import type { CitationStandardId, WritingMode } from "./standards/types";
import { checkDocumentAccessibility, type DocumentA11yModel } from "./documentAccessibility";
import type { Citation } from "../types/citation";

/** What the document scan and the store supply. */
export interface DocumentValidationInput {
  footnoteTexts: string[];
  bodyText: string;
  /** Outline levels of built-in Heading styles, in document order. */
  headingLevels: number[];
  citations: Citation[];
  standardId: CitationStandardId;
  writingMode: WritingMode;
  courtJurisdiction?: string;
  /** The document's court toggles (or the legacy device preference). */
  courtToggles?: Record<string, string>;
}

function push(result: ValidationResult, issue: ValidationIssue): void {
  switch (issue.severity) {
    case "error":
      result.errors.push(issue);
      break;
    case "warning":
      result.warnings.push(issue);
      break;
    case "info":
      result.info.push(issue);
      break;
  }
}

/** Runs every document-level check the Validate view runs. Pure. */
export function runDocumentValidation(input: DocumentValidationInput): ValidationResult {
  const { footnoteTexts, bodyText, headingLevels, citations, standardId, writingMode } = input;
  const baseConfig = getStandardConfig(standardId);
  const config = buildCourtConfig({ ...baseConfig, writingMode }, input.courtToggles);

  const result = validateDocument(footnoteTexts, citations, bodyText, {
    standardId,
    writingMode,
    courtJurisdiction: input.courtJurisdiction,
    parallelCitationMode: config.parallelCitationMode,
    ibidSuppressionMode: config.ibidSuppressionMode,
    // B2: a recorded MNC is the parallel unless the report replaces it.
    ...(config.reportedCaseMnc ? { reportedCaseMnc: config.reportedCaseMnc } : {}),
    // COURT-107: (n X) is not flagged when the document gives it.
    ...(config.crossReferenceSuppression === "off"
      ? { crossReferenceSuppression: "off" as const }
      : {}),
    unreportedGateMode: config.unreportedGateMode,
    // COURT-111: the frozen report hierarchy drives an information prompt.
    authorisedReportHierarchy: config.authorisedReportHierarchy,
  });

  if (standardId.startsWith("oscola")) {
    for (const issue of checkOscolaRules(citations, footnoteTexts, { standardId })) {
      push(result, issue);
    }
  } else if (standardId.startsWith("nzlsg")) {
    for (const issue of checkNzlsgRules(citations, footnoteTexts)) {
      push(result, issue);
    }
  }

  const a11yModel: DocumentA11yModel = {
    headingLevels,
    documentLanguageSet: true,
    fauxFootnoteCount: 0,
  };
  for (const issue of checkDocumentAccessibility(a11yModel)) {
    if (issue.severity === "error") {
      result.errors.push(issue);
    } else if (issue.severity === "warning") {
      result.warnings.push(issue);
    } else {
      result.info.push(issue);
    }
  }
  return result;
}
