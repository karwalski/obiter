/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Court Submission Mode — Jurisdictional Presets (COURT-002 / COURT-003)
 *
 * Each Australian court/tribunal maps to specific defaults for six toggles
 * that control how the AGLC4 engine assembles citations in court submissions.
 * These presets are stored as typed data, not hardcoded logic, so they can
 * be updated when practice directions change.
 *
 * CRIT-004 §4 sign-off (2026-07-23): NSWCA/NSWSC and QCA/QSC
 * `parallelCitations` softened "mandatory" -> "preferred" to match the
 * "should, as far as possible" wording in SC Gen 20 and PD 1 of 2024; the
 * NSW Part A/B List of Authorities is re-sourced to SC CA 1 (loaType
 * unchanged). Jurisdiction-keyed generative-AI use reminders live in
 * practiceDirections.ts (A5-CM-1); they are court-mode practice-direction
 * guidance, not AGLC citation rules.
 *
 * COURT-106: typed provenance for every value below (source ids, clause,
 * kind, check date) and each preset's data version live in provenance.ts;
 * the comments here are background. Changing a value here means updating
 * its provenance and bumping that preset's version there, so existing
 * documents are offered the change (DECISION-043 item 4). A test fails if a
 * preset lacks provenance for any toggle.
 *
 * COURT-111 / COURT-119 (6 Oct 2026): values corrected against the
 * court-interop evidence register (R02 §5) and DECISION-043 item 3
 * (parallel order follows the court's own example where the instrument is
 * silent or only gives one). Corrected values reach NEW documents; an
 * existing document keeps its frozen values until the user accepts the
 * "Update court profile" prompt (DECISION-043 item 4). provenance.ts
 * records the instrument, clause and check date for every value.
 *
 * Sources (verified against primary court sources 2026-07-21; re-checked
 * against the evidence register 2026-10-06):
 *   - Federal Court GPN-AUTH (reissued 7 May 2025)
 *   - HCA PD 2 of 2024
 *   - NSW SC PN Gen 20 (Oct 2023)
 *   - Vic SC PN Gen 3 (reissued 1 Dec 2025)
 *   - Vic SC PN CA 3 (reissued 10 Mar 2026) — Court of Appeal civil LOA
 *   - Qld SC PD 1 of 2024
 *   - Qld MC PD 7 of 2024
 *   - NSW SC PN SC CCA 1 (22 Jul 2021) — Court of Criminal Appeal list
 *   - WA SC Consolidated Practice Directions (updated 23 Sep 2026), PD 2.1 and PD 8.2.2
 *   - SA Uniform Civil Rules 2020 r 217.8 (current to 15 Mar 2026)
 *   - Tas SC PD 3 of 2014 (citation) and PD 3 of 2022 (lists of authorities)
 *   - ACT SC PD 2 of 2022 (26 May 2022)
 *   - NT SC PD 2 of 2007 (citation) and PD 1 of 2025 (lists of authorities)
 *   - FCFCOA FAM-APPEALS practice direction (updated 10 Jun 2025)
 */

import type {
  CrossReferenceSuppressionMode,
  PinpointConnector,
  SubsequentForm,
} from "../standards/types";

// ─── Toggle Value Types ─────────────────────────────────────────────────────

export type ParallelCitationMode = "off" | "preferred" | "mandatory";

export type PinpointStyle = "page-only" | "para-only" | "para-and-page";

/**
 * COURT-112: case pinpoint connector. "aglc" (default) keeps AGLC4
 * punctuation; "at" gives `479 at 481` and `[2010] TASSC 29 at [15]`.
 * Set only where an instrument shows it (FCA GPN-AUTH cl 2.6; Tas SC
 * PD 3 of 2014 cl 3).
 */
export type { PinpointConnector };

export type UnreportedGate = "off" | "warn";

export type IbidSuppression = "off" | "on";

/**
 * COURT-107: `(n X)` cross-reference suppression, separate from ibid.
 * "on" (default) drops `(n X)` from court short references, as court mode
 * always has; "off" restores the AGLC4 r 1.4.1 form.
 */
