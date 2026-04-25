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
  parallelCitationMode: "off",
  ibidSuppressionMode: "off",
  unreportedGateMode: "off",
  loaType: "off",
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
  parallelCitationMode: "off",
  ibidSuppressionMode: "off",
  unreportedGateMode: "off",
  loaType: "off",
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
  parallelCitationMode: "off",
  ibidSuppressionMode: "off",
  unreportedGateMode: "off",
  loaType: "off",
};

// ─── OSCOLA 4 (OSC-ENH-007: delta audit from OSCOLA 5) ─────────────────────
//
// OSCOLA 4th edition (2012) vs OSCOLA 5th edition (2024) delta analysis:
//
// 1. ibid: OSCOLA 4 uses ibid for immediately repeated references.
//    OSCOLA 5 deprecates ibid in favour of short-form "(n X)" throughout.
//    => ibidEnabled: true for OSCOLA 4, false for OSCOLA 5.
//
// 2. GenAI citations (Rule 3.7.13): Introduced in OSCOLA 5. Not present
//    in OSCOLA 4. The OSCOLA dispatch in engine.ts routes all "oscola*"
//    standards through the same OSCOLA_DISPATCH map. GenAI citations are
//    a data-entry concern (the source type simply would not be offered in
//    the UI for OSCOLA 4), so no engine change is needed — the formatter
//    is harmless if somehow invoked, and the UI should gate availability.
//
// 3. Assimilated EU law (post-Brexit): OSCOLA 5 added formatAssimilatedEuLaw
//    for retained/assimilated EU legislation. OSCOLA 4 predates Brexit; EU
//    law was cited directly. Again, this is a UI/source-type gating concern
//    rather than a formatter difference — the underlying format is valid.
//
// 4. EU law citing post-Brexit: OSCOLA 5 updated guidance for citing EU
//    law after the UK left the EU. The formatters handle both pre- and
//    post-Brexit citations structurally, so no config divergence is needed.
//
// 5. Digital/online sources: OSCOLA 5 updated guidance on citing digital
//    sources and URLs. The structural formatting is compatible; the main
//    change is editorial guidance rather than citation format differences.
//
// 6. Shared conventions (no change between editions):
//    - Single quotation marks for titles
//    - Roman (non-italic) legislation
//    - "edn" for edition abbreviation
//    - Footnote-based citation style
//    - Table of Cases / Table of Legislation structure
//
// Conclusion: The OSCOLA 5 formatters are backward-compatible with OSCOLA 4.
// The only config-level difference is ibidEnabled: true. GenAI and assimilated
// EU law source types should be hidden in the UI for OSCOLA 4 but do not
// require engine-level gating. OSCOLA 4 is enabled with comingSoon: false.
// ────────────────────────────────────────────────────────────────────────────

const OSCOLA4_CONFIG: CitationConfig = {
  standardId: "oscola4",
  standardLabel: "OSCOLA 4",
  italiciseLegislation: false,
  quotationMarkStyle: "single",
  pinpointPrefix: "",
  subsequentReferenceFormat: "n",
  ibidEnabled: true,
  editionAbbreviation: "edn",
  homeJurisdiction: "UK",
  bibliographyStructure: "oscola",
  writingMode: "academic",
  pinpointStyle: "page-only",
  parallelCitationMode: "off",
  ibidSuppressionMode: "off",
  unreportedGateMode: "off",
  loaType: "off",
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
  parallelCitationMode: "off",
  ibidSuppressionMode: "off",
  unreportedGateMode: "off",
  loaType: "off",
};

// ─── NZLSG 4 (placeholder) ──────────────────────────────────────────────────
//
// NZLSG-ENH-006 delta audit status (April 2026):
//   - NZLSG 4th edition has NOT been published as of April 2026.
//   - This placeholder config is an exact copy of NZLSG 3.
//   - When NZLSG 4 is published, perform a delta analysis following the same
//     process used for the AGLC4 → AGLC5 audit (compare every config field
//     and each formatter module against the new edition's rules).
//   - Keep comingSoon: true until publication and delta work is complete.
//

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
  parallelCitationMode: "off",
  ibidSuppressionMode: "off",
  unreportedGateMode: "off",
  loaType: "off",
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const STANDARD_PROFILES: Record<CitationStandardId, StandardProfile> = {
  aglc4: { config: AGLC4_CONFIG, comingSoon: false },
  aglc5: { config: AGLC5_CONFIG, comingSoon: true },
  oscola4: { config: OSCOLA4_CONFIG, comingSoon: false },
  oscola5: { config: OSCOLA5_CONFIG, comingSoon: false },
  nzlsg3: { config: NZLSG3_CONFIG, comingSoon: false },
  nzlsg4: { config: NZLSG4_CONFIG, comingSoon: true },
};
