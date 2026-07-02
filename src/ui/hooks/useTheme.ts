/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Hook that reads the Office.js theme and applies dark/light mode
 * to the document element via a data-theme attribute.
 */

/* global document, Office, window, MediaQueryList */

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
 * Reads the current theme and returns "dark" or "light". The Office theme is
 * authoritative when present (Word desktop); otherwise (Word for the web, or
 * before Office.js resolves) the OS/browser `prefers-color-scheme` is honoured.
 */
function detectTheme(): ThemeMode {
  try {
    const bg = Office?.context?.officeTheme?.bodyBackgroundColor;
    if (bg) {
      return isDarkColour(bg) ? "dark" : "light";
    }
  } catch {
    // Office.js not available or officeTheme not supported — fall through.
  }
  try {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // matchMedia unavailable — fall back to light.
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
    // Re-detect when the OS/browser colour scheme or forced-colors mode changes.
    // (Word has no task-pane theme-changed event, so we listen to the platform
    // media queries instead of abusing DocumentSelectionChanged.)
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    function onChange(): void {
      setTheme(detectTheme());
    }

    const queries: MediaQueryList[] = [
      window.matchMedia("(prefers-color-scheme: dark)"),
      window.matchMedia("(forced-colors: active)"),
    ];

    for (const mq of queries) {
      // addEventListener is the modern API; addListener is the Safari/WebView fallback.
      if (mq.addEventListener) {
        mq.addEventListener("change", onChange);
      } else if (mq.addListener) {
        mq.addListener(onChange);
      }
    }

    return () => {
      for (const mq of queries) {
        if (mq.removeEventListener) {
          mq.removeEventListener("change", onChange);
        } else if (mq.removeListener) {
          mq.removeListener(onChange);
        }
      }
    };
  }, []);

  return theme;
}