export type CrossReferenceSuppression = CrossReferenceSuppressionMode;

/**
 * COURT-113: subsequent-reference form for cases in court mode
 * ("short-title" default; "case-name" per WA PD 2.1 cl 14;
 * "short-title-report" opt-in, observed in HCA reasons).
 */
export type { SubsequentForm };

/**
 * List of Authorities generation type.
 *
 * - "off" — no LOA generated
 * - "simple" — flat Cases/Legislation list
 * - "part-ab" — Part A (read from) / Part B (referred to) split
 *   (QCA: Qld SC PD 3 of 2013). The HCA and NSWCA presets still use it
 *   pending their instrument layouts (COURT-117); FCA GPN-AUTH dropped
 *   Part A / Part B in its 7 May 2025 reissue (register O-R1).
 * - "part-abc" — Part A (read from at hearing) / Part B (referred to,
 *   not read from) / Part C (textbooks, articles, extrinsic materials),
 *   with "None" stated under unused parts (Vic SC PN CA 3, reissued
 *   10 Mar 2026)
 * - "two-part-read" — authorities expected to be read / not expected to
 *   be read (SA Uniform Civil Rules 2020 r 217.8, Form 91; FCFCOA
 *   FAM-APPEALS, updated 10 Jun 2025)
 * - "three-part-tas" — Part 1 authorities counsel intends to cite /
 *   Part 2 authorities that might be referred to but not cited /
 *   Part 3 legislation with sections (Tas SC PD 3 of 2022)
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
 *
 * - "report-first" — authorised report first, MNC appended
 *   (e.g. "(2009) 238 CLR 1; [2009] HCA 23") — the default in most
 *   jurisdictions.
 * - "mnc-first" — medium neutral citation first, then the report
 *   (e.g. "Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]")
 *   per WA SC Consolidated Practice Directions PD 8.2.2; also the
 *   instrument example for FCA GPN-AUTH cl 2.5 and Tas SC PD 3 of 2014
 *   cl 3(a) (DECISION-043 item 3).
 */
export type ParallelOrder = "report-first" | "mnc-first";

/**
 * COURT-111: whether court mode adds a reported case's MNC after (or
 * before) the report.
 *
 * - "include" — the report and the MNC are both given (a parallel
 *   citation). The default, and how every court document saved before
 *   COURT-111 renders.
 * - "omit" — the report replaces the MNC; the MNC is cited only for an
 *   unreported judgment. This is also AGLC4 r 2.2.7 (parallel citations
 *   are not given for Australian cases). Set where the instrument says the
 *   report is cited instead of the MNC: Vic SC Gen 3 cl 5.2, SC CA 3
 *   cl 14.4, FCFCOA FAM-APPEALS cl 5.8, ACT SC PD 2 of 2022 cl 3–4 and NT
 *   SC PD 2 of 2007.
 *
 * Parallels the user recorded on the citation are never removed.
 */
export type ReportedCaseMnc = "include" | "omit";

// ─── COURT-010 / COURT-119: Subsequent Treatment (Qld, Tas) ─────────────────

/**
 * Subsequent treatment of a cited case. "distinguished" and "overruled"
 * are kept so citations saved with them still load; the prompt no longer
 * offers them (COURT-119: the instruments ask only whether the case was
 * doubted or not followed).
 */
export type SubsequentTreatment =
  | ""
  | "not-affected"
  | "distinguished"
  | "doubted"
  | "not-followed"
  | "overruled"
  | "unknown";

/**
 * COURT-119: the treatment options offered, narrowed to the wording of Qld
 * SC PD 1 of 2024 cl 4(c) and Tas SC PD 3 of 2014 cl 3(f): whether a later
 * judgment has "doubted, or not followed" the case.
 */
export const SUBSEQUENT_TREATMENT_OPTIONS: ReadonlyArray<{
  value: SubsequentTreatment;
  label: string;
}> = [
  { value: "", label: "Select..." },
  { value: "not-affected", label: "Neither doubted nor not followed" },
  { value: "doubted", label: "Doubted" },
  { value: "not-followed", label: "Not followed" },
  { value: "unknown", label: "Unknown \u2014 check" },
];

