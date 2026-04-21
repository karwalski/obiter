/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Multi-Standard Architecture — Standard Profiles (MULTI-001 / MULTI-002)
 *
 * Configuration objects for each supported citation standard. These profiles
 * parameterise the shared formatting engine. Standards marked "comingSoon"
 * are placeholders copied from their parent edition and not yet selectable.
 */

import type { CitationConfig, CitationStandardId } from "./types";

export interface StandardProfile {
  config: CitationConfig;
  comingSoon: boolean;
}

// ─── AGLC4 ──────────────────────────────────────────────────────────────────

const AGLC4_CONFIG: CitationConfig = {
  standardId: "aglc4",
  standardLabel: "AGLC4",
  italiciseLegislation: true,
  quotationMarkStyle: "single",
  pinpointPrefix: "",
  subsequentReferenceFormat: "n",
  ibidEnabled: true,
  editionAbbreviation: "ed",
  homeJurisdiction: null,
  bibliographyStructure: "aglc",
  writingMode: "academic",
  pinpointStyle: "page-only",
};

// ─── AGLC5 (placeholder) ────────────────────────────────────────────────────

const AGLC5_CONFIG: CitationConfig = {
  standardId: "aglc5",
  standardLabel: "AGLC5",
  italiciseLegislation: true,
  quotationMarkStyle: "single",
  pinpointPrefix: "",
  subsequentReferenceFormat: "n",
  ibidEnabled: true,
  editionAbbreviation: "ed",
  homeJurisdiction: null,
  bibliographyStructure: "aglc",
  writingMode: "academic",
  pinpointStyle: "page-only",
};

// ─── OSCOLA 5 ────────────────────────────────────────────────────────────────

const OSCOLA5_CONFIG: CitationConfig = {
  standardId: "oscola5",
  standardLabel: "OSCOLA 5",
  italiciseLegislation: false,
  quotationMarkStyle: "single",
  pinpointPrefix: "",
  subsequentReferenceFormat: "n",
  ibidEnabled: false,
  editionAbbreviation: "edn",
  homeJurisdiction: "UK",
  bibliographyStructure: "oscola",
  writingMode: "academic",
  pinpointStyle: "page-only",
};

// ─── OSCOLA 4 (placeholder) ─────────────────────────────────────────────────

const OSCOLA4_CONFIG: CitationConfig = {
  standardId: "oscola4",
  standardLabel: "OSCOLA 4",
  italiciseLegislation: false,
  quotationMarkStyle: "single",
  pinpointPrefix: "",
  subsequentReferenceFormat: "n",
  ibidEnabled: false,
  editionAbbreviation: "edn",
  homeJurisdiction: "UK",
  bibliographyStructure: "oscola",
  writingMode: "academic",
  pinpointStyle: "page-only",
};

// ─── NZLSG 3 ─────────────────────────────────────────────────────────────────

const NZLSG3_CONFIG: CitationConfig = {
  standardId: "nzlsg3",
  standardLabel: "NZLSG 3",
  italiciseLegislation: false,
  quotationMarkStyle: "double",
  pinpointPrefix: "at ",
  subsequentReferenceFormat: "above n",
  ibidEnabled: false,
  editionAbbreviation: "ed",
  homeJurisdiction: "NZ",
  bibliographyStructure: "nzlsg",
  writingMode: "academic",
  pinpointStyle: "page-only",
};

// ─── NZLSG 4 (placeholder) ──────────────────────────────────────────────────

const NZLSG4_CONFIG: CitationConfig = {
  standardId: "nzlsg4",
  standardLabel: "NZLSG 4",
  italiciseLegislation: false,
  quotationMarkStyle: "double",
  pinpointPrefix: "at ",
  subsequentReferenceFormat: "above n",
  ibidEnabled: false,
  editionAbbreviation: "ed",
  homeJurisdiction: "NZ",
  bibliographyStructure: "nzlsg",
  writingMode: "academic",
  pinpointStyle: "page-only",
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const STANDARD_PROFILES: Record<CitationStandardId, StandardProfile> = {
  aglc4: { config: AGLC4_CONFIG, comingSoon: false },
  aglc5: { config: AGLC5_CONFIG, comingSoon: true },
  oscola4: { config: OSCOLA4_CONFIG, comingSoon: true },
  oscola5: { config: OSCOLA5_CONFIG, comingSoon: false },
  nzlsg3: { config: NZLSG3_CONFIG, comingSoon: false },
  nzlsg4: { config: NZLSG4_CONFIG, comingSoon: true },
};
