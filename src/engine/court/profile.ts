/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Court profile freezing (COURT-106)
 *
 * A court-mode document stores the FULL resolved toggle set it renders with
 * (in `courtToggles`) plus a `CourtProfileRecord` saying which preset and
 * preset version it came from and which values the user changed. The engine
 * reads only the document, never the live preset, so a later preset
 * correction cannot change an existing document's output. The user is
 * offered a per-document "Update court profile" prompt that lists what
 * would change, and nothing changes without consent (DECISION-043 item 4).
 *
 * Pure functions: no DOM, no Office.js, no storage.
 */

import type { CourtProfileRecord } from "../../types/citation";
import type { CitationConfig } from "../standards/types";
import { getCourtPreset, isCourtJurisdiction } from "./presets";
import { getPresetVersion, type CourtToggleKey } from "./provenance";

export type { CourtToggleKey };

/** Toggle keys in Settings display order. */
export const COURT_TOGGLE_KEYS: readonly CourtToggleKey[] = [
  "parallelCitations",
  "parallelOrder",
  "reportedCaseMnc",
  "pinpointStyle",
  "pinpointConnector",
  "reportStartingPage",
  "authorisedReportHierarchy",
  "unreportedGate",
  "ibidSuppression",
  "crossReferenceSuppression",
  "subsequentForm",
  "loaType",
];

/** Labels used in the update prompt and docs (match the Settings controls). */
export const COURT_TOGGLE_LABELS: Record<CourtToggleKey, string> = {
  parallelCitations: "Parallel citations",
  parallelOrder: "Parallel citation order",
  reportedCaseMnc: "MNC of a reported case",
  pinpointStyle: "Pinpoint style",
  pinpointConnector: "Pinpoint connector",
  reportStartingPage: "Report starting page with a paragraph pinpoint",
  authorisedReportHierarchy: "Authorised-report hierarchy",
  unreportedGate: "Unreported-judgment gate",
  ibidSuppression: "Ibid suppression",
  crossReferenceSuppression: "(n X) cross-reference suppression",
  subsequentForm: "Subsequent references to cases",
  loaType: "List of Authorities",
};

/** Plain-language names for toggle values (update prompt and docs). */
const VALUE_LABELS: Record<string, string> = {
  off: "Off",
  on: "On",
  preferred: "Preferred",
  mandatory: "Mandatory",
  warn: "Warn",
  "report-first": "Authorised report first",
  "mnc-first": "Medium neutral citation first",
  include: "Given with the report",
  omit: "Omitted (the report replaces it)",
  "page-only": "Page only",
  "para-only": "Paragraph only",
  "para-and-page": "Paragraph and page",
  aglc: "AGLC punctuation",
  at: "“at” before the pinpoint",
  always: "Always shown (AGLC4 r 2.2.5)",
  legacy: "Left out (earlier Obiter form)",
  simple: "Simple",
  "part-ab": "Part A / Part B",
  "part-abc": "Part A / B / C",
  "two-part-read": "Two parts (read / not read)",
  "three-part-tas": "Three parts (Tas)",
  "hca-jba-five-part": "Joint Book Parts A to E (HCA)",
  "nswca-four-category": "Four categories (NSW Court of Appeal)",
  "fca-ebook-sections": "eBook sections (Federal Court)",
  "wa-outline-asterisk": "Cases read marked with an asterisk (WA)",
  "short-title": "Short title and pinpoint",
  "case-name": "Case name and pinpoint",
  "short-title-report": "Short title, report and pinpoint",
};

/** Display a toggle value; the hierarchy is shown as "A → B → C". */
export function formatToggleValue(key: CourtToggleKey, value: string | undefined): string {
  if (value === undefined) return "Not set";
  if (key === "authorisedReportHierarchy") {
    const series = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return series.length > 0 ? series.join(" → ") : "None";
  }
  return VALUE_LABELS[value] ?? value;
}

/** Marker for a profile frozen from a pre-v3 document. */
export const LEGACY_PRESET_VERSION = "legacy";

// ─── Preset toggle set ──────────────────────────────────────────────────────

/**
 * COURT-106: the full toggle set a preset defines, with the engine defaults
 * written out explicitly (report-first, AGLC connector) and the report
 * hierarchy joined with commas. This is what a new document freezes when
 * its court is selected. Undefined for an unknown id.
 */
