/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Home Jurisdiction Suppression (MULTI-013)
 *
 * Determines whether a jurisdiction identifier should be displayed in a
 * citation based on the active standard's home jurisdiction setting.
 *
 * - AGLC4: homeJurisdiction is null — always show jurisdiction (no suppression).
 * - OSCOLA: homeJurisdiction is "UK" — suppress UK, show foreign jurisdictions.
 * - NZLSG: homeJurisdiction is "NZ" — suppress NZ, show foreign jurisdictions.
 *
 * @see AGLC4, Rule 3.1.1.
 * @see OSCOLA, Rule 2.2.
 * @see NZLSG, Rule 4.1.
 */

/**
 * Determines whether a jurisdiction identifier should be shown in a citation.
 *
 * When homeJurisdiction is null, the jurisdiction is always shown (AGLC4
 * behaviour — Commonwealth jurisdiction is never assumed).
 *
 * When homeJurisdiction is set, the jurisdiction is suppressed if it matches
 * the home jurisdiction (case-insensitive comparison). Foreign jurisdictions
 * are always shown.
 *
 * @param jurisdiction - The jurisdiction of the cited source (e.g. "UK", "NZ", "Cth").
 * @param homeJurisdiction - The home jurisdiction for the active standard, or null.
 * @returns true if the jurisdiction should be displayed, false if suppressed.
 *
 * @example
 * // AGLC4: always show
 * shouldShowJurisdiction("Cth", null) // true
 * shouldShowJurisdiction("UK", null)  // true
 *
 * @example
 * // OSCOLA: suppress UK
 * shouldShowJurisdiction("UK", "UK")     // false
 * shouldShowJurisdiction("France", "UK") // true
 *
 * @example
 * // NZLSG: suppress NZ
 * shouldShowJurisdiction("NZ", "NZ")     // false
 * shouldShowJurisdiction("UK", "NZ")     // true
 */
export function shouldShowJurisdiction(
  jurisdiction: string,
  homeJurisdiction: string | null,
): boolean {
  // When no home jurisdiction is set, always show (AGLC4 behaviour)
  if (homeJurisdiction === null) {
    return true;
  }

  // Suppress if jurisdiction matches home jurisdiction (case-insensitive)
  return jurisdiction.toLowerCase() !== homeJurisdiction.toLowerCase();
}
