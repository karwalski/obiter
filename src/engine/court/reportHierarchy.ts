/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-006: Authorised-Report Hierarchy Engine
 *
 * Jurisdiction-aware authorised-report preference ordering for validation
 * prompts and auto-ordering of parallel citations.
 *
 * AGLC4 Rule 2.2.2: When a case is reported in multiple series, preference
 * is given to authorised reports, then generalist unauthorised reports, then
 * subject-specific reports, then unreported (MNC).
 *
 * Court mode extends this with per-jurisdiction ordering derived from
 * practice directions:
 * - HCA PD 1 of 2019
 * - FCA GPN-AUTH cl 2.5
 * - State authorised report lists
 *
 * All hierarchy data is stored declaratively. No jurisdiction-specific logic
 * branches exist — the engine reads from a typed data map.
 */

// ─── Jurisdiction Identifiers ────────────────────────────────────────────────

/**
 * Jurisdictions that have a defined authorised-report preference ordering.
 *
 * These map to the court presets in COURT-002/COURT-003. Each jurisdiction
 * key groups all courts within that jurisdiction (e.g. "NSW" covers NSWCA,
 * NSWSC, and NSW District/Local).
 */
export type ReportJurisdiction =
  | "HCA"
  | "FCA"
  | "FCFCOA"
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

// ─── Hierarchy Data ──────────────────────────────────────────────────────────

/**
 * Per-jurisdiction ordered list of preferred report series, from most
 * preferred (index 0) to least preferred.
 *
 * The final entry for each jurisdiction is a medium neutral citation
 * placeholder ("MNC"). When matching, any series not found in the list
 * is treated as less preferred than named series but more preferred than
 * MNC (i.e. it falls into the "subject-specific unauthorised" tier from
 * AGLC4 Rule 2.2.3).
 *
 * Stored as data, not logic — editable for future practice direction
 * updates without code changes.
 */
export const REPORT_HIERARCHY: Record<ReportJurisdiction, readonly string[]> = {
  HCA: ["CLR", "ALJR", "ALR", "MNC"],
  FCA: ["FCR", "ALR", "MNC"],
  FCFCOA: ["FamCAFC", "FLC", "ALR", "MNC"],
  NSW: ["NSWLR", "ALR", "MNC"],
  VIC: ["VR", "ALR", "MNC"],
  QLD: ["Qd R", "ALR", "MNC"],
  WA: ["WAR", "ALR", "MNC"],
  SA: ["SASR", "ALR", "MNC"],
  TAS: ["Tas R", "ALR", "MNC"],
  ACT: ["ACTLR", "ALR", "MNC"],
  NT: ["NTR", "ALR", "MNC"],
};

// ─── Court-to-Jurisdiction Mapping ───────────────────────────────────────────

/**
 * Maps specific court identifiers to their parent jurisdiction for
 * hierarchy lookup. This supports cross-jurisdictional citation: when
 * citing a Victorian case in a Federal Court submission, the cited
 * case's home jurisdiction (VIC) determines the preference order.
 */
