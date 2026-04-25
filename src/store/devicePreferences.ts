/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INFRA-009: Device-level preferences — persist across all documents.
 *
 * Uses Office.context.roamingSettings as the primary store (persists across
 * documents and devices for the same Microsoft account). Falls back to
 * localStorage when roamingSettings is unavailable (e.g. during tests).
 *
 * These are user preferences that should follow the user (not the document),
 * such as LLM configuration, default citation standard for new documents,
 * migration notice dismissal, and court toggle overrides.
 */

const PREFIX = "obiter-device.";

/** Check if Office roaming settings are available. */
function hasRoaming(): boolean {
  try {
    return typeof Office !== "undefined" && Office.context?.roamingSettings != null;
  } catch { return false; }
}

/** Read a device-level preference. */
export function getDevicePref(key: string): unknown {
  const fullKey = PREFIX + key;

  // Try roaming settings first
  if (hasRoaming()) {
    try {
      const val = Office.context.roamingSettings.get(fullKey);
      if (val !== undefined && val !== null) return val;
    } catch { /* fall through */ }
  }

  // Fallback to localStorage (also used for one-time migration)
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      // Migrate: copy to roaming if available
      if (hasRoaming()) {
        try {
          Office.context.roamingSettings.set(fullKey, parsed);
          Office.context.roamingSettings.saveAsync();
        } catch { /* ignore */ }
      }
      return parsed;
    }
  } catch { /* ignore */ }

  return undefined;
}

/** Write a device-level preference. */
export function setDevicePref(key: string, value: unknown): void {
  const fullKey = PREFIX + key;

  // Write to roaming settings (primary)
  if (hasRoaming()) {
    try {
      if (value === undefined) {
        Office.context.roamingSettings.remove(fullKey);
      } else {
        Office.context.roamingSettings.set(fullKey, value);
      }
      Office.context.roamingSettings.saveAsync();
    } catch { /* ignore */ }
  }

  // Also write to localStorage (fallback / cache)
  try {
    if (value === undefined) {
      localStorage.removeItem(fullKey);
    } else {
      localStorage.setItem(fullKey, JSON.stringify(value));
    }
  } catch { /* ignore */ }
}
