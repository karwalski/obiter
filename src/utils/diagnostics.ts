/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { APP_VERSION } from "../constants";

/**
 * Diagnostic data collected for error reports.
 * All fields are optional except obiterVersion and timestamp.
 * No personal data, document content, or API keys are included.
 */
export interface ErrorReport {
  errorMessage: string;
  errorStack?: string;
  action: string;
  wordVersion?: string;
  platform?: string;
  obiterVersion: string;
  timestamp: string;
  formData?: Record<string, unknown>;
  standardId?: string;
  writingMode?: string;
}

/**
 * Collects non-sensitive diagnostic information about the current environment.
 * Used to populate error reports before the user reviews and optionally sends them.
 */
export function collectDiagnostics(): Partial<ErrorReport> {
  let wordVersion: string | undefined;
  let platform: string | undefined;

  try {
    wordVersion = Office?.context?.diagnostics?.version;
    platform = Office?.context?.diagnostics?.platform?.toString();
  } catch {
    // Office.js may not be available in all contexts
  }

  return {
    obiterVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    wordVersion,
    platform,
  };
}

/**
 * Sends an error report to the Obiter server.
 * Returns true if the report was accepted, false otherwise.
 */
export async function sendErrorReport(report: ErrorReport): Promise<boolean> {
  try {
    const response = await fetch("https://obiter.com.au/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.received === true;
  } catch {
    return false;
  }
}
