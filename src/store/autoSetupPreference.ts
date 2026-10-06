/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COURT-101: the visible "create AGLC4 styles in new blank documents"
 * setting, which replaces the hidden `obiter-autoSetup` localStorage key.
 *
 * Opening the task pane never modifies an existing style. With this setting
 * on, opening the pane on a new blank academic document may CREATE the
 * AGLC4 named styles that are missing (create-only). It never runs in court
 * mode. Whether the default should stay on for academic documents is open
 * (DECISION-043 item 8); it stays on to match earlier releases.
 */

import { getDevicePref, setDevicePref } from "./devicePreferences";

/** Device-preference key for the visible setting. */
export const AUTO_CREATE_STYLES_PREF = "autoCreateStylesOnNewDocuments";

/** The hidden key earlier releases read ("false" meant opted out). */
export const LEGACY_AUTO_SETUP_KEY = "obiter-autoSetup";

/**
 * Whether new blank documents get the AGLC4 styles created on open.
 * Migrates the legacy hidden key on first read: an explicit "false" opt-out
 * carries over; the legacy key is then removed.
 */
export function getAutoCreateStylesPref(): boolean {
  const saved = getDevicePref(AUTO_CREATE_STYLES_PREF);
  if (typeof saved === "boolean") return saved;

  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(LEGACY_AUTO_SETUP_KEY);
  } catch {
    /* storage unavailable */
  }
  if (legacy !== null) {
    const value = legacy !== "false";
    setDevicePref(AUTO_CREATE_STYLES_PREF, value);
    try {
      localStorage.removeItem(LEGACY_AUTO_SETUP_KEY);
    } catch {
      /* ignore */
    }
    return value;
  }
  return true;
}

/** Save the visible setting. */
export function setAutoCreateStylesPref(enabled: boolean): void {
  setDevicePref(AUTO_CREATE_STYLES_PREF, enabled);
}

/** Inputs to {@link shouldAutoCreateStyles}. */
export interface AutoCreateStylesInput {
  enabled: boolean;
  writingMode: "academic" | "court";
  /** The document body text (trimmed or not). */
  bodyText: string;
  /** Citations already in the document's Obiter store. */
  citationCount: number;
}

/**
 * True only for a new blank academic document with the setting on:
 * empty body, no citations, not court mode (COURT-101).
 */
export function shouldAutoCreateStyles(input: AutoCreateStylesInput): boolean {
  if (!input.enabled) return false;
  if (input.writingMode === "court") return false;
  if (input.citationCount > 0) return false;
  return input.bodyText.trim().length === 0;
}
