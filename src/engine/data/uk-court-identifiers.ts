/**
 * UK court identifiers dataset — independently compiled from public domain sources.
 *
 * This data maps UK court neutral citation codes to their full names, jurisdictions,
 * and hierarchy levels. Compiled from BAILII, the Courts and Tribunals Judiciary
 * website, and the Scottish Courts website.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

export type UKCourtJurisdiction = "E&W" | "Scot" | "NI" | "UK";

export type UKCourtLevel =
  | "supreme"
  | "privy_council"
  | "court_of_appeal"
  | "high_court"
  | "upper_tribunal"
  | "crown_court"
  | "first_tier_tribunal"
  | "court_of_session"
  | "high_court_justiciary"
  | "sheriff"
  | "court_of_appeal_ni"
  | "high_court_ni"
  | "other";

export interface UKCourtIdentifier {
  code: string;
  fullName: string;
  jurisdiction: UKCourtJurisdiction;
  level: UKCourtLevel;
  /** Division suffix for EWHC, if applicable */
  division?: string;
}

/**
 * ~40 UK court neutral citation identifiers.
 *
 * Sources:
 *   "BAILII"         — British and Irish Legal Information Institute
 *   "Judiciary.uk"   — Courts and Tribunals Judiciary website
 *   "scotcourts.gov.uk" — Scottish Courts and Tribunals Service
 */
