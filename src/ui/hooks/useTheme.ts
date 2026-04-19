/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Hook that reads the Office.js theme and applies dark/light mode
 * to the document element via a data-theme attribute.
 */

/* global document, Office */

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

/**
 * Determines whether a background colour is dark by checking its luminance.
 * Accepts hex colour strings (e.g. "#1b1a19" or "1b1a19").
 */
function isDarkColour(hex: string): boolean {
  const cleaned = hex.replace("#", "");
  if (cleaned.length < 6) return false;
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * Reads the current Office theme and returns "dark" or "light".
 */
function detectTheme(): ThemeMode {
  try {
    if (Office?.context?.officeTheme) {
      const bg = Office.context.officeTheme.bodyBackgroundColor;
      if (bg && isDarkColour(bg)) {
        return "dark";
      }
    }
  } catch {
    // Office.js not available or officeTheme not supported — fall back to light
  }
  return "light";
}

/**
 * React hook that detects the current Office theme (dark/light) and applies
 * a `data-theme` attribute to the document element. Re-checks when the
 * Office theme changes.
 */
export function useTheme(): ThemeMode {
  const [theme, setTheme] = useState<ThemeMode>(detectTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    function onThemeChanged(): void {
      setTheme(detectTheme());
    }

    try {
      if (Office?.context?.officeTheme) {
        Office.context.document.addHandlerAsync(
          Office.EventType.DocumentSelectionChanged,
          onThemeChanged
        );
      }
    } catch {
      // Theme change handler not supported — static theme only
    }

    return () => {
      try {
        Office.context.document.removeHandlerAsync(Office.EventType.DocumentSelectionChanged, {
          handler: onThemeChanged,
        });
      } catch {
        // Cleanup best-effort
      }
    };
  }, []);

  return theme;
}