/** Labels for treatment values saved before COURT-119 narrowed the options. */
const LEGACY_TREATMENT_LABELS: Partial<Record<SubsequentTreatment, string>> = {
  distinguished: "Distinguished (earlier option)",
  overruled: "Overruled (earlier option)",
};

/**
 * COURT-119: the options to show for a citation. A value saved from an
 * earlier option list is kept and shown, so editing the citation does not
 * silently change it.
 */
export function getSubsequentTreatmentOptions(
  current: string | undefined
): ReadonlyArray<{ value: SubsequentTreatment; label: string }> {
  const legacy = current ? LEGACY_TREATMENT_LABELS[current as SubsequentTreatment] : undefined;
  return legacy
    ? [...SUBSEQUENT_TREATMENT_OPTIONS, { value: current as SubsequentTreatment, label: legacy }]
    : SUBSEQUENT_TREATMENT_OPTIONS;
}

/** Treatment values that indicate a negative subsequent history. */
export const NEGATIVE_TREATMENTS: ReadonlySet<SubsequentTreatment> = new Set([
  "doubted",
  "not-followed",
  "overruled",
]);

// ─── Court Jurisdiction IDs ─────────────────────────────────────────────────

export type CourtJurisdiction =
  // Federal
  | "HCA"
  | "FCA"
  | "FCFCOA"
  // New South Wales
  | "NSWCA"
  | "NSWCCA"
  | "NSWSC"
  | "NSW_DISTRICT_LOCAL"
  // Victoria
  | "VSCA"
  | "VSC"
  | "VIC_COUNTY_MAG"
  // Queensland
  | "QCA"
  | "QSC"
  | "QLD_DISTRICT_MAG"
  // Other States/Territories
  | "WASC"
  | "SASC"
  | "SA_DISTRICT_MAG_CIVIL"
  | "TASSC"
  | "ACTSC"
  | "NTSC"
  // Tribunals
  | "ART"
  | "FWC"
  | "STATE_TRIBUNAL";

// ─── Court Preset Interface ─────────────────────────────────────────────────

export interface CourtPreset {
  /** Human-readable court name. */
  label: string;
  /** Grouping category for the jurisdiction dropdown. */
  group: CourtGroup;
  /** Toggle 1: Parallel citation emission mode. */
  parallelCitations: ParallelCitationMode;
  /** Toggle 2: Pinpoint rendering style. */
  pinpointStyle: PinpointStyle;
  /** Toggle 3: Ordered list of preferred authorised report series. */
  authorisedReportHierarchy: string[];
  /** Toggle 4: Unreported-judgment gate. */
  unreportedGate: UnreportedGate;
  /** Toggle 5: Ibid and (n X) suppression. */
  ibidSuppression: IbidSuppression;
  /** Toggle 6: List of Authorities generation type. */
  loaType: LoaType;
  /**
   * Parallel citation emission order. Optional — omitted means
   * "report-first" (authorised report, then MNC). WA requires
   * "mnc-first" per Consolidated PD 8.2.2 (updated 20 Jun 2025).
   */
  parallelOrder?: ParallelOrder;
  /**
   * COURT-112: case pinpoint connector. Optional — omitted means "aglc".
   * Set to "at" only where the court's instrument shows it, with the
   * source recorded beside the preset. Applied to a document when its
   * court is selected; a document saved without the toggle keeps "aglc"
   * (DECISION-043 item 4).
   */
  pinpointConnector?: PinpointConnector;
  /**
   * COURT-111: whether a reported case's MNC is added in court mode.
   * Optional — omitted means "include". A document saved without the
   * toggle keeps including it (DECISION-043 item 4).
   */
  reportedCaseMnc?: ReportedCaseMnc;
  /**
   * COURT-107: `(n X)` suppression. Optional — omitted means "on" (court
   * mode has always dropped `(n X)`). No preset sets "off".
   */
  crossReferenceSuppression?: CrossReferenceSuppression;
  /**
   * COURT-113: subsequent-reference form for cases. Optional — omitted
   * means "short-title". Set only where an instrument states a form
   * (WA PD 2.1 cl 14: case name). A document saved without the toggle
   * keeps "short-title" until the user accepts the "Update court profile"
   * prompt (DECISION-043 item 4).
   */
  subsequentForm?: SubsequentForm;
}