export const UK_COURT_IDENTIFIERS: UKCourtIdentifier[] = [
  // =========================================================================
  // UK-WIDE
  // =========================================================================
  { code: "UKSC", fullName: "United Kingdom Supreme Court", jurisdiction: "UK", level: "supreme" },
  { code: "UKPC", fullName: "Judicial Committee of the Privy Council", jurisdiction: "UK", level: "privy_council" },
  { code: "UKHL", fullName: "United Kingdom House of Lords", jurisdiction: "UK", level: "supreme" },

  // =========================================================================
  // ENGLAND & WALES — COURT OF APPEAL
  // =========================================================================
  { code: "EWCA Civ", fullName: "Court of Appeal (Civil Division)", jurisdiction: "E&W", level: "court_of_appeal" },
  { code: "EWCA Crim", fullName: "Court of Appeal (Criminal Division)", jurisdiction: "E&W", level: "court_of_appeal" },

  // =========================================================================
  // ENGLAND & WALES — HIGH COURT (EWHC + DIVISIONS)
  // =========================================================================
  { code: "EWHC", fullName: "High Court of England and Wales", jurisdiction: "E&W", level: "high_court" },
  { code: "EWHC (QB)", fullName: "High Court (Queen's Bench Division)", jurisdiction: "E&W", level: "high_court", division: "QB" },
  { code: "EWHC (KB)", fullName: "High Court (King's Bench Division)", jurisdiction: "E&W", level: "high_court", division: "KB" },
  { code: "EWHC (Ch)", fullName: "High Court (Chancery Division)", jurisdiction: "E&W", level: "high_court", division: "Ch" },
  { code: "EWHC (Fam)", fullName: "High Court (Family Division)", jurisdiction: "E&W", level: "high_court", division: "Fam" },
  { code: "EWHC (Admin)", fullName: "High Court (Administrative Court)", jurisdiction: "E&W", level: "high_court", division: "Admin" },
  { code: "EWHC (Comm)", fullName: "High Court (Commercial Court)", jurisdiction: "E&W", level: "high_court", division: "Comm" },
  { code: "EWHC (TCC)", fullName: "High Court (Technology and Construction Court)", jurisdiction: "E&W", level: "high_court", division: "TCC" },
  { code: "EWHC (Pat)", fullName: "High Court (Patents Court)", jurisdiction: "E&W", level: "high_court", division: "Pat" },
  { code: "EWHC (Admlty)", fullName: "High Court (Admiralty Court)", jurisdiction: "E&W", level: "high_court", division: "Admlty" },
  { code: "EWHC (IPEC)", fullName: "High Court (Intellectual Property Enterprise Court)", jurisdiction: "E&W", level: "high_court", division: "IPEC" },
  { code: "EWHC (SCCO)", fullName: "High Court (Senior Courts Costs Office)", jurisdiction: "E&W", level: "high_court", division: "SCCO" },

  // =========================================================================
  // ENGLAND & WALES — UPPER TRIBUNALS
  // =========================================================================
  { code: "UKUT (AAC)", fullName: "Upper Tribunal (Administrative Appeals Chamber)", jurisdiction: "E&W", level: "upper_tribunal" },
  { code: "UKUT (IAC)", fullName: "Upper Tribunal (Immigration and Asylum Chamber)", jurisdiction: "E&W", level: "upper_tribunal" },
  { code: "UKUT (LC)", fullName: "Upper Tribunal (Lands Chamber)", jurisdiction: "E&W", level: "upper_tribunal" },
  { code: "UKUT (TCC)", fullName: "Upper Tribunal (Tax and Chancery Chamber)", jurisdiction: "E&W", level: "upper_tribunal" },

  // =========================================================================
  // ENGLAND & WALES — FIRST-TIER TRIBUNALS
  // =========================================================================
  { code: "UKFTT (TC)", fullName: "First-tier Tribunal (Tax Chamber)", jurisdiction: "E&W", level: "first_tier_tribunal" },
  { code: "UKFTT (GRC)", fullName: "First-tier Tribunal (General Regulatory Chamber)", jurisdiction: "E&W", level: "first_tier_tribunal" },
  { code: "UKFTT (HESC)", fullName: "First-tier Tribunal (Health, Education and Social Care Chamber)", jurisdiction: "E&W", level: "first_tier_tribunal" },
  { code: "UKFTT (IAC)", fullName: "First-tier Tribunal (Immigration and Asylum Chamber)", jurisdiction: "E&W", level: "first_tier_tribunal" },

  // =========================================================================
  // ENGLAND & WALES — OTHER
  // =========================================================================
  { code: "EWCC", fullName: "Crown Court (England and Wales)", jurisdiction: "E&W", level: "crown_court" },
  { code: "EWCOP", fullName: "Court of Protection", jurisdiction: "E&W", level: "other" },
  { code: "UKEAT", fullName: "Employment Appeal Tribunal", jurisdiction: "UK", level: "upper_tribunal" },
  { code: "UKET", fullName: "Employment Tribunal", jurisdiction: "UK", level: "first_tier_tribunal" },

  // =========================================================================
  // SCOTLAND
  // =========================================================================
  { code: "CSIH", fullName: "Court of Session (Inner House)", jurisdiction: "Scot", level: "court_of_session" },
  { code: "CSOH", fullName: "Court of Session (Outer House)", jurisdiction: "Scot", level: "court_of_session" },
  { code: "HCJAC", fullName: "High Court of Justiciary (Appeal Court)", jurisdiction: "Scot", level: "high_court_justiciary" },
  { code: "HCJ", fullName: "High Court of Justiciary", jurisdiction: "Scot", level: "high_court_justiciary" },
  { code: "SAC", fullName: "Sheriff Appeal Court", jurisdiction: "Scot", level: "sheriff" },
  { code: "ScotSC", fullName: "Sheriff Court (Scotland)", jurisdiction: "Scot", level: "sheriff" },

  // =========================================================================
  // NORTHERN IRELAND
  // =========================================================================
  { code: "NICA", fullName: "Court of Appeal in Northern Ireland", jurisdiction: "NI", level: "court_of_appeal_ni" },
  { code: "NIQB", fullName: "High Court of Justice in Northern Ireland (Queen's Bench Division)", jurisdiction: "NI", level: "high_court_ni" },
  { code: "NIKB", fullName: "High Court of Justice in Northern Ireland (King's Bench Division)", jurisdiction: "NI", level: "high_court_ni" },
  { code: "NICh", fullName: "High Court of Justice in Northern Ireland (Chancery Division)", jurisdiction: "NI", level: "high_court_ni" },
  { code: "NIFam", fullName: "High Court of Justice in Northern Ireland (Family Division)", jurisdiction: "NI", level: "high_court_ni" },
  { code: "NIMaster", fullName: "High Court of Justice in Northern Ireland (Master)", jurisdiction: "NI", level: "high_court_ni" },
  { code: "NICC", fullName: "Crown Court in Northern Ireland", jurisdiction: "NI", level: "crown_court" },
];

/**
 * Search UK court identifiers by code or full name (case-insensitive substring match).
 */
export function searchUKCourtIdentifiers(query: string): UKCourtIdentifier[] {
  const lowerQuery = query.toLowerCase();
  return UK_COURT_IDENTIFIERS.filter(
    (entry) =>
      entry.code.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up a UK court identifier by its exact code (case-sensitive).
 */
export function getUKCourtByCode(code: string): UKCourtIdentifier | undefined {
  return UK_COURT_IDENTIFIERS.find((entry) => entry.code === code);
}

/**
 * Filter UK court identifiers by jurisdiction.
 */
export function getUKCourtsByJurisdiction(
  jurisdiction: UKCourtJurisdiction
): UKCourtIdentifier[] {
  return UK_COURT_IDENTIFIERS.filter(
    (entry) => entry.jurisdiction === jurisdiction
  );
}