export function getPresetToggles(
  jurisdictionId: string
): Record<CourtToggleKey, string> | undefined {
  const preset = getCourtPreset(jurisdictionId);
  if (!preset) return undefined;
  return {
    parallelCitations: preset.parallelCitations,
    parallelOrder: preset.parallelOrder ?? "report-first",
    reportedCaseMnc: preset.reportedCaseMnc ?? "include",
    pinpointStyle: preset.pinpointStyle,
    pinpointConnector: preset.pinpointConnector ?? "aglc",
    // COURT-110 follow-up: every new document keeps the starting page.
    reportStartingPage: "always",
    authorisedReportHierarchy: preset.authorisedReportHierarchy.join(","),
    unreportedGate: preset.unreportedGate,
    ibidSuppression: preset.ibidSuppression,
    crossReferenceSuppression: preset.crossReferenceSuppression ?? "on",
    subsequentForm: preset.subsequentForm ?? "short-title",
    loaType: preset.loaType,
  };
}

/** COURT-106: a fresh profile for a court the user has just selected. */
export function createCourtProfile(
  jurisdictionId: string,
  now: Date = new Date()
): CourtProfileRecord {
  return {
    presetId: jurisdictionId,
    presetVersion: getPresetVersion(jurisdictionId) ?? LEGACY_PRESET_VERSION,
    origin: "selected",
    frozenAt: now.toISOString(),
    overridden: [],
  };
}

// ─── Freezing what a document renders with today ────────────────────────────

/**
 * COURT-106: the toggle set a pre-v3 court document currently renders with,
 * written out in full so freezing it changes nothing.
 *
 * Mirrors `buildDocumentConfig` exactly: a stored value wins; a missing core
 * toggle falls back to the standard's base config (NOT the preset — that is
 * how such a document renders today); a missing hierarchy comes from the
 * preset; a missing order is report-first, a missing connector is the
 * AGLC form and a missing MNC toggle gives the MNC (COURT-111); a missing
 * `(n X)` toggle drops `(n X)` (COURT-107) and a missing subsequent form is
 * the short title (COURT-113). A missing starting-page toggle is "legacy":
 * a document saved before COURT-110 left the starting page out of a
 * para-only report pinpoint, and keeps doing so until the user accepts the
 * update (owner follow-up to DECISION-043 item 4, 7 Oct 2026). Stored keys are kept as they are, including
 * keys this build does not know (opaque bag rule).
 *
 * @param base - the standard's own config (`getStandardConfig(standardId)`).
 * @param stored - the toggles the document (or the legacy device pref) holds.
 */
export function freezeEffectiveToggles(
  base: CitationConfig,
  jurisdictionId: string,
  stored: Record<string, string> | undefined
): Record<string, string> {
  const t = stored ?? {};
  const preset = getCourtPreset(jurisdictionId);
  return {
    ...t,
    parallelCitations: t.parallelCitations ?? base.parallelCitationMode,
    parallelOrder: t.parallelOrder ?? base.parallelOrder ?? "report-first",
    // COURT-111: every document before the toggle existed gave the MNC.
    reportedCaseMnc: t.reportedCaseMnc ?? "include",
    pinpointStyle: t.pinpointStyle ?? base.pinpointStyle,
    pinpointConnector: t.pinpointConnector ?? "aglc",
    reportStartingPage: t.reportStartingPage ?? "legacy",
    authorisedReportHierarchy:
      t.authorisedReportHierarchy ?? (preset ? preset.authorisedReportHierarchy.join(",") : ""),
    unreportedGate: t.unreportedGate ?? base.unreportedGateMode,
    ibidSuppression: t.ibidSuppression ?? base.ibidSuppressionMode,
    // COURT-107 / COURT-113: every document before the toggles existed
    // dropped (n X) and used the short-title form.
    crossReferenceSuppression: t.crossReferenceSuppression ?? "on",
    subsequentForm: t.subsequentForm ?? "short-title",
    loaType: t.loaType ?? base.loaType,
  };
}

/**
 * COURT-106: the profile recorded for a document frozen by the v2 to v3
 * migration. The preset version is unknown ("legacy") and so is which values
 * the user changed.
 */
export function createMigratedProfile(
  jurisdictionId: string,
  now: Date = new Date()
): CourtProfileRecord {
  return {
    presetId: jurisdictionId,
    presetVersion: LEGACY_PRESET_VERSION,
    origin: "migrated",
    frozenAt: now.toISOString(),
    overridden: [],
    overridesKnown: false,
  };
}

// ─── Overrides ──────────────────────────────────────────────────────────────

/**
 * COURT-106: record a user change to one toggle. When the profile was frozen
 * from the current preset version, a value equal to the preset's is
 * "inherited" again; otherwise the key is marked overridden.
 */
