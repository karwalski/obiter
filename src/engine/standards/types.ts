/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Multi-Standard Architecture — Type Definitions (MULTI-001 / MULTI-002)
 *
 * Defines the citation standard identifiers and configuration interface
 * used to parameterise the rule engine across AGLC, OSCOLA, and NZLSG.
 */

export type CitationStandardId = "aglc4" | "aglc5" | "oscola4" | "oscola5" | "nzlsg3" | "nzlsg4";

/**
 * MULTI-014: Writing mode — determines whether the engine produces academic
 * footnote citations or practitioner court-submission citations.
 */
export type WritingMode = "academic" | "court";

/**
 * COURT-005: Pinpoint style — determines how pinpoints are rendered in
 * case citations.
 *
 * - "page-only": traditional page pinpoints `420, 425` (academic default,
 *   pre-MNC cases)
 * - "para-only": paragraph pinpoints only `[45]` — no starting page from
 *   authorised report (NSW, Qld court mode)
 * - "para-and-page": starting page then paragraph `420, [45]–[46]`
 *   (Vic, FCA, HCA, WA, SA, Tas, ACT, NT court mode)
 */
export type PinpointStyle = "page-only" | "para-only" | "para-and-page";

export interface CitationConfig {
  standardId: CitationStandardId;
  standardLabel: string;          // "AGLC4", "OSCOLA 5", "NZLSG 3"
  italiciseLegislation: boolean;
  quotationMarkStyle: "single" | "double";
  pinpointPrefix: "" | "at ";
  subsequentReferenceFormat: "n" | "above n";
  ibidEnabled: boolean;
  editionAbbreviation: "ed" | "edn";
  homeJurisdiction: string | null;  // null = always show, "UK" = suppress UK, "NZ" = suppress NZ
  bibliographyStructure: "aglc" | "oscola" | "nzlsg";
  /**
   * MULTI-014: Writing mode — "academic" (default) for standard footnote
   * citations, "court" for practitioner court submissions.
   *
   * Court mode disables ibid, uses short case name without (n X)
   * cross-references, emits parallel citations by default, generates
   * a List of Authorities instead of a bibliography, and suppresses
   * AGLC4 heading styles.
   */
  writingMode: WritingMode;
  /**
   * COURT-005: Pinpoint style — controls how pinpoints render in reported
   * case citations. Defaults to "page-only" for academic mode.
   */
  pinpointStyle: PinpointStyle;
}
