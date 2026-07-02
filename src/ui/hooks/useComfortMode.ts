/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Comfort mode: a persisted toggle that reshapes the pane for motor and
 * low-vision needs — larger targets, larger type, wider spacing, and no motion.
 * A single switch that serves the audience the accessibility uplift targets.
 *
 * State is stored per-device via devicePreferences (localStorage), so it never
 * travels in the .docx; on Mac it is per-document. The visual effect is driven
 * by a `data-comfort` attribute on <html> that CSS keys off (see global.css).
 */

/* global document */

import { useState, useEffect, useCallback } from "react";
import { getDevicePref, setDevicePref } from "../../store/devicePreferences";

const COMFORT_KEY = "comfortMode";

export function isComfortModeEnabled(): boolean {
  return getDevicePref(COMFORT_KEY) === true;
}

/** Applies the current comfort-mode preference to <html>. Safe to call on load. */
export function applyComfortMode(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-comfort", isComfortModeEnabled() ? "on" : "off");
}

/**
 * Hook returning the current comfort-mode state and a setter that persists the
 * preference and updates the `data-comfort` attribute immediately.
 */
export function useComfortMode(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(isComfortModeEnabled);

  useEffect(() => {
    document.documentElement.setAttribute("data-comfort", enabled ? "on" : "off");
  }, [enabled]);

  const set = useCallback((value: boolean) => {
    setDevicePref(COMFORT_KEY, value);
    setEnabled(value);
  }, []);

  return [enabled, set];
}