export function recordOverride(
  profile: CourtProfileRecord,
  key: string,
  value: string
): CourtProfileRecord {
  const current = new Set(profile.overridden);
  const presetToggles = getPresetToggles(profile.presetId) as Record<string, string> | undefined;
  const atCurrentVersion = profile.presetVersion === getPresetVersion(profile.presetId);
  if (atCurrentVersion && presetToggles && presetToggles[key] === value) {
    current.delete(key);
  } else {
    current.add(key);
  }
  return { ...profile, overridden: Array.from(current) };
}

/** True when the value of `key` is the user's own choice for this document. */
export function isOverridden(profile: CourtProfileRecord | undefined, key: string): boolean {
  return !!profile && profile.overridden.includes(key);
}

// ─── Update prompt ──────────────────────────────────────────────────────────

/** One row of the "Update court profile" comparison. */
export interface CourtProfileChange {
  key: CourtToggleKey;
  label: string;
  current: string | undefined;
  proposed: string;
  /** The user changed this value for the document; unticked by default. */
  overridden: boolean;
  /** A plain-language note on what the change does to citations, if any. */
  detail?: string;
}

/**
 * COURT-110 follow-up: the note the update prompt shows beside the
 * starting-page row.
 */
export const REPORT_STARTING_PAGE_DETAIL =
  "Report citations with a paragraph pinpoint will show the report's starting page, as AGLC4 rule 2.2.5 requires: for example 238 CLR 1 [45] instead of 238 CLR [45].";

/**
 * COURT-110 follow-up: the starting-page toggle changes output only under
 * the "para-only" pinpoint style. It counts as a difference only when the
 * document uses that style now or would after the update, so a document
 * with another style is not prompted for a change it cannot see.
 */
function startingPageMatters(
  toggles: Record<string, string>,
  preset: Record<CourtToggleKey, string>
): boolean {
  return toggles.pinpointStyle === "para-only" || preset.pinpointStyle === "para-only";
}

/**
 * The engine default a toggle takes when the document does not store it
 * (see `buildCourtConfig`). A document frozen before a toggle existed
 * renders with this value, so it is not a difference from a preset that
 * sets the same value.
 */
const ABSENT_TOGGLE_DEFAULTS: Partial<Record<CourtToggleKey, string>> = {
  parallelOrder: "report-first",
  pinpointConnector: "aglc",
  // COURT-110 follow-up: a document frozen after the fix (or new) keeps the
  // starting page; only a migrated document stores "legacy".
  reportStartingPage: "always",
  reportedCaseMnc: "include",
  crossReferenceSuppression: "on",
  subsequentForm: "short-title",
};

/**
 * COURT-106: every toggle whose frozen value differs from the current
 * preset. Empty when the document already matches, or for an unknown court.
 * A toggle the document does not store counts as its engine default.
 */
export function diffCourtProfile(
  toggles: Record<string, string> | undefined,
  profile: CourtProfileRecord | undefined,
  jurisdictionId: string
): CourtProfileChange[] {
  if (!isCourtJurisdiction(jurisdictionId)) return [];
  const preset = getPresetToggles(jurisdictionId);
  if (!preset) return [];
  const t = toggles ?? {};
  const changes: CourtProfileChange[] = [];
  for (const key of COURT_TOGGLE_KEYS) {
    if (key === "reportStartingPage" && !startingPageMatters(t, preset)) continue;
    const effective = t[key] ?? ABSENT_TOGGLE_DEFAULTS[key];
    if (effective !== preset[key]) {
      changes.push({
        key,
        label: COURT_TOGGLE_LABELS[key],
        current: t[key],
        proposed: preset[key],
        overridden: isOverridden(profile, key),
        ...(key === "reportStartingPage" ? { detail: REPORT_STARTING_PAGE_DETAIL } : {}),
      });
    }
  }
  return changes;
}

/**
 * COURT-106: whether Settings should show the "Update court profile" prompt.
 *
 * Shown when a value the user did not choose differs from the current
 * preset (for a migrated profile any difference counts, since Obiter cannot
 * tell the user's changes apart), unless the user already declined this
 * preset version. A document with no frozen profile (a partial store) is
 * never prompted.
 */
export function isProfileUpdateAvailable(
  toggles: Record<string, string> | undefined,
  profile: CourtProfileRecord | undefined,
  jurisdictionId: string
): boolean {
  if (!profile) return false;
  const currentVersion = getPresetVersion(jurisdictionId);
  if (currentVersion && profile.declinedVersion === currentVersion) return false;
  return diffCourtProfile(toggles, profile, jurisdictionId).some((c) => !c.overridden);
}

