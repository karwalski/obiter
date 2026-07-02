/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Keyboard shortcut registry (A11Y-030). Defines the global shortcuts, exposes a
 * reference list for the shortcuts help view, and supports light customisation
 * (the command-palette trigger key, and an on/off switch) persisted per device.
 */

/* global navigator */

import { getDevicePref, setDevicePref } from "../store/devicePreferences";

const PALETTE_KEY_PREF = "commandPaletteKey";
const SHORTCUTS_ENABLED_PREF = "globalShortcutsEnabled";

/** Letters offered for the command-palette trigger, to avoid clashing with Word. */
export const PALETTE_KEY_CHOICES = ["k", "j", "o", "p"] as const;

export function getPaletteKey(): string {
  const k = getDevicePref(PALETTE_KEY_PREF);
  return typeof k === "string" && k.length === 1 ? k : "k";
}

export function setPaletteKey(key: string): void {
  setDevicePref(PALETTE_KEY_PREF, key);
}

export function areShortcutsEnabled(): boolean {
  // Default on; only an explicit `false` disables them.
  return getDevicePref(SHORTCUTS_ENABLED_PREF) !== false;
}

export function setShortcutsEnabled(enabled: boolean): void {
  setDevicePref(SHORTCUTS_ENABLED_PREF, enabled);
}

/** Best-effort platform label for display (Cmd on Apple, otherwise Ctrl). */
export function modifierLabel(): string {
  try {
    if (typeof navigator !== "undefined" && /Mac|iPad|iPhone/.test(navigator.platform || "")) {
      return "Cmd";
    }
  } catch {
    // navigator unavailable — fall through.
  }
  return "Ctrl";
}

export interface ShortcutDoc {
  keys: string;
  action: string;
}

/** The current shortcut bindings, for display in the reference view. */
export function getShortcutDocs(): ShortcutDoc[] {
  const mod = modifierLabel();
  const k = getPaletteKey().toUpperCase();
  return [
    { keys: `${mod} + ${k}`, action: "Open the command palette" },
    { keys: `${mod} + /`, action: "Open this keyboard shortcuts reference" },
    { keys: "Tab / Shift + Tab", action: "Move between controls" },
    { keys: "Arrow keys", action: "Move within a list or the citation search results" },
    { keys: "Enter", action: "Activate the focused button or selected result" },
    { keys: "Esc", action: "Close a menu, dialog, or the command palette" },
  ];
}
