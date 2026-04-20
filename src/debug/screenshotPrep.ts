/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Screenshot preparation utility. Populates the add-in with realistic
 * data for each required AppSource screenshot. Each function navigates
 * to the correct view and sets up the state.
 */

import { createLogger } from "./logger";
import { generateTestEssay } from "./testRunner";

const log = createLogger("ScreenshotPrep");

let navigateFn: ((path: string) => void) | null = null;

/** Register the React Router navigate function for view switching. */
export function setNavigate(fn: (path: string) => void): void {
  navigateFn = fn;
}

function nav(path: string): void {
  if (navigateFn) {
    navigateFn(path);
  }
}

// ─── Prepare Essay ───────────────────────────────────────────────────────────

/**
 * Uses the test runner's essay generator which produces a properly
 * formatted essay with headings, body text, and citation footnotes.
 */
export async function prepareTestEssay(): Promise<void> {
  log.info("Generating test essay via test runner...");
  await generateTestEssay();
  log.info("Test essay ready for screenshots.");
}

// ─── Screenshot Preparers ────────────────────────────────────────────────────

/** Screenshot 1: Insert Citation — case form with preview */
export async function prepScreenshot1(): Promise<void> {
  log.info("Preparing Screenshot 1: Insert Citation");
  nav("/");
  // The Insert view will show. User needs to:
  // 1. Select "Domestic" category, then "Reported Case"
  // 2. The form pre-populates via the test essay setup
  // We can't programmatically fill the React form, but we navigate to it.
  // Hint: fill in Mabo v Queensland [No 2] (1992) 175 CLR 1
}

/** Screenshot 2: Citation Library — multiple citations */
export async function prepScreenshot2(): Promise<void> {
  log.info("Preparing Screenshot 2: Citation Library");
  nav("/library");
  // Library will show all 6 citations from the store
}

/** Screenshot 3: Validation — scan results */
export async function prepScreenshot3(): Promise<void> {
  log.info("Preparing Screenshot 3: Validation");
  nav("/validation");
  // User should click "Validate Document" to see results
}

/** Screenshot 4: Bibliography — preview */
export async function prepScreenshot4(): Promise<void> {
  log.info("Preparing Screenshot 4: Bibliography");
  nav("/bibliography");
  // Bibliography view will auto-generate preview from store
}

/** Screenshot 5: Reference Guide — search */
export async function prepScreenshot5(): Promise<void> {
  log.info("Preparing Screenshot 5: Reference Guide");
  nav("/guide");
  // User should type a search term like "ibid" or "2.1"
}

/** Screenshot 6: Settings */
export async function prepScreenshot6(): Promise<void> {
  log.info("Preparing Screenshot 6: Settings");
  nav("/settings");
}

/** Screenshot 7: Ribbon tab — just navigate to any view, ribbon is always visible */
export async function prepScreenshot7(): Promise<void> {
  log.info("Preparing Screenshot 7: Ribbon Tab");
  nav("/");
  // User captures the ribbon area showing the AGLC4 tab with all buttons
}

export const SCREENSHOT_PREPS = [
  { id: 1, label: "Insert Citation (case form + preview)", fn: prepScreenshot1 },
  { id: 2, label: "Citation Library (multiple types)", fn: prepScreenshot2 },
  { id: 3, label: "Validation (scan results)", fn: prepScreenshot3 },
  { id: 4, label: "Bibliography (preview)", fn: prepScreenshot4 },
  { id: 5, label: "Reference Guide (search)", fn: prepScreenshot5 },
  { id: 6, label: "Settings", fn: prepScreenshot6 },
  { id: 7, label: "Ribbon Tab (AGLC4 buttons)", fn: prepScreenshot7 },
];
