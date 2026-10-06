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
 * - "para-only": paragraph pinpoints are sufficient for medium neutral
 *   citations (NSW, Qld court mode). A report citation keeps its starting
 *   page and renders as "page-only" (COURT-110; AGLC4 r 2.2.5: a page must
 *   always appear in a report pinpoint).
 * - "para-and-page": starting page, then pinpoint page and paragraph
 *   `394, 410 [60]` (Vic SC Gen 3 cl 5.5); a paragraph-only pinpoint
 *   renders `420, [45]–[46]` (Vic, FCA, HCA, WA, SA, Tas, ACT, NT court mode)
 */
export type PinpointStyle = "page-only" | "para-only" | "para-and-page";

/**
 * COURT-112: The connector between a case citation and its pinpoint.
 *
 * - "aglc" (default): AGLC4 rr 2.2.5 and 2.3.1 punctuation, unchanged:
 *   a comma before a page pinpoint (`479, 481`), a space before a
 *   paragraph pinpoint on a report (`479 [29]`), and a comma before a
 *   paragraph pinpoint on a medium neutral citation (`[2014] FCAFC 115, [29]`).
 * - "at": the word 'at' before the pinpoint (`479 at 481`,
 *   `[2014] FCAFC 115 at [29]`), as shown by FCA GPN-AUTH cl 2.6
 *   (7 May 2025; register FCA-1) and Tas SC PD 3 of 2014 cl 3
 *   (21 Feb 2014; register TAS-1). Court mode only; applies to case full
 *   and short forms, never to 'ibid'.
 */
export type PinpointConnector = "aglc" | "at";

/** COURT-FIX: Parallel citation enforcement mode. */
export type ParallelCitationMode = "off" | "preferred" | "mandatory";

/** COURT-FIX: Ibid suppression mode. */
export type IbidSuppressionMode = "off" | "on";

/**
 * COURT-107: whether court mode drops the AGLC4 r 1.4.1 `(n X)`
 * cross-reference from a short reference.
 *
 * - "on" (default): the court short form carries no `(n X)`. This is how
 *   every court document saved before COURT-107 renders. No court
 *   instrument read requires or forbids `(n X)` (register R02); published
 *   HCA, NSW and ACT judgments do not use it (O-C2, O-C5).
 * - "off": the cross-reference is given, as AGLC4 r 1.4.1 requires
 *   (`Pape (n 1) [45]`).
 *
 * Separate from ibid suppression (`IbidSuppressionMode`), which governs
 * AGLC4 r 1.4.3 'Ibid' only.
 */
export type CrossReferenceSuppressionMode = "on" | "off";

/**
 * COURT-113: the lead of a court-mode subsequent reference to a case.
 *
 * - "short-title" (default): the short title (AGLC4 r 1.4.4 / r 2.1.14),
 *   then the pinpoint. Court-mode behaviour before COURT-113.
 * - "case-name": the case name only, then the pinpoint. WA SC
 *   Consolidated Practice Directions PD 2.1 cl 14 (updated 23 Sep 2026;
 *   register WA-1, O-R9): later references give the case name only,
 *   unless names are duplicated or popular. A case whose name is shared by
 *   another case cited in the document keeps the short-title form.
 * - "short-title-report": the short title, then the report citation and
 *   the pinpoint (`Pape (2009) 238 CLR 1, 23 [45]`). Observed in HCA
 *   reasons (register O-C2: repeats restate the short name and the full
 *   report; R03 federal §4), not in any instrument: an opt-in, never a
 *   preset default.
 *
 * Applies to cases only; legislation and secondary sources keep the court
 * short form.
 */
export type SubsequentForm = "short-title" | "case-name" | "short-title-report";

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
 *
 * COURT-117 instrument-backed layouts (register O-R1, O-R3, O-R12; WA-1):
 * - "hca-jba-five-part" — Joint Book of Authorities Parts A to E, with
 *   the legislation version (HCA PD 2 of 2024; Form 27A)
 * - "nswca-four-category" — legislation with version date; cases to be
 *   read (CLR/NSWLR, other reports, other cases); cases cited but not
 *   read; secondary sources (NSW SC CA 1 cl 37)
 * - "fca-ebook-sections" — authorities, legislation, bills and
 *   explanatory material, each alphabetical (FCA GPN-eBOOKS cl 7.2, 7.4)
 * - "wa-outline-asterisk" — cases and legislation, cases to be read
 *   marked with an asterisk and the passages to be read, and a statement
 *   when no case will be read (WA PD 2.1 cl 11–13)
 */
