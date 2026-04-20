/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Multi-Standard Architecture — Public API (MULTI-001 / MULTI-002)
 *
 * Exports the standard configuration accessor and the list of available
 * standards for use in the UI and engine.
 */

export type { CitationStandardId, CitationConfig } from "./types";
export { STANDARD_PROFILES, type StandardProfile } from "./profiles";

import type { CitationConfig, CitationStandardId } from "./types";
import { STANDARD_PROFILES } from "./profiles";

/**
 * Metadata for a selectable standard, used by the Settings UI.
 */
export interface AvailableStandard {
  id: CitationStandardId;
  label: string;
  family: "AGLC" | "OSCOLA" | "NZLSG";
  edition: string;
  comingSoon: boolean;
}

/**
 * All standards available in the picker, ordered by family then edition.
 */
export const AVAILABLE_STANDARDS: AvailableStandard[] = [
  { id: "aglc4", label: "AGLC4", family: "AGLC", edition: "4th ed (2018)", comingSoon: false },
  { id: "aglc5", label: "AGLC5", family: "AGLC", edition: "5th ed", comingSoon: true },
  { id: "oscola5", label: "OSCOLA 5", family: "OSCOLA", edition: "5th ed (2026)", comingSoon: false },
  { id: "nzlsg3", label: "NZLSG 3", family: "NZLSG", edition: "3rd ed (2018)", comingSoon: false },
  { id: "nzlsg4", label: "NZLSG 4", family: "NZLSG", edition: "4th ed", comingSoon: true },
];

/**
 * Retrieve the CitationConfig for a given standard ID.
 * Defaults to AGLC4 if the ID is unrecognised.
 */
export function getStandardConfig(id: CitationStandardId): CitationConfig {
  const profile = STANDARD_PROFILES[id];
  if (!profile) {
    return STANDARD_PROFILES.aglc4.config;
  }
  return profile.config;
}
