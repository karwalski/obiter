/**
 * EU case number prefixes and ECLI data — independently compiled from public domain sources.
 *
 * This data maps EU court case number prefixes, ECLI country codes, and Official
 * Journal series identifiers. Compiled from EUR-Lex, CURIA, and the Council of
 * the European Union's published ECLI documentation.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

// =============================================================================
// CASE NUMBER PREFIXES
// =============================================================================

export interface EUCasePrefix {
  prefix: string;
  court: string;
  fullName: string;
  /** Whether this court/prefix is still active */
  active: boolean;
  /** Notes on usage or history */
  note: string;
}

/**
 * EU case number prefixes used before case numbers in CJEU proceedings.
 *
 * Source: CURIA website (curia.europa.eu) — public case law search documentation
 */
export const EU_CASE_PREFIXES: EUCasePrefix[] = [
  { prefix: "C-", court: "CJEU", fullName: "Court of Justice of the European Union", active: true, note: "References for preliminary rulings, direct actions, appeals" },
  { prefix: "T-", court: "General Court", fullName: "General Court (formerly Court of First Instance)", active: true, note: "Direct actions, intellectual property, competition" },
  { prefix: "F-", court: "Civil Service Tribunal", fullName: "European Union Civil Service Tribunal", active: false, note: "Staff cases (dissolved 1 September 2016, jurisdiction transferred to General Court)" },
  { prefix: "P-", court: "CJEU", fullName: "Court of Justice (Appeals)", active: true, note: "Appeals from the General Court" },
  { prefix: "C-", court: "CJEU (Opinion)", fullName: "Court of Justice (Opinions of Advocates General)", active: true, note: "AG opinions use same prefix as the main case" },
];

// =============================================================================
// ECLI COUNTRY CODES
// =============================================================================

export interface ECLICountryCode {
  code: string;
  country: string;
  /** ISO 3166-1 alpha-2 code where applicable */
  isoCode: string;
}

/**
 * ECLI (European Case Law Identifier) country codes.
 *
 * The ECLI format is: ECLI:[country code]:[court code]:[year]:[number]
 * For EU institutions, the code is "EU".
 *
 * Source: Council conclusions on ECLI (2011/C 127/01) — Official Journal of the EU
 */
export const ECLI_COUNTRY_CODES: ECLICountryCode[] = [
  { code: "EU", country: "European Union", isoCode: "EU" },
  { code: "AT", country: "Austria", isoCode: "AT" },
  { code: "BE", country: "Belgium", isoCode: "BE" },
  { code: "BG", country: "Bulgaria", isoCode: "BG" },
  { code: "HR", country: "Croatia", isoCode: "HR" },
  { code: "CY", country: "Cyprus", isoCode: "CY" },
  { code: "CZ", country: "Czech Republic", isoCode: "CZ" },
  { code: "DK", country: "Denmark", isoCode: "DK" },
  { code: "EE", country: "Estonia", isoCode: "EE" },
  { code: "FI", country: "Finland", isoCode: "FI" },
  { code: "FR", country: "France", isoCode: "FR" },
  { code: "DE", country: "Germany", isoCode: "DE" },
  { code: "EL", country: "Greece", isoCode: "GR" },
  { code: "HU", country: "Hungary", isoCode: "HU" },
  { code: "IE", country: "Ireland", isoCode: "IE" },
  { code: "IT", country: "Italy", isoCode: "IT" },
  { code: "LV", country: "Latvia", isoCode: "LV" },
  { code: "LT", country: "Lithuania", isoCode: "LT" },
  { code: "LU", country: "Luxembourg", isoCode: "LU" },
  { code: "MT", country: "Malta", isoCode: "MT" },
  { code: "NL", country: "Netherlands", isoCode: "NL" },
  { code: "PL", country: "Poland", isoCode: "PL" },
  { code: "PT", country: "Portugal", isoCode: "PT" },
  { code: "RO", country: "Romania", isoCode: "RO" },
  { code: "SK", country: "Slovakia", isoCode: "SK" },
  { code: "SI", country: "Slovenia", isoCode: "SI" },
  { code: "ES", country: "Spain", isoCode: "ES" },
  { code: "SE", country: "Sweden", isoCode: "SE" },
];

