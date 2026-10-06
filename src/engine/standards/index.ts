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

export type {
  CitationStandardId,
  CitationConfig,
  WritingMode,
  ParallelCitationMode,
  IbidSuppressionMode,
  CrossReferenceSuppressionMode,
  SubsequentForm,
  UnreportedGateMode,
  LoaType,
  ParallelOrder,
} from "./types";
export { STANDARD_PROFILES, type StandardProfile } from "./profiles";

import type { CitationConfig, CitationStandardId, WritingMode } from "./types";
import { STANDARD_PROFILES } from "./profiles";
import { getCourtPreset } from "../court/presets";

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
  {
    id: "oscola5",
    label: "OSCOLA 5",
    family: "OSCOLA",
    edition: "5th ed (2026)",
    comingSoon: false,
  },
  {
    id: "oscola4",
    label: "OSCOLA 4",
    family: "OSCOLA",
    edition: "4th ed (2012)",
    comingSoon: false,
  },
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

/** COURT-FIX-001 / STD-013: the court toggle record Settings writes into the document. */
export interface CourtToggleRecord {
  parallelCitations?: string;
  pinpointStyle?: string;
  unreportedGate?: string;
  ibidSuppression?: string;
  loaType?: string;
  parallelOrder?: string;
  /** COURT-112: "aglc" (default) or "at". */
  pinpointConnector?: string;
  /**
   * COURT-110 follow-up: "always" (default, AGLC4 r 2.2.5) or "legacy" (the
   * pre-COURT-110 para-only form without the starting page).
   */
  reportStartingPage?: string;
  /** COURT-111: "include" (default) or "omit" (the report replaces the MNC). */
  reportedCaseMnc?: string;
  /** COURT-107: "on" (default, no (n X)) or "off" (AGLC4 r 1.4.1 (n X)). */
  crossReferenceSuppression?: string;
  /** COURT-113: "short-title" (default), "case-name" or "short-title-report". */
  subsequentForm?: string;
  /** Comma-separated report series, most preferred first (e.g. "NSWLR,CLR,ALR"). */
  authorisedReportHierarchy?: string;
}

/** STD-013: court mode is an AGLC feature; no other standard has court presets. */
function supportsCourtMode(standardId: CitationStandardId): boolean {
  return standardId.startsWith("aglc");
}

/** Parse the comma-separated hierarchy toggle; undefined when absent or blank. */
function parseHierarchy(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const series = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return series.length > 0 ? series : undefined;
}

/**
 * COURT-FIX-001: Build a CitationConfig with court toggle overrides applied.
 *
 * Reads the court toggles (typically from the document store) and merges
 * them into the base standard config. If writingMode is "academic", returns
 * the base config unchanged.
 *
 * STD-013 invariant: court mode exists only for the AGLC standards. A base
 * config carrying writing mode "court" under any other standard comes back
 * as its academic config with `courtModeIgnored` set, whatever the toggles.
 */
export function buildCourtConfig(
  baseConfig: CitationConfig,
  courtToggles?: CourtToggleRecord
): CitationConfig {
  if (baseConfig.writingMode !== "court") {
    return baseConfig;
  }
  if (!supportsCourtMode(baseConfig.standardId)) {
    return { ...baseConfig, writingMode: "academic", courtModeIgnored: true };
  }
  if (!courtToggles) {
    return baseConfig;
  }
  const hierarchy = parseHierarchy(courtToggles.authorisedReportHierarchy);
  return {
    ...baseConfig,
    pinpointStyle:
      (courtToggles.pinpointStyle as CitationConfig["pinpointStyle"]) ?? baseConfig.pinpointStyle,
    parallelCitationMode:
      (courtToggles.parallelCitations as CitationConfig["parallelCitationMode"]) ??
      baseConfig.parallelCitationMode,
    ibidSuppressionMode:
      (courtToggles.ibidSuppression as CitationConfig["ibidSuppressionMode"]) ??
      baseConfig.ibidSuppressionMode,
    unreportedGateMode:
      (courtToggles.unreportedGate as CitationConfig["unreportedGateMode"]) ??
      baseConfig.unreportedGateMode,
    loaType: (courtToggles.loaType as CitationConfig["loaType"]) ?? baseConfig.loaType,
    parallelOrder:
      (courtToggles.parallelOrder as CitationConfig["parallelOrder"]) ?? baseConfig.parallelOrder,
    // COURT-112: only an explicit "at" is carried; an absent toggle (every
    // court document saved before COURT-112) keeps the AGLC connector.
    ...(courtToggles.pinpointConnector === "at" ? { pinpointConnector: "at" as const } : {}),
    // COURT-110 follow-up: only an explicit "legacy" is carried; an absent
    // toggle (a document frozen after the fix, or a new one) keeps the
    // AGLC4 r 2.2.5 starting page.
    ...(courtToggles.reportStartingPage === "legacy"
      ? { reportStartingPage: "legacy" as const }
      : {}),
    // COURT-111: likewise only an explicit "omit" is carried; an absent
    // toggle (every court document saved before COURT-111) keeps the MNC.
    ...(courtToggles.reportedCaseMnc === "omit" ? { reportedCaseMnc: "omit" as const } : {}),
    // COURT-107: only an explicit "off" is carried; an absent toggle (every
    // court document saved before COURT-107) keeps dropping (n X).
    ...(courtToggles.crossReferenceSuppression === "off"
      ? { crossReferenceSuppression: "off" as const }
      : {}),
    // COURT-113: only a non-default form is carried; an absent toggle keeps
    // the short-title form.
    ...(courtToggles.subsequentForm === "case-name" ||
    courtToggles.subsequentForm === "short-title-report"
      ? { subsequentForm: courtToggles.subsequentForm }
      : {}),
    ...(hierarchy ? { authorisedReportHierarchy: hierarchy } : {}),
  };
}

