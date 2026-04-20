/**
 * UK report series dataset — independently compiled from public domain sources.
 *
 * This data maps UK report series abbreviations to their full names, jurisdictions,
 * and classification. Compiled from the Cardiff Index to Legal Abbreviations,
 * BAILII catalogue, and court websites.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

import { ReportSeriesEntry } from "./report-series";

export type UKJurisdiction = "E&W" | "Scot" | "NI" | "UK";

export interface UKReportSeriesEntry extends ReportSeriesEntry {
  jurisdiction: UKJurisdiction | string;
}

/**
 * ~100 UK report series entries compiled from public domain sources.
 *
 * Sources key:
 *   "Cardiff Index"  — Cardiff Index to Legal Abbreviations (Cardiff University)
 *   "BAILII"         — British and Irish Legal Information Institute
 *   "ICLR"           — Incorporated Council of Law Reporting (public catalogue)
 *   "Public domain"  — Widely published in multiple freely available references
 */
export const UK_REPORT_SERIES: UKReportSeriesEntry[] = [
  // =========================================================================
  // LAW REPORTS (AUTHORISED) — ICLR
  // =========================================================================
  { abbreviation: "AC", fullName: "Appeal Cases", jurisdiction: "UK", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "QB", fullName: "Queen's Bench", jurisdiction: "E&W", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "KB", fullName: "King's Bench", jurisdiction: "E&W", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "Ch", fullName: "Chancery", jurisdiction: "E&W", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "Fam", fullName: "Family Division", jurisdiction: "E&W", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "P", fullName: "Probate Division", jurisdiction: "E&W", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "Ex", fullName: "Exchequer Division", jurisdiction: "E&W", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "CPD", fullName: "Common Pleas Division", jurisdiction: "E&W", type: "authorised", yearOrganised: true, source: "ICLR" },
  { abbreviation: "App Cas", fullName: "Appeal Cases (Law Reports)", jurisdiction: "UK", type: "authorised", yearOrganised: false, source: "ICLR" },
  { abbreviation: "HL Cas", fullName: "House of Lords Cases (Clark)", jurisdiction: "UK", type: "authorised", yearOrganised: false, source: "Cardiff Index" },

  // =========================================================================
  // GENERALIST (UNAUTHORISED)
  // =========================================================================
  { abbreviation: "WLR", fullName: "Weekly Law Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: true, source: "ICLR" },
  { abbreviation: "All ER", fullName: "All England Law Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "All ER (D)", fullName: "All England Law Reports (Digests)", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "TLR", fullName: "Times Law Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "LT", fullName: "Law Times Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Sol Jo", fullName: "Solicitors' Journal", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },

  // =========================================================================
  // SPECIALIST (UNAUTHORISED SUBJECT-SPECIFIC)
  // =========================================================================
  { abbreviation: "Cr App R", fullName: "Criminal Appeal Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Cr App R (S)", fullName: "Criminal Appeal Reports (Sentencing)", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "ICR", fullName: "Industrial Cases Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "IRLR", fullName: "Industrial Relations Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "FSR", fullName: "Fleet Street Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "RPC", fullName: "Reports of Patent Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Lloyd's Rep", fullName: "Lloyd's Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Lloyd's Rep IR", fullName: "Lloyd's Law Reports: Insurance and Reinsurance", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Tax Cas", fullName: "Tax Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "STC", fullName: "Simon's Tax Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "BTC", fullName: "British Tax Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "BCLC", fullName: "Butterworths Company Law Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "BCC", fullName: "British Company Law Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "FLR", fullName: "Family Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Fam Law", fullName: "Family Law", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "CMLR", fullName: "Common Market Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Env LR", fullName: "Environmental Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Con LR", fullName: "Construction Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "EG", fullName: "Estates Gazette", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "EGLR", fullName: "Estates Gazette Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "P & CR", fullName: "Property and Compensation Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "HLR", fullName: "Housing Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "EHRR", fullName: "European Human Rights Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "HRLR", fullName: "Human Rights Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Med LR", fullName: "Medical Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "PIQR", fullName: "Personal Injuries and Quantum Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "RTR", fullName: "Road Traffic Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "LRLR", fullName: "Landlord and Tenant Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "JPL", fullName: "Journal of Planning and Environment Law", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "ELR", fullName: "Education Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "BPIR", fullName: "Bankruptcy and Personal Insolvency Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Costs LR", fullName: "Costs Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "WTLR", fullName: "Wills and Trusts Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "ITELR", fullName: "International Trust and Estate Law Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "ETMR", fullName: "European Trade Mark Reports", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },

  // =========================================================================
  // SCOTTISH REPORTS
  // =========================================================================
  { abbreviation: "SC", fullName: "Session Cases", jurisdiction: "Scot", type: "authorised", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "SC (HL)", fullName: "Session Cases (House of Lords)", jurisdiction: "Scot", type: "authorised", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "SC (PC)", fullName: "Session Cases (Privy Council)", jurisdiction: "Scot", type: "authorised", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "SLT", fullName: "Scots Law Times", jurisdiction: "Scot", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "SCLR", fullName: "Scottish Civil Law Reports", jurisdiction: "Scot", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "SCCR", fullName: "Scottish Criminal Case Reports", jurisdiction: "Scot", type: "unauthorised_subject", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "GWD", fullName: "Green's Weekly Digest", jurisdiction: "Scot", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "Macph", fullName: "Macpherson's Session Cases", jurisdiction: "Scot", type: "authorised", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Rettie", fullName: "Rettie's Session Cases", jurisdiction: "Scot", type: "authorised", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Adam", fullName: "Adam's Justiciary Cases", jurisdiction: "Scot", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },

  // =========================================================================
  // NORTHERN IRELAND REPORTS
  // =========================================================================
  { abbreviation: "NI", fullName: "Northern Ireland Law Reports", jurisdiction: "NI", type: "authorised", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "NIJB", fullName: "Northern Ireland Judgments Bulletin", jurisdiction: "NI", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },
  { abbreviation: "NILR", fullName: "Northern Ireland Legal Reports", jurisdiction: "NI", type: "unauthorised_generalist", yearOrganised: true, source: "Cardiff Index" },

  // =========================================================================
  // HISTORICAL NOMINATE REPORTS
  // =========================================================================
  { abbreviation: "Cox CC", fullName: "Cox's Criminal Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Camp", fullName: "Campbell's Nisi Prius Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Bing", fullName: "Bingham's Common Pleas Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Bing NC", fullName: "Bingham's New Cases", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "B & Ald", fullName: "Barnewall and Alderson's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "B & C", fullName: "Barnewall and Cresswell's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Burr", fullName: "Burrow's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Co Rep", fullName: "Coke's Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Doug", fullName: "Douglas's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "East", fullName: "East's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Esp", fullName: "Espinasse's Nisi Prius Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Hare", fullName: "Hare's Chancery Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "M & W", fullName: "Meeson and Welsby's Exchequer Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Mood", fullName: "Moody's Crown Cases Reserved", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Plowd", fullName: "Plowden's Commentaries", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Str", fullName: "Strange's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Taunt", fullName: "Taunton's Common Pleas Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Term Rep", fullName: "Term Reports (Durnford and East)", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Ves", fullName: "Vesey's Chancery Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Ves Jr", fullName: "Vesey Junior's Chancery Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "WR", fullName: "Weekly Reporter", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "De G & J", fullName: "De Gex and Jones's Chancery Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "De G M & G", fullName: "De Gex, Macnaghten and Gordon's Chancery Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Sim", fullName: "Simons' Chancery Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Y & C Ex", fullName: "Younge and Collyer's Exchequer Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Beav", fullName: "Beavan's Rolls Court Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "ER", fullName: "English Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Leach", fullName: "Leach's Crown Cases", jurisdiction: "E&W", type: "unauthorised_subject", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Lofft", fullName: "Lofft's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Stark", fullName: "Starkie's Nisi Prius Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
  { abbreviation: "Wils KB", fullName: "Wilson's King's Bench Reports", jurisdiction: "E&W", type: "unauthorised_generalist", yearOrganised: false, source: "Cardiff Index" },
];

/**
 * Search UK report series by abbreviation or full name (case-insensitive substring match).
 */
export function searchUKReportSeries(query: string): UKReportSeriesEntry[] {
  const lowerQuery = query.toLowerCase();
  return UK_REPORT_SERIES.filter(
    (entry) =>
      entry.abbreviation.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up a UK report series by its exact abbreviation (case-sensitive).
 */
export function getUKReportSeriesByAbbreviation(
  abbrev: string
): UKReportSeriesEntry | undefined {
  return UK_REPORT_SERIES.find((entry) => entry.abbreviation === abbrev);
}

/**
 * Filter UK report series by jurisdiction.
 */
export function getUKReportSeriesByJurisdiction(
  jurisdiction: UKJurisdiction
): UKReportSeriesEntry[] {
  return UK_REPORT_SERIES.filter((entry) => entry.jurisdiction === jurisdiction);
}
