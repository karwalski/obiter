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
 * Sources (verified against primary court sources 2026-07-21):
 *   - Federal Court GPN-AUTH (reissued 7 May 2025)
 *   - HCA PD 2 of 2024
 *   - NSW SC PN Gen 20 (Oct 2023)
 *   - Vic SC PN Gen 3 (reissued 1 Dec 2025)
 *   - Vic SC PN CA 3 (reissued 10 Mar 2026) — Court of Appeal civil LOA
 *   - Qld SC PD 1 of 2024
 *   - Qld MC PD 7 of 2024
 *   - WA SC Consolidated Practice Directions (updated 20 Jun 2025), PD 2.1 and PD 8.2.2
 *   - SA Uniform Civil Rules 2020 r 217.8 (current to 15 Mar 2026)
 *   - Tas SC PD 3 of 2014 (citation) and PD 3 of 2022 (lists of authorities)
 *   - ACT SC PD 2 of 2022 (26 May 2022)
 *   - NT SC PD 2 of 2007 (citation) and PD 1 of 2025 (lists of authorities)
 *   - FCFCOA FAM-APPEALS practice direction (updated 10 Jun 2025)
 */

// ─── Toggle Value Types ─────────────────────────────────────────────────────

export type ParallelCitationMode = "off" | "preferred" | "mandatory";

export type PinpointStyle = "page-only" | "para-only" | "para-and-page";

export type UnreportedGate = "off" | "warn";

export type IbidSuppression = "off" | "on";

/**
 * List of Authorities generation type.
 *
 * - "off" — no LOA generated
 * - "simple" — flat Cases/Legislation list
 * - "part-ab" — Part A (read from) / Part B (referred to) split
 *   (FCA GPN-AUTH cl 2.1; HCA PD 2 of 2024; NSWCA; QCA)
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
 *   per WA SC Consolidated Practice Directions PD 8.2.2 (updated
 *   20 Jun 2025).
 */
export type ParallelOrder = "report-first" | "mnc-first";

// ─── COURT-010: Subsequent Treatment (Qld) ─────────────────────────────────

export type SubsequentTreatment =
  | ""
  | "not-affected"
  | "distinguished"
  | "doubted"
  | "not-followed"
  | "overruled"
  | "unknown";

export const SUBSEQUENT_TREATMENT_OPTIONS: ReadonlyArray<{
  value: SubsequentTreatment;
  label: string;
}> = [
  { value: "", label: "Select..." },
  { value: "not-affected", label: "Not affected" },
  { value: "distinguished", label: "Distinguished" },
  { value: "doubted", label: "Doubted" },
  { value: "not-followed", label: "Not followed" },
  { value: "overruled", label: "Overruled" },
  { value: "unknown", label: "Unknown \u2014 check" },
];

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
  FCA: {
    label: "Federal Court of Australia",
    group: "Federal",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["FCR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "part-ab",
  },
  // FCFCOA FAM-APPEALS (updated 10 Jun 2025): appeals LOA is two parts —
  // Part 1 authorities cited in argument, Part 2 authorities possibly
  // referred to but not cited; filed with the summary of argument at
  // least 28 days before the sittings.
  FCFCOA: {
    label: "Federal Circuit and Family Court",
    group: "Federal",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["FamCAFC", "FLC", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "two-part-read",
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
  VSCA: {
    label: "Vic Court of Appeal",
    group: "Victoria",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["VR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "part-abc",
  },
  // Vic SC PN Gen 3 (reissued 1 Dec 2025, replacing the 30 Jan 2017
  // issue): the Court uses the AGLC as the basis of its citation
  // practice and parties are invited to follow it; authorised over
  // unauthorised reports; reported must be cited over unreported.
  VSC: {
    label: "Vic Supreme Court",
    group: "Victoria",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["VR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
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
  QLD_DISTRICT_MAG: {
    label: "Qld District / Magistrates Court",
    group: "Queensland",
    parallelCitations: "mandatory",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "simple",
  },

  // ── Other States/Territories ────────────────────────────────────────────
  // WA SC Consolidated Practice Directions (updated 20 Jun 2025)
  // PD 8.2.2: parallel citation required when a case is reported, with
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
  },
  // SA Uniform Civil Rules 2020 r 217.8 (current to 15 Mar 2026):
  // appeals LOA is two parts (authorities expected to be read / not
  // expected to be read — Form 91); citation hierarchy is authorised
  // report, then other published report, then MNC (post-1997).
  SASC: {
    label: "SA Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "preferred",
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
  },
  // ACT SC PD 2 of 2022 (26 May 2022): authorised-series citation
  // should be used where one exists, with no express dispensation for
  // MNC paragraph pinpoints; where copies are provided, provide the
  // cited report version. Toggle kept at "preferred" pending
  // confirmation of enforcement severity.
  ACTSC: {
    label: "ACT Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "preferred",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["ACTLR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
  },
  // NT SC PD 1 of 2025 (1 Jan 2025, replacing PD 4 of 2016): lists of
  // authorities are required whenever authorities are relied on —
  // single judge at least 24 hours before the hearing, Full Court 28
  // days. Citation of unreported cases remains governed by PD 2 of 2007.
  NTSC: {
    label: "NT Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "preferred",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["NTLR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
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

/** Jurisdictions where subsequent treatment prompting is active (Qld). */
export const QLD_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set<CourtJurisdiction>([
  "QCA",
  "QSC",
  "QLD_DISTRICT_MAG",
]);

// ─── COURT-011 / COURT-012: Jurisdiction group helpers ──────────────────────

/** Jurisdictions in the NSW group (for selectivity duty reminder). */
export const NSW_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set<CourtJurisdiction>([
  "NSWCA",
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