/**
 * STD-013: The document's standard settings, as the store holds them.
 */
export interface DocumentStandardState {
  standardId: CitationStandardId;
  writingMode: WritingMode;
  /** The court jurisdiction id (COURT-002); supplies the report hierarchy when the toggles omit it. */
  courtJurisdiction?: string;
  /** The court toggle record (document metadata, or the legacy device fallback). */
  courtToggles?: Record<string, string>;
  /** STD-022: the NZLSG subsequent-reference style (document metadata); absent reads as general. */
  nzlsgStyle?: "general" | "commercial";
  /** A5-EXP-9: the document's generative AI wording; applies under AGLC standards only. */
  genaiWording?: "output" | "correspondence";
}

/**
 * STD-013: The one way a CitationConfig is built for a document.
 *
 * `buildCourtConfig({ ...getStandardConfig(standardId), writingMode }, courtToggles)`,
 * with the jurisdiction preset's `authorisedReportHierarchy` mapped in when
 * the toggles carry none. In academic mode the result is the standard's own
 * profile config, byte for byte. Under a non-AGLC standard, writing mode
 * "court" is ignored (academic config, `courtModeIgnored: true`). Under an
 * NZLSG standard the document's `nzlsgStyle` is mapped in (STD-022).
 */
export function buildDocumentConfig(state: DocumentStandardState): CitationConfig {
  const { standardId, writingMode, courtJurisdiction, courtToggles, nzlsgStyle, genaiWording } =
    state;
  const base: CitationConfig = {
    ...getStandardConfig(standardId),
    writingMode,
    // STD-022: the style is an NZLSG setting; under any other standard the
    // profile config stays byte for byte.
    ...(nzlsgStyle && standardId.startsWith("nzlsg") ? { nzlsgStyle } : {}),
    // A5-EXP-9: only an explicit "correspondence" is carried, and only under
    // AGLC, so every other config stays byte for byte.
    ...(genaiWording === "correspondence" && standardId.startsWith("aglc") ? { genaiWording } : {}),
  };
  if (writingMode !== "court") {
    return base;
  }
  let toggles: CourtToggleRecord | undefined = courtToggles;
  // COURT-106: a document with a frozen court profile always carries the
  // hierarchy in its toggles, so the live preset is read only for a record
  // built outside the store (tests, a partial store) that lacks it.
  if (courtJurisdiction && toggles?.authorisedReportHierarchy === undefined) {
    const preset = getCourtPreset(courtJurisdiction);
    if (preset && preset.authorisedReportHierarchy.length > 0) {
      toggles = {
        ...(toggles ?? {}),
        authorisedReportHierarchy: preset.authorisedReportHierarchy.join(","),
      };
    }
  }
  return buildCourtConfig(base, toggles);
}

/**
 * STD-013: The store members the resolver reads. `CitationStore` satisfies
 * it; the optional members default the way the store does (academic, no
 * jurisdiction, no toggles) so a partial store still resolves.
 */
export interface DocumentStandardSource {
  getStandardId(): CitationStandardId;
  getWritingMode?(): WritingMode;
  getCourtJurisdiction?(): string | undefined;
  getCourtToggles?(): Record<string, string> | undefined;
  /** STD-022: absent on a partial store; the config then carries no style (general). */
  getNzlsgStyle?(): "general" | "commercial" | undefined;
  /** A5-EXP-9: absent on a partial store; the config then reads "output". */
  getGenaiWording?(): "output" | "correspondence" | undefined;
}

/**
 * STD-013: Resolve the document's CitationConfig from the store the way the
 * refresher does: standard and writing mode from the document, court toggles
 * from the document with `fallbackToggles` (the caller's device preference,
 * kept for legacy documents customised before the toggles moved into the
 * document) used only when the document has none.
 *
 * Logs a diagnostic when a non-AGLC document carries writing mode "court"
 * (Settings prevents it; a store written by another client may not).
 */
export function resolveDocumentConfig(
  store: DocumentStandardSource,
  fallbackToggles?: Record<string, string>
): CitationConfig {
  const config = buildDocumentConfig({
    standardId: store.getStandardId(),
    writingMode: store.getWritingMode?.() ?? "academic",
    courtJurisdiction: store.getCourtJurisdiction?.(),
    courtToggles: store.getCourtToggles?.() ?? fallbackToggles,
    nzlsgStyle: store.getNzlsgStyle?.(),
    genaiWording: store.getGenaiWording?.(),
  });
  if (config.courtModeIgnored) {
    console.warn(
      `Obiter: document standard "${config.standardId}" has no court mode; writing mode "court" ignored.`
    );
  }
  return config;
}
