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

/** COURT-FIX: Parallel citation enforcement mode. */
export type ParallelCitationMode = "off" | "preferred" | "mandatory";

/** COURT-FIX: Ibid suppression mode. */
export type IbidSuppressionMode = "off" | "on";

/** COURT-FIX: Unreported judgment gate mode. */
export type UnreportedGateMode = "off" | "warn";

/**
 * COURT-FIX: List of Authorities format.
 *
 * - "off" — no LOA
 * - "simple" — flat Cases/Legislation list
 * - "part-ab" — Part A (read from) / Part B (referred to)
 * - "part-abc" — Vic Court of Appeal three-part LOA with Part C for
 *   textbooks, articles and extrinsic materials (Vic SC PN CA 3,
 *   reissued 10 Mar 2026)
 * - "two-part-read" — authorities expected to be read / not expected
 *   to be read (SA Uniform Civil Rules 2020 r 217.8; FCFCOA
 *   FAM-APPEALS, updated 10 Jun 2025)
 * - "three-part-tas" — cite / might refer / legislation split
 *   (Tas SC PD 3 of 2022)
 */
export type LoaType =
  | "off"
  | "simple"
  | "part-ab"
  | "part-abc"
  | "two-part-read"
  | "three-part-tas";

/**
 * Parallel citation emission order for reported cases in court mode.
 * "mnc-first" places the medium neutral citation before the report
 * citation per WA SC Consolidated PD 8.2.2 (updated 20 Jun 2025).
 */
export type ParallelOrder = "report-first" | "mnc-first";

export interface CitationConfig {
  standardId: CitationStandardId;
  standardLabel: string; // "AGLC4", "OSCOLA 5", "NZLSG 3"
  italiciseLegislation: boolean;
  quotationMarkStyle: "single" | "double";
  pinpointPrefix: "" | "at ";
  subsequentReferenceFormat: "n" | "above n";
  ibidEnabled: boolean;
  editionAbbreviation: "ed" | "edn";
  homeJurisdiction: string | null; // null = always show, "UK" = suppress UK, "NZ" = suppress NZ
  bibliographyStructure: "aglc" | "oscola" | "nzlsg";
  /**
   * MULTI-014: Writing mode — "academic" (default) for standard footnote
   * citations, "court" for practitioner court submissions.
   */
  writingMode: WritingMode;
  /**
   * COURT-005: Pinpoint style — controls how pinpoints render in reported
   * case citations. Defaults to "page-only" for academic mode.
   */
  pinpointStyle: PinpointStyle;
  /**
   * COURT-FIX: Parallel citation enforcement. Only applies in court mode.
   * "mandatory" = validation error if missing, "preferred" = validation warning.
   */
  parallelCitationMode: ParallelCitationMode;
  /**
   * COURT-FIX: Whether ibid is suppressed in court mode. "on" = suppress ibid,
   * "off" = allow ibid even in court mode.
   */
  ibidSuppressionMode: IbidSuppressionMode;
  /**
   * COURT-FIX: Whether to warn when citing unreported judgments in court mode.
   */
  unreportedGateMode: UnreportedGateMode;
  /**
   * COURT-FIX: List of Authorities format in court mode bibliography.
   */
  loaType: LoaType;
  /**
   * Parallel citation emission order in court mode. Optional — when
   * omitted, "report-first" (authorised report, then MNC) applies.
   * WA requires "mnc-first" per Consolidated PD 8.2.2 (20 Jun 2025).
   */
  parallelOrder?: ParallelOrder;
}
