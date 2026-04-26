/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.3 — API Key Vault
 *
 * Stores per-adapter API keys in localStorage under a dedicated namespace.
 * Keys are NEVER logged, NEVER written to the document, and NEVER sent
 * anywhere except the adapter that owns them.
 *
 * SECURITY: localStorage is the only safe storage option in the Office
 * Add-in webview. roamingSettings is Outlook-only; document.settings
 * leaks into the .docx file. See devicePreferences.ts for the same
 * rationale.
 */

const KEY_PREFIX = "obiter-device.sourceKey.";

/**
 * Store an API key for a source adapter.
 * The key is persisted in localStorage under `obiter-device.sourceKey.{adapterId}`.
 */
export function saveKey(adapterId: string, key: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + adapterId, key);
  } catch { /* storage full or unavailable — fail silently */ }
}

/**
 * Retrieve the stored API key for a source adapter.
 * Returns an empty string if no key is stored.
 */
export function getKey(adapterId: string): string {
  try {
    return localStorage.getItem(KEY_PREFIX + adapterId) ?? "";
  } catch {
    return "";
  }
}

/**
 * Remove the stored API key for a source adapter.
 */
export function removeKey(adapterId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + adapterId);
  } catch { /* ignore */ }
}

/**
 * Check whether an API key is stored for a source adapter.
 */
export function hasKey(adapterId: string): boolean {
  try {
    const val = localStorage.getItem(KEY_PREFIX + adapterId);
    return val !== null && val.length > 0;
  } catch {
    return false;
  }
}
