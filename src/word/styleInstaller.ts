/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Utilities for installing the AGLC4 XSL bibliography style into
 * Word's built-in References > Style picker.
 */

/** OS-specific install paths for Word bibliography XSL styles. */
const STYLE_PATHS = {
  mac: "/Applications/Microsoft Word.app/Contents/Resources/Style/",
  windows: "C:\\Users\\%USERNAME%\\AppData\\Roaming\\Microsoft\\Bibliography\\Style\\",
} as const;

const XSL_FILENAME = "AGLC4.xsl";

/**
 * Returns the correct XSL style install path for the current OS.
 * Falls back to the Mac path if the platform cannot be determined.
 */
export function getStyleInstallPath(): string {
  const platform = detectPlatform();
  if (platform === "windows") {
    // Resolve %USERNAME% from environment if available
    const username =
      typeof process !== "undefined" && process.env?.USERNAME
        ? process.env.USERNAME
        : "%USERNAME%";
    return STYLE_PATHS.windows.replace("%USERNAME%", username) + XSL_FILENAME;
  }
  return STYLE_PATHS.mac + XSL_FILENAME;
}

/**
 * Checks whether the AGLC4 XSL style file is installed at the expected path.
 *
 * Note: Office Add-ins run in a sandboxed browser context and cannot directly
 * access the filesystem. This always returns `false` in the add-in context.
 */
export function isAglc4StyleInstalled(): boolean {
  // Filesystem access is unavailable in the add-in sandbox
  return false;
}

/**
 * Returns user-facing instructions for manually installing the AGLC4 XSL file
 * so it appears in Word's References > Style dropdown.
 */
export function getInstallInstructions(): string {
  const platform = detectPlatform();

  if (platform === "windows") {
    return [
      "To add AGLC4 to Word's built-in citation style picker:",
      "",
      "1. Download the AGLC4.xsl file from the Obiter add-in resources.",
      "2. Open File Explorer and navigate to:",
      "   %APPDATA%\\Microsoft\\Bibliography\\Style\\",
      "   (If the Style folder does not exist, create it.)",
      "3. Copy AGLC4.xsl into the Style folder.",
      "4. Restart Word.",
      "5. Go to the References tab and select AGLC4 from the Style dropdown.",
    ].join("\n");
  }

  return [
    "To add AGLC4 to Word's built-in citation style picker:",
    "",
    "1. Download the AGLC4.xsl file from the Obiter add-in resources.",
    "2. Open Finder and navigate to:",
    "   /Applications/Microsoft Word.app/Contents/Resources/Style/",
    "   (Right-click Microsoft Word.app > Show Package Contents > Contents > Resources > Style)",
    "3. Copy AGLC4.xsl into the Style folder.",
    "   You may need to enter your administrator password.",
    "4. Restart Word.",
    "5. Go to the References tab and select AGLC4 from the Style dropdown.",
  ].join("\n");
}

/**
 * Detects whether the current platform is macOS or Windows.
 */
function detectPlatform(): "mac" | "windows" {
  // Check Office.js platform info first
  try {
    if (typeof Office !== "undefined" && Office.context?.diagnostics?.platform) {
      const platform = Office.context.diagnostics.platform;
      if (platform === Office.PlatformType.PC) return "windows";
      return "mac";
    }
  } catch {
    // Fall through
  }

  // Check navigator.userAgent as fallback
  try {
    if (typeof navigator !== "undefined" && navigator.userAgent) {
      if (/Win/.test(navigator.userAgent)) return "windows";
    }
  } catch {
    // Fall through
  }

  // Default to Mac
  return "mac";
}
