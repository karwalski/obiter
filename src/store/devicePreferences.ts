/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INFRA-009: Device-level preferences — persist in localStorage across all documents.
 *
 * These are user preferences that should follow the device (not the document),
 * such as LLM configuration, default citation standard for new documents,
 * migration notice dismissal, and court toggle overrides.
 */

const PREFIX = "obiter-device.";

/** Read a device-level preference from localStorage. */
export function getDevicePref(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* ignore */ }
  return undefined;
}

/** Write a device-level preference to localStorage. */
export function setDevicePref(key: string, value: unknown): void {
  try {
    if (value === undefined) {
      localStorage.removeItem(PREFIX + key);
    } else {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
  } catch { /* ignore */ }
}
