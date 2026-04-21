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
 * Sources:
 *   - Federal Court GPN-AUTH (Dec 2024)
 *   - HCA PD 2 of 2024
 *   - NSW SC PN Gen 20 (Oct 2023)
 *   - Vic SC PN Gen 3 (Jan 2017)
 *   - Qld SC PD 1 of 2024
 *   - Qld MC PD 7 of 2024
 *   - NT SC PD 2 of 2007
 */

// ─── Toggle Value Types ─────────────────────────────────────────────────────

export type ParallelCitationMode = "off" | "preferred" | "mandatory";

export type PinpointStyle = "page-only" | "para-only" | "para-and-page";

export type UnreportedGate = "off" | "warn";

export type IbidSuppression = "off" | "on";

export type LoaType = "off" | "simple" | "part-ab";

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
  | "TASCSC"
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
  FCFCOA: {
    label: "Federal Circuit and Family Court",
    group: "Federal",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["FamCAFC", "FLC", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
  },

  // ── New South Wales ─────────────────────────────────────────────────────
  NSWCA: {
    label: "NSW Court of Appeal",
    group: "New South Wales",
    parallelCitations: "mandatory",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "part-ab",
  },
  NSWSC: {
    label: "NSW Supreme Court",
    group: "New South Wales",
    parallelCitations: "mandatory",
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
  VSCA: {
    label: "Vic Court of Appeal",
    group: "Victoria",
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["VR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "part-ab",
  },
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
  QCA: {
    label: "Qld Court of Appeal",
    group: "Queensland",
    parallelCitations: "mandatory",
    pinpointStyle: "para-only",
    authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "part-ab",
  },
  QSC: {
    label: "Qld Supreme Court",
    group: "Queensland",
    parallelCitations: "mandatory",
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
  WASC: {
    label: "WA Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "preferred",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["WAR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
  },
  SASC: {
    label: "SA Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "preferred",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["SASR", "CLR", "ALR"],
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "simple",
  },
  TASCSC: {
    label: "Tas Supreme Court",
    group: "Other States/Territories",
    parallelCitations: "preferred",
    pinpointStyle: "para-and-page",
    authorisedReportHierarchy: ["Tas R", "CLR", "ALR"],
    unreportedGate: "warn",
    ibidSuppression: "on",
    loaType: "simple",
  },
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
    (id) => COURT_PRESETS[id].unreportedGate === "warn",
  ),
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
    (id) => COURT_PRESETS[id].group === group,
  );
}

/**
 * Type guard: returns true if the given string is a valid CourtJurisdiction.
 */
export function isCourtJurisdiction(value: string): value is CourtJurisdiction {
  return value in COURT_PRESETS;
}
