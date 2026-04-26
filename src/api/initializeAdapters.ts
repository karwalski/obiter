/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Startup Adapter Initialization (Story 17.8 / 17.10)
 *
 * Runs once on app startup to:
 * 1. Try loading corpus from IndexedDB into InMemoryCorpusIndex
 * 2. If not found and not skipped, set the banner flag
 * 3. Register the corpus adapter with the source registry
 * 4. Register all built-in non-scraper adapters with the registry
 */

import {
  checkCorpusAvailable,
  getCorpusIndex,
  isCorpusSkipped,
  getCorpusStatus,
  loadCorpusFromStorage,
} from "./corpus/corpusDownload";
import { shouldUseLocal } from "./cloud/cloudMode";
import { registerAdapter } from "./sourceRegistry";

/** Whether initialization has completed. */
let initialized = false;

/** Whether the corpus download banner should be shown this session. */
let showCorpusBanner = false;

/**
 * Initialize the source lookup layer.
 *
 * - Attempts to load the corpus index from IndexedDB (persisted from a
 *   previous session).
 * - If the corpus is available, registers its adapter descriptor.
 * - If the corpus is not downloaded and local mode is allowed,
 *   sets the corpus banner flag so the UI can prompt the user.
 * - Registers all built-in adapter descriptors with the source registry.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initializeSourceLookup(): Promise<void> {
  if (initialized) return;

  // Try loading corpus from IndexedDB before checking status
  await loadCorpusFromStorage();

  // Determine whether the corpus banner should appear
  const corpusAvailable = checkCorpusAvailable();
  const corpusSkipped = isCorpusSkipped();
  const corpusStatus = getCorpusStatus();

  if (!corpusAvailable && !corpusSkipped && corpusStatus === "not-downloaded") {
    if (shouldUseLocal()) {
      showCorpusBanner = true;
    }
  }

  // If the corpus is already loaded, register its descriptor
  if (corpusAvailable) {
    const index = getCorpusIndex();
    if (index) {
      registerAdapter({
        id: "corpus",
        name: "Open Australian Legal Corpus",
        tier: "open",
        jurisdictions: ["AU"],
        licence: "CC BY 4.0 (Isaacus)",
        requiresKey: false,
        fragile: false,
        health: "green",
      });
    }
  }

  // Register built-in adapter descriptors.
  // Deep-link constructors (no HTTP requests)
  registerAdapter({
    id: "austlii-link",
    name: "AustLII Deep Links",
    tier: "open",
    jurisdictions: ["AU"],
    licence: "Link-only — no content retrieved",
    requiresKey: false,
    fragile: false,
    health: "green",
  });

  registerAdapter({
    id: "jade-link",
    name: "Jade.io Deep Links",
    tier: "open",
    jurisdictions: ["AU"],
    licence: "Link-only — no content retrieved",
    requiresKey: false,
    fragile: false,
    health: "green",
  });

  // Journal metadata adapters
  registerAdapter({
    id: "crossref",
    name: "Crossref",
    tier: "open",
    jurisdictions: [],
    licence: "CC0",
    requiresKey: false,
    fragile: false,
    health: "green",
  });

  registerAdapter({
    id: "openalex",
    name: "OpenAlex",
    tier: "open",
    jurisdictions: [],
    licence: "CC0",
    requiresKey: false,
    fragile: false,
    health: "green",
  });

  registerAdapter({
    id: "doaj",
    name: "DOAJ",
    tier: "open",
    jurisdictions: [],
    licence: "CC BY",
    requiresKey: false,
    fragile: false,
    health: "green",
  });

  // RSS feed adapters (live, fragile)
  registerAdapter({
    id: "fca-rss",
    name: "Federal Court RSS",
    tier: "live",
    jurisdictions: ["AU"],
    licence: "Commonwealth of Australia — open access",
    requiresKey: false,
    fragile: true,
    health: "green",
  });

  registerAdapter({
    id: "sclqld-rss",
    name: "Qld Courts RSS",
    tier: "live",
    jurisdictions: ["AU"],
    licence: "State of Queensland — open access",
    requiresKey: false,
    fragile: true,
    health: "green",
  });

  // Scrapers are NOT registered by default — they are fragile and need
  // explicit opt-in from the user via Settings > Sources.

  initialized = true;
}

/** Whether the corpus download banner should be shown to the user. */
export function shouldShowCorpusBanner(): boolean {
  return showCorpusBanner;
}

/** Dismiss the corpus banner for the rest of this session. */
export function dismissCorpusBanner(): void {
  showCorpusBanner = false;
}

/**
 * Called after a successful corpus download to register the corpus adapter
 * with the source registry (if not already registered).
 */
export function registerCorpusAfterDownload(): void {
  registerAdapter({
    id: "corpus",
    name: "Open Australian Legal Corpus",
    tier: "open",
    jurisdictions: ["AU"],
    licence: "CC BY 4.0 (Isaacus)",
    requiresKey: false,
    fragile: false,
    health: "green",
  });
  showCorpusBanner = false;
}

/**
 * Reset state (for testing).
 * @internal
 */
export function _resetInitializeState(): void {
  initialized = false;
  showCorpusBanner = false;
}
