/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.2 — Source Registry & Tiered Enablement
 *
 * Central registry of all available source adapters. Each adapter declares
 * its tier (open, live, link-only), jurisdiction coverage, and whether it
 * requires an API key. Enabled/disabled state is persisted via devicePreferences.
 */

import { getDevicePref, setDevicePref } from "../store/devicePreferences";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Adapter access tiers — controls default-on behaviour. */
export type AdapterTier = "open" | "live" | "link-only";

/** Health status for the UI dot indicator. */
export type HealthStatus = "green" | "amber" | "red";

/** Descriptor for a single source adapter in the registry. */
export interface SourceAdapterDescriptor {
  /** Unique machine-readable identifier (e.g. "austlii", "jade"). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Access tier — determines default enablement. */
  tier: AdapterTier;
  /** Jurisdictions this adapter covers (e.g. ["AU", "NZ"]). */
  jurisdictions: string[];
  /** Short licence/access summary shown in UI. */
  licence: string;
  /** Whether the adapter needs an API key to function. */
  requiresKey: boolean;
  /** Whether the adapter relies on fragile scraping. */
  fragile: boolean;
  /** Current health status — updated by health-check (wired later). */
  health: HealthStatus;
}

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

const PREF_KEY = "sourceRegistry.enabled";
const MASTER_KEY = "sourceRegistry.masterEnabled";

/** Load the persisted enabled/disabled map. */
function loadEnabledMap(): Record<string, boolean> {
  const saved = getDevicePref(PREF_KEY);
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    return saved as Record<string, boolean>;
  }
  return {};
}

/** Persist the enabled/disabled map. */
function saveEnabledMap(map: Record<string, boolean>): void {
  setDevicePref(PREF_KEY, map);
}

/** Check whether the master source-lookup toggle is enabled. */
export function isMasterEnabled(): boolean {
  const saved = getDevicePref(MASTER_KEY);
  // Default to false — user must explicitly enable source lookup
  return saved === true;
}

/** Set the master source-lookup toggle. */
export function setMasterEnabled(enabled: boolean): void {
  setDevicePref(MASTER_KEY, enabled);
}

/* ------------------------------------------------------------------ */
/*  Default enablement by tier                                         */
/* ------------------------------------------------------------------ */

function defaultEnabled(tier: AdapterTier): boolean {
  return tier === "open";
}

/* ------------------------------------------------------------------ */
/*  Registry implementation                                            */
/* ------------------------------------------------------------------ */

const adapters: SourceAdapterDescriptor[] = [];

/**
 * Register a source adapter with the registry.
 * Duplicate IDs are silently ignored (first registration wins).
 */
export function registerAdapter(adapter: SourceAdapterDescriptor): void {
  if (adapters.some((a) => a.id === adapter.id)) return;
  adapters.push(adapter);
}

/** Retrieve an adapter descriptor by ID, or undefined if not found. */
export function getAdapter(id: string): SourceAdapterDescriptor | undefined {
  return adapters.find((a) => a.id === id);
}

/** Return all registered adapter descriptors. */
export function getAllAdapters(): readonly SourceAdapterDescriptor[] {
  return adapters;
}

/** Return only the adapters that are currently enabled. */
export function getEnabledAdapters(): readonly SourceAdapterDescriptor[] {
  const map = loadEnabledMap();
  return adapters.filter((a) => {
    const persisted = map[a.id];
    return persisted !== undefined ? persisted : defaultEnabled(a.tier);
  });
}

/**
 * Check whether a specific adapter is enabled.
 * Falls back to the tier default if no persisted preference exists.
 */
export function isAdapterEnabled(id: string): boolean {
  const map = loadEnabledMap();
  const persisted = map[id];
  if (persisted !== undefined) return persisted;
  const adapter = getAdapter(id);
  return adapter ? defaultEnabled(adapter.tier) : false;
}

/** Set the enabled state for a specific adapter and persist. */
export function setAdapterEnabled(id: string, enabled: boolean): void {
  const map = loadEnabledMap();
  map[id] = enabled;
  saveEnabledMap(map);
}

/* ------------------------------------------------------------------ */
/*  Tier grouping helper                                               */
/* ------------------------------------------------------------------ */

/** Group adapters by their tier for display. */
export function getAdaptersByTier(): Record<AdapterTier, SourceAdapterDescriptor[]> {
  const groups: Record<AdapterTier, SourceAdapterDescriptor[]> = {
    open: [],
    live: [],
    "link-only": [],
  };
  for (const adapter of adapters) {
    groups[adapter.tier].push(adapter);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Tier display labels                                                */
/* ------------------------------------------------------------------ */

export const TIER_LABELS: Record<AdapterTier, string> = {
  open: "Open Access (enabled by default)",
  live: "Live Services (disabled by default)",
  "link-only": "Link-Only (disabled by default)",
};

/* ------------------------------------------------------------------ */
/*  Adapter registrations                                              */
/* ------------------------------------------------------------------ */
/*
 * Built-in static registrations removed. All adapter descriptors are now
 * registered dynamically by initialiseAdapters() in adapterSearch.ts,
 * which maps each SourceAdapter instance's descriptor into the registry
 * format. Call initialiseAdapters() early in the app lifecycle to
 * populate the registry before the Settings UI reads from it.
 */
