/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.6 — Source Preference & Jurisdictional Ordering
 *
 * Manages the priority order in which source adapters are consulted for
 * each content type and jurisdiction. The default order follows a
 * reliability hierarchy:
 *
 *   corpus > live API > scraper > link-only
 *
 * Users can override ordering per content type and/or jurisdiction.
 * Preferences are persisted via devicePreferences (localStorage).
 */

import { getDevicePref, setDevicePref } from "../store/devicePreferences";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Broad adapter category, ordered from most to least reliable. */
export type AdapterKind = "corpus" | "live-api" | "scraper" | "link-only";

/** Content types recognised by the preference system. */
export type ContentType =
  | "case"
  | "legislation"
  | "hansard"
  | "journal"
  | "treaty"
  | "lrc-report";

/** Metadata about an adapter, used for default ordering. */
export interface AdapterMeta {
  id: string;
  kind: AdapterKind;
  /** Content types this adapter supports. */
  contentTypes: ContentType[];
  /** Jurisdictions this adapter covers (empty = all). */
  jurisdictions: string[];
}

/** Serialised preference entry: content type + optional jurisdiction. */
interface PreferenceEntry {
  contentType: ContentType;
  jurisdiction?: string;
  adapterIds: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFS_KEY = "sourcePreferences";

/**
 * Kind priority — lower index = higher priority.
 * Used to derive default ordering when no user preference exists.
 */
const KIND_PRIORITY: AdapterKind[] = [
  "corpus",
  "live-api",
  "scraper",
  "link-only",
];

// ---------------------------------------------------------------------------
// Adapter registry (populated at startup)
// ---------------------------------------------------------------------------

const adapterRegistry = new Map<string, AdapterMeta>();

/** Register an adapter so the preference system knows about it. */
export function registerAdapter(meta: AdapterMeta): void {
  adapterRegistry.set(meta.id, meta);
}

/** Remove an adapter from the registry. */
export function unregisterAdapter(id: string): void {
  adapterRegistry.delete(id);
}

/** Return all registered adapter metadata. */
export function getRegisteredAdapters(): AdapterMeta[] {
  return Array.from(adapterRegistry.values());
}

// ---------------------------------------------------------------------------
// Preference storage
// ---------------------------------------------------------------------------

function loadEntries(): PreferenceEntry[] {
  const raw = getDevicePref(PREFS_KEY);
  if (Array.isArray(raw)) {
    return raw as PreferenceEntry[];
  }
  return [];
}

function saveEntries(entries: PreferenceEntry[]): void {
  setDevicePref(PREFS_KEY, entries);
}

/**
 * Build a composite lookup key for a content-type + jurisdiction pair.
 * Jurisdiction is normalised to uppercase; omitted means "global".
 */
function entryKey(contentType: ContentType, jurisdiction?: string): string {
  const j = jurisdiction?.toUpperCase() ?? "*";
  return `${contentType}:${j}`;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Return an ordered list of adapter IDs for the given content type and
 * jurisdiction. Resolution order:
 *
 *  1. Exact match (contentType + jurisdiction)
 *  2. Content-type-only match (contentType, no jurisdiction)
 *  3. Default: all registered adapters that support the content type,
 *     sorted by kind priority then by jurisdiction affinity.
 */
export function getPreferredAdapters(
  contentType: ContentType,
  jurisdiction?: string,
): string[] {
  const entries = loadEntries();

  // 1. Exact match
  if (jurisdiction) {
    const exact = entries.find(
      (e) =>
        e.contentType === contentType &&
        e.jurisdiction?.toUpperCase() === jurisdiction.toUpperCase(),
    );
    if (exact) return exact.adapterIds;
  }

  // 2. Content-type-only match
  const global = entries.find(
    (e) => e.contentType === contentType && !e.jurisdiction,
  );
  if (global) return global.adapterIds;

  // 3. Default ordering from registry
  return defaultOrder(contentType, jurisdiction);
}

/**
 * Derive the default adapter ordering from the registry. Adapters are
 * sorted by kind priority, with a secondary sort that prefers adapters
 * whose jurisdiction list includes the requested jurisdiction.
 */
function defaultOrder(
  contentType: ContentType,
  jurisdiction?: string,
): string[] {
  const candidates = Array.from(adapterRegistry.values()).filter((m) =>
    m.contentTypes.includes(contentType),
  );

  const jUp = jurisdiction?.toUpperCase();

  candidates.sort((a, b) => {
    // Primary: kind priority
    const kindDiff =
      KIND_PRIORITY.indexOf(a.kind) - KIND_PRIORITY.indexOf(b.kind);
    if (kindDiff !== 0) return kindDiff;

    // Secondary: jurisdiction affinity (matching jurisdiction sorts first)
    if (jUp) {
      const aMatch = a.jurisdictions.length === 0 ||
        a.jurisdictions.some((j) => j.toUpperCase() === jUp);
      const bMatch = b.jurisdictions.length === 0 ||
        b.jurisdictions.some((j) => j.toUpperCase() === jUp);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }

    return 0;
  });

  return candidates.map((c) => c.id);
}

/**
 * Save a custom adapter ordering for a content type and optional
 * jurisdiction. Pass `undefined` for jurisdiction to set the global
 * default for that content type.
 */
export function setPreference(
  contentType: ContentType,
  jurisdiction: string | undefined,
  adapterIds: string[],
): void {
  const entries = loadEntries();
  const key = entryKey(contentType, jurisdiction);

  const idx = entries.findIndex(
    (e) => entryKey(e.contentType, e.jurisdiction) === key,
  );

  const entry: PreferenceEntry = {
    contentType,
    ...(jurisdiction ? { jurisdiction: jurisdiction.toUpperCase() } : {}),
    adapterIds,
  };

  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }

  saveEntries(entries);
}

/**
 * Remove a custom preference, reverting to default ordering.
 */
export function clearPreference(
  contentType: ContentType,
  jurisdiction?: string,
): void {
  const entries = loadEntries();
  const key = entryKey(contentType, jurisdiction);
  saveEntries(
    entries.filter((e) => entryKey(e.contentType, e.jurisdiction) !== key),
  );
}

// ---------------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------------

/**
 * Export all source preferences as a JSON string, suitable for backup or
 * sharing across devices.
 */
export function exportPreferences(): string {
  return JSON.stringify(loadEntries(), null, 2);
}

/**
 * Import source preferences from a JSON string, replacing any existing
 * preferences. Throws on invalid input.
 */
export function importPreferences(json: string): void {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of preference entries");
  }

  // Basic shape validation
  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("contentType" in item) ||
      !("adapterIds" in item) ||
      !Array.isArray((item as PreferenceEntry).adapterIds)
    ) {
      throw new Error("Invalid preference entry");
    }
  }

  saveEntries(parsed as PreferenceEntry[]);
}

/**
 * Reset the adapter registry. Intended for tests.
 */
export function resetRegistry(): void {
  adapterRegistry.clear();
}
