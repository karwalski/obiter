/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.42 — Cloud / Local Mode Toggle
 *
 * Controls whether citation lookups use only local adapters, only the
 * Obiter Cloud service, or a fallback strategy that tries local first
 * and then the cloud. Persisted as a device preference.
 */

import { getDevicePref, setDevicePref } from "../../store/devicePreferences";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CloudMode = "local-only" | "cloud-only" | "local-then-cloud";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREF_KEY = "cloudMode";
const DEFAULT_MODE: CloudMode = "local-then-cloud";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** Read the current cloud mode from device preferences. */
export function getCloudMode(): CloudMode {
  const stored = getDevicePref(PREF_KEY);
  if (
    stored === "local-only" ||
    stored === "cloud-only" ||
    stored === "local-then-cloud"
  ) {
    return stored as CloudMode;
  }
  return DEFAULT_MODE;
}

/** Persist a new cloud mode to device preferences. */
export function setCloudMode(mode: CloudMode): void {
  setDevicePref(PREF_KEY, mode);
}

/** Whether the cloud service should be consulted for lookups. */
export function shouldUseCloud(): boolean {
  const mode = getCloudMode();
  return mode === "cloud-only" || mode === "local-then-cloud";
}

/** Whether local adapters should be consulted for lookups. */
export function shouldUseLocal(): boolean {
  const mode = getCloudMode();
  return mode === "local-only" || mode === "local-then-cloud";
}
