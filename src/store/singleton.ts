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
let storeInitError: Error | null = null;
let ready = false;

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
  // SAFE-006: record the last init rejection so views can surface a visible
  // banner instead of silently defaulting. The promise still rejects with the
  // original error — the getSharedStore contract is unchanged.
  initPromise = instance.initStore().then(
    () => {
      storeInitError = null;
      ready = true;
    },
    (err: unknown) => {
      storeInitError = err instanceof Error ? err : new Error(String(err));
      throw err;
    }
  );
  await initPromise;
  return instance;
}

/**
 * The error from the most recent failed store initialisation, or null when
 * the store initialised successfully (or has not been initialised yet).
 * Lets views render a store-failure banner without re-awaiting the
 * rejected init promise (SAFE-006).
 */
export function getStoreInitError(): Error | null {
  return storeInitError;
}

/**
 * Synchronous accessor for the shared store, or null when the store has not
 * finished initialising. For render-time reads (React memos) that cannot
 * await getSharedStore(); callers must fall back to sensible defaults.
 */
export function getSharedStoreIfReady(): CitationStore | null {
  return ready ? instance : null;
}

/**
 * Reset the singleton (for testing or when switching documents).
 */
export function resetSharedStore(): void {
  instance = null;
  initPromise = null;
  storeInitError = null;
  ready = false;
}