// =============================================================================
// OFFICIAL JOURNAL SERIES
// =============================================================================

export interface OJSeries {
  code: string;
  fullName: string;
  description: string;
  /** Whether this series is still published */
  active: boolean;
}

/**
 * Official Journal of the European Union series identifiers.
 *
 * Source: EUR-Lex (eur-lex.europa.eu) — public documentation on OJ structure
 */
export const OJ_SERIES: OJSeries[] = [
  { code: "L", fullName: "Official Journal L (Legislation)", description: "EU legislation: regulations, directives, decisions, recommendations, opinions", active: true },
  { code: "C", fullName: "Official Journal C (Information and Notices)", description: "Non-binding acts, information, notices, preparatory acts, CJEU case summaries", active: true },
  { code: "CE", fullName: "Official Journal C E (Electronic edition)", description: "Electronic-only edition of the C series (discontinued — merged into C)", active: false },
  { code: "LI", fullName: "Official Journal L I (Legislation — immediately applicable)", description: "Legislation requiring immediate publication", active: true },
  { code: "CI", fullName: "Official Journal C I (Information — urgent)", description: "Urgent information and notices", active: true },
  { code: "S", fullName: "Supplement to the Official Journal (Public procurement)", description: "Public procurement notices (Tenders Electronic Daily)", active: true },
];

// =============================================================================
// EU COURT IDENTIFIERS FOR ECLI
// =============================================================================

export interface EUCourtECLI {
  ecliCode: string;
  fullName: string;
  active: boolean;
}

/**
 * EU institution court codes used in ECLI identifiers.
 *
 * Format: ECLI:EU:[court code]:[year]:[number]
 * Source: CURIA ECLI documentation
 */
export const EU_COURT_ECLI_CODES: EUCourtECLI[] = [
  { ecliCode: "C", fullName: "Court of Justice", active: true },
  { ecliCode: "T", fullName: "General Court", active: true },
  { ecliCode: "F", fullName: "Civil Service Tribunal", active: false },
];

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Look up an EU case prefix by its string value (case-sensitive).
 */
export function getEUCasePrefixByPrefix(prefix: string): EUCasePrefix | undefined {
  return EU_CASE_PREFIXES.find((entry) => entry.prefix === prefix);
}

/**
 * Search EU case prefixes by court name (case-insensitive substring match).
 */
export function searchEUCasePrefixes(query: string): EUCasePrefix[] {
  const lowerQuery = query.toLowerCase();
  return EU_CASE_PREFIXES.filter(
    (entry) =>
      entry.court.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up an ECLI country code (case-insensitive).
 */
export function getECLICountryCode(code: string): ECLICountryCode | undefined {
  const upperCode = code.toUpperCase();
  return ECLI_COUNTRY_CODES.find((entry) => entry.code === upperCode);
}

/**
 * Look up an Official Journal series by its code (case-sensitive).
 */
export function getOJSeriesByCode(code: string): OJSeries | undefined {
  return OJ_SERIES.find((entry) => entry.code === code);
}

/**
 * Parse an ECLI string into its components.
 * Format: ECLI:[country]:[court]:[year]:[number]
 * Returns null if the string does not match ECLI format.
 */
export function parseECLI(ecli: string): {
  country: string;
  court: string;
  year: string;
  number: string;
} | null {
  const match = ecli.match(/^ECLI:([A-Z]{2}):([A-Z]+):(\d{4}):(.+)$/);
  if (!match) return null;
  return {
    country: match[1],
    court: match[2],
    year: match[3],
    number: match[4],
  };
}
