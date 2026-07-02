/**
 * New Zealand report series dataset — independently compiled from public domain sources.
 *
 * This data maps NZ report series abbreviations to their full names and classification.
 * Compiled from NZLII, Laws of New Zealand, and court websites.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

import { ReportSeriesEntry } from "./report-series";

export interface NZReportSeriesEntry extends ReportSeriesEntry {
  jurisdiction: "NZ";
}

/**
 * ~30 NZ report series entries compiled from public domain sources.
 *
 * Sources key:
 *   "NZLII"          — New Zealand Legal Information Institute
 *   "Public domain"  — Widely published in multiple freely available references
 *   "Court website"  — Published on the issuing court's official website
 *   "LCANZ"          — Legal Citations Advisory Committee of New Zealand
 */
export const NZ_REPORT_SERIES: NZReportSeriesEntry[] = [
  // =========================================================================
  // AUTHORISED / PRIMARY
  // =========================================================================
  {
    abbreviation: "NZLR",
    fullName: "New Zealand Law Reports",
    jurisdiction: "NZ",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    // provisional: verify against Appendix A (DATA-004) — chapter 21 names
    // only NZLR as authorised in-chapter; GLR's authorised status has no
    // in-chapter source.
    abbreviation: "GLR",
    fullName: "Gazette Law Reports",
    jurisdiction: "NZ",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },

  // =========================================================================
  // GENERALIST (UNAUTHORISED)
  // =========================================================================
  {
    // provisional: verify against Appendix A (DATA-004). A duplicate "NZAR"
    // entry ("New Zealand Accident Reports") was removed — duplicate keys
    // silently shadow entries in getNZReportSeriesByAbbreviation.
    abbreviation: "NZAR",
    fullName: "New Zealand Administrative Reports",
    jurisdiction: "NZ",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "BCB",
    fullName: "Butterworths Current Briefing",
    jurisdiction: "NZ",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "TCLR",
    fullName: "Thomson Reuters Current Law Review",
    jurisdiction: "NZ",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },

  // =========================================================================
  // SUBJECT-SPECIFIC (UNAUTHORISED)
  // =========================================================================
  {
    abbreviation: "NZFLR",
    fullName: "New Zealand Family Law Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "CRNZ",
    fullName: "Criminal Reports of New Zealand",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZELR",
    fullName: "New Zealand Employment Law Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "ERNZ",
    fullName: "Employment Reports of New Zealand",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZIPJ",
    fullName: "New Zealand Intellectual Property Journal",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZELC",
    fullName: "New Zealand Employment Law Cases",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZRMA",
    fullName: "New Zealand Resource Management Appeals",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZBLC",
    fullName: "New Zealand Business Law Cases",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZCLC",
    fullName: "New Zealand Company Law Cases",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZPC",
    fullName: "New Zealand Privy Council Cases",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZTC",
    fullName: "New Zealand Tax Cases",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZBORR",
    fullName: "New Zealand Bill of Rights Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZLC",
    fullName: "New Zealand Law Cases",
    jurisdiction: "NZ",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    // provisional: verify against Appendix A (DATA-004). A duplicate "NZCPR"
    // entry ("New Zealand Criminal Procedure Reports") was removed —
    // duplicate keys silently shadow entries in
    // getNZReportSeriesByAbbreviation.
    abbreviation: "NZCPR",
    fullName: "New Zealand Council of Law Reporting Practice Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZRLE",
    fullName: "New Zealand Resource and Local Government Law",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "FRNZ",
    fullName: "Family Reports of New Zealand",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "IPR",
    fullName: "Intellectual Property Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "NZCCLR",
    fullName: "New Zealand Credit and Commercial Law Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "DCR",
    fullName: "District Courts Reports",
    jurisdiction: "NZ",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    // provisional: verify against Appendix A (DATA-004) — both "NZPC" and
    // "NZPCC" claim "New Zealand Privy Council Cases" with different types;
    // only one is likely genuine.
    abbreviation: "NZPCC",
    fullName: "New Zealand Privy Council Cases",
    jurisdiction: "NZ",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "MCD",
    fullName: "Magistrates' Courts Decisions",
    jurisdiction: "NZ",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },
  // (Duplicate "NZAR" and "NZCPR" entries removed here — see the surviving
  // entries above; verify both abbreviations against Appendix A (DATA-004).)
  {
    abbreviation: "Maori LR",
    fullName: "Maori Law Review",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZTTB",
    fullName: "New Zealand Town and Country Planning Appeal Board Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
];

/**
 * Search NZ report series by abbreviation or full name (case-insensitive substring match).
 */
export function searchNZReportSeries(query: string): NZReportSeriesEntry[] {
  const lowerQuery = query.toLowerCase();
  return NZ_REPORT_SERIES.filter(
    (entry) =>
      entry.abbreviation.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up a NZ report series by its exact abbreviation (case-sensitive).
 */
export function getNZReportSeriesByAbbreviation(abbrev: string): NZReportSeriesEntry | undefined {
  return NZ_REPORT_SERIES.find((entry) => entry.abbreviation === abbrev);
}
