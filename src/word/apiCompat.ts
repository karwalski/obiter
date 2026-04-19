/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Office */

/**
 * Office.js API Compatibility Layer
 *
 * Provides runtime detection of the WordApi version supported by the host and
 * feature-flag checks so that the add-in can gracefully degrade on platforms
 * that do not support newer API sets.
 *
 * Core functionality targets WordApi 1.5 (the minimum supported version) and
 * is never gated behind feature checks. Optional features that require 1.6+
 * are checked at runtime via `isFeatureAvailable()`.
 */

// ─── Feature Flag Definitions ────────────────────────────────────────────────

/** Describes an API feature and the minimum API set version it requires. */
export interface FeatureFlag {
  /** The Office API set name (e.g. "WordApi"). */
  apiSet: string;
  /** The minimum version of the API set required (e.g. "1.7"). */
  version: string;
  /** Human-readable description of the feature. */
  description?: string;
}

/**
 * Known feature flags for optional capabilities above the 1.5 baseline.
 *
 * Core features (WordApi 1.5) are never gated — they are assumed to be
 * available on all supported hosts. Only features requiring 1.6+ are listed.
 */
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // WordApi 1.6
  customStyles: {
    apiSet: "WordApi",
    version: "1.6",
    description: "Document.addStyle() for creating named AGLC4 styles",
  },

  // WordApi 1.7
  annotations: {
    apiSet: "WordApi",
    version: "1.7",
    description: "Annotations API for inline markup",
  },
  checkboxContentControls: {
    apiSet: "WordApi",
    version: "1.7",
    description: "Checkbox content controls",
  },
  critiqueSuggestions: {
    apiSet: "WordApi",
    version: "1.7",
    description: "Critique and suggestion annotations",
  },

  // WordApi 1.8
  comments: {
    apiSet: "WordApi",
    version: "1.8",
    description: "Comments API for document comments",
  },
  trackedChanges: {
    apiSet: "WordApi",
    version: "1.8",
    description: "Tracked changes / revision API",
  },
};

// ─── API Version Detection ───────────────────────────────────────────────────

/** WordApi versions to probe, from newest to oldest. */
const WORDAPI_VERSIONS = [
  "1.8",
  "1.7",
  "1.6",
  "1.5",
  "1.4",
  "1.3",
  "1.2",
  "1.1",
];

/**
 * Returns the highest WordApi version supported by the current host.
 *
 * Probes from newest to oldest using `Office.context.requirements.isSetSupported()`.
 * If no version is detected (which should not happen on a supported host),
 * returns `"unknown"`.
 *
 * @returns A version string such as `"1.5"`, `"1.7"`, etc.
 */
export function getApiVersion(): string {
  for (const version of WORDAPI_VERSIONS) {
    if (Office.context.requirements.isSetSupported("WordApi", version)) {
      return version;
    }
  }
  return "unknown";
}

// ─── Feature Availability Checks ─────────────────────────────────────────────

/**
 * Checks whether a named feature is available in the current host environment.
 *
 * Looks up the feature in `FEATURE_FLAGS` and uses the Office.js requirements
 * API to determine if the host supports the required API set version.
 *
 * @param feature - A key from `FEATURE_FLAGS` (e.g. `"annotations"`,
 *   `"comments"`, `"customStyles"`).
 * @returns `true` if the feature is supported, `false` if not supported or
 *   if the feature name is not recognised.
 *
 * @example
 * ```ts
 * if (isFeatureAvailable("customStyles")) {
 *   // Safe to call document.addStyle()
 * } else {
 *   // Apply formatting manually without named styles
 * }
 * ```
 */
export function isFeatureAvailable(feature: string): boolean {
  const flag = FEATURE_FLAGS[feature];
  if (!flag) {
    return false;
  }
  return Office.context.requirements.isSetSupported(flag.apiSet, flag.version);
}
