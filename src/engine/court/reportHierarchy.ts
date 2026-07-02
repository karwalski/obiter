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
  // FamCAFC removed: it is a medium neutral court identifier (rule 2.3.1),
  // not a report series. Fam LR/FLC ordering is provisional: verify against
  // Appendix A (DATA-004) — no family series appears in the in-chapter
  // rule 2.2.3 table (Fam LR is a named unauthorised series in 2.2.3).
  FCFCOA: ["Fam LR", "FLC", "ALR", "MNC"],
  NSW: ["NSWLR", "ALR", "MNC"],
  VIC: ["VR", "ALR", "MNC"],
  QLD: ["Qd R", "ALR", "MNC"],
  WA: ["WAR", "ALR", "MNC"],
  SA: ["SASR", "ALR", "MNC"],
  TAS: ["Tas R", "ALR", "MNC"],
  ACT: ["ACTLR", "ALR", "MNC"],
  // NTLR (1990–) is the current NT series per the rule 2.2.3 table; NTR
  // ("NTR (in ALR)", 1979–91) ceased in 1991 and ranks behind it.
  NT: ["NTLR", "NTR", "ALR", "MNC"],
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
  HCASL: "HCA",
  FCA: "FCA",
  FCAFC: "FCA",
  FCFCOA: "FCFCOA",
  FamCA: "FCFCOA",
  FamCAFC: "FCFCOA",

  // New South Wales
  NSWCA: "NSW",
  NSWCCA: "NSW",
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

  // Tasmania — TASSC/TASCCA/TASFC per the rule 2.3.1 table. "TASCSC" is
  // NOT an AGLC4 identifier (typo — no such code in any table); it is
  // retained solely because it is the court-mode preset key in
  // presets.ts/validator.ts. Never emit it in citations; rename pending
  // (see handoff).
  TASFC: "TAS",
  TASCCA: "TAS",
  TASSC: "TAS",
  TASCSC: "TAS",

  // ACT
  ACTCA: "ACT",
  ACTSC: "ACT",

  // NT
  NTCA: "NT",
  NTCCA: "NT",
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
  availableSeries: string[]
): string | undefined {
  if (availableSeries.length === 0) {
    return undefined;
  }

  const hierarchy = getPreferredReportOrder(jurisdiction);

  if (hierarchy.length === 0) {
    // Unknown jurisdiction — fall back to AGLC4 default tier ordering.
    // Sort by the generic preference rank from Rule 2.2.3.
    return [...availableSeries].sort(
      (a, b) => getDefaultPreferenceRank(a) - getDefaultPreferenceRank(b)
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
  // Authorised tier per the rule 2.2.2/2.2.3 tables. Previous fabricated
  // "QR" removed (the AGLC4 abbreviation is "Qd R"); FLR moved to the
  // generalist tier (a rule 2.2.2 generalist example); FCAFC/FamCAFC moved
  // to the unreported tier (they are rule 2.3.1 medium neutral court
  // identifiers, not report series).
  const authorised = new Set([
    "CLR",
    "FCR",
    "NSWLR",
    "NSWR",
    "SR (NSW)",
    "VR",
    "VLR",
    "Qd R",
    "St R Qd",
    "SASR",
    "SALR",
    "Tas R",
    "Tas LR",
    "Tas SR",
    "WAR",
    "WALR",
    "ACTLR",
    "NTR",
    "NTLR",
    // provisional: verify against Appendix A (DATA-004) — FLC has no
    // in-chapter standing as an authorised series.
    "FLC",
  ]);
  // IR removed from this tier: the rule 2.2.2 table lists IR as a
  // subject-specific example (default rank 3). MVR retained here
  // provisionally: verify against Appendix A (DATA-004).
  const generalistUnauthorised = new Set(["ALJR", "ALR", "FLR", "ACTR", "MVR"]);
  const unreported = new Set(["MNC", "AustLII", "FCAFC", "FamCAFC"]);

  if (authorised.has(series)) return 1;
  if (generalistUnauthorised.has(series)) return 2;
  if (unreported.has(series)) return 4;
  return 3; // subject-specific unauthorised
}
