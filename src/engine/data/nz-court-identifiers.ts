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
  /**
   * Year from which the identifier applies (null if unknown or from
   * inception). For the six courts in the AGLC4 rule 21.1.3 table
   * (PDF p.265) this is the AGLC4 year — rule 21.1.3 applies identifiers
   * "only from the years indicated"; decisions outside those ranges are
   * cited under rule 2.3.2. Note that NZLII assigns identifiers from
   * earlier (real-world) dates; the AGLC4 table governs here — the
   * divergence is logged for researchers (see docs/decisions.md, DATA-004).
   */
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
  {
    code: "NZSC",
    fullName: "Supreme Court of New Zealand",
    level: "supreme",
    neutralCitationFrom: 2005, // rule 21.1.3 table (PDF p.265)
  },
  {
    code: "NZCA",
    fullName: "Court of Appeal of New Zealand",
    level: "court_of_appeal",
    neutralCitationFrom: 2007, // rule 21.1.3 table (PDF p.265)
  },
  {
    code: "NZHC",
    fullName: "High Court of New Zealand",
    level: "high_court",
    neutralCitationFrom: 2012, // rule 21.1.3 table (PDF p.265)
  },

  // =========================================================================
  // DISTRICT AND FAMILY COURTS
  // =========================================================================
  {
    // provisional: the District Court is absent from the AGLC4 rule 21.1.3
    // table entirely — NZLSG-sourced, treat with caution (DATA-004).
    code: "NZDC",
    fullName: "District Court of New Zealand",
    level: "district",
    neutralCitationFrom: 2003,
  },
  {
    code: "NZFC",
    fullName: "Family Court of New Zealand",
    level: "district",
    neutralCitationFrom: 2012, // rule 21.1.3 table (PDF p.265)
  },
  {
    code: "NZYC",
    fullName: "Youth Court of New Zealand",
    level: "district",
    neutralCitationFrom: 2004,
  },

  // =========================================================================
  // SPECIALIST COURTS
  // =========================================================================
  {
    code: "NZEnvC",
    fullName: "Environment Court of New Zealand",
    level: "specialist",
    neutralCitationFrom: 2010, // rule 21.1.3 table (PDF p.265)
  },
  {
    code: "NZEmpC",
    fullName: "Employment Court of New Zealand",
    level: "specialist",
    neutralCitationFrom: 2010, // rule 21.1.3 table (PDF p.265)
  },
  {
    code: "NZCMA",
    fullName: "Courts Martial Appeal Court of New Zealand",
    level: "specialist",
    neutralCitationFrom: 2009,
  },
  {
    code: "NZCM",
    fullName: "Court Martial of New Zealand",
    level: "specialist",
    neutralCitationFrom: 2009,
  },

  // =========================================================================
  // TRIBUNALS
  // =========================================================================
  {
    code: "NZHRRT",
    fullName: "Human Rights Review Tribunal",
    level: "tribunal",
    neutralCitationFrom: 2003,
  },
  {
    code: "NZIEAA",
    fullName:
      "Immigration and Protection Tribunal (formerly Immigration and Exclusion Appeal Authority)",
    level: "tribunal",
    neutralCitationFrom: 2003,
  },
  {
    code: "NZIACDT",
    fullName: "Immigration Advisers Complaints and Disciplinary Tribunal",
    level: "tribunal",
    neutralCitationFrom: 2010,
  },
  {
    code: "NZLCDT",
    fullName: "Lawyers and Conveyancers Disciplinary Tribunal",
    level: "tribunal",
    neutralCitationFrom: 2008,
  },
  {
    code: "NZREADT",
    fullName: "Real Estate Agents Disciplinary Tribunal",
    level: "tribunal",
    neutralCitationFrom: 2009,
  },
  {
    code: "NZDT",
    fullName: "Disputes Tribunal of New Zealand",
    level: "tribunal",
    neutralCitationFrom: null,
  },
  {
    // Label corrected: NZTRA is the Taxation Review Authority (previously
    // mislabelled "Tenancy Tribunal of New Zealand"). Non-AGLC4 identifier.
    code: "NZTRA",
    fullName: "Taxation Review Authority of New Zealand",
    level: "tribunal",
    neutralCitationFrom: null,
  },
  {
    code: "NZACA",
    fullName: "Accident Compensation Appeal Authority",
    level: "tribunal",
    neutralCitationFrom: null,
  },
  {
    code: "NZBSA",
    fullName: "Broadcasting Standards Authority",
    level: "tribunal",
    neutralCitationFrom: null,
  },
  {
    // Label corrected: NZPSPLA is the Private Security Personnel Licensing
    // Authority (previously mislabelled "Police Conduct Authority").
    // Non-AGLC4 identifier.
    code: "NZPSPLA",
    fullName: "Private Security Personnel Licensing Authority",
    level: "tribunal",
    neutralCitationFrom: null,
  },
  {
    code: "NZHDT",
    fullName: "Health Practitioners Disciplinary Tribunal",
    level: "tribunal",
    neutralCitationFrom: 2004,
  },
  {
    code: "NZARB",
    fullName: "New Zealand Arbitration Tribunal",
    level: "tribunal",
    neutralCitationFrom: null,
  },

  // =========================================================================
  // MAORI LAND COURT — BLOCK ABBREVIATIONS
  // =========================================================================
  {
    code: "NZMLC",
    fullName: "Maori Land Court",
    level: "maori_land_court",
    neutralCitationFrom: null,
  },
  {
    code: "NZMAC",
    fullName: "Maori Appellate Court",
    level: "maori_land_court",
    neutralCitationFrom: null,
  },
];

/**
 * AGLC4 rule 21.1.4 minute book abbreviations (PDF pp.265–266) for Māori
 * Land Court and Māori Appellate Court decisions:
 * `«Year») «Case Number» «Registry» «Minute Book Abbreviation» «Page»`.
 * Registries are written out in full (eg '173 Aotea MB 114', ex 13) —
 * do not abbreviate them in AGLC4 output.
 */
export const NZ_MINUTE_BOOKS: ReadonlyArray<{
  abbreviation: string;
  fullName: string;
}> = [
  { abbreviation: "MB", fullName: "Minute Book" },
  { abbreviation: "ACMB", fullName: "Appellate Court Minute Book" },
  { abbreviation: "CJMB", fullName: "Chief Judge's Minute Book" },
];

/**
 * Maori Land Court registry abbreviations used in case references.
 * Each abbreviation corresponds to a geographic district of the Maori Land Court.
 *
 * NZLSG-scoped only: AGLC4 rule 21.1.4 examples spell registries out in
 * full ('173 Aotea MB 114') — never apply these abbreviations on the AGLC4
 * path.
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