export type LoaType =
  | "off"
  | "simple"
  | "part-ab"
  | "part-abc"
  | "two-part-read"
  | "three-part-tas"
  | "hca-jba-five-part"
  | "nswca-four-category"
  | "fca-ebook-sections"
  | "wa-outline-asterisk";

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
   * COURT-112: Case pinpoint connector in court mode. Absent means "aglc"
   * (AGLC4 punctuation), so academic configs are unchanged.
   */
  pinpointConnector?: PinpointConnector;
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
   * COURT-107: in court mode, "off" gives the AGLC4 r 1.4.1 `(n X)`
   * cross-reference in short references. Absent means "on" (no `(n X)`),
   * so every court document saved before COURT-107 renders as it did.
   */
  crossReferenceSuppression?: CrossReferenceSuppressionMode;
  /**
   * COURT-113: the court-mode subsequent-reference form for cases. Absent
   * means "short-title" (court-mode behaviour before COURT-113).
   */
  subsequentForm?: SubsequentForm;
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
  /**
   * COURT-111: in court mode, "omit" leaves a reported case's MNC out (the
   * report replaces it; Vic SC Gen 3 cl 5.2, FCFCOA FAM-APPEALS cl 5.8, ACT
   * SC PD 2 of 2022, NT SC PD 2 of 2007; also AGLC4 r 2.2.7). Absent means
   * the MNC is given with the report, as before COURT-111.
   */
  reportedCaseMnc?: "include" | "omit";
  /**
   * STD-013: The jurisdiction's authorised report hierarchy in court mode
   * (most preferred first, e.g. `["NSWLR", "CLR", "ALR"]`), from the court
   * toggles (comma-separated) or the jurisdiction preset. Absent in
   * academic mode.
   */
  authorisedReportHierarchy?: string[];
  /**
   * STD-013 diagnostic: set when the document carried writing mode "court"
   * under a non-AGLC standard. Court mode is an AGLC-only feature, so the
   * config returned is the academic one; callers may surface a notice.
   */
  courtModeIgnored?: boolean;
  /**
   * STD-022: The NZLSG subsequent-reference style (NZLSG 3 r 2.3), from the
   * document metadata. "general" (the default) cross-refers with "above n";
   * "commercial" uses short-form references only. Set only when the document
   * is on an NZLSG standard; the engine falls back to `data.nzlsgStyle`.
   */
  nzlsgStyle?: "general" | "commercial";

  /**
   * A5-EXP-9 (experimental, pending AGLC5): the type word of the AGLC
   * generative AI form. Absent reads as "output" ("Output from …", the
   * library interim template); "correspondence" keeps the earlier Obiter form
   * for the whole document. Set from the document's store metadata under AGLC
   * standards only (DECISION-041).
   */
  genaiWording?: "output" | "correspondence";

  // ─── STD-015: subsequent references and the first-citation declaration ──
  // Optional so that hand-built configs keep working; when absent the
  // resolver derives the value from `standardId` (AGLC behaviour).

  /**
   * Whether a first citation is followed by a short-form declaration.
   * - "aglc": AGLC4 1.4.4 short title and 1.4.5 abbreviation for every
   *   source that carries one.
   * - "declared": only the source types the standard declares a short form
   *   for — OSCOLA 5 §1.2.1 legislation (`(‘SARAH’)`), §4.1.1 treaties
   *   (`(‘ICCPR’)`), §4.2.2 UN resolutions, §4.4.1 OJ instruments and
   *   §4.2.1 the UN Charter; cases and secondary sources are short-formed
   *   by party name or surname with nothing declared (§2.1.2, §3.1.5).
   *   OSCOLA 4 §1.2.1 declares without quotation marks.
   * - "none": never — NZLSG 3 §2.3.2 reference tags are square-bracketed,
   *   optional and not written by the engine.
   */
  shortTitleIntroduction?: "aglc" | "declared" | "none";
  /**
   * The ibid word when ibid is enabled: `Ibid` (AGLC4 1.4.3) or the
   * lower-case `ibid` of OSCOLA 4 §1.2.3 (never capitalised, never italic).
   */
  ibidStyle?: "capitalised" | "lowercase";

  // ─── STD-016: secondary-source and quotation style ───────────────────────
  // Optional so that hand-built configs keep working; when absent the
  // secondary formatters derive the value from `standardId` (see
  // src/engine/rules/v4/secondary/style.ts).

  /**
   * Author name order in a footnote citation: given names first under every
   * standard (AGLC4 4.1.1, OSCOLA 5 §3.1.1, NZLSG 3 §6.1.2). Bibliography
   * inversion is the bibliography formatter's concern (STD-018).
   */
  authorNameOrder?: "given-first" | "surname-initials";
  /**
   * Separator between the author element and the title: a comma under AGLC4
   * (4.1) and OSCOLA 5 (§3.2.1); a bare space under NZLSG 3 (§6.1.1).
   */
  authorTitleSeparator?: "comma" | "space";
  /**
   * Order of a book's publication details: AGLC4 6.3 `(Publisher, edn, year)`;
   * OSCOLA 5 §3.2.1 `(edn, Publisher year)`; NZLSG 3 §6.1.1
   * `(edn, Publisher, Place, year)`.
   */
  bookParenthesisOrder?:
    | "publisher-edition-year"
    | "edition-publisher-year"
    | "edition-publisher-place-year";
  /** Place of publication in the details (NZLSG 3 §6.1.6; not AGLC4 6.3 or OSCOLA 5 §3.2.1). */
  includePlaceOfPublication?: boolean;
  /** Chapter citations carry the chapter's starting page (AGLC4 6.6.1, NZLSG 3 §6.2; not OSCOLA 5 §3.2.4). */
  chapterStartPage?: boolean;
  /** Journal title element: italic under AGLC4 5.5; roman abbreviation under OSCOLA 5 §3.3 and NZLSG 3 §6.4. */
  journalTitleStyle?: "italic" | "roman";
  /** Thesis title: quoted (AGLC4 7.2.5, OSCOLA 4 §3.4.7, NZLSG 3 §6.7.1) or italic (OSCOLA 5 §3.7.6). */
  thesisTitleStyle?: "quoted" | "italic";
  /** Internet material form: AGLC4 7.15, OSCOLA 5 §3.7.1 or NZLSG 3 §7.1.1. */
  websiteStyle?: "aglc" | "oscola" | "nzlsg";
  /**
   * Long-quotation threshold: `lines` (AGLC4 1.5.1 four or more; OSCOLA 5
   * §1.5 longer than three) or `words` (NZLSG 3 §1.2.2 thirty or more).
   * When both are given the word count decides.
   */
  blockQuoteThreshold?: { lines?: number; words?: number };
}
