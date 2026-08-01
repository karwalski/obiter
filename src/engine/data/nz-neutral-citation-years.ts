/**
 * New Zealand neutral-citation dual-year reference metadata.
 *
 * AGLC4 rule 21.1.3 (PDF p.265) prints, for six New Zealand courts, the year
 * from which a medium neutral citation identifier may be used. NZLII (and the
 * courts themselves) in fact assigned identifiers from real-world dates that
 * can differ from the AGLC4-tabled years. This table records BOTH years side
 * by side as reference metadata and letter evidence of divergence
 * (AGLC5 feedback-package Part B.5; DECISION-022 — CLOSED).
 *
 * IMPORTANT — REFERENCE METADATA ONLY. The validator's behaviour is unchanged:
 * AGLC4's rule 21.1.3 years continue to govern (see
 * `NZ_COURT_IDENTIFIERS[].neutralCitationFrom` in `nz-court-identifiers.ts`,
 * which the engine and validator read). Nothing here is wired into validation
 * or formatting. For the six courts recorded below the two years happen to
 * align per B.5, but they are recorded regardless so the divergence framework
 * is in place for any future court where they differ.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

export interface NZNeutralCitationYearReference {
  /** NZ court neutral citation code (matches `nz-court-identifiers.ts`). */
  code: string;
  /** Full court name. */
  fullName: string;
  /**
   * Year from which AGLC4 rule 21.1.3 (PDF p.265) permits the identifier.
   * This is the year the validator uses (via `neutralCitationFrom`); it
   * governs.
   */
  aglc4Year: number;
  /**
   * Year from which NZLII / the court itself assigned the identifier in the
   * real world. Reference only — NOT used by the validator.
   */
  nzliiYear: number;
}

/**
 * The six New Zealand courts listed in the AGLC4 rule 21.1.3 table, with their
 * AGLC4 year and their real-world NZLII year. For these six the two years
 * coincide (B.5); the table is nonetheless recorded as reference metadata.
 */
export const NZ_NEUTRAL_CITATION_YEARS: ReadonlyArray<NZNeutralCitationYearReference> =
  [
    { code: "NZSC", fullName: "Supreme Court of New Zealand", aglc4Year: 2005, nzliiYear: 2005 },
    { code: "NZCA", fullName: "Court of Appeal of New Zealand", aglc4Year: 2007, nzliiYear: 2007 },
    { code: "NZHC", fullName: "High Court of New Zealand", aglc4Year: 2012, nzliiYear: 2012 },
    {
      code: "NZEmpC",
      fullName: "Employment Court of New Zealand",
      aglc4Year: 2010,
      nzliiYear: 2010,
    },
    {
      code: "NZEnvC",
      fullName: "Environment Court of New Zealand",
      aglc4Year: 2010,
      nzliiYear: 2010,
    },
    { code: "NZFC", fullName: "Family Court of New Zealand", aglc4Year: 2012, nzliiYear: 2012 },
  ];

/**
 * Look up the dual-year reference for a NZ court code (case-sensitive).
 * Reference metadata only — does not affect validation.
 */
export function getNZNeutralCitationYears(
  code: string
): NZNeutralCitationYearReference | undefined {
  return NZ_NEUTRAL_CITATION_YEARS.find((entry) => entry.code === code);
}
