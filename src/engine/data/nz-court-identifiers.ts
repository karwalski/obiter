/**
 * New Zealand court identifiers dataset — independently compiled from public domain sources.
 *
 * This data maps NZ court neutral citation codes to their full names and hierarchy levels.
 * Compiled from NZLII, the NZ Courts website, and the Legal Citations Advisory
 * Committee of New Zealand (LCANZ) published standards.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

export type NZCourtLevel =
  | "supreme"
  | "court_of_appeal"
  | "high_court"
  | "district"
  | "specialist"
  | "tribunal"
  | "maori_land_court";

export interface NZCourtIdentifier {
  code: string;
  fullName: string;
  level: NZCourtLevel;
  /** Year neutral citation adopted (null if unknown or from inception) */
  neutralCitationFrom: number | null;
}

/**
 * ~25 NZ court neutral citation identifiers.
 *
 * Sources:
 *   "NZLII"          — New Zealand Legal Information Institute
 *   "Courts.govt.nz" — New Zealand Courts website
 *   "LCANZ"          — Legal Citations Advisory Committee
 */
export const NZ_COURT_IDENTIFIERS: NZCourtIdentifier[] = [
  // =========================================================================
  // SUPERIOR COURTS
  // =========================================================================
  { code: "NZSC", fullName: "Supreme Court of New Zealand", level: "supreme", neutralCitationFrom: 2004 },
  { code: "NZCA", fullName: "Court of Appeal of New Zealand", level: "court_of_appeal", neutralCitationFrom: 2003 },
  { code: "NZHC", fullName: "High Court of New Zealand", level: "high_court", neutralCitationFrom: 2003 },

  // =========================================================================
  // DISTRICT AND FAMILY COURTS
  // =========================================================================
  { code: "NZDC", fullName: "District Court of New Zealand", level: "district", neutralCitationFrom: 2003 },
  { code: "NZFC", fullName: "Family Court of New Zealand", level: "district", neutralCitationFrom: 2004 },
  { code: "NZYC", fullName: "Youth Court of New Zealand", level: "district", neutralCitationFrom: 2004 },

  // =========================================================================
  // SPECIALIST COURTS
  // =========================================================================
  { code: "NZEnvC", fullName: "Environment Court of New Zealand", level: "specialist", neutralCitationFrom: 2003 },
  { code: "NZEmpC", fullName: "Employment Court of New Zealand", level: "specialist", neutralCitationFrom: 2003 },
  { code: "NZCMA", fullName: "Courts Martial Appeal Court of New Zealand", level: "specialist", neutralCitationFrom: 2009 },
  { code: "NZCM", fullName: "Court Martial of New Zealand", level: "specialist", neutralCitationFrom: 2009 },

  // =========================================================================
  // TRIBUNALS
  // =========================================================================
  { code: "NZHRRT", fullName: "Human Rights Review Tribunal", level: "tribunal", neutralCitationFrom: 2003 },
  { code: "NZIEAA", fullName: "Immigration and Protection Tribunal (formerly Immigration and Exclusion Appeal Authority)", level: "tribunal", neutralCitationFrom: 2003 },
  { code: "NZIACDT", fullName: "Immigration Advisers Complaints and Disciplinary Tribunal", level: "tribunal", neutralCitationFrom: 2010 },
  { code: "NZLCDT", fullName: "Lawyers and Conveyancers Disciplinary Tribunal", level: "tribunal", neutralCitationFrom: 2008 },
  { code: "NZREADT", fullName: "Real Estate Agents Disciplinary Tribunal", level: "tribunal", neutralCitationFrom: 2009 },
  { code: "NZDT", fullName: "Disputes Tribunal of New Zealand", level: "tribunal", neutralCitationFrom: null },
  { code: "NZTRA", fullName: "Tenancy Tribunal of New Zealand", level: "tribunal", neutralCitationFrom: null },
  { code: "NZACA", fullName: "Accident Compensation Appeal Authority", level: "tribunal", neutralCitationFrom: null },
  { code: "NZBSA", fullName: "Broadcasting Standards Authority", level: "tribunal", neutralCitationFrom: null },
  { code: "NZPSPLA", fullName: "Police Conduct Authority (formerly Police Complaints Authority)", level: "tribunal", neutralCitationFrom: null },
  { code: "NZHDT", fullName: "Health Practitioners Disciplinary Tribunal", level: "tribunal", neutralCitationFrom: 2004 },
  { code: "NZARB", fullName: "New Zealand Arbitration Tribunal", level: "tribunal", neutralCitationFrom: null },

  // =========================================================================
  // MAORI LAND COURT — BLOCK ABBREVIATIONS
  // =========================================================================
  { code: "NZMLC", fullName: "Maori Land Court", level: "maori_land_court", neutralCitationFrom: null },
  { code: "NZMAC", fullName: "Maori Appellate Court", level: "maori_land_court", neutralCitationFrom: null },
];

/**
 * Maori Land Court block abbreviations used in case references.
 * Each abbreviation corresponds to a geographic district of the Maori Land Court.
 */
export const MAORI_LAND_COURT_BLOCKS: Record<string, string> = {
  TTK: "Te Tai Tokerau",
  WHK: "Waiariki",
  TAR: "Tairawhiti",
  TAK: "Takitimu",
  AOT: "Aotea",
  WGN: "Te Whanganui-a-Tara (Wellington)",
  NLS: "Te Waipounamu (Nelson)",
  CBY: "Te Waipounamu (Canterbury)",
};

/**
 * Search NZ court identifiers by code or full name (case-insensitive substring match).
 */
export function searchNZCourtIdentifiers(query: string): NZCourtIdentifier[] {
  const lowerQuery = query.toLowerCase();
  return NZ_COURT_IDENTIFIERS.filter(
    (entry) =>
      entry.code.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up a NZ court identifier by its exact code (case-sensitive).
 */
export function getNZCourtByCode(code: string): NZCourtIdentifier | undefined {
  return NZ_COURT_IDENTIFIERS.find((entry) => entry.code === code);
}

/**
 * Filter NZ court identifiers by level.
 */
export function getNZCourtsByLevel(level: NZCourtLevel): NZCourtIdentifier[] {
  return NZ_COURT_IDENTIFIERS.filter((entry) => entry.level === level);
}