/**
 * COURT-106: apply the accepted rows of the update prompt.
 *
 * Accepted keys take the current preset value; every other key keeps its
 * frozen value. The profile moves to the current preset version, and any
 * key still differing from the preset is recorded as overridden (it is now
 * the user's choice).
 */
export function applyProfileUpdate(
  toggles: Record<string, string> | undefined,
  profile: CourtProfileRecord | undefined,
  jurisdictionId: string,
  acceptedKeys: readonly string[],
  now: Date = new Date()
): { toggles: Record<string, string>; profile: CourtProfileRecord } {
  const preset = getPresetToggles(jurisdictionId) as Record<string, string> | undefined;
  const next: Record<string, string> = { ...(toggles ?? {}) };
  if (preset) {
    for (const key of acceptedKeys) {
      if (key in preset) next[key] = preset[key];
    }
    // COURT-110 follow-up: where the starting-page toggle cannot change
    // output (no para-only style after the update), it takes the preset
    // value with the rest, so it is not left behind as a hidden override.
    if (next.pinpointStyle !== "para-only" && next.reportStartingPage !== undefined) {
      next.reportStartingPage = preset.reportStartingPage;
    }
  }
  const overridden = preset
    ? COURT_TOGGLE_KEYS.filter((k) => (next[k] ?? ABSENT_TOGGLE_DEFAULTS[k]) !== preset[k])
    : [];
  // Keep unknown keys a later build wrote; drop only the fields this step owns.
  const rest: Record<string, unknown> = { ...(profile ?? {}) };
  delete rest.declinedVersion;
  delete rest.overridesKnown;
  return {
    toggles: next,
    profile: {
      ...rest,
      presetId: jurisdictionId,
      presetVersion: getPresetVersion(jurisdictionId) ?? LEGACY_PRESET_VERSION,
      origin: "updated",
      frozenAt: now.toISOString(),
      overridden,
    },
  };
}

/** COURT-106: the user kept the current values; hide the prompt for this preset version. */
export function declineProfileUpdate(
  profile: CourtProfileRecord,
  jurisdictionId: string
): CourtProfileRecord {
  const version = getPresetVersion(jurisdictionId);
  return version ? { ...profile, declinedVersion: version } : profile;
}

// ─── COURT-107: court mode with and without a court ─────────────────────────

/**
 * COURT-107: the explicit court-mode state of a document.
 *
 * - "academic": writing mode is academic; no court behaviour applies.
 * - "no-court": writing mode is court but no court is selected. The
 *   document renders with the standard's base config in court mode (no
 *   court toggles): ibid is kept, short references drop `(n X)`, a
 *   reported case's recorded MNC is added, and no List of Authorities is
 *   generated. Settings asks the user to select a court.
 * - "court": a recognised court is selected and its frozen toggles apply.
 */
export type CourtModeState = "academic" | "no-court" | "court";

export function getCourtModeState(
  writingMode: string | undefined,
  jurisdictionId: string | undefined
): CourtModeState {
  if (writingMode !== "court") return "academic";
  return jurisdictionId && isCourtJurisdiction(jurisdictionId) ? "court" : "no-court";
}

/** COURT-107: the prompt Settings shows in the no-court state. */
export const SELECT_COURT_PROMPT = "Select a court to apply court rules.";

/**
 * COURT-107: the Settings help text for court mode, built from the config
 * the document actually renders with, so the text cannot drift from the
 * behaviour (register O-K5: court mode with no court kept ibid while the
 * help text said "no ibid").
 *
 * @param config - `buildDocumentConfig` for the document in court mode.
 * @param state - from `getCourtModeState`.
 */
export function describeCourtMode(config: CitationConfig, state: CourtModeState): string {
  const parts: string[] = [];
  parts.push(config.ibidSuppressionMode === "on" ? "no ibid" : "ibid");
  if (config.subsequentForm === "case-name") {
    parts.push("later references to cases by case name");
  } else if (config.subsequentForm === "short-title-report") {
    parts.push("later references to cases repeat the short title and report");
  } else {
    parts.push("short case names");
  }
  parts[parts.length - 1] +=
    config.crossReferenceSuppression === "off" ? " with (n X)" : " without (n X)";
  parts.push(
    config.reportedCaseMnc === "omit"
      ? "the report replaces the MNC"
      : "the MNC added to a reported case where one is recorded"
  );
  parts.push(
    config.loaType === "off"
      ? "no List of Authorities"
      : "List of Authorities instead of bibliography"
  );
  const list = parts.join(", ");
  return state === "no-court"
    ? `${SELECT_COURT_PROMPT} Until then, court mode gives: ${list}.`
    : `Court mode: ${list}.`;
}