export type CourtGroup =
  | "Federal"
  | "New South Wales"
  | "Victoria"
  | "Queensland"
  | "Other States/Territories"
  | "Tribunals";

// ─── Preset Data Map ────────────────────────────────────────────────────────

export const COURT_PRESETS: Record<CourtJurisdiction, CourtPreset> = {
  // ── Federal ─────────────────────────────────────────────────────────────
  HCA: {
    label: "High Court of Australia",
    group: "Federal",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["CLR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "part-ab",
  },
  // FCA GPN-AUTH (reissued 7 May 2025, replacing Dec 2024): the
  // authorised citation need not be given when not reasonably
  // obtainable, and MNC paragraph pinpoints are sufficient in lieu of
  // report pages. Parallel citations remain the default expectation, so
  // the toggle stays "mandatory"; the relaxation is documented in the
  // court reference guide.
  // COURT-111: cl 2.5 gives the MNC first ("D'Arcy v Myriad Genetics Inc
  // [2014] FCAFC 115; (2014) 224 FCR 479"), so the order is MNC first
  // (DECISION-043 item 3; register FCA-1, O-R2). The 2025 reissue has no
  // Part A / Part B list (O-R1): a simple list until COURT-117 adds the
  // GPN-eBOOKS cl 7.2 layout.
  FCA: {
    label: "Federal Court of Australia",
    group: "Federal",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["FCR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
    parallelOrder: "mnc-first",
    // COURT-112: GPN-AUTH cl 2.6 (7 May 2025; register FCA-1, O-R2)
    // shows pinpoints as "at [29]" and "at 481". Provenance: official
    // (instrument example).
    pinpointConnector: "at",
  },
  // FCFCOA FAM-APPEALS (updated 10 Jun 2025): appeals LOA is two parts —
  // Part 1 authorities cited in argument, Part 2 authorities possibly
  // referred to but not cited; filed with the summary of argument at
  // least 28 days before the sittings.
  // COURT-111: cl 5.8 — cite the report; the MNC is for unreported
  // judgments only, so no parallel citation (register FCF-1, O-R6).
  // FamCAFC dropped from the hierarchy: it is a medium neutral court
  // identifier (AGLC4 r 2.3.1), not a report series.
  FCFCOA: {
    label: "Federal Circuit and Family Court",
    group: "Federal",
    parallelCitations: "off",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["FLC", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "two-part-read",
    reportedCaseMnc: "omit",
  },

  // ── New South Wales ─────────────────────────────────────────────────────
  // CRIT-004 §4 sign-off (2026-07-23): SC Gen 20 does not make parallel
  // citation strictly mandatory — the authorised report "should, as far as
  // possible, also be noted" (a best-efforts obligation). parallelCitations
  // softened "mandatory" -> "preferred" to match those words. The Part A/B
  // List of Authorities derives from the Court of Appeal note SC CA 1, not
  // SC Gen 20; loaType stays "part-ab" (the attribution is corrected in the
  // court reference guide and practice-direction links).
  NSWCA: {
    label: "NSW Court of Appeal",
    group: "New South Wales",
    parallelCitations: "preferred",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "part-ab",
  },
  // COURT-119: NSW SC Practice Note SC CCA 1 (22 Jul 2021; register NSW-3,
  // O-R12): a single list of only the authorities the Court is expected to
  // be taken to in oral argument (cl 27); an authority on Caselaw with an
  // MNC "is not considered to be a reported judgment", and a copy of an
  // unreported judgment is attached (cl 28). Citation of authority follows
  // SC Gen 20, which applies to every division including the CCA (NSW-1).
  // "simple" stands for the single list until COURT-117 adds its layout.
  NSWCCA: {
    label: "NSW Court of Criminal Appeal",
    group: "New South Wales",
    parallelCitations: "preferred",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "simple",
  },
  NSWSC: {
    label: "NSW Supreme Court",
    group: "New South Wales",
    parallelCitations: "preferred",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "simple",
  },
  // COURT-119: no District or Local Court citation instrument was found
  // (register NSW-4, O-R18). Labelled "no instrument found; AGLC4
  // fallback" in provenance; the values are unchanged.
  NSW_DISTRICT_LOCAL: {
    label: "NSW District / Local Court",
    group: "New South Wales",
    parallelCitations: "preferred",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "off",
  },

  // ── Victoria ────────────────────────────────────────────────────────────
  // Vic SC PN CA 3 (reissued 10 Mar 2026): Court of Appeal civil LOA is
  // three parts (A read from at hearing / B referred to, not read from /
  // C textbooks, articles and extrinsic materials) with "None" stated
  // under unused parts; pinpoints mandatory; authorised citation
  // mandatory where one exists; AGLC compliance mandatory. Citation
  // style per SC Gen 3 (reissued 1 Dec 2025): reported over unreported,
  // pinpoint = paragraph and (if reported) commencing page, e.g.
  // "(2023) 72 VR 394, 410 [60]".
  // COURT-111: SC CA 3 cl 14.4 requires the authorised report and SC Gen 3
  // cl 5.2 cites the report "instead of" the unreported version: no
  // parallel citation (register VIC-1, VIC-2, O-R5; AGLC4 r 2.2.7).
  VSCA: {
    label: "Vic Court of Appeal",
    group: "Victoria",
    parallelCitations: "off",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["VR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "part-abc",
    reportedCaseMnc: "omit",
  },
  // Vic SC PN Gen 3 (reissued 1 Dec 2025, replacing the 30 Jan 2017
  // issue): the Court uses the AGLC as the basis of its citation
  // practice and parties are invited to follow it; authorised over
  // unauthorised reports; reported must be cited over unreported.
  // COURT-111: cl 5.2 — "that report must be included instead of the
  // unreported version": no parallel citation (register VIC-1, O-R5).
  VSC: {
    label: "Vic Supreme Court",
    group: "Victoria",
    parallelCitations: "off",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["VR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
    reportedCaseMnc: "omit",
  },
  VIC_COUNTY_MAG: {
    label: "Vic County / Magistrates' Court",
    group: "Victoria",
    parallelCitations: "preferred",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["VR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "off",
  },

  // ── Queensland ──────────────────────────────────────────────────────────
  // CRIT-004 §4 sign-off (2026-07-23): PD 1 of 2024 relaxed parallel
  // citation to "should, as far as possible" (access-to-justice), not
  // strictly mandatory. parallelCitations softened "mandatory" ->
  // "preferred" for the QCA and QSC presets to match those words.
  QCA: {
    label: "Qld Court of Appeal",
    group: "Queensland",
    parallelCitations: "preferred",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "part-ab",
  },
  QSC: {
    label: "Qld Supreme Court",
    group: "Queensland",
    parallelCitations: "preferred",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "simple",
  },
  // COURT-111: Magistrates Courts PD 7 of 2024 cl 3 uses the same "should,
  // as far as possible" wording as PD 1 of 2024 (register QLD-3, O-R11).
  // COURT-119: no District Court citation instrument was found (O-R18);
  // the District part is labelled "no instrument found; AGLC4 fallback".
  QLD_DISTRICT_MAG: {
    label: "Qld District / Magistrates Court",
    group: "Queensland",
    parallelCitations: "preferred",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "simple",
  },

  // ── Other States/Territories ────────────────────────────────────────────
  // WA SC Consolidated Practice Directions (updated 23 Sep 2026; PD 2.1
  // and PD 8.2.2 unchanged since 2022 and 2025) PD 8.2.2: parallel citation required when a case is reported, with
  // the MNC first and the report second, e.g. "Lee v The Queen [1999]
  // WASCA 14; (1999) 18 WAR 23, 34 [15]". PD 2.1: LOA lists all and
  // only authorities in the outline; cases to be read are marked with
  // an asterisk (isKeyAuthority) with pages/paras to be read.
  WASC: {
    label: "WA Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["WAR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
    parallelOrder: "mnc-first",
    // COURT-113: PD 2.1 cl 14, later references by case name only
    // (register WA-1, O-R9).
    subsequentForm: "case-name",
  },
  // SA Uniform Civil Rules 2020 r 217.8 (current to 15 Mar 2026):
  // appeals LOA is two parts (authorities expected to be read / not
  // expected to be read — Form 91); citation hierarchy is authorised
  // report, then other published report, then MNC (post-1997).
  // COURT-111: r 217.8(3) and r 101.8(4) say the highest authorised report
  // AND the MNC (for a decision after 1997 available online) "must" be
  // given, so parallel citation is mandatory (register SA-1, O-R7). The
  // order is not stated: report first (DECISION-043 item 3).
  SASC: {
    label: "SA Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["SASR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "two-part-read",
  },
  // COURT-119: the Uniform Civil Rules 2020 apply to the civil
  // jurisdictions of the Supreme, District and Magistrates Courts (register
  // SA-1, O-R7), so this preset carries the SASC values.
  SA_DISTRICT_MAG_CIVIL: {
    label: "SA District / Magistrates Court (civil)",
    group: "Other States/Territories",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["SASR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "two-part-read",
  },
  // Tas SC PD 3 of 2022: LOA is three parts — Part 1 authorities
  // counsel intends to cite (with pinpoints), Part 2 authorities that
  // might be referred to but not cited, Part 3 legislation with
  // sections; lodged at least 48 hours before the hearing. Citation
  // style remains governed by PD 3 of 2014.
  TASSC: {
    label: "Tas Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "preferred",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["Tas R", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "three-part-tas",
    // COURT-111: PD 3 of 2014 cl 3(a) gives the MNC first ("Jackson v
    // Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1"; register
    // TAS-1, O-R8; DECISION-043 item 3).
    parallelOrder: "mnc-first",
    // COURT-112: PD 3 of 2014 cl 3 (21 Feb 2014; register TAS-1, O-R8)
    // shows "Smith v Brown [1997] TASSC 161 at [15]". Provenance:
    // official (instrument example).
    pinpointConnector: "at",
  },
  // ACT SC PD 2 of 2022 (26 May 2022): authorised-series citation
  // should be used where one exists, with no express dispensation for
  // MNC paragraph pinpoints; where copies are provided, provide the
  // cited report version.
  // COURT-111: cl 3–4 require the authorised (then another) report and the
  // direction is silent on the MNC, so no parallel citation (register
  // ACT-1, O-R10; the scan was re-read on 6 Oct 2026; the owner's eye check,
  // DECISION-043 item 12, is pending).
  ACTSC: {
    label: "ACT Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "off",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["ACTLR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
    reportedCaseMnc: "omit",
  },
  // NT SC PD 1 of 2025 (1 Jan 2025, replacing PD 4 of 2016): lists of
  // authorities are required whenever authorities are relied on —
  // single judge at least 24 hours before the hearing, Full Court 28
  // days. Citation of authorities is governed by PD 2 of 2007.
  // COURT-111: PD 2 of 2007 (Citation of Authorities) says the authorised
  // report "is to be cited" and does not mention the MNC, so no parallel
  // citation (register NT-1, O-R10).
  NTSC: {
    label: "NT Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "off",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["NTLR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
    reportedCaseMnc: "omit",
  },

  // ── Tribunals ───────────────────────────────────────────────────────────
  ART: {
    label: "Administrative Review Tribunal",
    group: "Tribunals",
    parallelCitations: "off",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: [],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "off",
  },
  FWC: {
    label: "Fair Work Commission",
    group: "Tribunals",
    parallelCitations: "off",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: [],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "off",
  },
  STATE_TRIBUNAL: {
    label: "State/Territory Tribunal (NCAT/VCAT/QCAT/SAT/other)",
    group: "Tribunals",
    parallelCitations: "off",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: [],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "off",
  },
};

// ─── COURT-007: Unreported-judgment gate helpers ────────────────────────────

/** Jurisdictions where the unreported-judgment gate is set to "warn". */
export const UNREPORTED_GATE_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set(
  (Object.keys(COURT_PRESETS) as CourtJurisdiction[]).filter(
    (id) => COURT_PRESETS[id].unreportedGate === "warn"
  )
);

// ─── COURT-010: Queensland subsequent-treatment helpers ──────────────────────

/** Queensland jurisdictions (selectivity reminder and treatment prompt). */
export const QLD_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set<CourtJurisdiction>([
  "QCA",
  "QSC",
  "QLD_DISTRICT_MAG",
]);

/**
 * COURT-010 / COURT-119: the instrument behind the "doubted or not
 * followed" prompt, by jurisdiction. Each requires a party to cite any
 * later judgment that doubted or did not follow a cited case.
 */
const SUBSEQUENT_TREATMENT_SOURCES: Partial<Record<CourtJurisdiction, string>> = {
  QCA: "Qld SC PD 1/2024 cl 4(c)",
  QSC: "Qld SC PD 1/2024 cl 4(c)",
  // Register QLD-3: same wording as PD 1 of 2024.
  QLD_DISTRICT_MAG: "Qld MC PD 7/2024",
  // COURT-119: register TAS-1, O-R8.
  TASSC: "Tas SC PD 3/2014 cl 3(f)",
};

/** Jurisdictions where the subsequent-treatment prompt is active (Qld, Tas). */
export const SUBSEQUENT_TREATMENT_JURISDICTIONS: ReadonlySet<CourtJurisdiction> =
  new Set<CourtJurisdiction>(Object.keys(SUBSEQUENT_TREATMENT_SOURCES) as CourtJurisdiction[]);

/**
 * COURT-119: the instrument (and clause) requiring the treatment prompt for
 * a jurisdiction, or undefined where none applies.
 */
export function getSubsequentTreatmentSource(jurisdictionId: string): string | undefined {
  return SUBSEQUENT_TREATMENT_SOURCES[jurisdictionId as CourtJurisdiction];
}

// ─── COURT-011 / COURT-012: Jurisdiction group helpers ──────────────────────

/** Jurisdictions in the NSW group (for selectivity duty reminder). */
export const NSW_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set<CourtJurisdiction>([
  "NSWCA",
  "NSWCCA",
  "NSWSC",
  "NSW_DISTRICT_LOCAL",
]);

/** Jurisdictions in the Vic group (for AGLC adoption note). */
export const VIC_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set<CourtJurisdiction>([
  "VSCA",
  "VSC",
  "VIC_COUNTY_MAG",
]);

// ─── Ordered group list for dropdown rendering ──────────────────────────────

export const COURT_GROUPS: CourtGroup[] = [
  "Federal",
  "New South Wales",
  "Victoria",
  "Queensland",
  "Other States/Territories",
  "Tribunals",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Retrieve the court preset for a given jurisdiction ID.
 * Returns undefined if the ID is not a valid CourtJurisdiction.
 */
export function getCourtPreset(jurisdictionId: string): CourtPreset | undefined {
  return COURT_PRESETS[jurisdictionId as CourtJurisdiction];
}

/**
 * Return all jurisdiction IDs belonging to a given group, preserving
 * the declaration order in COURT_PRESETS.
 */
export function getJurisdictionsByGroup(group: CourtGroup): CourtJurisdiction[] {
  return (Object.keys(COURT_PRESETS) as CourtJurisdiction[]).filter(
    (id) => COURT_PRESETS[id].group === group
  );
}

/**
 * Type guard: returns true if the given string is a valid CourtJurisdiction.
 */
export function isCourtJurisdiction(value: string): value is CourtJurisdiction {
  return value in COURT_PRESETS;
}
