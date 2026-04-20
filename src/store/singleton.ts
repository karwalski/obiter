/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Singleton CitationStore instance shared across all views.
 * Ensures in-memory citation state is consistent and persist()
 * calls don't compete.
 */

import { CitationStore } from "./citationStore";
export { CitationStore } from "./citationStore";

let instance: CitationStore | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Returns the shared CitationStore singleton.
 * Initialises on first call; subsequent calls return the same instance.
 */
export async function getSharedStore(): Promise<CitationStore> {
  if (instance && initPromise) {
    await initPromise;
    return instance;
  }

  instance = new CitationStore();
  initPromise = instance.initStore();
  await initPromise;
  return instance;
}

/**
 * Reset the singleton (for testing or when switching documents).
 */
export function resetSharedStore(): void {
  instance = null;
  initPromise = null;
}
