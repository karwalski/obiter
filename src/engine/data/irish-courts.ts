/**
 * Irish courts and report series dataset — independently compiled from public domain sources.
 *
 * This data maps Irish court neutral citation codes and report series abbreviations
 * to their full names. Compiled from BAILII, the Courts Service of Ireland website,
 * and the Irish Legal Information Initiative.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

// =============================================================================
// COURT IDENTIFIERS
// =============================================================================

export type IrishCourtLevel =
  | "supreme"
  | "court_of_appeal"
  | "high_court"
  | "circuit"
  | "district"
  | "specialist";

export interface IrishCourtIdentifier {
  code: string;
  fullName: string;
  level: IrishCourtLevel;
  /** Year neutral citation adopted (null if unknown) */
  neutralCitationFrom: number | null;
}

/**
 * Irish court neutral citation identifiers.
 *
 * Sources:
 *   "BAILII"                — British and Irish Legal Information Institute
 *   "courts.ie"             — Courts Service of Ireland
 */
export const IRISH_COURT_IDENTIFIERS: IrishCourtIdentifier[] = [
  { code: "IESC", fullName: "Supreme Court of Ireland", level: "supreme", neutralCitationFrom: 2003 },
  { code: "IESCDET", fullName: "Supreme Court of Ireland (Determinations)", level: "supreme", neutralCitationFrom: 2014 },
  { code: "IECA", fullName: "Court of Appeal of Ireland", level: "court_of_appeal", neutralCitationFrom: 2014 },
  { code: "IEHC", fullName: "High Court of Ireland", level: "high_court", neutralCitationFrom: 2003 },
  { code: "IECC", fullName: "Circuit Court of Ireland", level: "circuit", neutralCitationFrom: null },
  { code: "IEDC", fullName: "District Court of Ireland", level: "district", neutralCitationFrom: null },
  { code: "IECMC", fullName: "Competition and Mergers Commission of Ireland", level: "specialist", neutralCitationFrom: null },
  { code: "IESC", fullName: "Special Criminal Court of Ireland", level: "specialist", neutralCitationFrom: null },
  { code: "IECLR", fullName: "Employment Law Reports", level: "specialist", neutralCitationFrom: null },
  { code: "IELRC", fullName: "Law Reform Commission of Ireland", level: "specialist", neutralCitationFrom: null },
  { code: "IECCA", fullName: "Court of Criminal Appeal of Ireland", level: "court_of_appeal", neutralCitationFrom: 2003 },
  { code: "IESC", fullName: "Supreme Court (historical)", level: "supreme", neutralCitationFrom: null },
  { code: "IEHCBK", fullName: "High Court (Bankruptcy)", level: "high_court", neutralCitationFrom: null },
  { code: "IELC", fullName: "Labour Court of Ireland", level: "specialist", neutralCitationFrom: null },
  { code: "IEEAT", fullName: "Employment Appeals Tribunal", level: "specialist", neutralCitationFrom: null },
  { code: "IEFSRA", fullName: "Financial Services Regulatory Authority", level: "specialist", neutralCitationFrom: null },
];

// =============================================================================
// REPORT SERIES
// =============================================================================

export type IrishReportType = "authorised" | "unauthorised_generalist" | "unauthorised_subject";

export interface IrishReportSeriesEntry {
  abbreviation: string;
  fullName: string;
  type: IrishReportType;
  yearOrganised: boolean;
  source: string;
}

/**
 * Irish report series entries.
 *
 * Sources:
 *   "BAILII"         — British and Irish Legal Information Institute
 *   "Cardiff Index"  — Cardiff Index to Legal Abbreviations
 *   "Public domain"  — Widely published in multiple freely available references
 */
export const IRISH_REPORT_SERIES: IrishReportSeriesEntry[] = [
  { abbreviation: "IR", fullName: "Irish Reports", type: "authorised", yearOrganised: true, source: "BAILII" },
  { abbreviation: "ILRM", fullName: "Irish Law Reports Monthly", type: "unauthorised_generalist", yearOrganised: true, source: "BAILII" },
  { abbreviation: "IEHC", fullName: "Irish High Court Reports", type: "authorised", yearOrganised: true, source: "BAILII" },
  { abbreviation: "ILTR", fullName: "Irish Law Times Reports", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "ILT", fullName: "Irish Law Times", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "DULJ", fullName: "Dublin University Law Journal", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "ICLR", fullName: "Irish Criminal Law Reports", type: "unauthorised_subject", yearOrganised: true, source: "Public domain" },
  { abbreviation: "IELJ", fullName: "Irish Employment Law Journal", type: "unauthorised_subject", yearOrganised: true, source: "Public domain" },
  { abbreviation: "ITR", fullName: "Irish Tax Reports", type: "unauthorised_subject", yearOrganised: true, source: "Public domain" },
  { abbreviation: "JIC", fullName: "Judgments of the Irish Courts", type: "unauthorised_generalist", yearOrganised: true, source: "Public domain" },
  { abbreviation: "IFLR", fullName: "Irish Family Law Reports", type: "unauthorised_subject", yearOrganised: true, source: "Public domain" },
  { abbreviation: "IPLR", fullName: "Irish Planning Law Reports", type: "unauthorised_subject", yearOrganised: true, source: "Public domain" },
];

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Search Irish court identifiers by code or full name (case-insensitive substring match).
 */
export function searchIrishCourtIdentifiers(query: string): IrishCourtIdentifier[] {
  const lowerQuery = query.toLowerCase();
  return IRISH_COURT_IDENTIFIERS.filter(
    (entry) =>
      entry.code.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up an Irish court identifier by its exact code (case-sensitive).
 */
export function getIrishCourtByCode(code: string): IrishCourtIdentifier | undefined {
  return IRISH_COURT_IDENTIFIERS.find((entry) => entry.code === code);
}

/**
 * Search Irish report series by abbreviation or full name (case-insensitive substring match).
 */
export function searchIrishReportSeries(query: string): IrishReportSeriesEntry[] {
  const lowerQuery = query.toLowerCase();
  return IRISH_REPORT_SERIES.filter(
    (entry) =>
      entry.abbreviation.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up an Irish report series by its exact abbreviation (case-sensitive).
 */
export function getIrishReportSeriesByAbbreviation(
  abbrev: string
): IrishReportSeriesEntry | undefined {
  return IRISH_REPORT_SERIES.find((entry) => entry.abbreviation === abbrev);
}
