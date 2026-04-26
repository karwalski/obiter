/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.5 — Source Health Indicator
 *
 * Session-level health tracking for source lookup adapters. Records the
 * result of each healthcheck and exposes a simple status model:
 *
 *   healthy  — last check succeeded
 *   degraded — first failure on a fragile (scraper) adapter, or intermittent
 *   offline  — confirmed unreachable (two consecutive failures for scrapers,
 *              or any failure for non-fragile adapters)
 *
 * State is held in memory only — it resets when the task pane reloads.
 */

import type { SourceLookup } from "./types";

/** Possible health states for an adapter. */
export type HealthStatus = "healthy" | "degraded" | "offline";

/** Internal record for a single adapter's health history. */
interface HealthRecord {
  status: HealthStatus;
  lastError: string | undefined;
  lastChecked: number; // Date.now() timestamp
  consecutiveFailures: number;
}

/**
 * Set of adapter IDs that are "fragile" — i.e. scrapers that may fail
 * transiently. The first failure for these adapters is reported as
 * "degraded" rather than "offline" to avoid crying wolf.
 */
const fragileAdapterIds = new Set<string>([
  "austlii",
  "nzlii",
  "bailii",
  "treaty-database",
]);

/** In-memory health state, keyed by adapter ID. */
const healthState = new Map<string, HealthRecord>();

/**
 * Mark an adapter ID as fragile (scraper). Useful for adapters registered
 * after module initialisation.
 */
export function markFragile(adapterId: string): void {
  fragileAdapterIds.add(adapterId);
}

/**
 * Derive a stable adapter ID from a SourceLookup instance.
 *
 * Uses the adapter's `name` property, lowercased and with spaces/dots
 * replaced by hyphens, so "Jade.io" becomes "jade-io".
 */
export function deriveAdapterId(adapter: SourceLookup): string {
  return adapter.name.toLowerCase().replace(/[\s.]+/g, "-");
}

/**
 * Run a healthcheck against an adapter and record the result.
 *
 * If the adapter exposes a `healthcheck()` method it is called directly.
 * Otherwise a zero-length search is issued as a lightweight probe — any
 * non-throwing response counts as healthy.
 */
export async function checkHealth(
  adapter: SourceLookup & { healthcheck?: () => Promise<void> },
): Promise<HealthStatus> {
  const id = deriveAdapterId(adapter);
  const previous = healthState.get(id);

  try {
    if (typeof adapter.healthcheck === "function") {
      await adapter.healthcheck();
    } else {
      // Fallback: issue a trivial search as a connectivity probe.
      await adapter.search("");
    }

    healthState.set(id, {
      status: "healthy",
      lastError: undefined,
      lastChecked: Date.now(),
      consecutiveFailures: 0,
    });
    return "healthy";
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    const failures = (previous?.consecutiveFailures ?? 0) + 1;
    const isFragile = fragileAdapterIds.has(id);

    // Fragile adapters get one grace failure before going offline.
    const status: HealthStatus =
      isFragile && failures < 2 ? "degraded" : "offline";

    healthState.set(id, {
      status,
      lastError: message,
      lastChecked: Date.now(),
      consecutiveFailures: failures,
    });
    return status;
  }
}

/** Return the current health status for an adapter, or "healthy" if unknown. */
export function getHealthStatus(adapterId: string): HealthStatus {
  return healthState.get(adapterId)?.status ?? "healthy";
}

/** Return the last error message for an adapter, or `undefined`. */
export function getLastError(adapterId: string): string | undefined {
  return healthState.get(adapterId)?.lastError;
}

/** Return the timestamp of the last healthcheck, or `undefined`. */
export function getLastChecked(adapterId: string): number | undefined {
  return healthState.get(adapterId)?.lastChecked;
}

/**
 * Reset all health state. Intended for tests and session-clear scenarios.
 */
export function resetHealthState(): void {
  healthState.clear();
}