const COURT_TO_JURISDICTION: Record<string, ReportJurisdiction> = {
  // Federal
  HCA: "HCA",
  FCA: "FCA",
  FCAFC: "FCA",
  FCFCOA: "FCFCOA",
  FamCAFC: "FCFCOA",

  // New South Wales
  NSWCA: "NSW",
  NSWSC: "NSW",
  NSWDC: "NSW",
  NSWLC: "NSW",

  // Victoria
  VSCA: "VIC",
  VSC: "VIC",
  VCC: "VIC",
  VMC: "VIC",

  // Queensland
  QCA: "QLD",
  QSC: "QLD",
  QDC: "QLD",
  QMC: "QLD",

  // Western Australia
  WASCA: "WA",
  WASC: "WA",
  WADC: "WA",

  // South Australia
  SASCFC: "SA",
  SASC: "SA",
  SADC: "SA",

  // Tasmania
  TASFC: "TAS",
  TASCSC: "TAS",
  TASSC: "TAS",

  // ACT
  ACTCA: "ACT",
  ACTSC: "ACT",

  // NT
  NTCA: "NT",
  NTSC: "NT",
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the ordered list of preferred report series for a jurisdiction.
 *
 * Accepts either a jurisdiction key (e.g. "NSW") or a specific court
 * identifier (e.g. "NSWSC"). Court identifiers are resolved to their
 * parent jurisdiction before lookup.
 *
 * @param jurisdiction - A ReportJurisdiction key or a court identifier string.
 * @returns The ordered preference list, or an empty array if the jurisdiction
 *   is not recognised.
 *
 * @example
 *   getPreferredReportOrder("HCA")
 *   // => ["CLR", "ALJR", "ALR", "MNC"]
 *
 * @example
 *   getPreferredReportOrder("NSWSC")
 *   // => ["NSWLR", "ALR", "MNC"]
 */
export function getPreferredReportOrder(jurisdiction: string): readonly string[] {
  const resolved = resolveJurisdiction(jurisdiction);
  if (resolved === undefined) {
    return [];
  }
  return REPORT_HIERARCHY[resolved];
}

/**
 * Given a jurisdiction and a list of available report series, returns the
 * highest-preference series according to the jurisdiction's hierarchy.
 *
 * This is used for validation prompts (COURT-VALID-001) and auto-ordering
 * of parallel citations (COURT-004).
 *
 * Series not in the jurisdiction's hierarchy are treated as subject-specific
 * unauthorised reports — ranked below named series but above MNC.
 *
 * @param jurisdiction - A ReportJurisdiction key or court identifier string.
 * @param availableSeries - The report series the user has provided for a case.
 * @returns The highest-preference series from the available list, or
 *   undefined if the list is empty.
 *
 * @example
 *   suggestPreferredReport("HCA", ["ALR", "CLR", "ALJR"])
 *   // => "CLR"
 *
 * @example
 *   suggestPreferredReport("FCA", ["ALR", "MNC"])
 *   // => "ALR"
 *
 * @example
 *   // Unknown jurisdiction falls back to AGLC4 default tier ordering
 *   suggestPreferredReport("UNKNOWN", ["ALR", "CLR"])
 *   // => "CLR" (authorised > generalist unauthorised)
 */
export function suggestPreferredReport(
  jurisdiction: string,
  availableSeries: string[],
): string | undefined {
  if (availableSeries.length === 0) {
    return undefined;
  }

  const hierarchy = getPreferredReportOrder(jurisdiction);

  if (hierarchy.length === 0) {
    // Unknown jurisdiction — fall back to AGLC4 default tier ordering.
    // Sort by the generic preference rank from Rule 2.2.3.
    return [...availableSeries].sort(
      (a, b) => getDefaultPreferenceRank(a) - getDefaultPreferenceRank(b),
    )[0];
  }

  // Score each available series by its position in the hierarchy.
  // Series not in the hierarchy get a rank just before MNC.
  let bestSeries: string | undefined;
  let bestRank = Infinity;

  for (const series of availableSeries) {
    const rank = getRankInHierarchy(series, hierarchy);
    if (rank < bestRank) {
      bestRank = rank;
      bestSeries = series;
    }
  }

  return bestSeries;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Resolves a court identifier or jurisdiction string to a ReportJurisdiction.
 */
function resolveJurisdiction(input: string): ReportJurisdiction | undefined {
  // Direct jurisdiction key match
  if (input in REPORT_HIERARCHY) {
    return input as ReportJurisdiction;
  }
  // Court identifier lookup
  return COURT_TO_JURISDICTION[input];
}

/**
 * Returns the rank of a series within a jurisdiction hierarchy.
 *
 * - Series found in the hierarchy: their index position (0 = most preferred).
 * - Series not found: ranked one position before MNC (subject-specific tier).
 * - MNC is always the last entry in every hierarchy.
 */
function getRankInHierarchy(series: string, hierarchy: readonly string[]): number {
  const index = hierarchy.indexOf(series);
  if (index !== -1) {
    return index;
  }
  // Unknown series: rank just before MNC (last position)
  const mncIndex = hierarchy.indexOf("MNC");
  return mncIndex !== -1 ? mncIndex - 0.5 : hierarchy.length - 0.5;
}

/**
 * AGLC4 Rule 2.2.3 default preference rank for fallback ordering when
 * jurisdiction is unknown. Mirrors the tiers in getReportSeriesPreference()
 * from cases.ts.
 */
function getDefaultPreferenceRank(series: string): number {
  const authorised = new Set([
    "CLR", "FCR", "FCAFC", "FLR", "NSWLR", "VR", "QR", "Qd R",
    "SASR", "Tas R", "WAR", "ACTLR", "NTR", "FamCAFC", "FLC",
  ]);
  const generalistUnauthorised = new Set(["ALJR", "ALR", "IR", "MVR"]);
  const unreported = new Set(["MNC", "AustLII"]);

  if (authorised.has(series)) return 1;
  if (generalistUnauthorised.has(series)) return 2;
  if (unreported.has(series)) return 4;
  return 3; // subject-specific unauthorised
}
