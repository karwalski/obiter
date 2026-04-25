/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INFRA-009: Device-level preferences — persist in localStorage.
 *
 * SECURITY: These preferences are stored in the browser's localStorage
 * only. They are NEVER written to the document (Custom XML Part, document
 * settings, or roamingSettings) to prevent sensitive data such as API
 * keys from leaking to other users who open the same document.
 *
 * On Mac, Office Add-in webviews have per-document localStorage, so
 * device preferences (including API keys) must be re-entered when
 * opening a new document for the first time. This is a known platform
 * limitation with no secure workaround — roamingSettings is Outlook-only
 * and document.settings is stored inside the .docx file.
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
